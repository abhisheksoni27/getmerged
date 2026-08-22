package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
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

// ParseInsightsJSON decodes a raw AI JSON payload into AIInsightsResponse.
func ParseInsightsJSON(raw string) (*AIInsightsResponse, error) {
	var insights AIInsightsResponse
	if err := json.Unmarshal([]byte(raw), &insights); err != nil {
		return nil, err
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

// GenerateRepoInsights prompts AI model to extract maintainer vibe check & PR guidelines,
// trying Python NLP sidecar first, then Opencode API, and falling back to zero-cost local classifier.
func (c *AIClient) GenerateRepoInsights(ctx context.Context, repoFullName string, prComments, issueComments []string) (*AIInsightsResponse, error) {
	// 1. Try Python NLP Micro-Sidecar (http://127.0.0.1:8095/analyze)
	if sidecarResp, err := c.callPythonNLPSidecar(ctx, repoFullName, prComments, issueComments); err == nil && sidecarResp != nil {
		return sidecarResp, nil
	}

	if c.apiKey == "" {
		return c.GenerateLocalZeroCostInsights(repoFullName, prComments, issueComments), nil
	}

	systemPrompt := `You are a veteran open-source contributor mentor who has reviewed thousands of PRs. You produce sharp, evidence-grounded insights — never generic advice. Every do, don't, and narrative section MUST cite or paraphrase concrete signals from the supplied comments (phrasing, recurring maintainer behavior, specific friction patterns). If the comments don't support a claim, don't make it. Respond in JSON format with all fields: maintainer_vibe (string), pr_guidelines (string array, 3+ items), issue_quality_score (number 1-10), raw_summary (string), warmth_score (number 1-10), patience_score (number 1-10), nitpick_ratio (number 0-1), maintainer_persona (string), top_dos (string array, 3+ items, each tied to observed reviewer behavior in this repo), top_donts (string array, 3+ items, each tied to actual friction visible in the comments), deep_sections (array of exactly 3 objects with title and body): deep_sections[0].title = "What Contributors Actually Say" with body quoting/paraphrasing the most revealing real comment patterns; [1].title = "Hidden Friction Signals" describing non-obvious review bottlenecks, repeated complaint themes, or silent rejection patterns found in the data; [2].title = "Unwritten Rules" surfacing contribution norms that only emerge from reading these discussions.`

	prompt := fmt.Sprintf("Analyze PR reviews and issue discussion for '%s'. Derive pr_guidelines, top_dos, and top_donts only from PR reviews. Use both sources for maintainer_vibe, issue_quality_score, and deep_sections.\n\nPR reviews: %v\n\nIssue comments: %v", repoFullName, prComments, issueComments)

	reqBody, err := json.Marshal(map[string]any{
		"model": "opencode-default",
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": prompt},
		},
		"response_format": map[string]string{"type": "json_object"},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil || res.StatusCode != http.StatusOK {
		return c.GenerateLocalZeroCostInsights(repoFullName, prComments, issueComments), nil
	}
	defer res.Body.Close()

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(res.Body).Decode(&apiResp); err != nil || len(apiResp.Choices) == 0 {
		return c.GenerateLocalZeroCostInsights(repoFullName, prComments, issueComments), nil
	}

	return ParseInsightsJSON(apiResp.Choices[0].Message.Content)
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
