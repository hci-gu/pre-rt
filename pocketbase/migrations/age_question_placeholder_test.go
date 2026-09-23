package migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestFixAgeQuestionPlaceholder(t *testing.T) {
	for _, tc := range []struct {
		name, questionType, before, want string
		missing                          bool
	}{
		{name: "empty", questionType: "number", want: "år"},
		{name: "generic fallback", questionType: "number", before: "Valfri kommentar", want: "år"},
		{name: "already corrected", questionType: "number", before: "år", want: "år"},
		{name: "custom content", questionType: "number", before: "Ange din ålder i år", want: "Ange din ålder i år"},
		{name: "changed question type", questionType: "text", before: "", want: ""},
		{name: "missing age question", missing: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
			if err := app.Bootstrap(); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { app.ResetBootstrapState() })
			questions := core.NewBaseCollection("questions")
			questions.Fields.Add(&core.TextField{Name: "type"}, &core.TextField{Name: "placeholder"})
			if err := app.Save(questions); err != nil {
				t.Fatal(err)
			}
			if !tc.missing {
				age := core.NewRecord(questions)
				age.Id = ageQuestionID
				age.Set("type", tc.questionType)
				age.Set("placeholder", tc.before)
				if err := app.Save(age); err != nil {
					t.Fatal(err)
				}
			}
			other := core.NewRecord(questions)
			other.Set("type", "number")
			if err := app.Save(other); err != nil {
				t.Fatal(err)
			}
			for range 2 {
				if err := fixAgeQuestionPlaceholder(app); err != nil {
					t.Fatal(err)
				}
			}
			if !tc.missing {
				age, err := app.FindRecordById("questions", ageQuestionID)
				if err != nil {
					t.Fatal(err)
				}
				if got := age.GetString("placeholder"); got != tc.want {
					t.Fatalf("placeholder = %q, want %q", got, tc.want)
				}
			}
			other, err := app.FindRecordById("questions", other.Id)
			if err != nil {
				t.Fatal(err)
			}
			if other.GetString("placeholder") != "" {
				t.Fatal("changed an unrelated numeric question")
			}
		})
	}
}
