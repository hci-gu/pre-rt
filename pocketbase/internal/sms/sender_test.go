package sms

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestProviderResponses(t *testing.T) {
	for _, code := range []int{200, 201, 400, 401, 429, 408, 500} {
		t.Run(http.StatusText(code), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				user, password, ok := r.BasicAuth()
				if !ok || user != "user" || password != "secret" {
					t.Error("missing authentication")
				}
				if err := r.ParseForm(); err != nil {
					t.Error(err)
				}
				if r.Form.Get("to") != "+46701234567" || r.Form.Get("from") != "StudiePreRT" || r.Form.Get("message") != "Test message" {
					t.Error("incorrect SMS payload")
				}
				w.WriteHeader(code)
			}))
			defer server.Close()
			err := (Sender{Endpoint: server.URL, Username: "user", Password: "secret"}).Send("0701234567", "Test message")
			if (err == nil) != (code < 300) {
				t.Fatalf("status=%d err=%v", code, err)
			}
			if errors.Is(err, ErrUncertain) != (code >= 500 || code == 408) {
				t.Fatal("incorrect retry classification", err)
			}
		})
	}
}
func TestTransportTimeoutAndMissingCredentials(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { time.Sleep(50 * time.Millisecond) }))
	defer server.Close()
	s := Sender{Endpoint: server.URL, Username: "user", Password: "secret", Client: &http.Client{Timeout: 5 * time.Millisecond}}
	if err := s.Send("+46701234567", "Test"); !errors.Is(err, ErrUncertain) {
		t.Fatal(err)
	}
	s.Password = ""
	if err := s.Send("+46701234567", "Test"); err == nil || errors.Is(err, ErrUncertain) {
		t.Fatal("missing credentials must fail before sending", err)
	}
}
