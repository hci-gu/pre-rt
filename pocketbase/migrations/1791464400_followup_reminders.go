package migrations

import (
	"database/sql"
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(ensureFollowupReminders, func(app core.App) error {
		// Preserve delivery history on rollback to prevent duplicate invitations.
		return nil
	})
}

func ensureFollowupReminders(app core.App) error {
	forms, err := app.FindCollectionByNameOrId("questionnaires")
	if err != nil {
		return err
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	settings, err := app.FindCollectionByNameOrId("studySettings")
	if err != nil {
		return err
	}
	if settings.Fields.GetByName("followupQuestionnaire") == nil {
		settings.Fields.Add(&core.RelationField{Name: "followupQuestionnaire", CollectionId: forms.Id, MaxSelect: 1})
	}
	if err := app.Save(settings); err != nil {
		return err
	}

	// Superuser-only delivery ledger; participants cannot read or edit it.
	deliveries, err := app.FindCollectionByNameOrId("followupReminders")
	if errors.Is(err, sql.ErrNoRows) {
		deliveries = core.NewBaseCollection("followupReminders")
	} else if err != nil {
		return err
	}
	deliveries.ListRule, deliveries.ViewRule, deliveries.CreateRule, deliveries.UpdateRule, deliveries.DeleteRule = nil, nil, nil, nil, nil
	deliveries.Fields.Add(
		&core.RelationField{Name: "user", CollectionId: users.Id, Required: true, MaxSelect: 1, CascadeDelete: true},
		&core.RelationField{Name: "questionnaire", CollectionId: forms.Id, Required: true, MaxSelect: 1},
		&core.SelectField{Name: "status", Values: []string{"pending", "sent", "failed", "unknown"}, Required: true, MaxSelect: 1},
		&core.DateField{Name: "treatmentEnd", Required: true},
		&core.DateField{Name: "dueDate", Required: true},
		&core.DateField{Name: "attemptedAt", Required: true},
		&core.DateField{Name: "sentAt"},
		&core.NumberField{Name: "attempts", OnlyInt: true},
		&core.TextField{Name: "lastError"},
	)
	deliveries.AddIndex("idx_followup_reminder_user_form", true, "user, questionnaire", "")
	if err := app.Save(deliveries); err != nil {
		return err
	}

	// Initial binding only where the reviewed follow-up form already exists.
	// Other installations remain inactive until an admin selects their form.
	const initialForm = "355082bf942bf57"
	if _, err := app.FindRecordById("questionnaires", initialForm); errors.Is(err, sql.ErrNoRows) {
		return nil
	} else if err != nil {
		return err
	}
	record, err := app.FindFirstRecordByData("studySettings", "key", "default")
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if record.GetString("followupQuestionnaire") != "" {
		return nil
	}
	record.Set("followupQuestionnaire", initialForm)
	return app.Save(record)

}
