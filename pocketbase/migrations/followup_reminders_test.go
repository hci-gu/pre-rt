package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"testing"
)

func TestFollowupMigrationPreservesDeliveryHistory(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	save := func(m core.Model) {
		t.Helper()
		if err := app.Save(m); err != nil {
			t.Fatal(err)
		}
	}
	record := func(table string) *core.Record {
		t.Helper()
		c, err := app.FindCollectionByNameOrId(table)
		if err != nil {
			t.Fatal(err)
		}
		return core.NewRecord(c)
	}
	q := record("questions")
	q.Set("type", "date")
	save(q)
	form := record("questionnaires")
	form.Id = "355082bf942bf57"
	form.Set("questions", []string{q.Id})
	save(form)
	about := record("resourceCollection")
	save(about)
	config := record("studySettings")
	config.Set("key", "default")
	for _, field := range []string{"baselineQuestionnaire", "dailyQuestionnaire", "treatmentEndQuestionnaire"} {
		config.Set(field, form.Id)
	}
	config.Set("treatmentEndQuestion", q.Id)
	config.Set("aboutCollection", about.Id)
	save(config)
	if err := ensureFollowupReminders(app); err != nil {
		t.Fatal(err)
	}
	config, _ = app.FindRecordById("studySettings", config.Id)
	if config.GetString("followupQuestionnaire") != form.Id {
		t.Fatal("existing reviewed form not bound")
	}
	user := record("users")
	user.SetRandomPassword()
	save(user)
	delivery := record("followupReminders")
	delivery.Set("user", user.Id)
	delivery.Set("questionnaire", form.Id)
	delivery.Set("status", "sent")
	for _, field := range []string{"treatmentEnd", "dueDate", "attemptedAt", "sentAt"} {
		delivery.Set(field, "2026-10-08")
	}
	delivery.Set("attempts", 1)
	save(delivery)
	other := record("questionnaires")
	save(other)
	config.Set("followupQuestionnaire", other.Id)
	save(config)
	if err := ensureFollowupReminders(app); err != nil {
		t.Fatal(err)
	}
	config, _ = app.FindRecordById("studySettings", config.Id)
	if config.GetString("followupQuestionnaire") != other.Id {
		t.Fatal("admin selection overwritten")
	}
	saved, err := app.FindRecordById("followupReminders", delivery.Id)
	if err != nil || saved.GetString("status") != "sent" || saved.GetString("user") != user.Id || saved.GetInt("attempts") != 1 {
		t.Fatal("delivery history lost", err)
	}
	duplicate := record("followupReminders")
	for _, field := range []string{"user", "questionnaire", "status", "treatmentEnd", "dueDate", "attemptedAt"} {
		duplicate.Set(field, saved.Get(field))
	}
	if err := app.Save(duplicate); err == nil {
		t.Fatal("duplicate invitation allowed")
	}
}
