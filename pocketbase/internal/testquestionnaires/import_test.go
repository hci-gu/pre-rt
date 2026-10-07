package testquestionnaires

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	_ "github.com/pocketbase/pocketbase/migrations"
	_ "myapp/migrations"
)

func TestReviewedProductionGraphIsCompleteAtomicAndRepeatable(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	defer app.ResetBootstrapState()
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile("../../../content/questionnaires/production-20261007.json")
	if err != nil {
		t.Fatal(err)
	}
	var snapshot Snapshot
	if err = json.Unmarshal(raw, &snapshot); err != nil {
		t.Fatal(err)
	}
	// First create the graph so the resource publisher can validate inbound
	// question remaps. A missing help target must still block the final import.
	if changed, err := Prepare(app, raw); err != nil || changed == 0 {
		t.Fatalf("prepare changed=%d err=%v", changed, err)
	}
	if _, err := Apply(app, raw); err == nil {
		t.Fatal("strict import accepted missing help before resource publication")
	}
	// Simulate the publisher's stable identities without participant data.
	seen := map[string]bool{}
	for _, q := range snapshot.Records["questions"] {
		for table, key := range q["help"].(map[string]any) {
			identity := table + "/" + key.(string)
			if seen[identity] {
				continue
			}
			seen[identity] = true
			collection, err := app.FindCollectionByNameOrId(table)
			if err != nil {
				t.Fatal(err)
			}
			r := core.NewRecord(collection)
			r.Set("sourceKey", key)
			r.Set("title", key)
			r.Set("name", key)
			if err = app.Save(r); err != nil {
				t.Fatal(err)
			}
		}
	}
	changed, err := Apply(app, raw)
	if err != nil || changed == 0 {
		t.Fatalf("initial import changed=%d err=%v", changed, err)
	}
	changed, err = Apply(app, raw)
	if err != nil || changed != 0 {
		t.Fatalf("repeat import changed=%d err=%v", changed, err)
	}
	for table, count := range map[string]int{"questions": 86, "questionOptions": 23, "questionnaires": 6} {
		rows, err := app.FindAllRecords(table)
		if err != nil || len(rows) != count {
			t.Fatalf("%s count=%d err=%v", table, len(rows), err)
		}
	}
	question, _ := app.FindRecordById("questions", "c2xmobhywcotlrq")
	before := question.GetString("text")
	for _, q := range snapshot.Records["questions"] {
		q["text"] = "Should roll back"
	}
	snapshot.Records["questions"][len(snapshot.Records["questions"])-1]["help"] = map[string]any{"resource": "missing.source"}
	bad, _ := json.Marshal(snapshot)
	if _, err = Apply(app, bad); err == nil {
		t.Fatal("missing resource mapping accepted")
	}
	question, _ = app.FindRecordById("questions", question.Id)
	if question.GetString("text") != before {
		t.Fatal("failed import partially updated questions")
	}
	snapshot.Records["users"] = []map[string]any{{"id": "notallowed00000"}}
	bad, _ = json.Marshal(snapshot)
	if _, err = Apply(app, bad); err == nil {
		t.Fatal("participant collection accepted")
	}
}
