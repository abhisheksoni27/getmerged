package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestEvaluatePreflight(t *testing.T) {
	t.Run("flawless PR achieves 100 score and ready to merge", func(t *testing.T) {
		input := scoring.PreflightInput{
			RepoFullName:   "golang/go",
			PRTitle:        "fix(net/http): resolve race condition in transport keepalive",
			PRDescription:  "This commit resolves an edge case race condition in connection reuse. Fixes #12345.",
			ChangedFiles:   []string{"src/net/http/transport.go", "src/net/http/transport_test.go"},
			Additions:      45,
			Deletions:      12,
			LinkedIssueURL: "https://github.com/golang/go/issues/12345",
		}

		result := scoring.EvaluatePreflight(input)
		if result.OverallScore != 100 {
			t.Errorf("expected score 100, got %v", result.OverallScore)
		}
		if !result.ReadyToMerge {
			t.Errorf("expected ready to merge to be true")
		}
		if len(result.Checks) != 5 {
			t.Errorf("expected 5 check items, got %d", len(result.Checks))
		}
	})

	t.Run("missing tests and conventional title fails readiness", func(t *testing.T) {
		input := scoring.PreflightInput{
			RepoFullName:  "facebook/react",
			PRTitle:       "quick update to hooks",
			PRDescription: "updated hook logic",
			ChangedFiles:  []string{"packages/react/src/ReactHooks.js"},
			Additions:     950,
			Deletions:     400,
		}

		result := scoring.EvaluatePreflight(input)
		if result.ReadyToMerge {
			t.Errorf("expected ready to merge to be false")
		}
		if result.OverallScore >= 70 {
			t.Errorf("expected score < 70, got %v", result.OverallScore)
		}
	})

	t.Run("conventional commit title check validation", func(t *testing.T) {
		findConventionalCheck := func(checks []scoring.PreflightCheckItem) *scoring.PreflightCheckItem {
			for i := range checks {
				if checks[i].Key == "conventional_title" {
					return &checks[i]
				}
			}
			return nil
		}

		// Case 1: Freeform non-conventional title
		nonConvInput := scoring.PreflightInput{
			RepoFullName:  "facebook/react",
			PRTitle:       "this is a really long freeform commit message without any conventional prefix",
			PRDescription: "A long enough description to pass the depth heuristic.",
			ChangedFiles:  []string{"src/parser.ts"},
			Additions:     25,
		}
		nonConvResult := scoring.EvaluatePreflight(nonConvInput)
		nonConvCheck := findConventionalCheck(nonConvResult.Checks)
		if nonConvCheck == nil {
			t.Fatalf("expected conventional_title check item to be present")
		}
		if nonConvCheck.Passed {
			t.Errorf("expected conventional_title.passed to be false for freeform title")
		}
		if nonConvCheck.Severity != "warning" {
			t.Errorf("expected conventional_title.severity to be 'warning', got %s", nonConvCheck.Severity)
		}

		// Case 2: Valid fix(core): conventional title
		convInput := scoring.PreflightInput{
			RepoFullName:  "facebook/react",
			PRTitle:       "fix(core): resolve null pointer exception in parser",
			PRDescription: "A long enough description to pass the depth heuristic.",
			ChangedFiles:  []string{"src/parser.ts"},
			Additions:     25,
		}
		convResult := scoring.EvaluatePreflight(convInput)
		convCheck := findConventionalCheck(convResult.Checks)
		if convCheck == nil {
			t.Fatalf("expected conventional_title check item to be present")
		}
		if !convCheck.Passed {
			t.Errorf("expected conventional_title.passed to be true for fix(core): title")
		}
		if convCheck.Severity != "info" {
			t.Errorf("expected conventional_title.severity to be 'info', got %s", convCheck.Severity)
		}
	})
}

