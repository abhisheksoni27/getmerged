package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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

// GenerateRepoInsights prompts AI model to extract maintainer vibe check & PR guidelines.
func (c *AIClient) GenerateRepoInsights(ctx context.Context, repoFullName string, prComments []string) (*AIInsightsResponse, error) {
	if c.apiKey == "" {
		// Default mock response when API key is not configured in local dev
		return &AIInsightsResponse{
			MaintainerVibe:    "Active and welcoming. Fast turnaround time on PR reviews with helpful guidance for first-time contributors.",
			PRGuidelines:      []string{"Include unit tests for new features", "Follow conventional commit format", "Ensure CI pipeline checks pass"},
			IssueQualityScore: 8.5,
			RawSummary:        "High responsiveness maintainer team with clear contribution instructions.",
		}, nil
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
