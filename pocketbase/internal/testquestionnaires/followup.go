package testquestionnaires

import (
	"encoding/json"
	"fmt"

	"github.com/pocketbase/pocketbase/core"
)

// ApplyFollowup imports the reviewed form and configures the test scheduler in
// one transaction. A failed binding must not leave a partially published form.
func ApplyFollowup(app core.App, raw []byte, formID string) (int, error) {
	var snapshot Snapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return 0, err
	}
	included := false
	for _, row := range snapshot.Records["questionnaires"] {
		if row["id"] == formID {
			included = true
		}
	}
	if !included {
		return 0, fmt.Errorf("follow-up questionnaire must be included in the imported snapshot")
	}
	changed := 0
	err := app.RunInTransaction(func(tx core.App) error {
		var err error
		changed, err = Apply(tx, raw)
		if err != nil {
			return err
		}
		form, err := tx.FindRecordById("questionnaires", formID)
		if err != nil {
			return err
		}
		if !form.GetBool("enabled") || form.GetString("occurrence") != "once" {
			return fmt.Errorf("follow-up questionnaire must be enabled and have occurrence once")
		}
		settings, err := tx.FindFirstRecordByData("studySettings", "key", "default")
		if err != nil {
			return fmt.Errorf("configure follow-up: %w", err)
		}
		if settings.Collection().Fields.GetByName("followupQuestionnaire") == nil {
			return fmt.Errorf("follow-up reminder migration must run before import")
		}
		if settings.GetString("followupQuestionnaire") == formID {
			return nil
		}
		settings.Set("followupQuestionnaire", formID)
		return tx.Save(settings)
	})
	if err != nil {
		return 0, err
	}
	return changed, nil
}
