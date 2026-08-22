package ai_test

import (
	"context"
	"os"
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

func TestAIClient_AllFieldsPopulated(t *testing.T) {
	client := ai.NewAIClient("")
	prComments := []string{
		"Please add tests for the failing edge case.",
		"LGTM, great fix merged!",
		"Keep the PR focused on one change.",
	}
	issueComments := []string{
		"Thanks for the bug report, please add reproduction steps.",
	}

	res, err := client.GenerateRepoInsights(context.Background(), "test-org/test-repo", prComments, issueComments)
	if err != nil {
		t.Fatalf("expected insights without error, got: %v", err)
	}

	if res.MaintainerVibe == "" {
		t.Fatal("expected non-empty maintainer_vibe")
	}
	if res.MaintainerPersona == "" {
		t.Fatal("expected non-empty maintainer_persona")
	}
	if res.RawSummary == "" {
		t.Fatal("expected non-empty raw_summary")
	}
	if len(res.PRGuidelines) == 0 {
		t.Fatal("expected non-empty pr_guidelines")
	}
	if len(res.TopDos) == 0 {
		t.Fatal("expected non-empty top_dos")
	}
	if len(res.TopDonts) == 0 {
		t.Fatal("expected non-empty top_donts")
	}
	if res.WarmthScore <= 0 {
		t.Fatalf("expected positive warmth_score, got %f", res.WarmthScore)
	}
	if res.PatienceScore <= 0 {
		t.Fatalf("expected positive patience_score, got %f", res.PatienceScore)
	}
	if res.NitpickRatio <= 0 {
		t.Fatalf("expected positive nitpick_ratio, got %f", res.NitpickRatio)
	}
	if res.IssueQualityScore <= 0 {
		t.Fatalf("expected positive issue_quality_score, got %f", res.IssueQualityScore)
	}
}

func TestAIClient_NLPSidecarURLConfigurable(t *testing.T) {
	customURL := "http://custom-nlp:9090/analyze"
	origURL := os.Getenv("NLP_SIDECAR_URL")
	os.Setenv("NLP_SIDECAR_URL", customURL)
	defer func() {
		if origURL == "" {
			os.Unsetenv("NLP_SIDECAR_URL")
		} else {
			os.Setenv("NLP_SIDECAR_URL", origURL)
		}
	}()

	got := ai.GetNLPSidecarURL()
	if got != customURL {
		t.Fatalf("expected NLP_SIDECAR_URL=%q, got %q", customURL, got)
	}
}

func TestAIClient_NLPSidecarURLDefault(t *testing.T) {
	origURL := os.Getenv("NLP_SIDECAR_URL")
	os.Unsetenv("NLP_SIDECAR_URL")
	defer func() {
		if origURL != "" {
			os.Setenv("NLP_SIDECAR_URL", origURL)
		}
	}()

	got := ai.GetNLPSidecarURL()
	if got == "" {
		t.Fatal("expected non-empty default NLP_SIDECAR_URL")
	}
}

func TestAIClient_GenerateRepoInsightsPromptIncludesAllFields(t *testing.T) {
	client := ai.NewAIClient("")
	prComments := []string{"Please add tests."}
	issueComments := []string{"Thanks for the report."}

	res, err := client.GenerateRepoInsights(context.Background(), "test/repo", prComments, issueComments)
	if err != nil {
		t.Fatalf("expected insights without error, got: %v", err)
	}

	if res.IssueQualityScore <= 0 {
		t.Fatalf("expected positive issue_quality_score, got %f", res.IssueQualityScore)
	}
	if res.RawSummary == "" {
		t.Fatal("expected non-empty raw_summary field")
	}
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
