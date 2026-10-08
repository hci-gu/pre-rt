package migrations

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func TestParticipantSecurityRules(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	if err := ensureUsersSchema(app); err != nil {
		t.Fatal(err)
	}
	for _, data := range baseCollectionJSON {
		if err := ensureCollection(app, []byte(data)); err != nil {
			t.Fatal(err)
		}
	}
	save := func(m core.Model) {
		t.Helper()
		if err := app.Save(m); err != nil {
			t.Fatal(err)
		}
	}
	users, _ := app.FindCollectionByNameOrId("users")
	participants := make([]*core.Record, 2)
	for i, phone := range []string{"SECURITY-A", "SECURITY-B"} {
		u := core.NewRecord(users)
		u.Set("phoneNumber", phone)
		u.Set("username", phone)
		u.SetPassword("synthetic-password")
		save(u)
		participants[i] = u
	}
	otps, _ := app.FindCollectionByNameOrId("otp")
	otp := core.NewRecord(otps)
	otp.Set("password", "123456")
	otp.Set("user", participants[0].Id)
	save(otp)
	// The migration must preserve records while locking down existing installations.
	if err := ensureParticipantSecurity(app); err != nil {
		t.Fatal(err)
	}
	if err := ensureParticipantSecurity(app); err != nil {
		t.Fatal(err)
	}
	otp, err := app.FindRecordById("otp", otp.Id)
	if err != nil {
		t.Fatal(err)
	}
	public, _ := json.Marshal(otp)
	if strings.Contains(string(public), "123456") {
		t.Error("OTP secret is not hidden")
	}
	token, err := participants[0].NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	mux, err := router.BuildMux()
	if err != nil {
		t.Fatal(err)
	}
	request := func(method, path, body, auth string) int {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Authorization", auth)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w.Code
	}
	for _, auth := range []string{"", token} {
		for _, path := range []string{"/api/collections/otp/records", "/api/collections/otp/records/" + otp.Id} {
			if status := request("GET", path, "", auth); status < 400 {
				t.Errorf("OTP read allowed: status %d", status)
			}
		}
	}
	for _, owner := range []string{participants[1].Id, ""} {
		body := `{"user":"` + owner + `","answers":{"test":"forged"}}`
		if status := request("POST", "/api/collections/answers/records", body, token); status < 400 {
			t.Errorf("cross-owner or unowned answer accepted: %d", status)
		}
	}
	body := `{"user":"` + participants[0].Id + `","answers":{"test":"owned"}}`
	if status := request("POST", "/api/collections/answers/records", body, ""); status < 400 {
		t.Errorf("anonymous answer accepted: %d", status)
	}
	if status := request("POST", "/api/collections/answers/records", body, token); status != 200 {
		t.Errorf("owned answer rejected: %d", status)
	}
	records, err := app.FindAllRecords("answers")
	if err != nil || len(records) != 1 {
		t.Fatal("unexpected answer records after authorization probes")
	}
}
