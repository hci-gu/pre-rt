// Package testquestionnaires restores reviewed content definitions in disposable
// test databases. It never imports users, answers, resources or collections.
package testquestionnaires

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type Snapshot struct {
	Version int                         `json:"version"`
	Records map[string][]map[string]any `json:"records"`
}

func Apply(app core.App, raw []byte) (int, error) {
	return apply(app, raw, false)
}

// Prepare creates the graph before resource publication checks question remaps.
// Missing help targets stay empty until the strict Apply after publication.
// This is only used by the test init container; no requests are served between
// the two phases and a failed strict Apply prevents startup.
func Prepare(app core.App, raw []byte) (int, error) {
	return apply(app, raw, true)
}

func apply(app core.App, raw []byte, deferMissingHelp bool) (int, error) {
	var snapshot Snapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return 0, err
	}
	order := []string{"questionOptions", "questions", "questionnaires"}
	allowed := map[string]bool{"questionOptions": true, "questions": true, "questionnaires": true}
	if snapshot.Version != 1 || len(snapshot.Records) != 3 {
		return 0, fmt.Errorf("unsupported questionnaire snapshot")
	}
	for table := range snapshot.Records {
		if !allowed[table] {
			return 0, fmt.Errorf("collection outside scope: %s", table)
		}
	}
	changed := 0
	err := app.RunInTransaction(func(tx core.App) error {
		for _, table := range order {
			collection, err := tx.FindCollectionByNameOrId(table)
			if err != nil {
				return err
			}
			for _, row := range snapshot.Records[table] {
				id, ok := row["id"].(string)
				if !ok || id == "" {
					return fmt.Errorf("missing %s id", table)
				}
				record, err := tx.FindRecordById(table, id)
				if err != nil && !errors.Is(err, sql.ErrNoRows) {
					return err
				}
				isNew := record == nil
				if isNew {
					record = core.NewRecord(collection)
					record.Id = id
				}
				values := map[string]any{}
				for field, value := range row {
					if field == "id" {
						continue
					}
					if field == "help" && table == "questions" {
						help, ok := value.(map[string]any)
						if !ok {
							return fmt.Errorf("invalid help mapping on %s", id)
						}
						for _, relation := range []string{"resource", "resourceCollection"} {
							values[relation] = ""
							if key, exists := help[relation]; exists {
								target, err := tx.FindFirstRecordByFilter(relation, "sourceKey = {:key} && archived = false", dbx.Params{"key": key})
								if errors.Is(err, sql.ErrNoRows) && deferMissingHelp {
									continue
								}
								if err != nil {
									return fmt.Errorf("%s help %v: %w", id, key, err)
								}
								values[relation] = target.Id
							}
						}
						continue
					}
					if field == "created" || field == "updated" || collection.Fields.GetByName(field) == nil {
						return fmt.Errorf("unsupported field %s.%s", table, field)
					}
					values[field] = value
				}
				different := isNew
				for field, value := range values {
					before, _ := json.Marshal(record.Get(field))
					record.Set(field, value)
					after, _ := json.Marshal(record.Get(field))
					if !bytes.Equal(before, after) {
						different = true
					}
				}
				if different {
					// Relations can point forward. Validate the complete graph below,
					// before the transaction commits any definition.
					if err = tx.SaveNoValidate(record); err != nil {
						return err
					}
					changed++
				}
			}
		}
		for _, table := range order {
			for _, row := range snapshot.Records[table] {
				record, err := tx.FindRecordById(table, row["id"].(string))
				if err != nil {
					return err
				}
				if err = tx.Validate(record); err != nil {
					return fmt.Errorf("%s/%v: %w", table, row["id"], err)
				}
			}
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return changed, nil
}
