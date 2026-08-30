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

// RenderKarmaBadgeSVG outputs modern squircle SVG badge for GitHub README embeds
func RenderKarmaBadgeSVG(username string, karma ContributorKarma) string {
	rightText := fmt.Sprintf("⚡ %s Karma · %s", formatKarmaNumber(karma.TotalKarma), karma.Rank.Title)

	leftWidth := 98
	rightWidth := int(float64(len(rightText))*7.2) + 20
	if rightWidth < 150 {
		rightWidth = 150
	}
	totalWidth := leftWidth + rightWidth
	rightCenter := leftWidth + rightWidth/2

	bgColor1 := "#064e3b"
	bgColor2 := "#022c22"
	accentColor := "#10b981"
	textColor := "#a7f3d0"

	if karma.TotalKarma >= 3000 {
		bgColor1 = "#451a03"
		bgColor2 = "#270e02"
		accentColor = "#f59e0b"
		textColor = "#fde68a"
	} else if karma.TotalKarma < 1000 {
		bgColor1 = "#0c4a6e"
		bgColor2 = "#082f49"
		accentColor = "#38bdf8"
		textColor = "#bae6fd"
	}

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="24" viewBox="0 0 %d 24" fill="none" role="img" aria-label="GetMerged: %s">
  <title>GetMerged Contributor: %s</title>
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="100%%" stop-color="#000000" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="rightBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%%" stop-color="%s"/>
      <stop offset="100%%" stop-color="%s"/>
    </linearGradient>
    <clipPath id="squircle">
      <rect width="%d" height="24" rx="6" fill="#ffffff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#squircle)">
    <rect width="%d" height="24" fill="#09090b"/>
    <rect x="%d" width="%d" height="24" fill="url(#rightBg)"/>
    <rect width="%d" height="24" fill="url(#gloss)"/>
    <line x1="%d" y1="0" x2="%d" y2="24" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <rect width="%d" height="24" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <rect x="%d" y="23" width="%d" height="1" fill="%s"/>
  </g>
  <g transform="translate(8, 5)">
    <path d="M7 1L1 8H6L5 13L11 6H6L7 1Z" fill="#10b981" stroke="#059669" stroke-width="0.5" stroke-linejoin="round"/>
  </g>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif" font-size="11" font-weight="700" text-rendering="geometricPrecision">
    <text x="24" y="16" fill="#f4f4f5" letter-spacing="-0.2px">GetMerged</text>
    <text x="%d" y="16" fill="%s" text-anchor="middle" font-weight="600" letter-spacing="-0.1px">%s</text>
  </g>
</svg>`, totalWidth, totalWidth, rightText, rightText, bgColor1, bgColor2, totalWidth, leftWidth, leftWidth, rightWidth, totalWidth, leftWidth, leftWidth, totalWidth, leftWidth, rightWidth, accentColor, rightCenter, textColor, rightText)
}

func formatKarmaNumber(n int) string {
	in := fmt.Sprintf("%d", n)
	if len(in) <= 3 {
		return in
	}
	var res []byte
	rem := len(in) % 3
	if rem > 0 {
		res = append(res, in[:rem]...)
		if len(in) > rem {
			res = append(res, ',')
		}
	}
	for i := rem; i < len(in); i += 3 {
		res = append(res, in[i:i+3]...)
		if i+3 < len(in) {
			res = append(res, ',')
		}
	}
	return string(res)
}
