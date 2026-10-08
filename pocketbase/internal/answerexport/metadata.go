package answerexport

import (
	"archive/zip"
	"encoding/csv"
	"strconv"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

type QuestionInfo struct {
	Name    string
	Type    string
	Options []string
}

func MissingAnswer(value any) bool {
	switch v := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(v) == ""
	case []any:
		return len(v) == 0
	case []string:
		return len(v) == 0
	}
	return false
}

// ResolveInfo follows the same composite keys as the questionnaire renderer.
// Option follow-ups are scalar answers, even when their parent is multiple choice.
func ResolveInfo(key string, questions map[string]QuestionInfo, questionnaires map[string]string) QuestionInfo {
	if info, ok := questions[key]; ok {
		return info
	}
	parts := strings.Split(key, "_")
	if len(parts) > 1 {
		if index, err := strconv.Atoi(parts[len(parts)-1]); err == nil {
			parent := ResolveInfo(strings.Join(parts[:len(parts)-1], "_"), questions, questionnaires)
			if index >= 0 && index < len(parent.Options) {
				return QuestionInfo{Name: parent.Name + " — " + parent.Options[index] + " — Följdsvar", Type: "singleChoice"}
			}
		}
		if len(parts) == 2 {
			if child, ok := questions[parts[1]]; ok {
				parent := ResolveInfo(parts[0], questions, questionnaires)
				child.Name = parent.Name + " — " + child.Name
				return child
			}
		}
		if len(parts) == 3 && parts[0] == "followup" {
			if child, ok := questions[parts[2]]; ok {
				name := questionnaires[parts[1]]
				if name == "" {
					name = parts[1]
				}
				child.Name = name + " — " + child.Name
				return child
			}
		}
	}
	// Preserve historical answers even if their source question was removed.
	return QuestionInfo{Name: key}
}

// Repeated wording is legal in questionnaire definitions. Disambiguate only
// collisions, using the stable ID header so spreadsheet imports cannot merge them.
func UniqueHeaders(names, ids []string) []string {
	counts := map[string]int{}
	for _, name := range names {
		counts[name]++
	}
	result := append([]string(nil), names...)
	used := map[string]bool{}
	for i, name := range result {
		if counts[name] > 1 {
			name += " [" + ids[i] + "]"
		}
		for used[name] {
			name += " [" + ids[i] + "]"
		}
		used[name] = true
		result[i] = name
	}
	return result
}

// Explicit allowlist: contact details and auth fields never enter the study export.
func WriteParticipants(writer *zip.Writer, participants []*core.Record) error {
	file, err := writer.Create("participants.csv")
	if err != nil {
		return err
	}
	csvWriter := csv.NewWriter(file)
	fields := []string{"id", "code", "diagnosis", "type", "treatmentStart", "treatmentEnd"}
	if err := csvWriter.Write(fields); err != nil {
		return err
	}
	for _, participant := range participants {
		row := make([]string, len(fields))
		for i, field := range fields {
			row[i] = participant.GetString(field)
		}
		if err := csvWriter.Write(row); err != nil {
			return err
		}
	}
	csvWriter.Flush()
	return csvWriter.Error()
}
