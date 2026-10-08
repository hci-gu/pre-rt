package resourceimport

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

func TestSeedCardImages(t *testing.T) {
	app, _ := fixture(t)
	collection, _ := app.FindCollectionByNameOrId("resourceCollection")
	collection.Fields.Add(&core.FileField{Name: "image", MaxSelect: 1}, &core.FileField{Name: "imageCompact", MaxSelect: 1})
	if err := app.Save(collection); err != nil {
		t.Fatal(err)
	}
	assets := t.TempDir()
	art := map[string][2]string{
		"radiation":     {"radiation-effects-wave-card-wide--p78.svg", "radiation-effects-wave-card-square--p84.svg"},
		"dilator":       {"vaginal-dilator-card-wide--p79.svg", "vaginal-dilator-card-square--p85.svg"},
		"intimate-care": {"intimate-care-card-wide--p81.svg", "intimate-care-card-square--p87.svg"},
		"sexual-health": {"sexual-health-card-wide--p80.svg", "sexual-health-card-square--p86.svg"},
		"violence":      {"violence-card-wide--p82.svg", "violence-card-square--p88.svg"},
	}
	records := map[string]*core.Record{}
	for key, names := range art {
		r := core.NewRecord(collection)
		r.Set("sourceKey", key)
		r.Set("name", "Reviewed "+key)
		r.Set("description", "Keep the resource text")
		if err := app.Save(r); err != nil {
			t.Fatal(err)
		}
		records[key] = r
		for _, name := range names {
			data := []byte(`<svg xmlns="http://www.w3.org/2000/svg"><title>` + name + `</title></svg>`)
			if err := os.WriteFile(filepath.Join(assets, name), data, 0600); err != nil {
				t.Fatal(err)
			}
		}
	}
	// An editorial replacement must take precedence, including on small screens.
	custom, err := filesystem.NewFileFromBytes([]byte(`<svg xmlns="http://www.w3.org/2000/svg"><title>Custom</title></svg>`), "custom.svg")
	if err != nil {
		t.Fatal(err)
	}
	records["violence"].Set("image", custom)
	if err := app.Save(records["violence"]); err != nil {
		t.Fatal(err)
	}
	customName := records["violence"].GetString("image")
	// Validate the whole set before writing any records.
	missing := filepath.Join(assets, art["dilator"][1])
	missingData, _ := os.ReadFile(missing)
	if err := os.Remove(missing); err != nil {
		t.Fatal(err)
	}
	if _, err := SeedCardImages(app, assets); err == nil {
		t.Fatal("missing packaged artwork must fail")
	}
	for key, r := range records {
		if key == "violence" {
			continue
		}
		stored, _ := app.FindRecordById(collection, r.Id)
		if stored.GetString("image") != "" {
			t.Fatal("preflight failure partially updated artwork")
		}
	}
	if err := os.WriteFile(missing, missingData, 0600); err != nil {
		t.Fatal(err)
	}
	changed, err := SeedCardImages(app, assets)
	if err != nil || changed != 4 {
		t.Fatalf("seed: changed=%d, error=%v", changed, err)
	}
	fs, err := app.NewFilesystem()
	if err != nil {
		t.Fatal(err)
	}
	defer fs.Close()
	for key, original := range records {
		r, err := app.FindRecordById(collection, original.Id)
		if err != nil {
			t.Fatal(err)
		}
		if r.GetString("name") != "Reviewed "+key || r.GetString("description") != "Keep the resource text" {
			t.Fatal("seed changed content")
		}
		if key == "violence" {
			if r.GetString("image") != customName || r.GetString("imageCompact") != "" {
				t.Fatal("custom art was overridden")
			}
			continue
		}
		for i, field := range []string{"image", "imageCompact"} {
			reader, err := fs.GetFile(r.BaseFilesPath() + "/" + r.GetString(field))
			if err != nil {
				t.Fatal(err)
			}
			data, err := io.ReadAll(reader)
			reader.Close()
			if err != nil {
				t.Fatal(err)
			}
			expected, _ := os.ReadFile(filepath.Join(assets, art[key][i]))
			if !bytes.Equal(data, expected) {
				t.Fatalf("incorrect %s artwork for %s", field, key)
			}
		}
	}
	changed, err = SeedCardImages(app, assets)
	if err != nil || changed != 0 {
		t.Fatalf("repeat seed should be a no-op: %d, %v", changed, err)
	}
	answers, _ := app.FindAllRecords("answers")
	if len(answers) != 1 || answers[0].GetString("sentinel") != "must remain untouched" {
		t.Fatal("seed changed answers")
	}
}
