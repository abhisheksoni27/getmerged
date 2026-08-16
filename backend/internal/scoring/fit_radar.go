package scoring

import (
	"strings"
)

type FiletypeSuccessRate struct {
	Extension       string  `json:"extension"`       // e.g. ".md", ".go", ".ts"
	Category        string  `json:"category"`        // "docs" | "code" | "config" | "test"
	SuccessRate     float64 `json:"success_rate"`    // 0.0 - 100.0
	MergeSpeedHours float64 `json:"merge_speed_hours"`
}

type FitRadarInput struct {
	RepoLanguage        string
	RepoOnboardingScore int
	FirstTimerRate      float64
	ResponseP50Hours    float64
	ExternalMergeRate   float64
	UserPrimaryLangs    []string
	UserPRSizePref      string // "small" | "medium" | "large"
}

type FitRadarResult struct {
	LanguageAffinityScore  float64               `json:"language_affinity_score"`  // 0 - 100
	PRSizeFitScore         float64               `json:"pr_size_fit_score"`        // 0 - 100
	ReviewVelocityScore    float64               `json:"review_velocity_score"`    // 0 - 100
	MentorshipScore        float64               `json:"mentorship_score"`         // 0 - 100
	DocumentationScore     float64               `json:"documentation_score"`      // 0 - 100
	OverallMatchPercentage float64               `json:"overall_match_percentage"` // 0 - 100
	FiletypeProbabilities  []FiletypeSuccessRate `json:"filetype_probabilities"`
	PersonalizedMatchNotes []string              `json:"personalized_match_notes"`
}

// CalculateFitRadar computes personalized 5-axis contributor compatibility and filetype success rates.
func CalculateFitRadar(input FitRadarInput) FitRadarResult {
	notes := make([]string, 0, 4)

	// 1. Language Affinity Score
	langScore := 40.0 // Default baseline
	if input.RepoLanguage != "" {
		if len(input.UserPrimaryLangs) == 0 {
			langScore = 70.0 // Unprofiled contributor baseline
		} else {
			matched := false
			for _, userLang := range input.UserPrimaryLangs {
				if strings.EqualFold(userLang, input.RepoLanguage) {
					langScore = 100.0
					matched = true
					notes = append(notes, "Primary language match ("+input.RepoLanguage+") - high development familiarity.")
					break
				}
			}
			if !matched {
				langScore = 55.0
			}
		}
	}

	// 2. PR Size Fit Score
	prSizeScore := 80.0
	if input.UserPRSizePref == "small" {
		prSizeScore = 95.0
		notes = append(notes, "Your small PR preference aligns with maintainer review velocity.")
	} else if input.UserPRSizePref == "large" {
		prSizeScore = 60.0
		notes = append(notes, "Repo prioritizes compact PRs; consider breaking down large refactors.")
	}

	// 3. Review Velocity Score (based on response p50 latency)
	velocityScore := 85.0
	if input.ResponseP50Hours > 0 {
		if input.ResponseP50Hours <= 6 {
			velocityScore = 98.0
		} else if input.ResponseP50Hours <= 24 {
			velocityScore = 80.0
		} else if input.ResponseP50Hours <= 72 {
			velocityScore = 65.0
		} else {
			velocityScore = 45.0
		}
	}

	// 4. Mentorship Score (based on first-timer merge rate)
	mentorshipScore := 75.0
	if input.FirstTimerRate > 0 {
		mentorshipScore = input.FirstTimerRate
		if mentorshipScore > 100.0 {
			mentorshipScore = 100.0
		}
	}

	// 5. Documentation Readiness Score
	docScore := float64(input.RepoOnboardingScore)
	if docScore <= 0 {
		docScore = 50.0
	} else if docScore > 100.0 {
		docScore = 100.0
	}

	overall := (langScore*0.30) + (prSizeScore*0.20) + (velocityScore*0.20) + (mentorshipScore*0.15) + (docScore*0.15)
	if overall > 100.0 {
		overall = 100.0
	}

	// Generate baseline filetype success rate breakdown
	filetypes := []FiletypeSuccessRate{
		{Extension: ".md", Category: "docs", SuccessRate: 92.5, MergeSpeedHours: 14.2},
		{Extension: ".yml", Category: "config", SuccessRate: 84.0, MergeSpeedHours: 22.8},
		{Extension: "_test.go", Category: "test", SuccessRate: 88.0, MergeSpeedHours: 18.5},
		{Extension: ".go", Category: "code", SuccessRate: input.ExternalMergeRate, MergeSpeedHours: input.ResponseP50Hours * 2.5},
	}
	if filetypes[3].SuccessRate <= 0 {
		filetypes[3].SuccessRate = 72.0
	}
	if filetypes[3].MergeSpeedHours <= 0 {
		filetypes[3].MergeSpeedHours = 36.0
	}

	return FitRadarResult{
		LanguageAffinityScore:  langScore,
		PRSizeFitScore:         prSizeScore,
		ReviewVelocityScore:    velocityScore,
		MentorshipScore:        mentorshipScore,
		DocumentationScore:     docScore,
		OverallMatchPercentage: overall,
		FiletypeProbabilities:  filetypes,
		PersonalizedMatchNotes: notes,
	}
}
