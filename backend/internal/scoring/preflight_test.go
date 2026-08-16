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
}
