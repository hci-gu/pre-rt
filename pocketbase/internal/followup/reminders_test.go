package followup

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/pocketbase/pocketbase/core"
	_ "github.com/pocketbase/pocketbase/migrations"
	"myapp/internal/sms"
	_ "myapp/migrations"
)

func TestCalendarDueDate(t *testing.T) {
	location, err := time.LoadLocation("Europe/Stockholm")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct{ end, due string }{
		{"2026-07-08", "2026-10-08"}, {"2026-01-31", "2026-04-30"},
		{"2026-08-31", "2026-11-30"}, {"2025-11-30", "2026-02-28"},
		{"2023-11-30", "2024-02-29"}, {"2026-12-31", "2027-03-31"},
	} {
		t.Run(tc.end, func(t *testing.T) {
			end, _ := time.Parse(time.DateOnly, tc.end)
			due := DueDate(end, location)
			if due.Format(time.DateOnly) != tc.due || due.Hour() != 0 || due.Location() != location {
				t.Fatal(due)
			}
		})
	}
	// Sweden has already reached the due date although UTC is still the day before.
	end, _ := time.Parse(time.DateOnly, "2026-07-08")
	now, _ := time.Parse(time.RFC3339, "2026-10-07T22:00:00Z")
	if now.Before(DueDate(end, location)) {
		t.Fatal("must use Swedish calendar date")
	}
}

type fixture struct {
	app            core.App
	form, settings *core.Record
	now            time.Time
}

func setup(t *testing.T) fixture {
	t.Helper()
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	newRecord := func(table string) *core.Record {
		c, e := app.FindCollectionByNameOrId(table)
		if e != nil {
			t.Fatal(e)
		}
		return core.NewRecord(c)
	}
	q := newRecord("questions")
	q.Set("type", "date")
	q.Set("text", "Treatment end")
	save(t, app, q)
	form := newRecord("questionnaires")
	form.Set("name", "Follow-up")
	form.Set("occurrence", "once")
	form.Set("enabled", true)
	form.Set("questions", []string{q.Id})
	save(t, app, form)
	about := newRecord("resourceCollection")
	about.Set("name", "About")
	save(t, app, about)
	settings := newRecord("studySettings")
	settings.Set("key", "default")
	for _, name := range []string{"baselineQuestionnaire", "dailyQuestionnaire", "treatmentEndQuestionnaire", "followupQuestionnaire"} {
		settings.Set(name, form.Id)
	}
	settings.Set("treatmentEndQuestion", q.Id)
	settings.Set("aboutCollection", about.Id)
	save(t, app, settings)
	now, _ := time.Parse(time.RFC3339, "2026-10-08T16:00:00Z")
	return fixture{app, form, settings, now}
}
func save(t *testing.T, app core.App, m core.Model) {
	t.Helper()
	if err := app.Save(m); err != nil {
		t.Fatal(err)
	}
}
func (f fixture) user(t *testing.T, phone, end string) *core.Record {
	t.Helper()
	c, _ := f.app.FindCollectionByNameOrId("users")
	u := core.NewRecord(c)
	u.SetRandomPassword()
	u.Set("phoneNumber", phone)
	u.Set("treatmentEnd", end)
	save(t, f.app, u)
	return u
}
func (f fixture) answer(t *testing.T, userID, formID string) {
	t.Helper()
	c, _ := f.app.FindCollectionByNameOrId("answers")
	a := core.NewRecord(c)
	a.Set("user", userID)
	a.Set("questionnaire", formID)
	a.Set("answers", map[string]any{})
	save(t, f.app, a)
}
func (f fixture) runner(send func(string, string) error) Runner {
	return Runner{App: f.app, Send: send, WebURL: "https://study.example.test"}
}

func TestEligibilityCompletionAndPersistentDeduplication(t *testing.T) {
	f := setup(t)
	f.user(t, "MISSING-DATE", "")
	f.user(t, "NOT-YET", "2026-07-09")
	f.user(t, "FUTURE", "2027-01-01")
	f.user(t, "", "2026-07-01")
	f.user(t, "DUE", "2026-07-08")
	f.user(t, "OVERDUE", "2026-06-30")
	answered := f.user(t, "ANSWERED", "2026-07-01")
	f.answer(t, answered.Id, f.form.Id)
	other := f.user(t, "OTHER-FORM-ANSWERED", "2026-07-01")
	c, _ := f.app.FindCollectionByNameOrId("questionnaires")
	otherForm := core.NewRecord(c)
	save(t, f.app, otherForm)
	f.answer(t, other.Id, otherForm.Id)
	shared := f.user(t, "SHARED-TEST", "2026-07-01")
	phones := map[string]bool{}
	r := f.runner(func(phone, message string) error {
		phones[phone] = true
		if !strings.HasSuffix(message, "/forms/"+f.form.Id) {
			t.Error(message)
		}
		return nil
	})
	r.SkipUserID = shared.Id
	sent, err := r.Run(f.now)
	if err != nil || sent != 3 || !phones["DUE"] || !phones["OVERDUE"] || !phones["OTHER-FORM-ANSWERED"] {
		t.Fatalf("sent=%d phones=%v err=%v", sent, phones, err)
	}
	// A new runner after database re-bootstrap must see the persisted ledger.
	if err := f.app.ResetBootstrapState(); err != nil {
		t.Fatal(err)
	}
	if err := f.app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	r = f.runner(func(string, string) error { t.Fatal("duplicate send after restart"); return nil })
	r.SkipUserID = shared.Id
	if sent, err = r.Run(f.now.Add(time.Hour)); err != nil || sent != 0 {
		t.Fatalf("sent=%d err=%v", sent, err)
	}
	rows, _ := f.app.FindAllRecords("followupReminders")
	if len(rows) != 3 {
		t.Fatal(len(rows))
	}
	for _, row := range rows {
		if row.GetString("status") != "sent" || row.GetInt("attempts") != 1 || row.GetDateTime("sentAt").IsZero() {
			t.Fatal("missing sent receipt")
		}
	}
}

func TestFailuresAreRetriedButUncertainOrClaimedSendsAreNot(t *testing.T) {
	for _, outcome := range []string{"failed", "unknown", "pending"} {
		t.Run(outcome, func(t *testing.T) {
			f := setup(t)
			u := f.user(t, "RETRY", "2026-07-01")
			calls := 0
			r := f.runner(func(string, string) error {
				calls++
				if outcome == "unknown" {
					return fmt.Errorf("%w: timeout", sms.ErrUncertain)
				}
				return errors.New("SMS rejected: HTTP 429")
			})
			if outcome == "pending" {
				loc, _ := time.LoadLocation("Europe/Stockholm")
				row, _, err := r.claim(u.Id, f.form.Id, f.now, loc)
				if err != nil || row == nil {
					t.Fatal(err)
				}
			} else {
				if _, err := r.Run(f.now); err == nil {
					t.Fatal("delivery error ignored")
				}
			}
			r.Send = func(string, string) error { calls++; return nil }
			sent, err := r.Run(f.now.AddDate(0, 0, 1))
			if err != nil {
				t.Fatal(err)
			}
			want := 0
			if outcome == "failed" {
				want = 1
			}
			if sent != want {
				t.Fatalf("retry count %d", sent)
			}
			row, _ := f.app.FindFirstRecordByData("followupReminders", "user", u.Id)
			if outcome == "failed" && (row.GetInt("attempts") != 2 || row.GetString("status") != "sent" || calls != 2) {
				t.Fatal("retry receipt incorrect")
			}
			if outcome == "unknown" && calls != 1 || outcome == "pending" && calls != 0 {
				t.Fatal("uncertain/pending send retried")
			}
		})
	}
}

func TestRechecksEligibilityBeforeRetry(t *testing.T) {
	for _, change := range []string{"answered", "date-corrected", "date-cleared"} {
		t.Run(change, func(t *testing.T) {
			f := setup(t)
			u := f.user(t, "RECHECK", "2026-07-01")
			r := f.runner(func(string, string) error { return errors.New("provider rejected") })
			_, _ = r.Run(f.now)
			switch change {
			case "answered":
				f.answer(t, u.Id, f.form.Id)
			case "date-corrected":
				u.Set("treatmentEnd", "2026-09-01")
				save(t, f.app, u)
			case "date-cleared":
				u.Set("treatmentEnd", "")
				save(t, f.app, u)
			}
			r.Send = func(string, string) error { t.Fatal("ineligible participant notified"); return nil }
			if n, err := r.Run(f.now.AddDate(0, 0, 1)); n != 0 || err != nil {
				t.Fatal(n, err)
			}
		})
	}
}

func TestDisabledConfigurationAndProtectedLedger(t *testing.T) {
	f := setup(t)
	f.user(t, "ELIGIBLE", "2026-07-01")
	r := f.runner(func(string, string) error { t.Fatal("disabled reminder sent"); return nil })
	f.settings.Set("followupQuestionnaire", "")
	save(t, f.app, f.settings)
	if n, err := r.Run(f.now); n != 0 || err != nil {
		t.Fatal(n, err)
	}
	f.settings.Set("followupQuestionnaire", f.form.Id)
	save(t, f.app, f.settings)
	f.form.Set("enabled", false)
	save(t, f.app, f.form)
	if n, err := r.Run(f.now); n != 0 || err != nil {
		t.Fatal(n, err)
	}
	c, _ := f.app.FindCollectionByNameOrId("followupReminders")
	if c.ListRule != nil || c.ViewRule != nil || c.CreateRule != nil || c.UpdateRule != nil || c.DeleteRule != nil {
		t.Fatal("delivery ledger exposed")
	}
}

func TestOverlappingRunsSendOnce(t *testing.T) {
	f := setup(t)
	f.user(t, "CONCURRENT", "2026-07-01")
	started := make(chan struct{})
	release := make(chan struct{})
	done := make(chan error, 1)
	r := f.runner(func(string, string) error { close(started); <-release; return nil })
	go func() { _, err := r.Run(f.now); done <- err }()
	<-started
	other := f.runner(func(string, string) error { t.Error("duplicate concurrent send"); return nil })
	n, err := other.Run(f.now)
	close(release)
	if n != 0 || err != nil {
		t.Fatal(n, err)
	}
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestReminderBecomesDueAtSwedishMidnight(t *testing.T) {
	f := setup(t)
	f.user(t, "BOUNDARY", "2025-11-30")
	location, _ := time.LoadLocation("Europe/Stockholm")
	due := time.Date(2026, 2, 28, 0, 0, 0, 0, location)
	calls := 0
	r := f.runner(func(string, string) error { calls++; return nil })
	if n, err := r.Run(due.Add(-time.Nanosecond)); n != 0 || err != nil || calls != 0 {
		t.Fatal(n, err, calls)
	}
	if n, err := r.Run(due); n != 1 || err != nil || calls != 1 {
		t.Fatal(n, err, calls)
	}
}
