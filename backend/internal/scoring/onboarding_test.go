package scoring

import (
	"testing"
)

func TestCalculateOnboardingScore(t *testing.T) {
	tests := []struct {
		name     string
		docs     OnboardingDocs
		expected int
	}{
		{
			name: "all docs present with issues enabled",
			docs: OnboardingDocs{
				HasContributing:   true,
				HasPRTemplate:     true,
				HasIssueTemplate:  true,
				HasCodeOfConduct:  true,
				HasIssuesEnabled:  true,
			},
			expected: 100,
		},
		{
			name: "contributing only",
			docs: OnboardingDocs{
				HasContributing:  true,
				HasIssuesEnabled: true,
			},
			expected: 40,
		},
		{
			name: "no docs at all",
			docs: OnboardingDocs{
				HasIssuesEnabled: true,
			},
			expected: 0,
		},
		{
			name: "issues disabled redistributes 20 points across remaining 80",
			docs: OnboardingDocs{
				HasContributing:  true,
				HasPRTemplate:    true,
				HasCodeOfConduct: true,
				HasIssuesEnabled: false, // 40 + 25 + 15 = 80 out of 80 -> 100%
			},
			expected: 100,
		},
		{
			name: "issues disabled with contributing only (40/80 -> 50%)",
			docs: OnboardingDocs{
				HasContributing:  true,
				HasIssuesEnabled: false,
			},
			expected: 50,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := CalculateOnboardingScore(tt.docs)
			if score != tt.expected {
				t.Errorf("CalculateOnboardingScore() = %d, want %d", score, tt.expected)
			}
		})
	}
}
