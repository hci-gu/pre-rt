package migrations

import (
	"database/sql"
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		settings := core.NewBaseCollection("studySettings")
		settings.ListRule = types.Pointer(`@request.auth.id != ""`)
		settings.ViewRule = types.Pointer(`@request.auth.id != ""`)
		// Only superusers can write. One named record is shared by web and backend.
		settings.Fields.Add(&core.TextField{Name: "key", Required: true, Pattern: "^default$"})
		settings.AddIndex("idx_study_settings_key", true, "key", "")
		for _, relation := range []struct{ name, collection string }{
			{"baselineQuestionnaire", "questionnaires"},
			{"dailyQuestionnaire", "questionnaires"},
			{"treatmentEndQuestionnaire", "questionnaires"},
			{"treatmentEndQuestion", "questions"},
			{"aboutCollection", "resourceCollection"},
		} {
			target, err := app.FindCollectionByNameOrId(relation.collection)
			if err != nil {
				return err
			}
			settings.Fields.Add(&core.RelationField{
				Name: relation.name, CollectionId: target.Id, Required: true, MaxSelect: 1,
			})
		}
		if err := app.Save(settings); err != nil {
			return err
		}

		// Initial wiring for the existing study. IDs are migration data only;
		// admins can subsequently replace these relations without changing code.
		defaults := map[string]string{
			"baselineQuestionnaire":     "u6917wm639q1d01",
			"dailyQuestionnaire":        "sdzkpd49ndccf5b",
			"treatmentEndQuestionnaire": "p8ow7xj8h4uuv43",
			"treatmentEndQuestion":      "242u8ha0yn8m06d",
		}
		for field, id := range defaults {
			collection := "questionnaires"
			if field == "treatmentEndQuestion" {
				collection = "questions"
			}
			if _, err := app.FindRecordById(collection, id); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					// Empty installations must supply their own study records.
					return nil
				}
				return err
			}
		}
		// Reuse the same resources used by questionnaire help/FAQ, including
		// audience-specific timing. Never create a second contact answer.
		timingID := "faq000000000001"
		if _, err := app.FindRecordById("resource", timingID); errors.Is(err, sql.ErrNoRows) {
			timingID = "4mv1csl1xq95j2w" // Original PRE/POST instructions before FAQ seed.
		} else if err != nil {
			return err
		}
		resourceIDs := []string{timingID, "5l904a7395842iu", "yy98yjvj54e732h"}
		for _, id := range resourceIDs {
			if _, err := app.FindRecordById("resource", id); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return nil
				}
				return err
			}
		}
		collections, err := app.FindCollectionByNameOrId("resourceCollection")
		if err != nil {
			return err
		}
		about := core.NewRecord(collections)
		about.Set("name", "Information om studien")
		about.Set("pageTitle", "Information om studien")
		about.Set("visible_on_questions_and_answers", false)
		about.Set("resources", resourceIDs)
		if err := app.Save(about); err != nil {
			return err
		}
		record := core.NewRecord(settings)
		record.Set("key", "default")
		for field, id := range defaults {
			record.Set(field, id)
		}
		record.Set("aboutCollection", about.Id)
		return app.Save(record)
	}, func(app core.App) error {
		// Preserve the about collection and its content on rollback.
		collection, err := app.FindCollectionByNameOrId("studySettings")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
