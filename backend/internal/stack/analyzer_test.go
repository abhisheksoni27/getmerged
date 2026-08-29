package stack

import (
	"testing"
)

func TestParsePackageJSON(t *testing.T) {
	manifest := `{
		"name": "my-app",
		"dependencies": {
			"next": "15.0.0",
			"react": "19.0.0",
			"tailwindcss": "^3.4.0"
		},
		"devDependencies": {
			"typescript": "^5.0.0",
			"@types/react": "^19.0.0"
		}
	}`

	deps, err := ParseManifest(ManifestPackageJSON, manifest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deps) != 5 {
		t.Fatalf("expected 5 dependencies, got %d", len(deps))
	}

	names := make(map[string]bool)
	for _, d := range deps {
		names[d.Name] = true
	}

	if !names["next"] || !names["react"] || !names["tailwindcss"] || !names["typescript"] || !names["@types/react"] {
		t.Errorf("missing expected dependency, got %+v", deps)
	}
}

func TestParseGoMod(t *testing.T) {
	manifest := `module myapp

go 1.22

require (
	github.com/gin-gonic/gin v1.10.0
	github.com/jmoiron/sqlx v1.4.0 // indirect
)

require github.com/stretchr/testify v1.9.0
`

	deps, err := ParseManifest(ManifestGoMod, manifest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deps) != 3 {
		t.Fatalf("expected 3 dependencies, got %d: %+v", len(deps), deps)
	}

	names := make(map[string]bool)
	for _, d := range deps {
		names[d.Name] = true
	}

	if !names["github.com/gin-gonic/gin"] || !names["github.com/jmoiron/sqlx"] || !names["github.com/stretchr/testify"] {
		t.Errorf("missing expected go modules, got %+v", deps)
	}
}

func TestParseCargoToml(t *testing.T) {
	manifest := `[package]
name = "my-cli"
version = "0.1.0"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
serde = "1.0"
reqwest = "0.11"

[dev-dependencies]
tempfile = "3.8"
`

	deps, err := ParseManifest(ManifestCargoToml, manifest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deps) != 4 {
		t.Fatalf("expected 4 dependencies, got %d: %+v", len(deps), deps)
	}

	names := make(map[string]bool)
	for _, d := range deps {
		names[d.Name] = true
	}

	if !names["tokio"] || !names["serde"] || !names["reqwest"] || !names["tempfile"] {
		t.Errorf("missing expected cargo dependencies, got %+v", deps)
	}
}

func TestParseRequirementsTxt(t *testing.T) {
	manifest := `# Production dependencies
fastapi==0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.0
# Comment line
requests~=2.31.0
`

	deps, err := ParseManifest(ManifestRequirementsTxt, manifest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deps) != 4 {
		t.Fatalf("expected 4 dependencies, got %d: %+v", len(deps), deps)
	}
}

func TestAnalyzer_ManualPackages(t *testing.T) {
	analyzer := NewAnalyzer(nil)
	res, err := analyzer.AnalyzeStack(ManifestPackageJSON, "", []string{"next", "tailwindcss"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Summary.TotalDependencies != 2 {
		t.Fatalf("expected 2 total dependencies, got %d", res.Summary.TotalDependencies)
	}
}
