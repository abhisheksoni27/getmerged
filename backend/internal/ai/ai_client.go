package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type AIClient struct {
	apiKey     string
	endpoint   string
	httpClient *http.Client
}

type AIInsightsResponse struct {
	MaintainerVibe    string   `json:"maintainer_vibe"`
	PRGuidelines      []string `json:"pr_guidelines"`
	IssueQualityScore float64  `json:"issue_quality_score"`
	RawSummary        string   `json:"raw_summary"`
}

func NewAIClient(apiKey string) *AIClient {
	return &AIClient{
		apiKey:     apiKey,
		endpoint:   "https://api.opencode.ai/v1/chat/completions",
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// GenerateRepoInsights prompts AI model to extract maintainer vibe check & PR guidelines,
// trying Python NLP sidecar first, then Opencode API, and falling back to zero-cost local classifier.
func (c *AIClient) GenerateRepoInsights(ctx context.Context, repoFullName string, prComments []string) (*AIInsightsResponse, error) {
	// 1. Try Python NLP Micro-Sidecar (http://127.0.0.1:8095/analyze)
	if sidecarResp, err := c.callPythonNLPSidecar(ctx, repoFullName, prComments); err == nil && sidecarResp != nil {
		return sidecarResp, nil
	}

	if c.apiKey == "" {
		return c.GenerateLocalZeroCostInsights(repoFullName, prComments), nil
	}

	prompt := fmt.Sprintf("Analyze the following PR comments and reviews for open-source repo '%s'. Provide a brief Maintainer Vibe summary, a bullet list of PR submission guidelines, and an issue quality score (1-10):\n\n%v", repoFullName, prComments)

	reqBody, err := json.Marshal(map[string]any{
		"model": "opencode-default",
		"messages": []map[string]string{
			{"role": "system", "content": "You are an expert open-source contributor mentor. Respond in JSON format with fields maintainer_vibe, pr_guidelines (string array), issue_quality_score (number), and raw_summary."},
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
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI API returned status %d", res.StatusCode)
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(res.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("empty AI response")
	}

	var insights AIInsightsResponse
	if err := json.Unmarshal([]byte(apiResp.Choices[0].Message.Content), &insights); err != nil {
		return nil, fmt.Errorf("failed to parse AI JSON response: %w", err)
	}

	return &insights, nil
}

// GenerateLocalZeroCostInsights performs pure local sentiment & rule extraction with zero API cost.
func (c *AIClient) GenerateLocalZeroCostInsights(repoFullName string, prComments []string) *AIInsightsResponse {
	textBlob := strings.ToLower(strings.Join(prComments, " "))

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

	vibe := fmt.Sprintf("Active maintainer team in %s. Reviews pull requests regularly with constructive feedback.", repoFullName)
	if positiveHits > negativeHits {
		vibe = fmt.Sprintf("Highly welcoming maintainers in %s. Prompt code reviews with positive guidance for new contributors.", repoFullName)
	} else if negativeHits > positiveHits {
		vibe = fmt.Sprintf("Strict review standards in %s. Ensure PR scope matches issue requirements closely before requesting review.", repoFullName)
	}

	// Guideline Rule Extraction
	guidelines := []string{}
	if strings.Contains(textBlob, "test") || strings.Contains(textBlob, "spec") || strings.Contains(textBlob, "coverage") {
		guidelines = append(guidelines, "Include unit tests covering new logic or bug fixes")
	} else {
		guidelines = append(guidelines, "Ensure all automated test suites pass cleanly")
	}

	if strings.Contains(textBlob, "commit") || strings.Contains(textBlob, "format") || strings.Contains(textBlob, "lint") {
		guidelines = append(guidelines, "Follow conventional commit format and repo linter rules")
	} else {
		guidelines = append(guidelines, "Keep commit history clean with descriptive messages")
	}

	if strings.Contains(textBlob, "doc") || strings.Contains(textBlob, "readme") {
		guidelines = append(guidelines, "Update relevant documentation or README snippets")
	} else {
		guidelines = append(guidelines, "Reference related issue number in the PR description")
	}

	score := 8.0 + float64(positiveHits)*0.5 - float64(negativeHits)*0.5
	if score > 9.8 {
		score = 9.8
	}
	if score < 5.0 {
		score = 5.0
	}

	return &AIInsightsResponse{
		MaintainerVibe:    vibe,
		PRGuidelines:      guidelines,
		IssueQualityScore: score,
		RawSummary:        fmt.Sprintf("Analyzed %d PR review signals for %s.", len(prComments), repoFullName),
	}
}

func (c *AIClient) callPythonNLPSidecar(ctx context.Context, repoFullName string, prComments []string) (*AIInsightsResponse, error) {
	sidecarCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	payload := map[string]any{
		"repo":     repoFullName,
		"comments": prComments,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(sidecarCtx, http.MethodPost, "http://127.0.0.1:8095/analyze", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("sidecar returned %d", res.StatusCode)
	}

	var insights AIInsightsResponse
	if err := json.NewDecoder(res.Body).Decode(&insights); err != nil {
		return nil, err
	}
	return &insights, nil
}
