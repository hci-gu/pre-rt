package main

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func TestOTPChallengeDoesNotDiscloseCode(t *testing.T) {
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
	users, _ := app.FindCollectionByNameOrId("users")
	users.Fields.Add(&core.TextField{Name: "phoneNumber"})
	save(users)
	user := core.NewRecord(users)
	user.SetEmail("otp@example.test")
	user.SetPassword("synthetic-password")
	user.Set("phoneNumber", "AUDIT-OTP")
	save(user)
	otp := core.NewBaseCollection("otp")
	otp.Fields.Add(&core.TextField{Name: "password"}, &core.TextField{Name: "user"}, &core.DateField{Name: "expiration"}, &core.NumberField{Name: "attempts"})
	save(otp)
	delivered := ""
	deliveryFails := false
	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	router.POST("/otp-create", otpCreateHandler(func(_ string, message string) error {
		if deliveryFails {
			return errors.New("synthetic delivery failure")
		}
		delivered = message
		return nil
	}))
	mux, err := router.BuildMux()
	if err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("POST", "/otp-create", strings.NewReader(`{"phoneNumber":"AUDIT-OTP"}`))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatalf("challenge status %d", w.Code)
	}
	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if len(response) != 1 || response["id"] == nil {
		t.Fatalf("challenge must contain only an opaque id; got %d fields", len(response))
	}
	record, err := app.FindRecordById("otp", response["id"].(string))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(delivered, record.GetString("password")) {
		t.Fatal("code was not sent through the delivery channel")
	}
	if strings.Contains(w.Body.String(), record.GetString("password")) {
		t.Fatal("code disclosed in challenge")
	}
	deliveryFails = true
	r = httptest.NewRequest("POST", "/otp-create", strings.NewReader(`{"phoneNumber":"AUDIT-OTP"}`))
	r.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != 500 {
		t.Fatalf("delivery failure must be observable, got %d", w.Code)
	}
	records, err := app.FindAllRecords("otp")
	if err != nil || len(records) != 1 || records[0].Id != record.Id {
		t.Fatal("failed delivery must not leave another valid challenge")
	}
}
