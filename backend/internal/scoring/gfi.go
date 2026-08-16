package scoring

import (
	"strings"
	"time"
)

// GFIQualityInput holds raw attributes needed to compute GFI Quality Score.
type GFIQualityInput struct {
	IsMaintainerAuthored     bool
	MaintainerResponseHours float64
	HasMentorComment        bool
	WordCount               int
	HasCodeSnippets         bool
	HasDocLabel             bool
	CreatedAt               time.Time
	HasGfiLabel             bool
}

// CalculateGFIQualityScore computes a 0–100 quality score for a Good First Issue.
func CalculateGFIQualityScore(in GFIQualityInput, refTime time.Time) int {
	var score int

	// 1. Maintainer & Mentor Involvement (max 40 pts)
	if in.IsMaintainerAuthored {
		score += 40
	} else {
		// Response latency: reply within 48h (or issue created <48h ago)
		ageHours := refTime.Sub(in.CreatedAt).Hours()
		if (in.MaintainerResponseHours > 0 && in.MaintainerResponseHours <= 48) || (in.MaintainerResponseHours == 0 && ageHours < 48) {
			score += 25
		}
		if in.HasMentorComment {
			score += 15
		}
	}

	// 2. Issue Description & Scope (max 30 pts)
	if in.WordCount >= 50 && in.WordCount <= 1200 {
		score += 20
	} else if in.WordCount > 1500 {
		// Penalize massive crash dumps / unformatted stack traces
		score -= 5
	} else if in.WordCount > 0 && in.WordCount < 50 {
		score += 5
	}

	if in.HasCodeSnippets || in.HasDocLabel {
		score += 10
	}

	// 3. Freshness & Explicit Labels (max 30 pts)
	ageDays := refTime.Sub(in.CreatedAt).Hours() / 24
	if ageDays <= 60 {
		score += 20
	} else if ageDays <= 120 {
		score += 10
	}

	if in.HasGfiLabel {
		score += 10
	}

	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

// InspectGFIQuality calculates word count, code blocks, and label flags from issue body and labels.
func InspectGFIQuality(bodyText string, labelNames []string) (wordCount int, hasCodeSnippets bool, hasDocLabel bool, hasGfiLabel bool) {
	words := strings.Fields(bodyText)
	wordCount = len(words)

	hasCodeSnippets = strings.Contains(bodyText, "```") || strings.Contains(bodyText, "`")

	for _, l := range labelNames {
		ln := strings.ToLower(l)
		if strings.Contains(ln, "doc") || strings.Contains(ln, "documentation") {
			hasDocLabel = true
		}
		if strings.Contains(ln, "good first issue") || strings.Contains(ln, "first-timers-only") || strings.Contains(ln, "help wanted") || strings.Contains(ln, "up-for-grabs") {
			hasGfiLabel = true
		}
	}

	return wordCount, hasCodeSnippets, hasDocLabel, hasGfiLabel
}
