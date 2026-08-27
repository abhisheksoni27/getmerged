package ai_test

import (
	"os"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/ai"
)

func TestAIClient_FallbackMock(t *testing.T) {
	client := ai.NewAIClient("")
	res := client.GenerateLocalZeroCostInsights("freeCodeCamp/freeCodeCamp", nil, nil)
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

	res := client.GenerateLocalZeroCostInsights("gin-gonic/gin", comments, nil)
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

	res := client.GenerateLocalZeroCostInsights("gin-gonic/gin", prComments, issueComments)
	assertContains(t, res.TopDos, "Keep PRs small and focused on one change")
	assertContains(t, res.TopDonts, "Do not mix unrelated refactors with feature work")
}

func TestAIClient_NoKeywordMatchPadsToThreeGenericDosAndDonts(t *testing.T) {
	client := ai.NewAIClient("")
	prComments := []string{"This PR looks really nice and helpful. Great work!"}

	res := client.GenerateLocalZeroCostInsights("test-org/test-repo", prComments, nil)
	if len(res.TopDos) != 3 {
		t.Fatalf("expected exactly 3 dos for no-keyword-match fallback, got %d: %+v", len(res.TopDos), res.TopDos)
	}
	if len(res.TopDonts) != 3 {
		t.Fatalf("expected exactly 3 donts for no-keyword-match fallback, got %d: %+v", len(res.TopDonts), res.TopDonts)
	}

	assertContains(t, res.TopDos, "Ensure code complies with the project coding style")
	assertContains(t, res.TopDos, "Keep PRs scoped to a single concern")
	assertContains(t, res.TopDos, "Include context and link to the related issue")
	assertContains(t, res.TopDonts, "Do not submit PRs without linking an issue")
	assertContains(t, res.TopDonts, "Do not break existing tests without fixing them")
	assertContains(t, res.TopDonts, "Do not mix unrelated refactors in a single PR")
}

func TestAIClient_PartialKeywordMatchPadsToMinimumThree(t *testing.T) {
	client := ai.NewAIClient("")
	prComments := []string{"Please add tests for this feature."}

	res := client.GenerateLocalZeroCostInsights("test-org/test-repo", prComments, nil)
	if len(res.TopDos) < 3 {
		t.Fatalf("expected at least 3 dos after padding, got %d: %+v", len(res.TopDos), res.TopDos)
	}
	if len(res.TopDonts) < 3 {
		t.Fatalf("expected at least 3 donts after padding, got %d: %+v", len(res.TopDonts), res.TopDonts)
	}

	assertContains(t, res.TopDos, "Add or update tests for changed behavior before requesting review")
	assertContains(t, res.TopDonts, "Do not leave requested test coverage unresolved")
	assertContains(t, res.TopDos, "Keep PRs scoped to a single concern")
	assertContains(t, res.TopDonts, "Do not mix unrelated refactors in a single PR")
}

func TestAIClient_EmptyCommentsReturnsAtLeastThreeDosAndDonts(t *testing.T) {
	client := ai.NewAIClient("")
	result := client.GenerateLocalZeroCostInsights("test-org/test-repo", []string{}, []string{})
	if result == nil {
		t.Fatal("expected non-nil AIInsightsResponse")
	}
	if len(result.TopDos) < 3 {
		t.Fatalf("expected at least 3 dos for empty comments, got %d: %+v", len(result.TopDos), result.TopDos)
	}
	if len(result.TopDonts) < 3 {
		t.Fatalf("expected at least 3 donts for empty comments, got %d: %+v", len(result.TopDonts), result.TopDonts)
	}
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

	res := client.GenerateLocalZeroCostInsights("test-org/test-repo", prComments, issueComments)
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

	res := client.GenerateLocalZeroCostInsights("test/repo", prComments, issueComments)
	if res.IssueQualityScore <= 0 {
		t.Fatalf("expected positive issue_quality_score, got %f", res.IssueQualityScore)
	}
	if res.RawSummary == "" {
		t.Fatal("expected non-empty raw_summary field")
	}
}

func TestAIClient_LocalFallbackReturnsDeepSections(t *testing.T) {
	client := ai.NewAIClient("")
	res := client.GenerateLocalZeroCostInsights("test-org/test-repo", []string{"add tests please"}, nil)
	if len(res.DeepSections) != 3 {
		t.Fatalf("expected 3 default deep sections from local classifier, got %d", len(res.DeepSections))
	}
}

func TestParseInsightsJSONWithDeepSections(t *testing.T) {
	raw := `{
		"maintainer_vibe": "sharp reviewer",
		"pr_guidelines": ["link issues"],
		"issue_quality_score": 7.5,
		"raw_summary": "ok",
		"warmth_score": 6.1,
		"patience_score": 7.0,
		"nitpick_ratio": 0.3,
		"maintainer_persona": "Gatekeeper",
		"top_dos": ["do a"],
		"top_donts": ["dont b"],
		"deep_sections": [
			{"title": "What Contributors Actually Say", "body": "Reviewers repeatedly flag..."},
			{"title": "Unwritten Rules", "body": "PRs touching core/ need an issue first."}
		]
	}`

	res, err := ai.ParseInsightsJSON(raw)
	if err != nil {
		t.Fatalf("expected parse success, got: %v", err)
	}
	if len(res.DeepSections) != 2 {
		t.Fatalf("expected 2 deep sections, got %d", len(res.DeepSections))
	}
	if res.DeepSections[0].Title == "" || res.DeepSections[0].Body == "" {
		t.Fatalf("expected populated deep section, got %+v", res.DeepSections[0])
	}
}

func TestParseInsightsJSONWithoutDeepSections(t *testing.T) {
	res, err := ai.ParseInsightsJSON(`{"maintainer_vibe":"vibe","raw_summary":"s"}`)
	if err != nil {
		t.Fatalf("expected parse success without deep_sections, got: %v", err)
	}
	if len(res.DeepSections) != 0 {
		t.Fatalf("expected empty deep sections, got %+v", res.DeepSections)
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
