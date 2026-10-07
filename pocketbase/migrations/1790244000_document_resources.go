package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"myapp/internal/resourceimport"
)

func init() {
	m.Register(resourceimport.EnsureSchema, func(app core.App) error { return nil }) // preserve imported content on rollback
}
