package pipeline

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/jmoiron/sqlx"
)

// AIPolicy represents whether an open source repo allows, requires disclosure for, or bans AI contributions.
type AIPolicy string

const (
	AIPolicyAllowed            AIPolicy = "allowed"
	AIPolicyDisclosureRequired AIPolicy = "disclosure_required"
	AIPolicyProhibited         AIPolicy = "prohibited"
	AIPolicyUnspecified        AIPolicy = "unspecified"
)

// AIPolicyResult contains the evaluated AI policy classification, matched doc URL, and reason.
type AIPolicyResult struct {
	Policy AIPolicy `json:"policy"`
	URL    string   `json:"url,omitempty"`
	Reason string   `json:"reason"`
}

var (
	// AI Prohibited regex patterns (strict ban e.g. QEMU, rust-lang)
	aiProhibitedPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(no\s+(ai|llm|copilot|chatgpt)\s+(contributions|code|generated|prs|pull\s+requests))`),
		regexp.MustCompile(`(?i)(ai-generated\s+(code|content|pull\s+requests|prs)\s+(is|are)\s+(prohibited|forbidden|strictly\s+forbidden|not\s+allowed|banned))`),
		regexp.MustCompile(`(?i)(do\s+not\s+(submit|use)\s+(ai|llm|chatgpt|copilot)\s+generated\s+(code|prs))`),
		regexp.MustCompile(`(?i)(prohibit(s|ed|ing)?\s+(the\s+use\s+of\s+)?(generative\s+ai|llms?|chatgpt|copilot|ai)(\s+or\s+(chatgpt|copilot|llms?|ai))?\s+(for|in)\s+contributions)`),
		regexp.MustCompile(`(?i)(ai\s+contributions\s+are\s+not\s+accepted)`),
	}

	// AI Disclosure Required regex patterns (e.g. Ghostty disclosure mandate)
	aiDisclosurePatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(must\s+disclose\s+(any\s+)?(ai|llm|copilot|chatgpt)(\s+or\s+(copilot|llm|ai))?\s+use)`),
		regexp.MustCompile(`(?i)(disclose\s+(if|whether)\s+(ai|copilot|llm)\s+was\s+used)`),
		regexp.MustCompile(`(?i)(disclosure\s+of\s+(generative\s+ai|ai|llm)\s+assistance\s+is\s+required)`),
		regexp.MustCompile(`(?i)(ai-assisted\s+contributions\s+require\s+(prior\s+)?disclosure)`),
		regexp.MustCompile(`(?i)(state\s+in\s+the\s+pr\s+description\s+if\s+ai\s+was\s+used)`),
	}

	// AI Allowed explicitly
	aiAllowedPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(ai-assisted\s+(code|contributions)\s+(is|are)\s+welcome(d)?)`),
		regexp.MustCompile(`(?i)(feel\s+free\s+to\s+use\s+(ai|copilot|llms?))`),
		regexp.MustCompile(`(?i)(we\s+encourage\s+(the\s+use\s+of\s+)?(ai|copilot|llms?))`),
		regexp.MustCompile(`(?i)(ai\s+tools\s+(like\s+copilot\s+)?are\s+permitted)`),
	}
)

// DetectAIPolicy parses text content from AI_POLICY.md or CONTRIBUTING.md guidelines.
func DetectAIPolicy(content string) AIPolicyResult {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return AIPolicyResult{
			Policy: AIPolicyUnspecified,
			Reason: "No explicit AI contribution policy detected",
		}
	}

	// Check prohibited first (highest risk for contributors)
	for _, re := range aiProhibitedPatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AIPolicyResult{
				Policy: AIPolicyProhibited,
				Reason: fmt.Sprintf("Explicit AI ban: %q", loc),
			}
		}
	}

	// Check disclosure requirement
	for _, re := range aiDisclosurePatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AIPolicyResult{
				Policy: AIPolicyDisclosureRequired,
				Reason: fmt.Sprintf("Mandatory AI disclosure policy: %q", loc),
			}
		}
	}

	// Check explicit allowance
	for _, re := range aiAllowedPatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AIPolicyResult{
				Policy: AIPolicyAllowed,
				Reason: fmt.Sprintf("AI-assisted contributions explicitly permitted: %q", loc),
			}
		}
	}

	return AIPolicyResult{
		Policy: AIPolicyUnspecified,
		Reason: "General contributor guide with no specific LLM/AI policy clauses",
	}
}

// FetchAIPolicyContent attempts to find and fetch AI_POLICY.md or CONTRIBUTING.md from GitHub raw URLs.
func FetchAIPolicyContent(ctx context.Context, client *http.Client, token, owner, name string) (string, string, error) {
	if client == nil {
		client = http.DefaultClient
	}

	candidates := []struct {
		url     string
		viewURL string
	}{
		{
			url:     fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/AI_POLICY.md", owner, name),
			viewURL: fmt.Sprintf("https://github.com/%s/%s/blob/HEAD/AI_POLICY.md", owner, name),
		},
		{
			url:     fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/.github/AI_POLICY.md", owner, name),
			viewURL: fmt.Sprintf("https://github.com/%s/%s/blob/HEAD/.github/AI_POLICY.md", owner, name),
		},
		{
			url:     fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/CONTRIBUTING.md", owner, name),
			viewURL: fmt.Sprintf("https://github.com/%s/%s/blob/HEAD/CONTRIBUTING.md", owner, name),
		},
		{
			url:     fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/.github/CONTRIBUTING.md", owner, name),
			viewURL: fmt.Sprintf("https://github.com/%s/%s/blob/HEAD/.github/CONTRIBUTING.md", owner, name),
		},
	}

	for _, cand := range candidates {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, cand.url, nil)
		if err != nil {
			continue
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
			if err == nil && len(body) > 0 {
				return string(body), cand.viewURL, nil
			}
		}
	}

	return "", "", nil
}

// UpdateRepoAIPolicy fetches, detects, and persists the repository's AI contribution policy in the database.
func UpdateRepoAIPolicy(ctx context.Context, db *sqlx.DB, client *http.Client, token, repoID, owner, name string) (AIPolicyResult, error) {
	content, sourceURL, err := FetchAIPolicyContent(ctx, client, token, owner, name)
	if err != nil {
		return AIPolicyResult{Policy: AIPolicyUnspecified}, err
	}

	res := DetectAIPolicy(content)
	if res.Policy != AIPolicyUnspecified && sourceURL != "" {
		res.URL = sourceURL
	}

	_, err = db.ExecContext(ctx, `
		UPDATE repositories
		SET ai_policy = ?, ai_policy_url = ?, ai_policy_reason = ?
		WHERE id = ?
	`, string(res.Policy), res.URL, res.Reason, repoID)

	return res, err
}
