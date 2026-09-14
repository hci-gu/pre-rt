package main

import (
	"myapp/internal/studysettings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestLoadStudySettings(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })

	questions := core.NewBaseCollection("questions")
	questions.Fields.Add(&core.TextField{Name: "type"})
	forms := core.NewBaseCollection("questionnaires")
	settings := core.NewBaseCollection("studySettings")
	for _, name := range []string{"key", "treatmentEndQuestionnaire", "treatmentEndQuestion"} {
		settings.Fields.Add(&core.TextField{Name: name})
	}
	save := func(model core.Model) {
		t.Helper()
		if err := app.Save(model); err != nil {
			t.Fatal(err)
		}
	}
	save(questions)
	forms.Fields.Add(&core.RelationField{Name: "questions", CollectionId: questions.Id, MaxSelect: 10})
	save(forms)
	save(settings)
	if _, err := studysettings.Load(app); err == nil {
		t.Fatal("missing configuration must fail, not fall back to a hardcoded form")
	}
	date := core.NewRecord(questions)
	date.Set("type", "date")
	save(date)
	form := core.NewRecord(forms)
	form.Set("questions", []string{date.Id})
	save(form)
	config := core.NewRecord(settings)
	config.Set("key", "default")
	config.Set("treatmentEndQuestionnaire", form.Id)
	config.Set("treatmentEndQuestion", date.Id)
	save(config)

	got, err := studysettings.Load(app)
	if err != nil || got.TreatmentEndQuestionnaire != form.Id || got.TreatmentEndQuestion != date.Id {
		t.Fatalf("must use configured IDs: got %+v, error %v", got, err)
	}
	replacement := core.NewRecord(forms)
	replacement.Set("questions", []string{date.Id})
	save(replacement)
	config.Set("treatmentEndQuestionnaire", replacement.Id)
	save(config)
	got, err = studysettings.Load(app)
	if err != nil || got.TreatmentEndQuestionnaire != replacement.Id {
		t.Fatalf("must reload edited relations: got %+v, error %v", got, err)
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	users.Fields.Add(&core.DateField{Name: "treatmentEnd"})
	save(users)
	user := core.NewRecord(users)
	user.SetEmail("study-settings@example.test")
	user.SetPassword("test-password-123456")
	save(user)
	answers := core.NewBaseCollection("answers")
	answers.Fields.Add(&core.TextField{Name: "questionnaire"}, &core.TextField{Name: "user"}, &core.JSONField{Name: "answers"})
	save(answers)
	answer := core.NewRecord(answers)
	answer.Set("user", user.Id)
	answer.Set("answers", map[string]string{date.Id: "2026-09-09"})
	answer.Set("questionnaire", form.Id)
	if err := studysettings.SyncTreatmentEnd(app, answer); err != nil {
		t.Fatal(err)
	}
	user, _ = app.FindRecordById("users", user.Id)
	if !user.GetDateTime("treatmentEnd").IsZero() {
		t.Fatal("the old questionnaire must not update treatmentEnd after reconfiguration")
	}
	answer.Set("questionnaire", replacement.Id)
	if err := studysettings.SyncTreatmentEnd(app, answer); err != nil {
		t.Fatal(err)
	}
	user, _ = app.FindRecordById("users", user.Id)
	if user.GetDateTime("treatmentEnd").Time().Format("2006-01-02") != "2026-09-09" {
		t.Fatal("the configured question's answer must update treatmentEnd")
	}
	replacement.Set("questions", []string{})
	save(replacement)
	if _, err := studysettings.Load(app); err == nil {
		t.Fatal("a question outside the configured form must be rejected")
	}
	replacement.Set("questions", []string{date.Id})
	save(replacement)
	date.Set("type", "text")
	save(date)
	if _, err := studysettings.Load(app); err == nil {
		t.Fatal("a non-date question must be rejected")
	}
}
