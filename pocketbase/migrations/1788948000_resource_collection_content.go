package migrations

import (
	_ "embed"
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Shared with web/scripts/seed-faq.mjs so the live API and migrations use
// the same fields. Content is seeded separately from the existing records.
//
//go:embed faq_collection_fields.json
var faqCollectionFields []byte

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("resourceCollection")
		if err != nil {
			return err
		}
		var fields []json.RawMessage
		if err := json.Unmarshal(faqCollectionFields, &fields); err != nil {
			return err
		}
		for _, field := range fields {
			var identity struct{ Name string }
			if err := json.Unmarshal(field, &identity); err != nil {
				return err
			}
			if collection.Fields.GetByName(identity.Name) == nil {
				if err := collection.Fields.AddMarshaledJSON(field); err != nil {
					return err
				}
			}
		}
		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("resourceCollection")
		if err != nil {
			return err
		}
		for _, name := range []string{"pageTitle", "footerContent", "showQuickExit", "imageCompact"} {
			collection.Fields.RemoveByName(name)
		}
		return app.Save(collection)
	})
}
