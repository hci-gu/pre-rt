package main

import (
	"os/exec"
	"testing"
)

func TestSingleFileEntrypoint(t *testing.T) {
	// --help compiles the user's entrypoint without starting a second server
	// or touching the local database.
	output, err := exec.Command("go", "run", "main.go", "serve", "--help").CombinedOutput()
	if err != nil {
		t.Fatalf("single-file startup failed: %v\n%s", err, output)
	}
}

func TestTestLoginUserID(t *testing.T) {
	tests := []struct {
		name    string
		appEnv  string
		userID  string
		wantID  string
		enabled bool
	}{
		{
			name:   "disabled in production even with a user id",
			appEnv: "production",
			userID: "publictestuser1",
		},
		{
			name:   "disabled without a user id",
			appEnv: "test",
		},
		{
			name:   "disabled for an invalid user id",
			appEnv: "test",
			userID: "too-short",
		},
		{
			name:    "enabled only with complete test configuration",
			appEnv:  " test ",
			userID:  " publictestuser1 ",
			wantID:  "publictestuser1",
			enabled: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("APP_ENV", tt.appEnv)
			t.Setenv("TEST_LOGIN_USER_ID", tt.userID)

			id, enabled := testLoginUserID()
			if id != tt.wantID || enabled != tt.enabled {
				t.Fatalf("testLoginUserID() = (%q, %v), want (%q, %v)", id, enabled, tt.wantID, tt.enabled)
			}
		})
	}
}
