package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestBuildMatchmakingQuery(t *testing.T) {
	t.Run("builds query with multiple languages", func(t *testing.T) {
		query, args := scoring.BuildMatchmakingQuery([]string{"Go", "Rust"}, 5)

		if len(args) != 3 {
			t.Errorf("expected 3 arguments, got %d", len(args))
		}
		if args[0] != "Go" || args[1] != "Rust" || args[2] != 5 {
			t.Errorf("unexpected arguments: %v", args)
		}
		if query == "" {
			t.Error("expected non-empty SQL query string")
		}
	})

	t.Run("handles empty languages gracefully", func(t *testing.T) {
		query, args := scoring.BuildMatchmakingQuery(nil, 10)

		if len(args) != 1 || args[0] != 10 {
			t.Errorf("expected limit argument only, got %v", args)
		}
		if query == "" {
			t.Error("expected non-empty SQL query string")
		}
	})
}
