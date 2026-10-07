package resourceimport

import (
	"fmt"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
	"os"
	"path/filepath"
	"sort"
)

func ReviewTarget(app core.App) bool {
	b, e := os.ReadFile(filepath.Join(app.DataDir(), ".resource-review"))
	return e == nil && string(b) == "isolated resource content review\n"
}
func StageAssets(app core.App, b *Bundle, path string) error {
	collection, err := app.FindCollectionByNameOrId("resourceAsset")
	if err != nil {
		return err
	}
	for _, asset := range b.Assets {
		local, err := assetPath(path, asset)
		if err != nil {
			return err
		}
		id := stableID("asset", asset.Key)
		existing, err := findRecord(app, "resourceAsset", id)
		if err != nil {
			return err
		}
		if existing != nil {
			if existing.GetString("sourceKey") != asset.Key {
				return fmt.Errorf("asset ID collision")
			}
			if err := verifyAsset(app, existing, asset.Key); err != nil {
				return err
			}
			continue
		}
		file, err := filesystem.NewFileFromPath(local)
		if err != nil {
			return err
		}
		record := core.NewRecord(collection)
		record.Id = id
		record.Set("sourceKey", asset.Key)
		record.Set("file", file)
		record.Set("metadata", asset)
		if err = app.Save(record); err != nil {
			return err
		}
		if err = verifyAsset(app, record, asset.Key); err != nil {
			return err
		}
	}
	return nil
}
func verifyAsset(app core.App, r *core.Record, hash string) error {
	fs, err := app.NewFilesystem()
	if err != nil {
		return err
	}
	defer fs.Close()
	reader, err := fs.GetFile(r.BaseFilesPath() + "/" + r.GetString("file"))
	if err != nil {
		return err
	}
	defer reader.Close()
	data, err := readAllLimited(reader, 20<<20)
	if err != nil {
		return err
	}
	if HashBytes(data) != hash {
		return fmt.Errorf("stored asset hash mismatch: %s", hash)
	}
	return nil
}
func Apply(app core.App, p *Plan) (string, error) {
	target, _ := filepath.Abs(app.DataDir())
	if p.Version != 1 || p.Target != target {
		return "", fmt.Errorf("plan belongs to a different target")
	}
	if p.Review && !ReviewTarget(app) {
		return "", fmt.Errorf("draft imports require an isolated init-review database")
	}
	if !p.Review {
		for _, issue := range p.Issues {
			if issue.Blocking {
				return "", fmt.Errorf("publication blocked: %s: %s", issue.Code, issue.Message)
			}
		}
	}
	if p.RollbackOf == "" {
		current, err := BuildPlan(app, p.BundlePath, p.Review, p.PreferSource)
		if err != nil {
			return "", err
		}
		if Hash(current) != Hash(p) {
			return "", fmt.Errorf("plan is stale or modified; regenerate and review it")
		}
	} else {
		current, err := RollbackPlan(app, p.RollbackOf)
		if err != nil {
			return "", err
		}
		if Hash(current) != Hash(p) {
			return "", fmt.Errorf("rollback plan is stale or modified")
		}
	}
	if len(p.Operations) == 0 {
		return "unchanged", nil
	}
	var bundle Bundle
	if p.RollbackOf == "" {
		if err := ReadJSON(p.BundlePath, &bundle); err != nil {
			return "", err
		}
		if !p.Review {
			if issues := publicationIssues(&bundle); len(issues) > 0 {
				return "", fmt.Errorf("publication blocked: %s", issues[0].Message)
			}
		}
		if err := StageAssets(app, &bundle, p.BundlePath); err != nil {
			return "", err
		}
	}
	runID := ""
	err := app.RunInTransaction(func(tx core.App) error {
		current, err := ReadSnapshot(tx)
		if err != nil {
			return err
		}
		if Hash(current) != p.StateHash {
			return fmt.Errorf("target content changed since plan; no records applied")
		}
		collection, err := tx.FindCollectionByNameOrId("resourceImportRun")
		if err != nil {
			return err
		}
		run := core.NewRecord(collection)
		run.Set("bundleHash", p.BundleHash)
		run.Set("sourceDocumentHash", bundle.SourceDocumentHash)
		run.Set("manifestHash", bundle.ManifestHash)
		run.Set("parserVersion", bundle.ParserVersion)
		run.Set("target", p.Target)
		status := "applied"
		if p.Review {
			status = "review"
		}
		if p.RollbackOf != "" {
			status = "rollback"
		}
		run.Set("status", status)
		// Relations point to resources first, then collections, then question/settings rows.
		ops := append([]Operation{}, p.Operations...)
		priority := map[string]int{"resource": 0, "resourceCollection": 1, "questions": 2, "studySettings": 3}
		sort.SliceStable(ops, func(i, j int) bool { return priority[ops[i].Collection] < priority[ops[j].Collection] })
		if err = tx.Save(run); err != nil {
			return err
		}
		runID = run.Id
		for _, op := range ops {
			if len(fields(op.Collection)) == 0 {
				return fmt.Errorf("unsupported operation collection")
			}
			r, err := findRecord(tx, op.Collection, op.ID)
			if err != nil {
				return err
			}
			if r == nil {
				c, err := tx.FindCollectionByNameOrId(op.Collection)
				if err != nil {
					return err
				}
				r = core.NewRecord(c)
				r.Id = op.ID
			}
			for key, value := range op.After {
				if !contains(fields(op.Collection), key) {
					return fmt.Errorf("unsupported write field %s", key)
				}
				r.Set(key, value)
			}
			if op.Collection == "resource" || op.Collection == "resourceCollection" {
				r.Set("contentHash", Hash(op.After))
				r.Set("importBaseline", op.After)
				r.Set("importRun", run.Id)
				r.Set("sourceDocumentHash", bundle.SourceDocumentHash)
				if op.RestoreMetadata != nil {
					for _, k := range metadataFields {
						r.Set(k, op.RestoreMetadata[k])
					}
				}
			}
			if err = tx.Save(r); err != nil {
				return fmt.Errorf("%s/%s: %w", op.Collection, op.ID, err)
			}
			if Hash(recordValues(r, fields(op.Collection))) != Hash(op.After) {
				return fmt.Errorf("readback differs for %s/%s", op.Collection, op.ID)
			}
		}
		run.Set("receipt", p)
		return tx.Save(run)
	})
	if err != nil {
		return runID, fmt.Errorf("import error (inspect receipt %s before retry): %w", runID, err)
	}
	if err = Verify(app, runID); err != nil {
		return runID, err
	}
	return runID, nil
}
func Verify(app core.App, id string) error {
	r, err := app.FindRecordById("resourceImportRun", id)
	if err != nil {
		return err
	}
	var p Plan
	if err = unmarshalNormalized(r.Get("receipt"), &p); err != nil {
		return err
	}
	for _, op := range p.Operations {
		current, err := app.FindRecordById(op.Collection, op.ID)
		if err != nil {
			return err
		}
		if Hash(recordValues(current, fields(op.Collection))) != Hash(op.After) {
			return fmt.Errorf("record no longer matches run: %s/%s", op.Collection, op.ID)
		}
	}
	assets, err := app.FindAllRecords("resourceAsset")
	if err != nil {
		return err
	}
	for _, a := range assets {
		if err = verifyAsset(app, a, a.GetString("sourceKey")); err != nil {
			return err
		}
	}
	return nil
}
func RollbackPlan(app core.App, id string) (*Plan, error) {
	if err := Verify(app, id); err != nil {
		return nil, fmt.Errorf("cannot restore over newer edits: %w", err)
	}
	r, err := app.FindRecordById("resourceImportRun", id)
	if err != nil {
		return nil, err
	}
	var original Plan
	if err = unmarshalNormalized(r.Get("receipt"), &original); err != nil {
		return nil, err
	}
	snapshot, err := ReadSnapshot(app)
	if err != nil {
		return nil, err
	}
	target, _ := filepath.Abs(app.DataDir())
	p := &Plan{Version: 1, Target: target, StateHash: Hash(snapshot), Review: original.Review, RollbackOf: id, Operations: []Operation{}, Issues: []Issue{}}
	for _, op := range original.Operations {
		after := op.Before
		if after == nil {
			after = vals(op.After)
			after["archived"] = true
			if op.Collection == "resourceCollection" {
				after["resources"] = []string{}
				after["visible_on_questions_and_answers"] = false
			}
		}
		p.Operations = append(p.Operations, Operation{Collection: op.Collection, ID: op.ID, Key: op.Key, Before: op.After, After: after, Kind: "restore", MetadataBefore: metadataValues(snapshot[op.Collection][op.ID]), RestoreMetadata: op.MetadataBefore})
	}
	// New inbound links not part of the original run must not be broken by rollback.
	retiring := map[string]bool{}
	for _, op := range p.Operations {
		if op.After["archived"] == true {
			retiring[op.ID] = true
		}
	}
	future := Snapshot{}
	_ = jsonCopy(snapshot, &future)
	for _, op := range p.Operations {
		future[op.Collection][op.ID] = op.After
	}
	for _, name := range []string{"resourceCollection", "questions", "studySettings"} {
		for id, v := range future[name] {
			if v["archived"] == true {
				continue
			}
			for _, f := range []string{"resources", "resource", "resourceCollection", "aboutCollection", "afterTreatmentCollection"} {
				targets := arr(v[f])
				if s := str(v[f]); s != "" {
					targets = append(targets, s)
				}
				for _, t := range targets {
					if retiring[str(t)] {
						return nil, fmt.Errorf("rollback would break %s/%s.%s", name, id, f)
					}
				}
			}
		}
	}
	return p, nil
}
