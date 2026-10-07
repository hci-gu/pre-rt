package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Production questionnaires already have these fields. Older local/test
// schemas omitted them, losing the baseline -> PCL-5 dependency graph.
func ensureQuestionnaireFollowupFields(app core.App) error {
	forms, err := app.FindCollectionByNameOrId("questionnaires")
	if err != nil {
		return err
	}
	questions, err := app.FindCollectionByNameOrId("questions")
	if err != nil {
		return err
	}
	fields := []core.Field{
		&core.RelationField{Id: "relation794318085", Name: "dependency", CollectionId: questions.Id, MaxSelect: 999},
		&core.JSONField{Id: "json2553692341", Name: "dependencyValue"},
		&core.RelationField{Id: "relation488274491", Name: "followup", CollectionId: forms.Id, MaxSelect: 999},
	}
	changed := false
	for _, field := range fields {
		if forms.Fields.GetByName(field.GetName()) == nil {
			forms.Fields.Add(field)
			changed = true
		}
	}
	if !changed {
		return nil
	}
	return app.Save(forms)
}

func init() {
	m.Register(ensureQuestionnaireFollowupFields, func(app core.App) error {
		// Preserve questionnaire connections and values on rollback.
		return nil
	})
}
