package migrations

import (
	"fmt"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	// Rolling back application code must never reopen participant data or OTPs.
	m.Register(ensureParticipantSecurity, func(app core.App) error { return nil })
}

func ensureParticipantSecurity(app core.App) error {
	return app.RunInTransaction(func(tx core.App) error {
		otp, err := tx.FindCollectionByNameOrId("otp")
		if err != nil {
			return err
		}
		otp.ListRule = nil
		otp.ViewRule = nil
		otp.CreateRule = nil
		otp.UpdateRule = nil
		otp.DeleteRule = nil
		secret, ok := otp.Fields.GetByName("password").(*core.TextField)
		if !ok {
			return fmt.Errorf("OTP password field is missing or has an unexpected type")
		}
		secret.Hidden = true
		if err := tx.Save(otp); err != nil {
			return err
		}
		answers, err := tx.FindCollectionByNameOrId("answers")
		if err != nil {
			return err
		}
		answers.CreateRule = types.Pointer(`@request.auth.collectionName = "users" && user = @request.auth.id`)
		return tx.Save(answers)
	})
}
