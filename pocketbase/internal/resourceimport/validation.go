package resourceimport

import "fmt"

func requireType(object Values, key, kind string, optional bool) error {
	v, exists := object[key]
	if !exists && optional {
		return nil
	}
	valid := false
	switch kind {
	case "array":
		_, valid = v.([]any)
	case "object":
		_, valid = v.(map[string]any)
	case "string":
		_, valid = v.(string)
	case "boolean":
		_, valid = v.(bool)
	case "number":
		_, valid = v.(float64)
	}
	if !valid {
		return fmt.Errorf("%s must be %s", key, kind)
	}
	return nil
}
func strictBlockShape(b Values) error {
	typ := str(b["type"])
	types := map[string]string{}
	required := []string{}
	switch typ {
	case "paragraph", "subheading", "quote", "linkButton":
		types = map[string]string{"inline": "array", "href": "string"}
		required = []string{"inline"}
	case "image", "video":
		types = map[string]string{"asset": "string", "alt": "string", "decorative": "boolean", "width": "number", "height": "number", "url": "string", "crop": "object", "placeholder": "boolean"}
		required = []string{"asset", "alt"}
	case "list":
		types = map[string]string{"ordered": "boolean", "start": "number", "items": "array"}
		required = []string{"ordered", "items"}
	case "columns":
		types = map[string]string{"columns": "array"}
		required = []string{"columns"}
	case "callout":
		types = map[string]string{"tone": "string", "blocks": "array"}
		required = []string{"tone", "blocks"}
	case "audienceGroup":
		types = map[string]string{"audience": "object", "blocks": "array"}
		required = []string{"audience", "blocks"}
	default:
		return fmt.Errorf("unknown block %s", typ)
	}
	for k := range b {
		if k != "type" && k != "source" && types[k] == "" {
			return fmt.Errorf("unknown %s field %s", typ, k)
		}
	}
	for k, t := range types {
		if err := requireType(b, k, t, !contains(required, k)); err != nil {
			return err
		}
	}
	return nil
}

// Publication invariants cannot be waived merely by editing the issue list.
func publicationIssues(b *Bundle) []Issue {
	issues := []Issue{}
	var walk func(any, string)
	walk = func(v any, key string) {
		switch x := v.(type) {
		case map[string]any:
			typ := str(x["type"])
			if (typ == "image" || typ == "video") && str(x["alt"]) == "" && x["decorative"] != true {
				issues = append(issues, Issue{Code: "missing-alt", Message: "Alternative text or decorative classification required: " + key, Blocking: true})
			}
			if typ == "video" && str(x["url"]) == "" && x["placeholder"] != true {
				issues = append(issues, Issue{Code: "missing-video", Message: "Verified video link required: " + key, Blocking: true})
			}
			if typ == "linkButton" && str(x["href"]) == "" {
				issues = append(issues, Issue{Code: "missing-button-target", Message: "Link-button URL required: " + key, Blocking: true})
			}
			for _, val := range x {
				walk(val, key)
			}
		case []any:
			for _, val := range x {
				walk(val, key)
			}
		}
	}
	for _, e := range append(append([]Entry{}, b.Resources...), b.Collections...) {
		walk(e.Content, e.SourceKey)
	}
	return issues
}
