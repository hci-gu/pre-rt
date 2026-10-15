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

	t.Run("follow-up import and scheduler binding are atomic and repeatable", func(t *testing.T) {
		followup, err := os.ReadFile("../../../content/questionnaires/follow-up-3-months.json")
		if err != nil {
			t.Fatal(err)
		}
		const formID = "355082bf942bf57"
		if _, err := ApplyFollowup(app, followup, formID); err == nil {
			t.Fatal("missing settings must fail")
		}
		if _, err := app.FindRecordById("questionnaires", formID); err == nil {
			t.Fatal("failed binding left a partial import")
		}
		collection, _ := app.FindCollectionByNameOrId("resourceCollection")
		about := core.NewRecord(collection)
		about.Set("name", "Test study information")
		if err := app.Save(about); err != nil {
			t.Fatal(err)
		}
		collection, _ = app.FindCollectionByNameOrId("studySettings")
		settings := core.NewRecord(collection)
		settings.Set("key", "default")
		settings.Set("baselineQuestionnaire", "u6917wm639q1d01")
		settings.Set("dailyQuestionnaire", "sdzkpd49ndccf5b")
		settings.Set("treatmentEndQuestionnaire", "p8ow7xj8h4uuv43")
		settings.Set("treatmentEndQuestion", "242u8ha0yn8m06d")
		settings.Set("aboutCollection", about.Id)
		if err := app.Save(settings); err != nil {
			t.Fatal(err)
		}
		if _, err := ApplyFollowup(app, followup, "u6917wm639q1d01"); err == nil {
			t.Fatal("unrelated form accepted")
		}
		if changed, err := ApplyFollowup(app, followup, formID); err != nil || changed != 26 {
			t.Fatalf("changed=%d err=%v", changed, err)
		}
		if changed, err := ApplyFollowup(app, followup, formID); err != nil || changed != 0 {
			t.Fatalf("repeat changed=%d err=%v", changed, err)
		}
		settings, _ = app.FindRecordById("studySettings", settings.Id)
		if settings.GetString("followupQuestionnaire") != formID {
			t.Fatal("scheduler not configured")
		}
	})
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
