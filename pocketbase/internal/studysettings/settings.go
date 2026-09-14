package studysettings

import (
	"encoding/json"
	"fmt"
	"slices"

	"github.com/pocketbase/pocketbase/core"
)

type Settings struct {
	TreatmentEndQuestionnaire string
	TreatmentEndQuestion      string
}

// Apply the configured date binding; other questionnaires have no side effect.
func SyncTreatmentEnd(app core.App, answer *core.Record) error {
	settings, err := Load(app)
	if err != nil {
		return err
	}
	if answer.GetString("questionnaire") != settings.TreatmentEndQuestionnaire {
		return nil
	}
	user, err := app.FindRecordById("users", answer.GetString("user"))
	if err != nil {
		return err
	}
	var values map[string]interface{}
	if err := json.Unmarshal([]byte(answer.GetString("answers")), &values); err != nil {
		return err
	}
	user.Set("treatmentEnd", values[settings.TreatmentEndQuestion])
	return app.Save(user)
}

func Load(app core.App) (Settings, error) {
	record, err := app.FindFirstRecordByData("studySettings", "key", "default")
	if err != nil {
		return Settings{}, fmt.Errorf("load study settings: %w", err)
	}
	settings := Settings{
		TreatmentEndQuestionnaire: record.GetString("treatmentEndQuestionnaire"),
		TreatmentEndQuestion:      record.GetString("treatmentEndQuestion"),
	}
	questionnaire, err := app.FindRecordById("questionnaires", settings.TreatmentEndQuestionnaire)
	if err != nil {
		return Settings{}, fmt.Errorf("load treatment-end questionnaire: %w", err)
	}
	if !slices.Contains(questionnaire.GetStringSlice("questions"), settings.TreatmentEndQuestion) {
		return Settings{}, fmt.Errorf("configured treatment-end question does not belong to its questionnaire")
	}
	question, err := app.FindRecordById("questions", settings.TreatmentEndQuestion)
	if err != nil {
		return Settings{}, err
	}
	if question.GetString("type") != "date" {
		return Settings{}, fmt.Errorf("configured treatment-end question must be a date question")
	}
	return settings, nil
}
