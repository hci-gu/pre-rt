package answerexport

import (
	"reflect"
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestQuestionKeysKeepConditionalAndHistoricalAnswers(t *testing.T) {
	collection := core.NewBaseCollection("answers")
	collection.Fields.Add(&core.JSONField{Name: "answers"})
	one := core.NewRecord(collection)
	one.Set("answers", map[string]any{"gate": "Ja", "followup_pcl_symptom": "Måttligt", "gate_length": "10cm", "historical": "retained"})
	two := core.NewRecord(collection)
	two.Set("answers", map[string]any{"gate": "Nej"})
	keys := QuestionKeys([]string{"gate", "length"}, []*core.Record{one, two})
	want := []string{"gate", "length", "followup_pcl_symptom", "gate_length", "historical"}
	if !reflect.DeepEqual(keys, want) {
		t.Fatalf("export keys = %v; want %v", keys, want)
	}
	if SourceQuestion("followup_pcl_symptom") != "symptom" || SourceQuestion("gate_length") != "length" || SourceQuestion("historical") != "historical" {
		t.Fatal("composite question metadata mapping failed")
	}
}
