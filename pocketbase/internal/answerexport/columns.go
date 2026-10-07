package answerexport

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

// QuestionKeys retains the questionnaire's declared order, then adds every
// stored key. Conditional questions have composite keys and are not present in
// the parent's questions relation. Historical keys must not disappear either.
func QuestionKeys(declared []string, answers []*core.Record) []string {
	keys := append([]string(nil), declared...)
	seen := map[string]bool{}
	for _, key := range keys {
		seen[key] = true
	}
	extras := []string{}
	for _, answer := range answers {
		values := map[string]any{}
		if json.Unmarshal([]byte(answer.GetString("answers")), &values) != nil {
			continue
		}
		for key := range values {
			if !seen[key] {
				extras = append(extras, key)
				seen[key] = true
			}
		}
	}
	sort.Strings(extras)
	return append(keys, extras...)
}

// SourceQuestion identifies known composite keys used by the questionnaire
// renderer, allowing human headers and multiple-choice options to be reused.
func SourceQuestion(key string) string {
	parts := strings.Split(key, "_")
	if len(parts) == 2 || (len(parts) == 3 && parts[0] == "followup") {
		return parts[len(parts)-1]
	}
	return key
}
