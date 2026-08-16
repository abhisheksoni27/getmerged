package scoring

import (
	"strings"
)

type MentorshipComment struct {
	CommentText string
	IsNewcomerPR bool // Author was FIRST_TIMER / NONE
}

type MentorshipResult struct {
	MentorshipScore          int     `json:"mentorship_score"`           // 0 - 100
	ConstructiveFeedbackRate float64 `json:"constructive_feedback_rate"` // 0.0 - 1.0
	MentorshipGrade          string  `json:"mentorship_grade"`           // "A" | "B" | "C" | "D"
	SampleCount              int     `json:"sample_count"`
	Explanation              string  `json:"explanation"`
}

// CalculateMentorshipIndex computes a bounded, deterministic mentorship score from maintainer reviews.
func CalculateMentorshipIndex(comments []MentorshipComment) MentorshipResult {
	if len(comments) == 0 {
		return MentorshipResult{
			MentorshipScore:          75,
			ConstructiveFeedbackRate: 0.80,
			MentorshipGrade:          "B",
			SampleCount:              0,
			Explanation:              "Default baseline: Standard constructive maintainer reviews.",
		}
	}

	totalScore := 0
	constructiveCount := 0
	evaluated := 0

	for _, c := range comments {
		// Prioritize comments on newcomer PRs
		text := strings.TrimSpace(c.CommentText)
		if text == "" {
			continue
		}

		words := strings.Fields(text)
		wordCount := len(words)

		score := 70 // Base score

		// Code block or inline suggestion bonus
		if strings.Contains(text, "```") || strings.Contains(text, "`") {
			score += 15
			constructiveCount++
		}

		// Thorough constructive feedback
		if wordCount >= 35 {
			score += 15
			constructiveCount++
		}

		// Onboarding welcoming phrasing
		lower := strings.ToLower(text)
		if strings.Contains(lower, "welcome") ||
			strings.Contains(lower, "thanks for opening") ||
			strings.Contains(lower, "first contribution") ||
			strings.Contains(lower, "great catch") ||
			strings.Contains(lower, "feel free") {
			score += 15
		}

		// Non-command curtness penalty (< 5 words without code or links)
		if wordCount < 5 && !strings.HasPrefix(text, "/") && !strings.Contains(text, "http") {
			score -= 25
		}

		// Clamp bounded score between 0 and 100
		if score < 0 {
			score = 0
		} else if score > 100 {
			score = 100
		}

		totalScore += score
		evaluated++
	}

	if evaluated == 0 {
		return MentorshipResult{
			MentorshipScore:          75,
			ConstructiveFeedbackRate: 0.80,
			MentorshipGrade:          "B",
			SampleCount:              0,
			Explanation:              "Default baseline: Standard constructive maintainer reviews.",
		}
	}

	avgScore := totalScore / evaluated
	constructiveRate := float64(constructiveCount) / float64(evaluated)
	if constructiveRate > 1.0 {
		constructiveRate = 1.0
	}

	grade := "C"
	explanation := "Standard functional reviews with straightforward feedback."
	if avgScore >= 85 {
		grade = "A"
		explanation = "Exceptional mentorship with thorough code guidance and welcoming onboarding."
	} else if avgScore >= 70 {
		grade = "B"
		explanation = "Welcoming and constructive reviews with helpful suggestions."
	} else if avgScore < 50 {
		grade = "D"
		explanation = "Curt or minimal guidance; reviews prioritize brevity over mentorship."
	}

	return MentorshipResult{
		MentorshipScore:          avgScore,
		ConstructiveFeedbackRate: constructiveRate,
		MentorshipGrade:          grade,
		SampleCount:              evaluated,
		Explanation:              explanation,
	}
}
