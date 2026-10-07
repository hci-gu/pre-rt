package resourceimport

import "encoding/json"

func unmarshalNormalized(a, b any) error {
	data, e := json.Marshal(a)
	if e != nil {
		return e
	}
	return json.Unmarshal(data, b)
}
