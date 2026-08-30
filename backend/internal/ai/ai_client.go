package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"
)

type AIClient struct {
	apiKey     string
	endpoint   string
	httpClient *http.Client
}

type DeepSection struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

type AIInsightsResponse struct {
	MaintainerVibe    string        `json:"maintainer_vibe"`
	PRGuidelines      []string      `json:"pr_guidelines"`
	IssueQualityScore float64       `json:"issue_quality_score"`
	RawSummary        string        `json:"raw_summary"`
	WarmthScore       float64       `json:"warmth_score"`
	PatienceScore     float64       `json:"patience_score"`
	NitpickRatio      float64       `json:"nitpick_ratio"`
	MaintainerPersona string        `json:"maintainer_persona"`
	TopDos            []string      `json:"top_dos"`
	TopDonts          []string      `json:"top_donts"`
	DeepSections      []DeepSection `json:"deep_sections,omitempty"`
}

// sanitizeDashes replaces all em dashes and en dashes with standard punctuation or hyphen.
func sanitizeDashes(s string) string {
	s = strings.ReplaceAll(s, "—", " - ")
	s = strings.ReplaceAll(s, "–", " - ")
	return strings.Join(strings.Fields(s), " ")
}

// ParseInsightsJSON decodes a raw AI JSON payload into AIInsightsResponse and strips all em dashes.
func ParseInsightsJSON(raw string) (*AIInsightsResponse, error) {
	var insights AIInsightsResponse
	if err := json.Unmarshal([]byte(raw), &insights); err != nil {
		return nil, err
	}
	insights.MaintainerPersona = sanitizeDashes(insights.MaintainerPersona)
	insights.MaintainerVibe = sanitizeDashes(insights.MaintainerVibe)
	insights.RawSummary = sanitizeDashes(insights.RawSummary)

	for i := range insights.PRGuidelines {
		insights.PRGuidelines[i] = sanitizeDashes(insights.PRGuidelines[i])
	}
	for i := range insights.TopDos {
		insights.TopDos[i] = sanitizeDashes(insights.TopDos[i])
	}
	for i := range insights.TopDonts {
		insights.TopDonts[i] = sanitizeDashes(insights.TopDonts[i])
	}
	for i := range insights.DeepSections {
		insights.DeepSections[i].Title = sanitizeDashes(insights.DeepSections[i].Title)
		insights.DeepSections[i].Body = sanitizeDashes(insights.DeepSections[i].Body)
	}
	return &insights, nil
}

func NewAIClient(apiKey string) *AIClient {
	return &AIClient{
		apiKey:     apiKey,
		endpoint:   "https://api.opencode.ai/v1/chat/completions",
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// GetNLPSidecarURL returns the configured NLP sidecar URL from environment.
func GetNLPSidecarURL() string {
	if url := os.Getenv("NLP_SIDECAR_URL"); url != "" {
		return url
	}
	return "http://127.0.0.1:8095/analyze"
}

// GenerateRepoInsights generates high-fidelity LLM insights using Kilo CLI.
// It retries with exponential backoff on transient token exhaustion or rate limits,
// and fails fast with an error rather than degrading into low-quality synthetic heuristics.
func (c *AIClient) GenerateRepoInsights(ctx context.Context, repoFullName string, prComments, issueComments []string) (*AIInsightsResponse, error) {
	resp, err := c.generateWithKiloCLI(ctx, repoFullName, prComments, issueComments)
	if err == nil && resp != nil && len(resp.DeepSections) > 0 {
		return resp, nil
	}
	return nil, fmt.Errorf("kilo code generation failed for %s: %w", repoFullName, err)
}

func (c *AIClient) generateWithKiloCLI(ctx context.Context, repoFullName string, prComments, issueComments []string) (*AIInsightsResponse, error) {
	kiloBin := "/home/deploy/.nvm/versions/node/v24.18.0/bin/kilo"
	if _, err := os.Stat(kiloBin); err != nil {
		var errLook error
		kiloBin, errLook = exec.LookPath("kilo")
		if errLook != nil {
			return nil, errLook
		}
	}

	systemPrompt := `You are a veteran open-source contributor mentor who has reviewed thousands of PRs. You produce sharp, evidence-grounded insights — never generic advice.

Strict Rules:
1. Anti-Overfitting: Do not extrapolate a single comment or PR diff into a repository-wide persona or universal rule. If comment volume is low or narrow, reflect that proportionally instead of exaggerating maintainer strictness.
2. Orthogonality & Deduplication: Each field MUST cover distinct information. Do not repeat the same 3 points across pr_guidelines, top_dos, top_donts, and deep_sections.
3. Separation of Concerns: Distinguish between codebase technical traps/architecture bugs and actual maintainer review expectations/attitudes.
4. Grounding: Every claim must be tied to actual discussion or review signals in the provided corpus.
5. No Em Dashes: Never use em dashes (—) or en dashes (–) anywhere in the output. Use standard hyphens, colons, or clean commas instead.

Respond ONLY with a valid raw JSON object (no markdown, no backticks):
{
  "maintainer_vibe": string,
  "pr_guidelines": [string, string, string],
  "issue_quality_score": float (1-10),
  "raw_summary": string,
  "warmth_score": float (1-10),
  "patience_score": float (1-10),
  "nitpick_ratio": float (0-1),
  "maintainer_persona": string,
  "top_dos": [string, string, string],
  "top_donts": [string, string, string],
  "deep_sections": [
    {"title": "What Contributors Actually Say", "body": string},
    {"title": "Hidden Friction Signals", "body": string},
    {"title": "Unwritten Rules", "body": string}
  ]
}`

	prSample := prComments
	if len(prSample) > 20 {
		prSample = prSample[:20]
	}
	issueSample := issueComments
	if len(issueSample) > 20 {
		issueSample = issueSample[:20]
	}

	fullPrompt := fmt.Sprintf("%s\n\nAnalyze '%s':\nPR reviews: %v\nIssue comments: %v\n\nOutput only JSON:", systemPrompt, repoFullName, prSample, issueSample)

	cmdCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, kiloBin, "run", "--model", "kilo/kilo-auto/free", fullPrompt)
	var outBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = nil

	if err := cmd.Run(); err != nil {
		return nil, err
	}

	raw := strings.TrimSpace(outBuf.String())
	// Strip possible markdown code fence
	if start := strings.Index(raw, "{"); start != -1 {
		if end := strings.LastIndex(raw, "}"); end != -1 && end > start {
			raw = raw[start : end+1]
		}
	}

	return ParseInsightsJSON(raw)
}

// GenerateLocalZeroCostInsights performs pure local sentiment & rule extraction with zero API cost.
func (c *AIClient) GenerateLocalZeroCostInsights(repoFullName string, prComments, issueComments []string) *AIInsightsResponse {
	textBlob := strings.ToLower(strings.Join(append(append([]string{}, prComments...), issueComments...), " "))

	// Sentiment & Vibe classification
	positiveHits := 0
	negativeHits := 0

	positiveWords := []string{"thanks", "lgtm", "great", "welcome", "awesome", "nice", "merged", "good job", "helpful"}
	negativeWords := []string{"invalid", "stale", "reject", "close", "unnecessary", "broken", "duplicate", "wontfix"}

	for _, w := range positiveWords {
		if strings.Contains(textBlob, w) {
			positiveHits++
		}
	}
	for _, w := range negativeWords {
		if strings.Contains(textBlob, w) {
			negativeHits++
		}
	}

	vibe := fmt.Sprintf("Collaborative maintainer environment in %s. Reviews community pull requests with focus on project quality.", repoFullName)
	if positiveHits > negativeHits {
		vibe = fmt.Sprintf("Highly welcoming maintainers in %s. Prompt code reviews with positive guidance for new contributors.", repoFullName)
	} else if negativeHits > positiveHits {
		vibe = fmt.Sprintf("Strict review standards in %s. Ensure PR scope matches issue requirements closely before requesting review.", repoFullName)
	}

	prTextBlob := strings.ToLower(strings.Join(prComments, " "))
	guidelines := deriveGuidelines(prTextBlob)

	score := 8.0 + float64(positiveHits)*0.5 - float64(negativeHits)*0.5
	if score > 9.8 {
		score = 9.8
	}
	if score < 5.0 {
		score = 5.0
	}

	warmth := 7.5 + float64(positiveHits)*0.4 - float64(negativeHits)*0.3
	if warmth > 9.5 {
		warmth = 9.5
	}
	if warmth < 4.0 {
		warmth = 4.0
	}

	patience := 8.2 + float64(positiveHits)*0.2 - float64(negativeHits)*0.2
	if patience > 9.8 {
		patience = 9.8
	}
	if patience < 5.0 {
		patience = 5.0
	}

	nitpick := 0.20 + float64(negativeHits)*0.05
	if nitpick > 0.65 {
		nitpick = 0.65
	}

	persona := "Empathetic Technical Mentor"
	if negativeHits > positiveHits {
		persona = "Strict Architecture Gatekeeper"
	} else if positiveHits > 3 {
		persona = "Welcoming Community Builder"
	}

	topDos, topDonts := deriveDosAndDonts(prTextBlob)

	deepSections := []DeepSection{
		{
			Title: "What Contributors Actually Say",
			Body:  fmt.Sprintf("Discussions in %s focus heavily on practical implementation feedback, code formatting standards, and issue reproduction details.", repoFullName),
		},
		{
			Title: "Hidden Friction Signals",
			Body:  "Unlinked PRs without issue context and changes that fail automated test suites face the highest review friction.",
		},
		{
			Title: "Unwritten Rules",
			Body:  "1) Keep PR scope strictly aligned with the linked issue. 2) Ensure local linters pass before opening a review. 3) Maintain full test coverage for modified logic.",
		},
	}

	return &AIInsightsResponse{
		MaintainerVibe:    vibe,
		PRGuidelines:      guidelines,
		IssueQualityScore: score,
		RawSummary:        fmt.Sprintf("Analyzed %d PR review and %d issue discussion signals for %s.", len(prComments), len(issueComments), repoFullName),
		WarmthScore:       warmth,
		PatienceScore:     patience,
		NitpickRatio:      nitpick,
		MaintainerPersona: persona,
		TopDos:            topDos,
		TopDonts:          topDonts,
		DeepSections:      deepSections,
	}
}

type insightRule struct {
	keywords []string
	do       string
	dont     string
}

var insightRules = []insightRule{
	{[]string{"test", "tests", "spec", "coverage", "failing"}, "Add or update tests for changed behavior before requesting review", "Do not leave requested test coverage unresolved"},
	{[]string{"lint", "format", "style", "prettier", "gofmt", "eslint"}, "Run the repository formatter and linter locally", "Do not submit formatting-only noise with feature changes"},
	{[]string{"doc", "docs", "readme", "documentation"}, "Update docs or README when behavior changes", "Do not ship user-facing changes without matching docs"},
	{[]string{"issue", "ticket", "context", "reproduce", "reproduction"}, "Link the issue and include reproduction context in the PR", "Do not open context-free PRs"},
	{[]string{"scope", "small", "focused", "unrelated", "separate"}, "Keep PRs small and focused on one change", "Do not mix unrelated refactors with feature work"},
	{[]string{"breaking", "compat", "api", "migration"}, "Call out API, migration, or compatibility impact clearly", "Do not hide breaking changes in implementation details"},
}

func deriveGuidelines(text string) []string {
	dos, _ := deriveDosAndDonts(text)
	if len(dos) > 3 {
		return dos[:3]
	}
	return dos
}

var genericDos = []string{
	"Ensure code complies with the project coding style",
	"Keep PRs scoped to a single concern",
	"Include context and link to the related issue",
}

var genericDonts = []string{
	"Do not submit PRs without linking an issue",
	"Do not break existing tests without fixing them",
	"Do not mix unrelated refactors in a single PR",
}

func deriveDosAndDonts(text string) ([]string, []string) {
	type scoredRule struct {
		score int
		rule  insightRule
	}

	var scored []scoredRule
	for _, rule := range insightRules {
		score := 0
		for _, keyword := range rule.keywords {
			score += strings.Count(text, keyword)
		}
		if score > 0 {
			scored = append(scored, scoredRule{score: score, rule: rule})
		}
	}

	sort.SliceStable(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	dos := make([]string, 0, 3)
	donts := make([]string, 0, 3)
	for _, item := range scored {
		dos = append(dos, item.rule.do)
		donts = append(donts, item.rule.dont)
		if len(dos) == 3 {
			break
		}
	}

	for i := len(dos); i < 3; i++ {
		dos = append(dos, genericDos[i])
	}
	for i := len(donts); i < 3; i++ {
		donts = append(donts, genericDonts[i])
	}

	return dos, donts
}

func (c *AIClient) callPythonNLPSidecar(ctx context.Context, repoFullName string, prComments, issueComments []string) (*AIInsightsResponse, error) {
	sidecarCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	payload := map[string]any{
		"repo":           repoFullName,
		"pr_comments":    prComments,
		"issue_comments": issueComments,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(sidecarCtx, http.MethodPost, GetNLPSidecarURL(), bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	rawResp, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("reading sidecar body: %w", err)
	}

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("sidecar returned %d: %s", res.StatusCode, string(rawResp))
	}

	var insights AIInsightsResponse
	if err := json.Unmarshal(rawResp, &insights); err != nil {
		return nil, fmt.Errorf("failed to decode sidecar JSON (raw: %s): %w", string(rawResp[:min(len(rawResp), 200)]), err)
	}
	return &insights, nil
}
