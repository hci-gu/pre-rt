package migrations

import (
	"database/sql"
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("resourceCollection")
		if err != nil {
			return err
		}
		if collection.Fields.GetByName("description") == nil {
			collection.Fields.Add(&core.EditorField{Name: "description"})
			if err := app.Save(collection); err != nil {
				return err
			}
		}
		settings, err := app.FindFirstRecordByData("studySettings", "key", "default")
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		about, err := app.FindRecordById("resourceCollection", settings.GetString("aboutCollection"))
		if err != nil {
			return err
		}
		if about.GetString("description") != "" {
			return nil
		}
		about.Set("description", `<p>Syftet med studien är att undersöka vid vilken tidpunkt som det är mest optimalt att påbörja vaginalstavsanvändning för att begränsa vaginala förändringar som beror på strålbehandlingens effekter.</p>
<p>Vi vill förstå hur vården kan utveckla information och uppföljning till kvinnor om metoder för att bibehålla vävnadens elasticitet och förhindra att sammanlänkning av slidlemhinnan sker.</p>
<p>Undersökningen är en så kallad observationsstudie.</p>`)
		return app.Save(about)
	}, func(app core.App) error {
		// Preserve editorial content on rollback.
		return nil
	})
}
