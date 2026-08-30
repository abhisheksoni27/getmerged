package karma

import (
	"fmt"
	"math"
)

// LevelRank represents the contributor's reputation level
type LevelRank struct {
	Level       int    `json:"level"`
	Title       string `json:"title"`
	BadgeColor  string `json:"badge_color"`
	MinPoints   int    `json:"min_points"`
	MaxPoints   int    `json:"max_points"`
	NextTier    string `json:"next_tier,omitempty"`
	NextPoints  int    `json:"points_to_next_tier"`
	Percentile  string `json:"percentile"`
}

// ContributorKarma represents verified reputation earned from merged PRs
type ContributorKarma struct {
	TotalKarma          int       `json:"total_karma"`
	Rank                LevelRank `json:"rank"`
	MergedTierSCount    int       `json:"merged_tier_s_count"`
	MergedTierACount    int       `json:"merged_tier_a_count"`
	MergedTierBCount    int       `json:"merged_tier_b_count"`
	MergedTierCCount    int       `json:"merged_tier_c_count"`
	FirstTimerBonuses   int       `json:"first_timer_bonuses"`
	StreakMonths        int       `json:"streak_months"`
	Multiplier          float64   `json:"streak_multiplier"`
	TopLanguageMastered string    `json:"top_language_mastered"`
	ReputationHeadline  string    `json:"reputation_headline"`
}

type MergedPRInput struct {
	RepoFullName string
	CRankTier    string // S, A, B, C, D
	IsFirstTimer bool
	LinesChanged int
	Language     string
}

// CalculateKarma computes verified open-source reputation points from real merged PRs
func CalculateKarma(prs []MergedPRInput, streakMonths int, topLang string) ContributorKarma {
	tierS := 0
	tierA := 0
	tierB := 0
	tierC := 0
	firstTimerCount := 0
	rawPoints := 0

	for _, pr := range prs {
		switch pr.CRankTier {
		case "S":
			tierS++
			rawPoints += 100
		case "A":
			tierA++
			rawPoints += 50
		case "B":
			tierB++
			rawPoints += 25
		case "C":
			tierC++
			rawPoints += 10
		default:
			rawPoints += 5
		}

		if pr.IsFirstTimer {
			firstTimerCount++
			rawPoints += 50
		}
	}

	// Calculate streak multiplier (1.0 to 1.5 max)
	multiplier := 1.0
	if streakMonths > 1 {
		multiplier = 1.0 + math.Min(float64(streakMonths-1)*0.1, 0.5)
	}

	totalKarma := int(float64(rawPoints) * multiplier)
	rank := ComputeLevelRank(totalKarma)

	headline := fmt.Sprintf("Level %d %s", rank.Level, rank.Title)
	if topLang != "" {
		headline = fmt.Sprintf("Level %d %s in %s", rank.Level, rank.Title, topLang)
	}

	return ContributorKarma{
		TotalKarma:          totalKarma,
		Rank:                rank,
		MergedTierSCount:    tierS,
		MergedTierACount:    tierA,
		MergedTierBCount:    tierB,
		MergedTierCCount:    tierC,
		FirstTimerBonuses:   firstTimerCount,
		StreakMonths:        streakMonths,
		Multiplier:          multiplier,
		TopLanguageMastered: topLang,
		ReputationHeadline:  headline,
	}
}

// ComputeLevelRank maps points into levels and titles
func ComputeLevelRank(points int) LevelRank {
	switch {
	case points >= 3500:
		return LevelRank{
			Level:      5,
			Title:      "Core OSS Legend",
			BadgeColor: "#10b981", // Emerald
			MinPoints:  3500,
			MaxPoints:  10000,
			NextTier:   "Max Rank",
			NextPoints: 0,
			Percentile: "Top 1% Worldwide",
		}
	case points >= 1500:
		return LevelRank{
			Level:      4,
			Title:      "Senior Open-Source Engineer",
			BadgeColor: "#3b82f6", // Blue
			MinPoints:  1500,
			MaxPoints:  3500,
			NextTier:   "Core OSS Legend",
			NextPoints: 3500 - points,
			Percentile: "Top 5% Worldwide",
		}
	case points >= 500:
		return LevelRank{
			Level:      3,
			Title:      "Ecosystem Specialist",
			BadgeColor: "#8b5cf6", // Purple
			MinPoints:  500,
			MaxPoints:  1500,
			NextTier:   "Senior Open-Source Engineer",
			NextPoints: 1500 - points,
			Percentile: "Top 15% Worldwide",
		}
	case points >= 100:
		return LevelRank{
			Level:      2,
			Title:      "Verified Contributor",
			BadgeColor: "#f59e0b", // Amber
			MinPoints:  100,
			MaxPoints:  500,
			NextTier:   "Ecosystem Specialist",
			NextPoints: 500 - points,
			Percentile: "Top 35% Worldwide",
		}
	default:
		return LevelRank{
			Level:      1,
			Title:      "Apprentice Contributor",
			BadgeColor: "#71717a", // Zinc
			MinPoints:  0,
			MaxPoints:  100,
			NextTier:   "Verified Contributor",
			NextPoints: 100 - points,
			Percentile: "Rising Contributor",
		}
	}
}

// RenderKarmaBadgeSVG outputs Shields.io-styled SVG badge for GitHub README embeds
func RenderKarmaBadgeSVG(username string, karma ContributorKarma) string {
	ptsText := fmt.Sprintf("%d Karma", karma.TotalKarma)
	titleText := karma.Rank.Title
	if karma.Rank.Level >= 4 {
		titleText = fmt.Sprintf("Lv.%d %s", karma.Rank.Level, karma.Rank.Title)
	}

	totalWidth := 190 + len(titleText)*6

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="28" role="img" aria-label="GetMerged Karma: %s (%s)">
  <linearGradient id="b" x2="0" y2="100%%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="%d" height="28" rx="6" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <rect width="105" height="28" fill="#09090b"/>
    <rect x="105" width="%d" height="28" fill="%s"/>
    <rect width="%d" height="28" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="53" y="18" fill="#a1a1aa" font-weight="bold">GetMerged ⚡</text>
    <text x="%d" y="18" fill="#ffffff" font-weight="bold">%s (%s)</text>
  </g>
</svg>`, totalWidth, ptsText, titleText, totalWidth, totalWidth-105, karma.Rank.BadgeColor, totalWidth, 105+(totalWidth-105)/2, ptsText, titleText)
}
