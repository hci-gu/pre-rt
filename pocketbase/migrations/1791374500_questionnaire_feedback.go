package migrations

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func applyQuestionnaireFeedback(app core.App) error {
	if err := fixAgeQuestionPlaceholder(app); err != nil {
		return err
	}
	weight, err := app.FindRecordById("questions", "zlay0n666s5d1r3")
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if weight != nil && (weight.GetString("resourceCollection") == "6bakz3exe2fv486" || weight.GetString("resourceCollection") == "94ze51rc8dz5oh6") {
		weight.Set("resourceCollection", "")
		if err := app.Save(weight); err != nil {
			return err
		}
	}
	// Only replace the known local fixed-count copy, preserving other editorial
	// changes and the production question graph. Conditional counts vary.
	forms, err := app.FindRecordsByFilter("questionnaires", "", "", 0, 0)
	if err != nil {
		return err
	}
	for _, form := range forms {
		intro := form.GetString("introText")
		updated := strings.ReplaceAll(intro, "Formuläret består av 37 frågor<br>och tar ca 20 min", "Antalet frågor beror på dina svar. Formuläret tar cirka 20 minuter.")
		updated = strings.ReplaceAll(updated, "Formuläret består av 6-8 frågor<br>och tar ca 1-2 min", "Antalet frågor beror på dina svar. Formuläret tar cirka 1–2 minuter.")
		if updated != intro {
			form.Set("introText", updated)
			if err := app.Save(form); err != nil {
				return err
			}
		}
	}
	return nil
}

func init() {
	m.Register(applyQuestionnaireFeedback, func(app core.App) error { return nil })
}
