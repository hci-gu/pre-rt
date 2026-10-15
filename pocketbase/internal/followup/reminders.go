// Package followup schedules one three-month invitation per participant and form.
package followup

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"myapp/internal/sms"
)

// DueDate uses three calendar months, clamping to the last day of a shorter
// month. Treatment-end fields represent calendar dates, not elapsed durations.
func DueDate(end time.Time, location *time.Location) time.Time {
	year, month, day := end.Date()
	last := time.Date(year, month+4, 0, 0, 0, 0, 0, location)
	if day > last.Day() {
		day = last.Day()
	}
	return time.Date(last.Year(), last.Month(), day, 0, 0, 0, 0, location)
}

type Runner struct {
	App        core.App
	Send       func(phone, message string) error
	WebURL     string
	SkipUserID string
}

func (r Runner) Run(now time.Time) (int, error) {
	location, err := time.LoadLocation("Europe/Stockholm")
	if err != nil {
		return 0, err
	}
	settings, err := r.App.FindFirstRecordByData("studySettings", "key", "default")
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	formID := settings.GetString("followupQuestionnaire")
	if formID == "" {
		return 0, nil
	}
	form, err := r.App.FindRecordById("questionnaires", formID)
	if err != nil {
		return 0, fmt.Errorf("follow-up questionnaire: %w", err)
	}
	if !form.GetBool("enabled") {
		return 0, nil
	}
	if form.GetString("occurrence") != "once" {
		return 0, errors.New("follow-up questionnaire must have occurrence once")
	}
	origin, err := url.Parse(r.WebURL)
	if err != nil || origin.Host == "" || (origin.Scheme != "http" && origin.Scheme != "https") {
		return 0, errors.New("follow-up reminder requires a valid WEB_URL")
	}
	users, err := r.App.FindRecordsByFilter("users", "phoneNumber != '' && treatmentEnd != ''", "id", 0, 0)
	if err != nil {
		return 0, err
	}
	sent := 0
	var failures []error
	for _, user := range users {
		if user.Id == r.SkipUserID {
			continue
		}
		delivery, phone, err := r.claim(user.Id, formID, now, location)
		if err != nil {
			failures = append(failures, err)
			continue
		}
		if delivery == nil {
			continue
		}
		message := "Hej! Det har gått tre månader sedan din strålbehandling avslutades. Besvara uppföljningsformuläret här: " + strings.TrimRight(r.WebURL, "/") + "/forms/" + formID
		sendErr := r.Send(phone, message)
		switch {
		case sendErr == nil:
			delivery.Set("status", "sent")
			delivery.Set("sentAt", now)
			sent++
		case errors.Is(sendErr, sms.ErrUncertain):
			delivery.Set("status", "unknown")
			delivery.Set("lastError", sendErr.Error())
		default:
			delivery.Set("status", "failed")
			delivery.Set("lastError", sendErr.Error())
		}
		// A crash/save failure leaves the durable pending claim in place. It must be
		// reconciled before retrying, since the SMS may already have been accepted.
		if err := r.App.Save(delivery); err != nil {
			failures = append(failures, fmt.Errorf("save follow-up delivery %s: %w", delivery.Id, err))
		}
		if sendErr != nil {
			failures = append(failures, fmt.Errorf("follow-up delivery %s: %w", delivery.Id, sendErr))
		}
	}
	return sent, errors.Join(failures...)
}

func (r Runner) claim(userID, formID string, now time.Time, location *time.Location) (*core.Record, string, error) {
	var claimed *core.Record
	var phone string
	err := r.App.RunInTransaction(func(tx core.App) error {
		// Re-read eligibility and completion immediately before claiming a send.
		user, err := tx.FindRecordById("users", userID)
		if err != nil {
			return err
		}
		end := user.GetDateTime("treatmentEnd").Time()
		phone = strings.TrimSpace(user.GetString("phoneNumber"))
		if end.IsZero() || phone == "" || now.Before(DueDate(end, location)) {
			return nil
		}
		params := dbx.Params{"user": userID, "form": formID}
		_, err = tx.FindFirstRecordByFilter("answers", "user = {:user} && questionnaire = {:form}", params)
		if err == nil {
			return nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		record, err := tx.FindFirstRecordByFilter("followupReminders", "user = {:user} && questionnaire = {:form}", params)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if record != nil && record.GetString("status") != "failed" {
			return nil
		}
		if record == nil {
			collection, err := tx.FindCollectionByNameOrId("followupReminders")
			if err != nil {
				return err
			}
			record = core.NewRecord(collection)
			record.Set("user", userID)
			record.Set("questionnaire", formID)
		}
		record.Set("status", "pending")
		record.Set("treatmentEnd", end)
		record.Set("dueDate", DueDate(end, location))
		record.Set("attemptedAt", now)
		record.Set("attempts", record.GetInt("attempts")+1)
		record.Set("lastError", "")
		record.Set("sentAt", "")
		if err := tx.Save(record); err != nil {
			return err
		}
		claimed = record
		return nil
	})
	return claimed, phone, err
}
