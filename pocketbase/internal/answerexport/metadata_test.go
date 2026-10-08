package answerexport

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"reflect"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestFollowupMetadataKeepsContextAndScalarDetails(t *testing.T) {
	questions := map[string]QuestionInfo{
		"threats": {Name: "Hotad?"}, "injuries": {Name: "Skadad?"},
		"period":  {Name: "När?", Type: "multipleChoice", Options: []string{"Senaste året", "Som barn"}},
		"symptom": {Name: "Sömn?", Type: "singleChoice"},
	}
	forms := map[string]string{"pcl": "PCL-5"}
	threat := ResolveInfo("threats_period", questions, forms)
	injury := ResolveInfo("injuries_period", questions, forms)
	if threat.Name != "Hotad? — När?" || injury.Name != "Skadad? — När?" || !reflect.DeepEqual(threat.Options, questions["period"].Options) {
		t.Fatalf("lost parent context or options: %+v %+v", threat, injury)
	}
	detail := ResolveInfo("threats_period_1", questions, forms)
	if detail.Name != "Hotad? — När? — Som barn — Följdsvar" || detail.Type != "singleChoice" || len(detail.Options) != 0 {
		t.Fatalf("option detail must be a labelled scalar: %+v", detail)
	}
	if got := ResolveInfo("followup_pcl_symptom", questions, forms); got.Name != "PCL-5 — Sömn?" {
		t.Fatal(got)
	}
	if got := ResolveInfo("period_0", questions, forms); got.Name != "När? — Senaste året — Följdsvar" {
		t.Fatal(got)
	}
	for _, key := range []string{"deleted", "threats_period_99", "threats_period_-1"} {
		if got := ResolveInfo(key, questions, forms); got.Name != key {
			t.Fatalf("unknown key was mislabelled: %+v", got)
		}
	}
}

func TestMissingIsDistinctFromExplicitNegativeAndZero(t *testing.T) {
	for _, value := range []any{nil, "", " \n", []any{}, []string{}} {
		if !MissingAnswer(value) {
			t.Fatalf("missing answer treated as answered: %#v", value)
		}
	}
	for _, value := range []any{0, false, "Nej", []any{"Nej"}, []string{"0"}} {
		if MissingAnswer(value) {
			t.Fatalf("valid answer treated as missing: %#v", value)
		}
	}
}

func TestRepeatedHumanHeadersRemainDistinct(t *testing.T) {
	got := UniqueHeaders([]string{"id", "När?", "När?", "Annat"}, []string{"id", "a", "b", "c"})
	if !reflect.DeepEqual(got, []string{"id", "När? [a]", "När? [b]", "Annat"}) {
		t.Fatal(got)
	}
}

func TestParticipantCSVContainsOnlyStudyFieldsAndPreservesQuotedText(t *testing.T) {
	collection := core.NewAuthCollection("users")
	for _, field := range []string{"code", "diagnosis", "type", "treatmentStart", "treatmentEnd", "phoneNumber"} {
		collection.Fields.Add(&core.TextField{Name: field})
	}
	user := core.NewRecord(collection)
	user.Id = "participant0001"
	user.Set("code", "Studie, \"åäö\"")
	user.Set("diagnosis", "corpus")
	user.Set("type", "PRE")
	user.Set("treatmentStart", "2026-10-05 00:00:00.000Z")
	user.Set("phoneNumber", "0700000099")
	user.Set("email", "private@example.test")
	var buf bytes.Buffer
	writer := zip.NewWriter(&buf)
	if err := WriteParticipants(writer, []*core.Record{user}); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	archive, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	file, err := archive.File[0].Open()
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	rows, err := csv.NewReader(file).ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(rows[0], []string{"id", "code", "diagnosis", "type", "treatmentStart", "treatmentEnd"}) {
		t.Fatal(rows[0])
	}
	if !reflect.DeepEqual(rows[1], []string{user.Id, "Studie, \"åäö\"", "corpus", "PRE", "2026-10-05 00:00:00.000Z", ""}) {
		t.Fatal(rows[1])
	}
	if strings.Contains(strings.Join(rows[1], ","), "private") {
		t.Fatal("contact details leaked")
	}
}
