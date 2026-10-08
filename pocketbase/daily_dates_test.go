package main

import (
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

func TestDailyAnswerDateBoundaries(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	save := func(model core.Model) {
		t.Helper()
		if err := app.Save(model); err != nil {
			t.Fatal(err)
		}
	}
	users, _ := app.FindCollectionByNameOrId("users")
	users.Fields.Add(&core.TextField{Name: "type"}, &core.DateField{Name: "treatmentStart"}, &core.DateField{Name: "treatmentEnd"})
	save(users)
	user := core.NewRecord(users)
	user.SetEmail("dates@example.test")
	user.SetPassword("synthetic-password")
	save(user)
	settings := core.NewBaseCollection("studySettings")
	settings.Fields.Add(&core.TextField{Name: "key"}, &core.TextField{Name: "dailyQuestionnaire"})
	save(settings)
	config := core.NewRecord(settings)
	config.Set("key", "default")
	config.Set("dailyQuestionnaire", "daily")
	save(config)
	answers := core.NewBaseCollection("answers")
	answers.Fields.Add(&core.TextField{Name: "user"}, &core.TextField{Name: "questionnaire"}, &core.DateField{Name: "date"})
	save(answers)
	answer := core.NewRecord(answers)
	answer.Set("user", user.Id)
	// At this instant it is October 8 in Stockholm, even though UTC is October 7.
	now := time.Date(2026, 10, 7, 22, 30, 0, 0, time.UTC)
	for _, tc := range []struct {
		name, kind, start, end, day, form string
		allowed                           bool
	}{
		{"pre start inclusive", "PRE", "2026-09-15", "2026-09-30", "2026-09-01", "daily", true},
		{"pre before start", "PRE", "2026-09-15", "2026-09-30", "2026-08-31", "daily", false},
		{"pre end inclusive", "PRE", "2026-09-15", "2026-09-30", "2026-09-30", "daily", true},
		{"pre after end", "PRE", "2026-09-15", "2026-09-30", "2026-10-01", "daily", false},
		{"local today without end", "PRE", "2026-09-15", "", "2026-10-08", "daily", true},
		{"future without end", "PRE", "2026-09-15", "", "2026-10-09", "daily", false},
		{"missing start", "PRE", "", "", "2026-10-01", "daily", false},
		{"missing answer date", "PRE", "2026-09-15", "", "", "daily", false},
		{"post waiting for end", "POST", "2026-07-01", "", "2026-10-01", "daily", false},
		{"post before start", "POST", "2026-07-01", "2026-08-01", "2026-08-14", "daily", false},
		{"post start inclusive", "POST", "2026-07-01", "2026-08-01", "2026-08-15", "daily", true},
		{"post end inclusive", "POST", "2026-07-01", "2026-08-01", "2026-09-26", "daily", true},
		{"post after end", "POST", "2026-07-01", "2026-08-01", "2026-09-27", "daily", false},
		{"other questionnaire unaffected", "POST", "", "", "2026-10-09", "baseline", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			user.Set("type", tc.kind)
			user.Set("treatmentStart", tc.start)
			user.Set("treatmentEnd", tc.end)
			save(user)
			answer.Set("questionnaire", tc.form)
			answer.Set("date", tc.day)
			if err := validateDailyAnswerDate(app, answer, now); (err == nil) != tc.allowed {
				t.Fatalf("allowed=%v; error=%v", tc.allowed, err)
			}
		})
	}
}
