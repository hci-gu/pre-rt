package resourceimport

import (
	"database/sql"
	"errors"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// EnsureSchema is shared by the normal migration and isolated importer tests.
func EnsureSchema(app core.App) error {
	for _, name := range []string{"resource", "resourceCollection"} {
		c, err := app.FindCollectionByNameOrId(name)
		if err != nil {
			return err
		}
		fields := []core.Field{
			&core.TextField{Name: "sourceKey"}, &core.TextField{Name: "managedBy"},
			&core.TextField{Name: "contentHash"}, &core.TextField{Name: "sourceDocumentHash"}, &core.TextField{Name: "importRun", Hidden: true},
			&core.JSONField{Name: "content", MaxSize: 8 << 20}, &core.JSONField{Name: "bindings", MaxSize: 2 << 20},
			&core.JSONField{Name: "aliases", MaxSize: 100000}, &core.JSONField{Name: "importBaseline", MaxSize: 16 << 20, Hidden: true},
			&core.BoolField{Name: "archived"},
		}
		for _, f := range fields {
			if c.Fields.GetByName(f.GetName()) == nil {
				c.Fields.Add(f)
			}
		}
		c.AddIndex("idx_"+name+"_source", true, "managedBy,sourceKey", "sourceKey != ''")
		// Archived source records must not remain accessible through direct API requests.
		c.ListRule = types.Pointer(`@request.auth.id != "" && archived = false`)
		c.ViewRule = types.Pointer(`@request.auth.id != "" && archived = false`)
		if err = app.Save(c); err != nil {
			return err
		}
	}
	if _, err := app.FindCollectionByNameOrId("resourceAsset"); errors.Is(err, sql.ErrNoRows) {
		c := core.NewBaseCollection("resourceAsset")
		c.ListRule = types.Pointer(`@request.auth.id != ""`)
		c.ViewRule = c.ListRule
		c.Fields.Add(&core.TextField{Name: "sourceKey", Required: true}, &core.FileField{Name: "file", MaxSelect: 1, MaxSize: 20 << 20, MimeTypes: []string{"image/png"}}, &core.JSONField{Name: "metadata"})
		c.AddIndex("idx_resource_asset_source", true, "sourceKey", "")
		if err = app.Save(c); err != nil {
			return err
		}
	} else if err != nil {
		return err
	}
	if _, err := app.FindCollectionByNameOrId("resourceImportRun"); errors.Is(err, sql.ErrNoRows) {
		c := core.NewBaseCollection("resourceImportRun") // all rules nil: administrative records only
		c.Fields.Add(&core.TextField{Name: "bundleHash"}, &core.TextField{Name: "status"}, &core.TextField{Name: "sourceDocumentHash"}, &core.TextField{Name: "target"}, &core.TextField{Name: "parserVersion"}, &core.TextField{Name: "manifestHash"}, &core.JSONField{Name: "receipt", MaxSize: 64 << 20})
		if err = app.Save(c); err != nil {
			return err
		}
	} else if err != nil {
		return err
	}
	c, err := app.FindCollectionByNameOrId("studySettings")
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if c.Fields.GetByName("afterTreatmentCollection") == nil {
		target, err := app.FindCollectionByNameOrId("resourceCollection")
		if err != nil {
			return err
		}
		c.Fields.Add(&core.RelationField{Name: "afterTreatmentCollection", CollectionId: target.Id, MaxSelect: 1})
		return app.Save(c)
	}
	return nil
}
