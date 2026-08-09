package ai_test

import (
	"context"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/ai"
)

func TestAIClient_FallbackMock(t *testing.T) {
	client := ai.NewAIClient("")
	res, err := client.GenerateRepoInsights(context.Background(), "freeCodeCamp/freeCodeCamp", nil, nil)
	if err != nil {
		t.Fatalf("expected fallback mock response without error, got: %v", err)
	}

	if res.MaintainerVibe == "" || len(res.PRGuidelines) == 0 {
		t.Fatalf("expected non-empty mock insights, got: %+v", res)
	}
}

func TestAIClient_LocalZeroCostInsights(t *testing.T) {
	client := ai.NewAIClient("")
	comments := []string{
		"Thanks for this PR! LGTM, merged.",
		"Great fix, please make sure unit tests pass.",
		"Welcome to the repo! Please follow conventional commit guidelines.",
	}

	res, err := client.GenerateRepoInsights(context.Background(), "gin-gonic/gin", comments, nil)
	if err != nil {
		t.Fatalf("expected local zero cost insights to succeed, got: %v", err)
	}

	if res.IssueQualityScore <= 0 {
		t.Fatalf("expected positive quality score, got %f", res.IssueQualityScore)
	}

	if len(res.PRGuidelines) == 0 {
		t.Fatalf("expected extracted guidelines, got empty slice")
	}
}

func TestAIClient_DerivesDosAndDontsFromPRComments(t *testing.T) {
	client := ai.NewAIClient("")
	prComments := []string{
		"Please keep this PR focused. The unrelated refactor should be separate.",
	}
	issueComments := []string{"Coverage is missing for the failing edge case; add tests."}

	res, err := client.GenerateRepoInsights(context.Background(), "gin-gonic/gin", prComments, issueComments)
	if err != nil {
		t.Fatalf("expected local insights to succeed, got: %v", err)
	}

	assertContains(t, res.TopDos, "Keep PRs small and focused on one change")
	assertContains(t, res.TopDonts, "Do not mix unrelated refactors with feature work")
}

func assertContains(t *testing.T, values []string, want string) {
	t.Helper()
	for _, value := range values {
		if value == want {
			return
		}
	}
	t.Fatalf("expected %q in %+v", want, values)
}
