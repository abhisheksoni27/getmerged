package audit

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseMarkdownCensus_FullCoverage(t *testing.T) {
	docPath := filepath.Join("..", "..", "..", "OPENDOOR_NEXT_STEPS.md")
	content, err := os.ReadFile(docPath)
	if err != nil {
		t.Fatalf("failed to read OPENDOOR_NEXT_STEPS.md: %v", err)
	}

	census, err := ParseCensus(string(content))
	if err != nil {
		t.Fatalf("ParseCensus failed: %v", err)
	}

	if len(census.Items) == 0 {
		t.Fatalf("expected non-empty census items, got 0")
	}

	// Verify that sections 0 through 12 are all present
	sectionsFound := make(map[string]bool)
	for _, item := range census.Items {
		sectionsFound[item.Section] = true
	}

	for sec := 0; sec <= 12; sec++ {
		secPrefix := "sec" + string(rune('0'+sec))
		if sec >= 10 {
			secPrefix = "sec" + string(rune('0'+sec/10)) + string(rune('0'+sec%10))
		}
		found := false
		for k := range sectionsFound {
			if strings.HasPrefix(strings.ToLower(k), secPrefix) || strings.HasPrefix(strings.ToLower(k), "section "+string(rune('0'+sec))) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected section %d to be extracted in census, but it was not found in %v", sec, sectionsFound)
		}
	}
}

func TestAuditCensus_100PercentMappedAgainstLiveDocument(t *testing.T) {
	docPath := filepath.Join("..", "..", "..", "OPENDOOR_NEXT_STEPS.md")
	content, err := os.ReadFile(docPath)
	if err != nil {
		t.Fatalf("failed to read OPENDOOR_NEXT_STEPS.md: %v", err)
	}

	census, err := ParseCensus(string(content))
	if err != nil {
		t.Fatalf("ParseCensus failed: %v", err)
	}

	repoRoot := filepath.Join("..", "..", "..")
	engine := NewAuditEngine(repoRoot, census)
	unmapped := engine.GetUnmappedItems()

	if len(unmapped) > 0 {
		var unmappedKeys []string
		for _, u := range unmapped {
			unmappedKeys = append(unmappedKeys, fmt.Sprintf("[%s] line %d: %s (Key: %s)", u.Section, u.LineNumber, u.Title, u.Key))
		}
		t.Fatalf("Found %d unmapped items in OPENDOOR_NEXT_STEPS.md census:\n%s", len(unmapped), strings.Join(unmappedKeys, "\n"))
	}
}

func TestCensus_HardFailOnUnmappedItem(t *testing.T) {
	fakeMarkdown := `
# Fake Roadmap
## 1. Moats
- **Story 1.1**: Real existing story.
- **Story 99.9**: Brand new unmapped rogue story deliverable.
`
	census, err := ParseCensus(fakeMarkdown)
	if err != nil {
		t.Fatalf("ParseCensus failed: %v", err)
	}

	engine := NewAuditEngine(".", census)
	unmapped := engine.GetUnmappedItems()
	if len(unmapped) == 0 {
		t.Fatalf("expected unmapped items for rogue Story 99.9, but got 0")
	}

	foundRogue := false
	for _, u := range unmapped {
		if strings.Contains(u.Key, "99.9") || strings.Contains(u.Title, "rogue") {
			foundRogue = true
			break
		}
	}
	if !foundRogue {
		t.Errorf("expected unmapped list to contain rogue Story 99.9, got: %v", unmapped)
	}
}

func TestProbeOracle_MultiSurface(t *testing.T) {
	// Create a temporary mock repository filesystem
	tmpDir := t.TempDir()

	// 1. Create frontend route structure
	feRouteDir := filepath.Join(tmpDir, "frontend", "src", "app", "topics", "[topic]")
	if err := os.MkdirAll(feRouteDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(feRouteDir, "page.tsx"), []byte("// topic page"), 0644); err != nil {
		t.Fatal(err)
	}

	// 2. Create backend main.go with registered routes
	backendDir := filepath.Join(tmpDir, "backend", "cmd", "server")
	if err := os.MkdirAll(backendDir, 0755); err != nil {
		t.Fatal(err)
	}
	mainGoContent := `package main
func main() {
	api := r.Group("/api/v1")
	api.GET("/repos/:id/pr-likelihood", handler.GetPRLikelihoodHandler(repoStore))
	api.POST("/preflight/evaluate", handler.EvaluatePreflightHandler())
}
`
	if err := os.WriteFile(filepath.Join(backendDir, "main.go"), []byte(mainGoContent), 0644); err != nil {
		t.Fatal(err)
	}

	// 3. Create db.go with schema table and columns
	dbDir := filepath.Join(tmpDir, "backend", "internal", "db")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		t.Fatal(err)
	}
	dbGoContent := `package db
func AutoMigrate() {
	_ = "CREATE TABLE IF NOT EXISTS users ( profiling_consent BOOLEAN, deleted_at DATETIME );"
	_ = "CREATE TABLE IF NOT EXISTS user_entitlements ( is_pro BOOLEAN );"
}
`
	if err := os.WriteFile(filepath.Join(dbDir, "db.go"), []byte(dbGoContent), 0644); err != nil {
		t.Fatal(err)
	}

	oracle := NewProbeOracle(tmpDir)

	// Probe existing frontend route
	feResult := oracle.ProbeFrontendRoute("/topics/[topic]")
	if !feResult.Implemented {
		t.Errorf("expected /topics/[topic] to be implemented, got: %+v", feResult)
	}

	// Probe missing frontend route
	feMissing := oracle.ProbeFrontendRoute("/missing/[param]")
	if feMissing.Implemented {
		t.Errorf("expected /missing/[param] to be pending, got: %+v", feMissing)
	}

	// Probe existing backend route
	beResult := oracle.ProbeBackendRoute("GET", "/api/v1/repos/:id/pr-likelihood")
	if !beResult.Implemented {
		t.Errorf("expected backend route to be implemented, got: %+v", beResult)
	}

	// Probe missing backend route
	beMissing := oracle.ProbeBackendRoute("GET", "/api/v1/nonexistent")
	if beMissing.Implemented {
		t.Errorf("expected nonexistent backend route to be pending, got: %+v", beMissing)
	}

	// Probe DB column
	dbColResult := oracle.ProbeDBSchema("users", "profiling_consent")
	if !dbColResult.Implemented {
		t.Errorf("expected DB column users.profiling_consent to be implemented, got: %+v", dbColResult)
	}

	// Probe missing DB column
	dbColMissing := oracle.ProbeDBSchema("users", "nonexistent_col")
	if dbColMissing.Implemented {
		t.Errorf("expected missing DB column to be pending, got: %+v", dbColMissing)
	}
}

func TestAuditKeyDeduplication(t *testing.T) {
	mockIssues := []GitHubIssue{
		{
			Number: 42,
			Title:  "Implement Internal link engine [audit-key=sec11-story11.4-internal-link-engine]",
			Body:   "Details for internal link engine",
			State:  "open",
		},
		{
			Number: 43,
			Title:  "Custom title by human maintainer",
			Body:   "Ref: [audit-key=sec3-story3.1-dodopayments-webhook]\nSome description",
			State:  "closed",
		},
	}

	dedup := NewIssueDeduplicator(mockIssues)

	if !dedup.IsDuplicate("sec11-story11.4-internal-link-engine") {
		t.Errorf("expected duplicate for sec11-story11.4-internal-link-engine from title")
	}

	if !dedup.IsDuplicate("sec3-story3.1-dodopayments-webhook") {
		t.Errorf("expected duplicate for sec3-story3.1-dodopayments-webhook from closed issue body")
	}

	if dedup.IsDuplicate("sec4-story4.1-new-feature") {
		t.Errorf("did not expect duplicate for unfiled key sec4-story4.1-new-feature")
	}
}

func TestDryRunGate_DefaultSafeMode(t *testing.T) {
	if ShouldCreateIssues(false, true) {
		t.Errorf("expected default dry-run mode to skip issue creation")
	}
	if ShouldCreateIssues(false, false) {
		t.Errorf("expected create-issues=false to skip issue creation even with dry-run disabled")
	}
	if ShouldCreateIssues(true, true) {
		t.Errorf("expected --create-issues with default dry-run=true to be gated")
	}
	if !ShouldCreateIssues(true, false) {
		t.Errorf("expected explicit --create-issues --dry-run=false to enable filing")
	}
}
