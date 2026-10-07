package resourceimport

import (
	"fmt"
	"github.com/pocketbase/pocketbase/core"
)

// LoadReview adopts only content and relation wiring; participant data is never exported or loaded.
func LoadReview(app core.App, s Snapshot) error {
	if !ReviewTarget(app) {
		return fmt.Errorf("not an isolated review database")
	}
	return app.RunInTransaction(func(tx core.App) error {
		for _, name := range []string{"resource", "resourceCollection", "questions"} {
			collection, err := tx.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			for id, v := range s[name] {
				r := core.NewRecord(collection)
				r.Id = id
				for _, f := range fields(name) {
					if value, ok := v[f]; ok {
						r.Set(f, value)
					}
				}
				if err = tx.Save(r); err != nil {
					return err
				}
			}
		}
		// Existing study settings require questionnaire relations, which are deliberately
		// absent from content snapshots. Only in this isolated fixture, make them optional.
		c, err := tx.FindCollectionByNameOrId("studySettings")
		if err != nil {
			return err
		}
		for _, f := range c.Fields {
			if relation, ok := f.(*core.RelationField); ok {
				relation.Required = false
			}
		}
		if err = tx.Save(c); err != nil {
			return err
		}
		for id, v := range s["studySettings"] {
			r := core.NewRecord(c)
			r.Id = id
			r.Set("key", "default")
			for _, f := range fields("studySettings") {
				r.Set(f, v[f])
			}
			if err = tx.Save(r); err != nil {
				return err
			}
		}
		return nil
	})
}
