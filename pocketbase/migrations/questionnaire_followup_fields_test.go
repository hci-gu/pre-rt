package migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestQuestionnaireFollowupFieldsPreserveExistingData(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	questions := core.NewBaseCollection("questions")
	forms := core.NewBaseCollection("questionnaires")
	forms.Fields.Add(&core.TextField{Name: "introText"})
	for _, collection := range []*core.Collection{questions, forms} {
		if err := app.Save(collection); err != nil {
			t.Fatal(err)
		}
	}
	gate := core.NewRecord(questions)
	if err := app.Save(gate); err != nil {
		t.Fatal(err)
	}
	baseline := core.NewRecord(forms)
	baseline.Set("introText", "Keep local presentation")
	if err := app.Save(baseline); err != nil {
		t.Fatal(err)
	}
	if err := ensureQuestionnaireFollowupFields(app); err != nil {
		t.Fatal(err)
	}
	forms, err := app.FindCollectionByNameOrId("questionnaires")
	if err != nil {
		t.Fatal(err)
	}
	followup := core.NewRecord(forms)
	followup.Set("dependency", []string{gate.Id})
	followup.Set("dependencyValue", "Ja")
	if err := app.Save(followup); err != nil {
		t.Fatal(err)
	}
	baseline, err = app.FindRecordById("questionnaires", baseline.Id)
	if err != nil {
		t.Fatal(err)
	}
	baseline.Set("followup", []string{followup.Id})
	if err := app.Save(baseline); err != nil {
		t.Fatal(err)
	}
	// Production/already-imported schemas must be an idempotent no-op.
	if err := ensureQuestionnaireFollowupFields(app); err != nil {
		t.Fatal(err)
	}
	baseline, _ = app.FindRecordById("questionnaires", baseline.Id)
	followup, _ = app.FindRecordById("questionnaires", followup.Id)
	if baseline.GetString("introText") != "Keep local presentation" ||
		len(baseline.GetStringSlice("followup")) != 1 || baseline.GetStringSlice("followup")[0] != followup.Id ||
		len(followup.GetStringSlice("dependency")) != 1 || followup.GetStringSlice("dependency")[0] != gate.Id ||
		followup.GetString("dependencyValue") != `"Ja"` {
		t.Fatal("migration changed existing questionnaire values")
	}
}
