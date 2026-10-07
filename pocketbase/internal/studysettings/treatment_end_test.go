package studysettings

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	_ "github.com/pocketbase/pocketbase/migrations"
)

func TestTreatmentEndHTTP(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	save := func(m core.Model) {
		t.Helper()
		if err := app.Save(m); err != nil {
			t.Fatal(err)
		}
	}
	questions := core.NewBaseCollection("questions")
	questions.Fields.Add(&core.TextField{Name: "type"})
	save(questions)
	forms := core.NewBaseCollection("questionnaires")
	forms.Fields.Add(&core.RelationField{Name: "questions", CollectionId: questions.Id, MaxSelect: 99})
	save(forms)
	config := core.NewBaseCollection("studySettings")
	for _, name := range []string{"key", "treatmentEndQuestionnaire", "treatmentEndQuestion"} {
		config.Fields.Add(&core.TextField{Name: name})
	}
	save(config)
	users, _ := app.FindCollectionByNameOrId("users")
	users.Fields.Add(&core.DateField{Name: "treatmentEnd"})
	save(users)
	answers := core.NewBaseCollection("answers")
	answers.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id}, &core.RelationField{Name: "questionnaire", CollectionId: forms.Id},
		&core.JSONField{Name: "answers"}, &core.DateField{Name: "date"}, &core.DateField{Name: "started"})
	save(answers)
	question := core.NewRecord(questions)
	question.Set("type", "date")
	save(question)
	form := core.NewRecord(forms)
	form.Set("questions", []string{question.Id})
	save(form)
	settings := core.NewRecord(config)
	settings.Set("key", "default")
	settings.Set("treatmentEndQuestionnaire", form.Id)
	settings.Set("treatmentEndQuestion", question.Id)
	save(settings)
	user := core.NewRecord(users)
	user.SetEmail("date@example.test")
	user.SetPassword("test-password-1234")
	save(user)
	other := core.NewRecord(users)
	other.SetEmail("other@example.test")
	other.SetPassword("test-password-1234")
	save(other)
	unrelatedForm := core.NewRecord(forms)
	save(unrelatedForm)
	unrelated := core.NewRecord(answers)
	unrelated.Set("user", user.Id)
	unrelated.Set("questionnaire", unrelatedForm.Id)
	unrelated.Set("answers", map[string]string{"keep": "original"})
	save(unrelated)
	token, err := user.NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	router.PUT("/treatment-end", HandleTreatmentEnd).Bind(apis.RequireAuth("users"))
	mux, err := router.BuildMux()
	if err != nil {
		t.Fatal(err)
	}
	request := func(body, auth string, status int) map[string]string {
		t.Helper()
		r := httptest.NewRequest(http.MethodPut, "/treatment-end", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Authorization", auth)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != status {
			t.Fatalf("got %d, want %d: %s", w.Code, status, w.Body.String())
		}
		var result map[string]string
		if status == 200 {
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
		}
		return result
	}
	request(`{"date":"2026-10-07"}`, "", 401)
	request(`{"date":"2026-02-30"}`, token, 400)
	first := request(`{"date":"2026-10-07","user":"`+other.Id+`"}`, token, 200)
	answer, _ := app.FindRecordById("answers", first["answerId"])
	answer.Set("answers", map[string]string{question.Id: "2026-10-07", "keep": "existing answer value"})
	answer.Set("started", "2026-10-01")
	save(answer)
	second := request(`{"date":"2026-10-12"}`, token, 200)
	if first["answerId"] != second["answerId"] {
		t.Fatal("edit created another answer")
	}
	answer, _ = app.FindRecordById("answers", first["answerId"])
	if !strings.Contains(answer.GetString("answers"), "existing answer value") || !strings.Contains(answer.GetString("answers"), "2026-10-12") || answer.GetString("started")[:10] != "2026-10-01" {
		t.Fatal("edit lost existing values or did not save the new date")
	}
	user, _ = app.FindRecordById("users", user.Id)
	other, _ = app.FindRecordById("users", other.Id)
	if user.GetString("treatmentEnd")[:10] != "2026-10-12" || !other.GetDateTime("treatmentEnd").IsZero() {
		t.Fatal("incorrect user date or caller isolation")
	}
	unrelated, _ = app.FindRecordById("answers", unrelated.Id)
	if unrelated.GetString("answers") != `{"keep":"original"}` {
		t.Fatal("unrelated answer changed")
	}

	// Failure saving the user's scheduling date must roll back the answer edit.
	app.OnRecordUpdate("users").BindFunc(func(e *core.RecordEvent) error { return errors.New("injected date save failure") })
	request(`{"date":"2026-10-20"}`, token, 500)
	answer, _ = app.FindRecordById("answers", first["answerId"])
	user, _ = app.FindRecordById("users", user.Id)
	if !strings.Contains(answer.GetString("answers"), "2026-10-12") || user.GetString("treatmentEnd")[:10] != "2026-10-12" {
		t.Fatal("failed edit partially changed the date")
	}
	duplicate := core.NewRecord(answers)
	duplicate.Set("user", user.Id)
	duplicate.Set("questionnaire", form.Id)
	duplicate.Set("answers", map[string]string{question.Id: "2026-10-13"})
	save(duplicate)
	request(`{"date":"2026-10-22"}`, token, 409)
}
