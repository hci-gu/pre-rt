package resourceimport

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const Owner = "resources.docx"

type Values = map[string]any
type Issue struct {
	Source     Values `json:"source,omitempty"`
	Resource   string `json:"resource,omitempty"`
	Evidence   any    `json:"evidence,omitempty"`
	Resolution string `json:"resolution,omitempty"`
	Code       string `json:"code"`
	Message    string `json:"message"`
	Blocking   bool   `json:"blocking"`
	ID         string `json:"id,omitempty"`
}
type Entry struct {
	SourceKey     string   `json:"sourceKey"`
	ExistingID    string   `json:"existingId"`
	Title         string   `json:"title"`
	Name          string   `json:"name"`
	Collection    string   `json:"collection"`
	Resources     []string `json:"resources"`
	Visible       bool     `json:"visible"`
	ShowQuickExit bool     `json:"showQuickExit"`
	Sort          int      `json:"sort"`
	Content       Values   `json:"content"`
	TitleHistory  []string `json:"titleHistory"`
}
type Asset struct {
	Key       string `json:"key"`
	Path      string `json:"path"`
	MediaType string `json:"mediaType"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
}
type Remap struct {
	Collection string `json:"collection"`
	ID         string `json:"id"`
	Field      string `json:"field"`
	Target     string `json:"target"`
}
type Retirement struct {
	Collection string `json:"collection"`
	ID         string `json:"id"`
}
type Bundle struct {
	CompiledHash       string       `json:"bundleHash"`
	SchemaVersion      int          `json:"schemaVersion"`
	ParserVersion      string       `json:"parserVersion"`
	SourceDocumentHash string       `json:"sourceDocumentHash"`
	ManifestHash       string       `json:"manifestHash"`
	Collections        []Entry      `json:"collections"`
	Resources          []Entry      `json:"resources"`
	Assets             []Asset      `json:"assets"`
	Issues             []Issue      `json:"issues"`
	Retirements        []Retirement `json:"retirements"`
	RelationRemaps     []Remap      `json:"relationRemaps"`
}
type Operation struct {
	MetadataBefore  Values `json:"metadataBefore,omitempty"`
	RestoreMetadata Values `json:"restoreMetadata,omitempty"`
	Collection      string `json:"collection"`
	ID              string `json:"id"`
	Key             string `json:"sourceKey"`
	Before          Values `json:"before"`
	After           Values `json:"after"`
	Kind            string `json:"kind"`
}
type Coverage struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Disposition string   `json:"disposition"`
	References  []string `json:"references"`
}
type Plan struct {
	CompiledBundleHash string      `json:"compiledBundleHash"`
	Version            int         `json:"version"`
	Target             string      `json:"target"`
	StateHash          string      `json:"stateHash"`
	BundlePath         string      `json:"bundlePath"`
	BundleHash         string      `json:"bundleHash"`
	Review             bool        `json:"review"`
	Operations         []Operation `json:"operations"`
	Issues             []Issue     `json:"issues"`
	Coverage           []Coverage  `json:"coverage"`
	PreferSource       []string    `json:"preferSource"`
	RollbackOf         string      `json:"rollbackOf,omitempty"`
}

func Hash(v any) string         { b, _ := json.Marshal(v); return HashBytes(b) }
func HashBytes(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func ReadJSON(path string, v any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}
func WriteJSON(path string, v any) error {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	if err = os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	return os.WriteFile(path, append(b, '\n'), 0600)
}
func Normalize(v any) any { b, _ := json.Marshal(v); var x any; _ = json.Unmarshal(b, &x); return x }
func str(v any) string    { s, _ := v.(string); return s }
func vals(v any) Values   { x, _ := Normalize(v).(map[string]any); return x }
func arr(v any) []any     { x, _ := Normalize(v).([]any); return x }

var keyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9.-]{0,100}$`)
var hashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)
var idPattern = regexp.MustCompile(`^[a-z0-9]{15}$`)

func assetPath(base string, a Asset) (string, error) {
	if a.Path != "assets/"+a.Key+".png" || !hashPattern.MatchString(a.Key) {
		return "", fmt.Errorf("unsafe asset path %q", a.Path)
	}
	path := filepath.Join(filepath.Dir(base), filepath.FromSlash(a.Path))
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		return "", err
	}
	root, err := filepath.EvalSymlinks(filepath.Dir(base))
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(root, resolved)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("asset outside bundle directory")
	}
	data, err := os.ReadFile(resolved)
	if err != nil {
		return "", err
	}
	if HashBytes(data) != a.Key {
		return "", fmt.Errorf("asset hash mismatch: %s", a.Key)
	}
	if len(data) < 24 || string(data[:8]) != "\x89PNG\r\n\x1a\n" {
		return "", fmt.Errorf("invalid PNG")
	}
	return resolved, nil
}
func safeURL(s string) bool {
	if s == "" {
		return true
	}
	u, e := url.Parse(s)
	if e != nil {
		return false
	}
	if u.Scheme == "https" {
		return u.Host != "" && u.User == nil
	}
	if u.Scheme == "tel" {
		return regexp.MustCompile(`^tel:[+0-9 ()-]+$`).MatchString(s)
	}
	if u.Scheme == "mailto" {
		return !strings.ContainsAny(s, "\r\n") && u.Opaque != ""
	}
	return false
}
func ValidateBundle(b *Bundle, path string) error {
	if b.SchemaVersion != 1 || b.ParserVersion == "" || !hashPattern.MatchString(b.SourceDocumentHash) || !hashPattern.MatchString(b.ManifestHash) {
		return fmt.Errorf("invalid bundle metadata")
	}
	keys := map[string]bool{}
	resources := map[string]bool{}
	assets := map[string]bool{}
	for _, a := range b.Assets {
		if assets[a.Key] {
			return fmt.Errorf("duplicate asset")
		}
		assets[a.Key] = true
		if _, e := assetPath(path, a); e != nil {
			return e
		}
	}
	for _, e := range append(append([]Entry{}, b.Resources...), b.Collections...) {
		if !keyPattern.MatchString(e.SourceKey) || keys[e.SourceKey] {
			return fmt.Errorf("invalid/duplicate source key %s", e.SourceKey)
		}
		keys[e.SourceKey] = true
		if e.ExistingID != "" && !idPattern.MatchString(e.ExistingID) {
			return fmt.Errorf("invalid existing ID")
		}
	}
	for _, r := range b.Resources {
		resources[r.SourceKey] = true
		if r.Title == "" {
			return fmt.Errorf("resource title missing")
		}
	}
	for _, c := range b.Collections {
		if c.Name == "" {
			return fmt.Errorf("collection name missing")
		}
		seen := map[string]bool{}
		for _, k := range c.Resources {
			if !resources[k] || seen[k] {
				return fmt.Errorf("invalid collection member %s", k)
			}
			seen[k] = true
		}
	}
	membership := map[string]string{}
	for _, c := range b.Collections {
		for _, k := range c.Resources {
			if membership[k] != "" {
				return fmt.Errorf("resource belongs to multiple source collections")
			}
			membership[k] = c.SourceKey
		}
	}
	for _, r := range b.Resources {
		if membership[r.SourceKey] != r.Collection || r.Collection == "" {
			return fmt.Errorf("resource has inconsistent collection membership")
		}
	}
	for _, e := range append(append([]Entry{}, b.Resources...), b.Collections...) {
		if err := validateContent(e.Content, keys, assets); err != nil {
			return fmt.Errorf("%s: %w", e.SourceKey, err)
		}
	}
	return nil
}
func validateAudience(a Values) error {
	for k, v := range a {
		allowed := map[string]bool{}
		switch k {
		case "arms":
			allowed = map[string]bool{"PRE": true, "POST": true}
		case "phases":
			allowed = map[string]bool{"before": true, "during": true, "after": true}
		case "diagnoses": // backend values, mapped explicitly by the author
			allowed = map[string]bool{"cervix": true, "anal": true, "corpus": true}
		default:
			return fmt.Errorf("unknown audience dimension %s", k)
		}
		if len(arr(v)) == 0 {
			return fmt.Errorf("empty audience filter")
		}
		for _, x := range arr(v) {
			if !allowed[str(x)] {
				return fmt.Errorf("unsupported audience value %v", x)
			}
		}
	}
	return nil
}
func validateContent(c Values, keys, assets map[string]bool) error {
	if err := requireType(c, "audience", "object", false); err != nil {
		return err
	}
	if err := requireType(c, "blocks", "array", false); err != nil {
		return err
	}
	if err := requireType(c, "footer", "array", true); err != nil {
		return err
	}
	for k := range c {
		if !contains([]string{"schemaVersion", "audience", "blocks", "footer"}, k) {
			return fmt.Errorf("unknown content field %s", k)
		}
	}
	if c["schemaVersion"] != float64(1) {
		return fmt.Errorf("unknown content version")
	}
	if err := validateAudience(vals(c["audience"])); err != nil {
		return err
	}
	for _, name := range []string{"blocks", "footer"} {
		if c[name] != nil {
			if err := validateBlocks(arr(c[name]), keys, assets, 0); err != nil {
				return err
			}
		}
	}
	return nil
}
func validateBlocks(blocks []any, keys, assets map[string]bool, depth int) error {
	if depth > 20 {
		return fmt.Errorf("content nesting too deep")
	}
	for _, v := range blocks {
		b := vals(v)
		if err := strictBlockShape(b); err != nil {
			return err
		}
		typ := str(b["type"])
		switch typ {
		case "paragraph", "subheading", "quote", "linkButton":
			for _, n := range arr(b["inline"]) {
				in := vals(n)
				for k := range in {
					kind := "string"
					switch k {
					case "text", "href", "target":
					case "bold", "italic", "underline":
						kind = "boolean"
					default:
						return fmt.Errorf("unknown inline field %s", k)
					}
					if err := requireType(in, k, kind, false); err != nil {
						return err
					}
				}
				if _, ok := in["text"].(string); !ok {
					return fmt.Errorf("missing inline text")
				}
				if !safeURL(str(in["href"])) {
					return fmt.Errorf("unsafe inline link")
				}
				if t := str(in["target"]); t != "" && !keys[t] {
					return fmt.Errorf("unknown internal target")
				}
			}
			if !safeURL(str(b["href"])) {
				return fmt.Errorf("unsafe button link")
			}
		case "image", "video":
			if !assets[str(b["asset"])] {
				return fmt.Errorf("missing image asset")
			}
			if !safeURL(str(b["url"])) {
				return fmt.Errorf("unsafe media URL")
			}
			for k, v := range vals(b["crop"]) {
				n, ok := v.(float64)
				if !ok || n < 0 || n >= 1 || !strings.Contains(" l r t b ", " "+k+" ") {
					return fmt.Errorf("invalid crop")
				}
			}
		case "callout", "audienceGroup":
			if typ == "callout" && b["tone"] != "advice" && b["tone"] != "emergency" {
				return fmt.Errorf("unknown callout tone")
			}
			if err := validateAudience(vals(b["audience"])); err != nil {
				return err
			}
			if err := validateBlocks(arr(b["blocks"]), keys, assets, depth+1); err != nil {
				return err
			}
		case "list":
			for _, item := range arr(b["items"]) {
				if err := requireType(vals(item), "blocks", "array", false); err != nil {
					return err
				}
				if err := validateBlocks(arr(vals(item)["blocks"]), keys, assets, depth+1); err != nil {
					return err
				}
			}
		case "columns":
			for _, col := range arr(b["columns"]) {
				if _, ok := col.([]any); !ok {
					return fmt.Errorf("column must be array")
				}
				if err := validateBlocks(arr(col), keys, assets, depth+1); err != nil {
					return err
				}
			}
		default:
			return fmt.Errorf("unsupported block type %q", typ)
		}
	}
	return nil
}
