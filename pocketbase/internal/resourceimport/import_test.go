package resourceimport

import (
	"encoding/base64"
	"errors"
	"github.com/pocketbase/pocketbase/core"
	_ "github.com/pocketbase/pocketbase/migrations"
	"os"
	"path/filepath"
	"testing"
)

func fixture(t *testing.T) (core.App, string) {
	t.Helper()
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if e := app.Bootstrap(); e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	r := core.NewBaseCollection("resource")
	r.Fields.Add(&core.TextField{Name: "title"}, &core.EditorField{Name: "description"})
	if e := app.Save(r); e != nil {
		t.Fatal(e)
	}
	c := core.NewBaseCollection("resourceCollection")
	c.Fields.Add(&core.TextField{Name: "name"}, &core.TextField{Name: "pageTitle"}, &core.EditorField{Name: "description"}, &core.EditorField{Name: "footerContent"}, &core.RelationField{Name: "resources", CollectionId: r.Id, MaxSelect: 999}, &core.NumberField{Name: "sort"}, &core.BoolField{Name: "visible_on_questions_and_answers"}, &core.BoolField{Name: "showQuickExit"})
	if e := app.Save(c); e != nil {
		t.Fatal(e)
	}
	q := core.NewBaseCollection("questions")
	q.Fields.Add(&core.RelationField{Name: "resource", CollectionId: r.Id, MaxSelect: 1}, &core.RelationField{Name: "resourceCollection", CollectionId: c.Id, MaxSelect: 1})
	if e := app.Save(q); e != nil {
		t.Fatal(e)
	}
	s := core.NewBaseCollection("studySettings")
	s.Fields.Add(&core.RelationField{Name: "aboutCollection", CollectionId: c.Id, MaxSelect: 1})
	if e := app.Save(s); e != nil {
		t.Fatal(e)
	}
	if e := EnsureSchema(app); e != nil {
		t.Fatal(e)
	}
	a := core.NewBaseCollection("answers")
	a.Fields.Add(&core.TextField{Name: "sentinel"})
	if e := app.Save(a); e != nil {
		t.Fatal(e)
	}
	answer := core.NewRecord(a)
	answer.Set("sentinel", "must remain untouched")
	if e := app.Save(answer); e != nil {
		t.Fatal(e)
	}
	data, _ := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==")
	sha := HashBytes(data)
	path := filepath.Join(t.TempDir(), "bundle.json")
	if e := os.MkdirAll(filepath.Join(filepath.Dir(path), "assets"), 0700); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(filepath.Join(filepath.Dir(path), "assets", sha+".png"), data, 0600); e != nil {
		t.Fatal(e)
	}
	content := Values{"schemaVersion": float64(1), "audience": Values{}, "blocks": []any{Values{"type": "paragraph", "inline": []any{Values{"text": "Exact original wording"}}}, Values{"type": "image", "asset": sha, "alt": "Example"}}}
	b := Bundle{SchemaVersion: 1, ParserVersion: "test", SourceDocumentHash: Hash("doc"), ManifestHash: Hash("manifest"), Resources: []Entry{{SourceKey: "one.answer", Title: "First title", TitleHistory: []string{"First title"}, Collection: "one", Content: content}}, Collections: []Entry{{SourceKey: "one", Name: "Category", Resources: []string{"one.answer"}, Visible: true, Content: Values{"schemaVersion": float64(1), "audience": Values{}, "blocks": []any{}, "footer": []any{}}}}, Assets: []Asset{{Key: sha, Path: "assets/" + sha + ".png", MediaType: "image/png", Width: 1, Height: 1}}}
	if e := WriteJSON(path, b); e != nil {
		t.Fatal(e)
	}
	return app, path
}
func plan(t *testing.T, app core.App, path string) *Plan {
	t.Helper()
	p, e := BuildPlan(app, path, false, nil)
	if e != nil {
		t.Fatal(e)
	}
	return p
}
func apply(t *testing.T, app core.App, p *Plan) string {
	t.Helper()
	id, e := Apply(app, p)
	if e != nil {
		t.Fatal(e)
	}
	return id
}
func mutate(t *testing.T, path string, fn func(*Bundle)) {
	t.Helper()
	var b Bundle
	if e := ReadJSON(path, &b); e != nil {
		t.Fatal(e)
	}
	fn(&b)
	if e := WriteJSON(path, b); e != nil {
		t.Fatal(e)
	}
}
func TestImportIdempotenceRenameConflictAndRollback(t *testing.T) {
	app, path := fixture(t)
	p := plan(t, app, path)
	p2 := plan(t, app, path)
	if Hash(p) != Hash(p2) {
		t.Fatal("non-deterministic plan")
	}
	first := apply(t, app, p)
	r, e := app.FindFirstRecordByData("resource", "sourceKey", "one.answer")
	if e != nil {
		t.Fatal(e)
	}
	id := r.Id
	updated := r.GetString("updated")
	if p := plan(t, app, path); len(p.Operations) != 0 {
		t.Fatalf("reapply would write: %+v", p.Operations)
	}
	if got := apply(t, app, plan(t, app, path)); got != "unchanged" {
		t.Fatal(got)
	}
	mutate(t, path, func(b *Bundle) { b.SourceDocumentHash = Hash("metadata-only") })
	if len(plan(t, app, path).Operations) != 0 {
		t.Fatal("metadata-only document save rewrites content")
	}
	mutate(t, path, func(b *Bundle) { b.Resources[0].Title = "Renamed title" })
	rename := apply(t, app, plan(t, app, path))
	r, _ = app.FindRecordById("resource", id)
	if r.GetString("title") != "Renamed title" {
		t.Fatal("rename failed")
	}
	if !containsStrings(r.Get("aliases"), "first-title") {
		t.Fatal("lost old deep-link alias")
	}
	if updated != "" && r.GetString("updated") == updated {
		t.Log("timestamp resolution did not advance; identity retained")
	}
	rollback, e := RollbackPlan(app, rename)
	if e != nil {
		t.Fatal(e)
	}
	apply(t, app, rollback)
	r, _ = app.FindRecordById("resource", id)
	if r.GetString("title") != "First title" {
		t.Fatal("rollback did not restore title")
	}
	if r.GetString("importRun") != first || r.GetString("sourceDocumentHash") != Hash("doc") {
		t.Fatal("rollback did not restore prior import provenance")
	}
	// An independent edit is detected even when the DOCX is unchanged.
	r.Set("title", "Edited outside importer")
	if e = app.Save(r); e != nil {
		t.Fatal(e)
	}
	conflict := plan(t, app, path)
	if !hasIssue(conflict, "database-conflict") {
		t.Fatal("missed external edit")
	}
	if _, e = Apply(app, conflict); e == nil {
		t.Fatal("applied conflicting import")
	}
	if _, e = RollbackPlan(app, first); e == nil {
		t.Fatal("rollback overwrote later edits")
	}
	answers, _ := app.FindAllRecords("answers")
	if len(answers) != 1 || answers[0].GetString("sentinel") != "must remain untouched" {
		t.Fatal("changed participant data")
	}
}
func containsStrings(v any, s string) bool {
	for _, x := range arr(v) {
		if str(x) == s {
			return true
		}
	}
	return false
}
func hasIssue(p *Plan, code string) bool {
	for _, i := range p.Issues {
		if i.Code == code && i.Blocking {
			return true
		}
	}
	return false
}
func TestStalePlansAndAtomicFailure(t *testing.T) {
	app, path := fixture(t)
	p := plan(t, app, path)
	c, _ := app.FindCollectionByNameOrId("questions")
	q := core.NewRecord(c)
	if e := app.Save(q); e != nil {
		t.Fatal(e)
	}
	if _, e := Apply(app, p); e == nil {
		t.Fatal("accepted stale plan")
	}
	p = plan(t, app, path)
	app.OnRecordCreate("resourceCollection").BindFunc(func(e *core.RecordEvent) error { return errors.New("injected collection write failure") })
	if _, e := Apply(app, p); e == nil {
		t.Fatal("expected failure")
	}
	for _, name := range []string{"resource", "resourceCollection", "resourceImportRun"} {
		records, _ := app.FindAllRecords(name)
		if len(records) != 0 {
			t.Fatalf("partial transaction persisted %s", name)
		}
	}
	assets, _ := app.FindAllRecords("resourceAsset")
	if len(assets) != 1 {
		t.Fatal("staged asset should be retained for retry")
	}
}
func TestRetirementProtectsQuestionLinksAndSupportsExplicitRemap(t *testing.T) {
	app, path := fixture(t)
	apply(t, app, plan(t, app, path))
	old, _ := app.FindFirstRecordByData("resource", "sourceKey", "one.answer")
	qcol, _ := app.FindCollectionByNameOrId("questions")
	q := core.NewRecord(qcol)
	q.Set("resource", old.Id)
	if e := app.Save(q); e != nil {
		t.Fatal(e)
	}
	mutate(t, path, func(b *Bundle) {
		b.Resources[0].SourceKey = "one.replacement"
		b.Resources[0].Title = "Replacement"
		b.Collections[0].Resources = []string{"one.replacement"}
		b.Retirements = []Retirement{{Collection: "resource", ID: old.Id}}
	})
	if !hasIssue(plan(t, app, path), "dangling-resource") {
		t.Fatal("retired live questionnaire answer")
	}
	mutate(t, path, func(b *Bundle) {
		b.RelationRemaps = []Remap{{Collection: "questions", ID: q.Id, Field: "resource", Target: "one.replacement"}}
	})
	id := apply(t, app, plan(t, app, path))
	q, _ = app.FindRecordById("questions", q.Id)
	if q.GetString("resource") == old.Id {
		t.Fatal("question not remapped")
	}
	restored, e := RollbackPlan(app, id)
	if e != nil {
		t.Fatal(e)
	}
	apply(t, app, restored)
	q, _ = app.FindRecordById("questions", q.Id)
	if q.GetString("resource") != old.Id {
		t.Fatal("rollback lost original relation")
	}
}
func TestDraftCannotPublishAndAssetsAreVerified(t *testing.T) {
	app, path := fixture(t)
	mutate(t, path, func(b *Bundle) { b.Issues = []Issue{{Code: "timing", Message: "Author decision", Blocking: true}} })
	if _, e := Apply(app, plan(t, app, path)); e == nil {
		t.Fatal("published draft")
	}
	p, e := BuildPlan(app, path, true, nil)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = Apply(app, p); e == nil {
		t.Fatal("draft bypass without isolated marker")
	}
	if e = os.WriteFile(filepath.Join(app.DataDir(), ".resource-review"), []byte("isolated resource content review\n"), 0600); e != nil {
		t.Fatal(e)
	}
	apply(t, app, p)
	var b Bundle
	_ = ReadJSON(path, &b)
	_ = os.WriteFile(filepath.Join(filepath.Dir(path), b.Assets[0].Path), []byte("corrupt"), 0600)
	if _, e = BuildPlan(app, path, true, nil); e == nil {
		t.Fatal("accepted corrupt asset")
	}
}
func TestRejectUnsafeContentAndDuplicateKeys(t *testing.T) {
	for _, mode := range []string{"javascript", "duplicate", "unknown-block"} {
		t.Run(mode, func(t *testing.T) {
			app, path := fixture(t)
			mutate(t, path, func(b *Bundle) {
				switch mode {
				case "javascript":
					b.Resources[0].Content["blocks"] = []any{Values{"type": "linkButton", "inline": []any{Values{"text": "Bad"}}, "href": "javascript:alert(1)"}}
				case "duplicate":
					b.Resources = append(b.Resources, b.Resources[0])
				case "unknown-block":
					b.Resources[0].Content["blocks"] = []any{Values{"type": "script"}}
				}
			})
			if _, e := BuildPlan(app, path, false, nil); e == nil {
				t.Fatal("accepted invalid content")
			}
		})
	}
}

func TestVideoPlaceholderRequiresExplicitFlagAndRetainsAltRequirement(t *testing.T) {
	app, path := fixture(t)
	mutate(t, path, func(b *Bundle) {
		block := b.Resources[0].Content["blocks"].([]any)[1].(map[string]any)
		block["type"] = "video"
		block["url"] = ""
	})
	p := plan(t, app, path)
	if _, err := Apply(app, p); err == nil {
		t.Fatal("unapproved missing video must block")
	}
	mutate(t, path, func(b *Bundle) {
		block := b.Resources[0].Content["blocks"].([]any)[1].(map[string]any)
		block["placeholder"] = true
	})
	p = plan(t, app, path)

	if _, err := Apply(app, p); err != nil {
		t.Fatal(err)
	}
	mutate(t, path, func(b *Bundle) {
		block := b.Resources[0].Content["blocks"].([]any)[1].(map[string]any)
		block["alt"] = ""
	})
	p = plan(t, app, path)

	if _, err := Apply(app, p); err == nil {
		t.Fatal("unreviewed image must not publish")
	}
}

func TestStudyCollectionUsesTargetAboutBinding(t *testing.T) {
	app, path := fixture(t)
	collection, _ := app.FindCollectionByNameOrId("resourceCollection")
	about := core.NewRecord(collection)
	about.Set("name", "Information om studien")
	about.Set("description", "<p>Existing study introduction</p>")
	if err := app.Save(about); err != nil {
		t.Fatal(err)
	}
	settingsCollection, _ := app.FindCollectionByNameOrId("studySettings")
	settings := core.NewRecord(settingsCollection)
	settings.Set("aboutCollection", about.Id)
	if err := app.Save(settings); err != nil {
		t.Fatal(err)
	}
	mutate(t, path, func(b *Bundle) {
		b.Collections[0].SourceKey = "study"
		b.Collections[0].ExistingID = "localabout00001"
		b.Resources[0].Collection = "study"
	})
	p := plan(t, app, path)
	if hasIssue(p, "collection-copy-gap") {
		t.Fatal("target About collection was not matched when the local ID was absent")
	}
	run := apply(t, app, p)
	if err := Verify(app, run); err != nil {
		t.Fatal(err)
	}
	imported, err := app.FindFirstRecordByData("resourceCollection", "sourceKey", "study")
	if err != nil || imported.Id != about.Id {
		t.Fatalf("did not preserve the target's About identity: %v", err)
	}
	settings, _ = app.FindRecordById("studySettings", settings.Id)
	if settings.GetString("aboutCollection") != about.Id {
		t.Fatal("changed the target's About binding")
	}
	if len(plan(t, app, path).Operations) != 0 {
		t.Fatal("reimport should be unchanged")
	}
}
