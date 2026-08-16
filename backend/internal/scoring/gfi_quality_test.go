package scoring

import (
	"testing"
	"time"
)

func TestCalculateGFIQualityScore(t *testing.T) {
	now := time.Now().UTC()

	tests := []struct {
		name     string
		input    GFIQualityInput
		expected int
	}{
		{
			name: "maintainer authored well-structured issue",
			input: GFIQualityInput{
				IsMaintainerAuthored: true,
				WordCount:            150,
				HasCodeSnippets:      true,
				HasDocLabel:          false,
				CreatedAt:            now.Add(-5 * 24 * time.Hour), // 5 days old
				HasGfiLabel:          true,
			},
			expected: 100, // 40 (maintainer) + 20 (words) + 10 (snippets) + 20 (<60d) + 10 (label)
		},
		{
			name: "external author with fast maintainer response",
			input: GFIQualityInput{
				IsMaintainerAuthored:     false,
				MaintainerResponseHours: 12.5,
				HasMentorComment:        true,
				WordCount:               200,
				HasCodeSnippets:         true,
				CreatedAt:               now.Add(-10 * 24 * time.Hour),
				HasGfiLabel:             true,
			},
			expected: 100, // 25 (response) + 15 (mentor) + 20 (words) + 10 (snippets) + 20 (<60d) + 10 (label)
		},
		{
			name: "stack trace dump penalization",
			input: GFIQualityInput{
				IsMaintainerAuthored: false,
				WordCount:            1800, // >1500 words
				HasCodeSnippets:      true,
				CreatedAt:            now.Add(-150 * 24 * time.Hour), // stale
				HasGfiLabel:          true,
			},
			expected: 15, // 0 (maintainer) + 0 (words penalised) + 10 (snippets) + 0 (stale) + 10 (label) - 5 clamped
		},
		{
			name: "documentation issue without code snippet gets doc waiver",
			input: GFIQualityInput{
				IsMaintainerAuthored: true,
				WordCount:            100,
				HasCodeSnippets:      false,
				HasDocLabel:          true, // doc label waives code snippet
				CreatedAt:            now.Add(-2 * 24 * time.Hour),
				HasGfiLabel:          true,
			},
			expected: 100, // 40 + 20 + 10 (doc waiver) + 20 + 10
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := CalculateGFIQualityScore(tt.input, now)
			if score != tt.expected {
				t.Errorf("CalculateGFIQualityScore() = %d, want %d", score, tt.expected)
			}
		})
	}
}
