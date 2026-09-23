package migrations

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

const ageQuestionID = "c2xmobhywcotlrq"

func fixAgeQuestionPlaceholder(app core.App) error {
	question, err := app.FindRecordById("questions", ageQuestionID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	placeholder := strings.TrimSpace(question.GetString("placeholder"))
	if question.GetString("type") != "number" ||
		(placeholder != "" && !strings.EqualFold(placeholder, "Valfri kommentar")) {
		return nil
	}
	question.Set("placeholder", "år")
	return app.Save(question)
}

func init() {
	m.Register(fixAgeQuestionPlaceholder, func(app core.App) error {
		// Preserve the corrected editorial content on rollback.
		return nil
	})
}
