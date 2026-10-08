package resourceimport

import (
	"fmt"
	"path/filepath"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

// SeedCardImages supplies the original design artwork for empty FAQ cards.
// Word imports own the card text and ordering; uploaded artwork remains editable.
// Run after importing resources so sourceKey identifies the reviewed collections.
func SeedCardImages(app core.App, assetDir string) (int, error) {
	if assetDir == "" {
		return 0, fmt.Errorf("seed-card-images requires --card-assets")
	}
	art := []struct{ key, wide, compact string }{
		{"radiation", "radiation-effects-wave-card-wide--p78.svg", "radiation-effects-wave-card-square--p84.svg"},
		{"dilator", "vaginal-dilator-card-wide--p79.svg", "vaginal-dilator-card-square--p85.svg"},
		{"intimate-care", "intimate-care-card-wide--p81.svg", "intimate-care-card-square--p87.svg"},
		{"sexual-health", "sexual-health-card-wide--p80.svg", "sexual-health-card-square--p86.svg"},
		{"violence", "violence-card-wide--p82.svg", "violence-card-square--p88.svg"},
	}
	changed := 0
	err := app.RunInTransaction(func(tx core.App) error {
		var pending []*core.Record
		for _, card := range art {
			records, err := tx.FindRecordsByFilter("resourceCollection", "sourceKey = {:key}", "", 2, 0, dbx.Params{"key": card.key})
			if err != nil {
				return err
			}
			if len(records) != 1 {
				return fmt.Errorf("expected one FAQ collection for %q, got %d; import resources first", card.key, len(records))
			}
			r := records[0]
			// An existing wide image also serves as the mobile fallback. Don't
			// pair a custom wide image with unrelated default compact artwork.
			if r.GetString("image") != "" {
				continue
			}
			for _, field := range []struct{ name, file string }{{"image", card.wide}, {"imageCompact", card.compact}} {
				if r.GetString(field.name) != "" {
					continue
				}
				if _, ok := r.Collection().Fields.GetByName(field.name).(*core.FileField); !ok {
					return fmt.Errorf("FAQ %s file field is missing; run migrations first", field.name)
				}
				file, err := filesystem.NewFileFromPath(filepath.Join(assetDir, field.file))
				if err != nil {
					return fmt.Errorf("FAQ artwork %s: %w", field.file, err)
				}
				r.Set(field.name, file)
			}
			pending = append(pending, r)
		}
		// All required records and packaged assets must exist before any save.
		for _, r := range pending {
			if err := tx.Save(r); err != nil {
				return fmt.Errorf("save FAQ artwork for %s: %w", r.GetString("sourceKey"), err)
			}
		}
		changed = len(pending)
		return nil
	})
	if err != nil {
		return 0, err
	}
	return changed, nil
}
