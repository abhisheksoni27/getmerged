package scoring

import "fmt"

// MatchMetrics carries the snapshot fields that drive contributor-repo fit.
type MatchMetrics struct {
	CRankScore            float64
	ExternalPRMergeRate   float64
	FirstTimerSuccessRate float64
	ResponseP50Hours      float64
	GoodFirstIssueCount   int
	OnboardingScore       float64
	LastActivityDays      float64
	StalenessFlag         bool
}

type weightProfile map[string]float64

var beginnerProfile = weightProfile{
	"first_timer": 0.30,
	"gfi":         0.25,
	"onboarding":  0.15,
	"response":    0.15,
	"merge_rate":  0.15,
}

var experiencedProfile = weightProfile{
	"c_rank":     0.35,
	"merge_rate": 0.25,
	"response":   0.15,
	"freshness":  0.20,
	"onboarding": 0.05,
}

// clamp keeps a feature score inside [0, 100].
func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

// responseScore decays linearly to zero at 72 hours.
// A missing median (0) counts as no signal rather than instant responses.
func responseScore(p50Hours float64) float64 {
	if p50Hours <= 0 {
		return 0
	}
	return clamp(100 * (1 - p50Hours/72))
}

// gfiScore saturates at five open good first issues.
func gfiScore(count int) float64 {
	return clamp(float64(count) / 5 * 100)
}

// freshnessScore rewards repos active within the last 60 days.
func freshnessScore(lastActivityDays float64) float64 {
	return clamp(100 * (1 - lastActivityDays/60))
}

func profileFor(level string) weightProfile {
	if level == "experienced" {
		return experiencedProfile
	}
	return beginnerProfile
}

// MatchScore blends snapshot metrics into a 0-100 contributor fit score.
// Unknown levels fall back to the beginner profile.
func MatchScore(m MatchMetrics, level string) float64 {
	features := map[string]float64{
		"c_rank":      clamp(m.CRankScore),
		"merge_rate":  clamp(m.ExternalPRMergeRate),
		"first_timer": clamp(m.FirstTimerSuccessRate),
		"response":    responseScore(m.ResponseP50Hours),
		"gfi":         gfiScore(m.GoodFirstIssueCount),
		"onboarding":  clamp(m.OnboardingScore),
		"freshness":   freshnessScore(m.LastActivityDays),
	}

	score := 0.0
	for feature, weight := range profileFor(level) {
		score += weight * features[feature]
	}

	if m.StalenessFlag {
		score *= 0.7
	}
	return clamp(score)
}

// MatchReasons explains why a repo fits the requested contributor level.
// Weak signals produce no reasons so pages never over-promise.
func MatchReasons(m MatchMetrics, level string) []string {
	var reasons []string
	add := func(format string, args ...interface{}) {
		reasons = append(reasons, fmt.Sprintf(format, args...))
	}

	switch level {
	case "experienced":
		if m.CRankScore >= 80 {
			add("C-Rank %.1f — top-tier maintainer discipline", m.CRankScore)
		}
		if freshnessScore(m.LastActivityDays) > 50 {
			add("Active in the last month")
		}
	default:
		if m.FirstTimerSuccessRate >= 60 {
			add("%.0f%% of first-time PRs get merged", m.FirstTimerSuccessRate)
		}
		if m.GoodFirstIssueCount > 0 {
			add("%d open good first issues", m.GoodFirstIssueCount)
		}
		if m.OnboardingScore >= 60 {
			add("Strong onboarding docs for newcomers")
		}
	}

	if m.ExternalPRMergeRate >= 70 {
		add("Merges %.0f%% of outside pull requests", m.ExternalPRMergeRate)
	}
	if responseScore(m.ResponseP50Hours) >= 70 {
		add("Median review turnaround under %d hours", bestRoundHour(m.ResponseP50Hours))
	}

	return reasons
}

// bestRoundHour rounds sub-hour responses up to one so copy never says "0 hours".
func bestRoundHour(h float64) int {
	if h < 1 {
		return 1
	}
	return int(h + 0.5)
}
