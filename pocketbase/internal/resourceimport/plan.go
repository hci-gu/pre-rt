package resourceimport

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/pocketbase/pocketbase/core"
	"path/filepath"
	"sort"
	"strings"
)

var resourceFields = []string{"title", "description", "sourceKey", "content", "bindings", "aliases", "managedBy", "archived"}
var collectionFields = []string{"name", "pageTitle", "description", "footerContent", "resources", "sort", "visible_on_questions_and_answers", "showQuickExit", "sourceKey", "content", "bindings", "aliases", "managedBy", "archived"}

func fields(name string) []string {
	switch name {
	case "resource":
		return resourceFields
	case "resourceCollection":
		return collectionFields
	case "questions":
		return []string{"resource", "resourceCollection"}
	case "studySettings":
		return []string{"aboutCollection", "afterTreatmentCollection"}
	}
	return nil
}
func recordValues(r *core.Record, names []string) Values {
	v := Values{}
	for _, n := range names {
		v[n] = Normalize(r.Get(n))
	}
	return v
}

type Snapshot map[string]map[string]Values

func ReadSnapshot(app core.App) (Snapshot, error) {
	out := Snapshot{}
	for _, name := range []string{"resource", "resourceCollection", "questions", "studySettings"} {
		out[name] = map[string]Values{}
		records, err := app.FindAllRecords(name)
		if err != nil {
			return nil, err
		}
		for _, r := range records {
			v := recordValues(r, fields(name))
			v["importBaseline"] = Normalize(r.Get("importBaseline"))
			v["contentHash"] = r.GetString("contentHash")
			v["sourceDocumentHash"] = r.GetString("sourceDocumentHash")
			v["importRun"] = r.GetString("importRun")
			out[name][r.Id] = v
		}
	}
	return out, nil
}
func withoutMeta(v Values) Values {
	copy := Values{}
	for k, x := range v {
		if !contains(metadataFields, k) {
			copy[k] = x
		}
	}
	return copy
}
func stableID(kind, key string) string { return Hash(kind + ":" + key)[:15] }
func slug(s string) string {
	s = strings.ToLower(s)
	s = strings.NewReplacer("å", "a", "ä", "a", "à", "a", "á", "a", "â", "a", "ã", "a", "æ", "a", "ö", "o", "ò", "o", "ó", "o", "ô", "o", "õ", "o", "ø", "o").Replace(s)
	var out strings.Builder
	for _, r := range s {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == ' ' || r == '\t' || r == '\n' {
			out.WriteRune(r)
		}
	}
	return strings.Join(strings.Fields(out.String()), "-")
}
func contains(xs []string, s string) bool {
	for _, x := range xs {
		if x == s {
			return true
		}
	}
	return false
}
func BuildPlan(app core.App, bundlePath string, review bool, prefer []string) (*Plan, error) {
	path, err := filepath.Abs(bundlePath)
	if err != nil {
		return nil, err
	}
	var b Bundle
	if err = ReadJSON(path, &b); err != nil {
		return nil, err
	}
	if err = ValidateBundle(&b, path); err != nil {
		return nil, err
	}
	snapshot, err := ReadSnapshot(app)
	if err != nil {
		return nil, err
	}
	target, _ := filepath.Abs(app.DataDir())
	p := &Plan{Version: 1, Target: target, StateHash: Hash(snapshot), BundlePath: path, BundleHash: Hash(b), Review: review, Issues: append([]Issue{}, b.Issues...), PreferSource: prefer, Operations: []Operation{}, Coverage: []Coverage{}}
	p.CompiledBundleHash = b.CompiledHash
	ids := map[string]string{}
	claimed := map[string]string{}
	issue := func(code, msg string) { p.Issues = append(p.Issues, Issue{Code: code, Message: msg, Blocking: true}) }
	groups := []struct {
		name    string
		entries []Entry
	}{{"resource", b.Resources}, {"resourceCollection", b.Collections}}
	for _, group := range groups {
		for _, entry := range group.entries {
			id := ""
			for rid, v := range snapshot[group.name] {
				if v["managedBy"] == Owner && v["sourceKey"] == entry.SourceKey {
					id = rid
				}
			}
			if id == "" && entry.ExistingID != "" {
				if _, ok := snapshot[group.name][entry.ExistingID]; ok {
					id = entry.ExistingID
				}
			}
			// The study-settings migration creates About with a random ID on each
			// installation. Reuse that destination when the bootstrap ID is absent.
			if id == "" && group.name == "resourceCollection" && entry.SourceKey == "study" {
				for _, settings := range snapshot["studySettings"] {
					bound := str(settings["aboutCollection"])
					if bound == "" {
						continue
					}
					if snapshot[group.name][bound] == nil {
						return nil, fmt.Errorf("About binding points to missing collection: %s", bound)
					}
					if id != "" && id != bound {
						return nil, fmt.Errorf("ambiguous About collection bindings")
					}
					id = bound
				}
			}
			if id == "" {
				id = stableID(group.name, entry.SourceKey)
			}
			claim := group.name + "/" + id
			if prior := claimed[claim]; prior != "" {
				return nil, fmt.Errorf("two source keys claim %s: %s and %s", claim, prior, entry.SourceKey)
			}
			claimed[claim] = entry.SourceKey
			if v, ok := snapshot[group.name][id]; ok && str(v["managedBy"]) != "" && (v["managedBy"] != Owner || v["sourceKey"] != entry.SourceKey) {
				return nil, fmt.Errorf("identity collision at %s", claim)
			}
			ids[entry.SourceKey] = id
		}
	}
	links := Values{}
	for _, c := range b.Collections {
		route := "/faq/" + ids[c.SourceKey]
		if c.SourceKey == "after-treatment" {
			route = "/after-treatment"
		}
		links[c.SourceKey] = route
		for _, k := range c.Resources {
			links[k] = route + "#" + k
		}
	}
	addOp := func(name, id, key string, after Values) {
		before := snapshot[name][id]
		kind := "create"
		if before != nil {
			kind = "update"
			before = withoutMeta(before)
		}
		if Hash(before) == Hash(after) {
			return
		}
		if baseline := vals(snapshot[name][id]["importBaseline"]); len(baseline) > 0 && Hash(before) != Hash(baseline) && !contains(prefer, name+"/"+id) {
			issue("database-conflict", "Managed content changed outside import: "+name+"/"+id)
		}
		p.Operations = append(p.Operations, Operation{Collection: name, ID: id, Key: key, Before: before, After: after, Kind: kind, MetadataBefore: metadataValues(snapshot[name][id])})
	}
	for _, group := range groups {
		for _, e := range group.entries {
			id := ids[e.SourceKey]
			old := snapshot[group.name][id]
			aliases := []string{}
			for _, x := range arr(old["aliases"]) {
				aliases = append(aliases, str(x))
			}
			titles := append([]string{}, e.TitleHistory...)
			titles = append(titles, str(old["title"]))
			for _, t := range titles {
				if s := slug(t); s != "" && !contains(aliases, s) {
					aliases = append(aliases, s)
				}
			}
			sort.Strings(aliases)
			content := vals(stripSource(e.Content))
			after := Values{"sourceKey": e.SourceKey, "content": content, "bindings": Values{"links": usedLinks(content, links)}, "aliases": aliases, "managedBy": Owner, "archived": false}
			if group.name == "resource" {
				after["title"] = e.Title
				after["description"] = ""
			} else {
				members := []string{}
				for _, key := range e.Resources {
					members = append(members, ids[key])
				}
				after["name"] = e.Name
				after["pageTitle"] = e.Name
				after["description"] = ""
				after["footerContent"] = ""
				after["resources"] = members
				after["sort"] = e.Sort
				after["visible_on_questions_and_answers"] = e.Visible
				after["showQuickExit"] = e.ShowQuickExit
			}
			addOp(group.name, id, e.SourceKey, vals(after))
		}
	}
	// Explicit remaps are narrow and leave all other question/study fields untouched.
	for _, r := range b.RelationRemaps {
		if r.Collection != "questions" && r.Collection != "studySettings" {
			return nil, fmt.Errorf("unsupported relation remap collection")
		}
		if !contains(fields(r.Collection), r.Field) || ids[r.Target] == "" {
			return nil, fmt.Errorf("invalid remap")
		}
		before := snapshot[r.Collection][r.ID]
		if before == nil {
			return nil, fmt.Errorf("remap record missing")
		}
		after := withoutMeta(before)
		after[r.Field] = ids[r.Target]
		// Multiple remaps for the same row are combined below.
		merged := false
		for i := range p.Operations {
			op := &p.Operations[i]
			if op.Collection == r.Collection && op.ID == r.ID {
				op.After[r.Field] = ids[r.Target]
				merged = true
			}
		}
		if !merged {
			addOp(r.Collection, r.ID, "", after)
		}
	}
	if id := ids["after-treatment"]; id != "" {
		for sid, v := range snapshot["studySettings"] {
			found := false
			for i := range p.Operations {
				op := &p.Operations[i]
				if op.Collection == "studySettings" && op.ID == sid {
					op.After["afterTreatmentCollection"] = id
					found = true
				}
			}
			if !found {
				after := withoutMeta(v)
				after["afterTreatmentCollection"] = id
				addOp("studySettings", sid, "", after)
			}
		}
		if len(snapshot["studySettings"]) == 0 {
			issue("missing-study-settings", "No studySettings record to bind the after-treatment collection")
		}
	}
	retired := map[string]bool{}
	for _, r := range b.Retirements {
		if r.Collection != "resource" && r.Collection != "resourceCollection" {
			return nil, fmt.Errorf("invalid retirement collection")
		}
		before := snapshot[r.Collection][r.ID]
		if before == nil {
			return nil, fmt.Errorf("retirement record missing")
		}
		if claimed[r.Collection+"/"+r.ID] != "" {
			return nil, fmt.Errorf("cannot retire a source section still in the bundle")
		}
		after := withoutMeta(before)
		after["archived"] = true
		if r.Collection == "resourceCollection" {
			after["visible_on_questions_and_answers"] = false
			after["resources"] = []string{}
		}
		addOp(r.Collection, r.ID, "", after)
		retired[r.Collection+"/"+r.ID] = true
	}
	// Simulate final graph to check missing coverage and dangling relations before any write.
	future := Snapshot{}
	_ = jsonCopy(snapshot, &future)
	for _, op := range p.Operations {
		future[op.Collection][op.ID] = op.After
	}
	refs := map[string][]string{}
	collectionRefs := map[string][]string{}
	for id, v := range future["resourceCollection"] {
		if v["archived"] == true {
			continue
		}
		for _, r := range arr(v["resources"]) {
			refs[str(r)] = append(refs[str(r)], "resourceCollection/"+id)
		}
	}
	for id, v := range future["questions"] {
		if r := str(v["resource"]); r != "" {
			refs[r] = append(refs[r], "questions/"+id)
		}
		if c := str(v["resourceCollection"]); c != "" {
			collectionRefs[c] = append(collectionRefs[c], "questions/"+id)
		}
	}
	for id, v := range future["studySettings"] {
		for _, f := range fields("studySettings") {
			if c := str(v[f]); c != "" {
				collectionRefs[c] = append(collectionRefs[c], "studySettings/"+id+"."+f)
			}
		}
	}
	for id := range refs {
		sort.Strings(refs[id])
	}
	for id := range collectionRefs {
		sort.Strings(collectionRefs[id])
	}
	for id, uses := range refs {
		v := future["resource"][id]
		if v == nil || v["archived"] == true {
			issue("dangling-resource", fmt.Sprintf("%s is absent/archived but referenced by %v", id, uses))
		}
	}
	for id, uses := range collectionRefs {
		v := future["resourceCollection"][id]
		if v == nil || v["archived"] == true {
			issue("dangling-collection", fmt.Sprintf("%s is absent/archived but referenced by %v", id, uses))
		}
	}
	for id, v := range snapshot["resource"] {
		status := "unreferenced"
		uses := refs[id]
		if claimed["resource/"+id] != "" {
			status = "mapped"
		} else if retired["resource/"+id] || v["archived"] == true {
			status = "retired"
		} else if len(uses) > 0 {
			status = "missing-from-document"
			issue("coverage-gap", fmt.Sprintf("%s (%s) is not sourced from Word; referenced by %v", id, str(v["title"]), uses))
		}
		if v["managedBy"] == Owner && claimed["resource/"+id] == "" && !retired["resource/"+id] && v["archived"] != true {
			issue("removed-section", "Previously imported section needs explicit retirement: "+id)
		}
		sort.Strings(uses)
		p.Coverage = append(p.Coverage, Coverage{ID: id, Title: str(v["title"]), Disposition: status, References: uses})
	}
	for id, v := range future["resourceCollection"] {
		if v["archived"] == true {
			continue
		}
		if v["managedBy"] == Owner && claimed["resourceCollection/"+id] == "" {
			issue("removed-collection", "Previously imported collection needs explicit retirement: "+id)
		}
		if claimed["resourceCollection/"+id] == "" && (str(v["description"]) != "" || str(v["footerContent"]) != "") {
			issue("collection-copy-gap", "Collection introduction/footer is not sourced from Word: "+id)
		}
	}
	sort.Slice(p.Coverage, func(i, j int) bool { return p.Coverage[i].ID < p.Coverage[j].ID })
	sort.Slice(p.Issues, func(i, j int) bool { return Hash(p.Issues[i]) < Hash(p.Issues[j]) })
	sort.Slice(p.Operations, func(i, j int) bool {
		a, b := p.Operations[i], p.Operations[j]
		return a.Collection+"/"+a.ID < b.Collection+"/"+b.ID
	})
	return p, nil
}
func jsonCopy(a, b any) error { return unmarshalNormalized(a, b) }
func findRecord(app core.App, c, id string) (*core.Record, error) {
	r, e := app.FindRecordById(c, id)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	return r, e
}

// Source locators are review metadata; paragraph movement alone must not rewrite content.
func stripSource(v any) any {
	switch x := v.(type) {
	case map[string]any:
		y := Values{}
		for k, val := range x {
			if k != "source" {
				y[k] = stripSource(val)
			}
		}
		return y
	case []any:
		y := []any{}
		for _, val := range x {
			y = append(y, stripSource(val))
		}
		return y
	}
	return v
}
func usedLinks(content Values, all Values) Values {
	out := Values{}
	var visit func(any)
	visit = func(v any) {
		switch x := v.(type) {
		case map[string]any:
			if key := str(x["target"]); key != "" {
				out[key] = all[key]
			}
			for _, val := range x {
				visit(val)
			}
		case []any:
			for _, val := range x {
				visit(val)
			}
		}
	}
	visit(content)
	return out
}

var metadataFields = []string{"importBaseline", "contentHash", "sourceDocumentHash", "importRun"}

func metadataValues(v Values) Values {
	if v == nil {
		return nil
	}
	out := Values{}
	for _, k := range metadataFields {
		out[k] = v[k]
	}
	return out
}
