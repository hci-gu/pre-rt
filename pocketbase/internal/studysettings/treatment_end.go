package studysettings

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

var ErrMultipleTreatmentEndAnswers = errors.New("multiple treatment-end answers")

// SaveTreatmentEnd keeps the answer used by exports and the date used by
// schedules in one transaction. Editing never creates a second answer.
func SaveTreatmentEnd(app core.App, userID string, date time.Time) (*core.Record, error) {
	var answer *core.Record
	err := app.RunInTransaction(func(tx core.App) error {
		settings, err := Load(tx)
		if err != nil {
			return err
		}
		user, err := tx.FindRecordById("users", userID)
		if err != nil {
			return err
		}
		existing, err := tx.FindRecordsByFilter("answers", "user = {:user} && questionnaire = {:form}", "", 2, 0,
			dbx.Params{"user": userID, "form": settings.TreatmentEndQuestionnaire})
		if err != nil {
			return err
		}
		if len(existing) > 1 {
			// Preserve ambiguous historical records for an explicit review.
			return ErrMultipleTreatmentEndAnswers
		}
		values := map[string]any{}
		if len(existing) == 1 {
			answer = existing[0]
			if err := json.Unmarshal([]byte(answer.GetString("answers")), &values); err != nil {
				return err
			}
		} else {
			collection, err := tx.FindCollectionByNameOrId("answers")
			if err != nil {
				return err
			}
			answer = core.NewRecord(collection)
			answer.Set("user", userID)
			answer.Set("questionnaire", settings.TreatmentEndQuestionnaire)
			answer.Set("date", time.Now().UTC().Format(time.DateOnly))
		}
		if values == nil {
			values = map[string]any{}
		}
		values[settings.TreatmentEndQuestion] = date.Format(time.DateOnly)
		answer.Set("answers", values)
		if err := tx.Save(answer); err != nil {
			return err
		}
		user.Set("treatmentEnd", date)
		return tx.Save(user)
	})
	return answer, err
}

func HandleTreatmentEnd(e *core.RequestEvent) error {
	if e.Auth == nil || e.Auth.Collection().Name != "users" {
		return apis.NewUnauthorizedError("Logga in för att spara datumet.", nil)
	}
	var data struct {
		Date string `json:"date"`
	}
	if err := e.BindBody(&data); err != nil {
		return apis.NewBadRequestError("Ange ett giltigt datum.", nil)
	}
	date, err := time.Parse(time.DateOnly, data.Date)
	if err != nil || date.IsZero() || len(data.Date) != 10 {
		return apis.NewBadRequestError("Ange ett giltigt datum.", nil)
	}
	answer, err := SaveTreatmentEnd(e.App, e.Auth.Id, date)
	if errors.Is(err, ErrMultipleTreatmentEndAnswers) {
		return apis.NewApiError(http.StatusConflict, "Det finns flera registrerade slutdatum. Kontakta studiepersonalen för hjälp.", nil)
	}
	if err != nil {
		return apis.NewInternalServerError("Datumet kunde inte sparas. Försök igen.", err)
	}
	return e.JSON(http.StatusOK, map[string]string{"answerId": answer.Id, "treatmentEnd": data.Date})
}
