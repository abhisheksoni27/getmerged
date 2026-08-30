package quests

import "time"

// Quest represents a gamified onboarding mission
type Quest struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	KarmaReward int    `json:"karma_reward"`
	IsCompleted bool   `json:"is_completed"`
	ProgressPct int    `json:"progress_percentage"`
	Category    string `json:"category"` // "onboarding" | "exploration" | "contribution"
	IconName    string `json:"icon_name"`
}

// QuestTrack contains the complete mission log and completion stats
type QuestTrack struct {
	TotalQuests     int     `json:"total_quests"`
	CompletedQuests int     `json:"completed_quests"`
	TotalKarmaEarned int    `json:"total_karma_earned"`
	CompletionRate  float64 `json:"completion_rate"`
	Quests          []Quest `json:"quests"`
}

type UserActivitySnapshot struct {
	HasScannedStack   bool
	HasActiveSniper   bool
	HasViewedSweetSpot bool
	MergedPRCount     int
	HasSubmittedReview bool
}

// ComputeUserQuests calculates the real-time quest progress for a contributor
func ComputeUserQuests(activity UserActivitySnapshot) QuestTrack {
	quests := []Quest{
		{
			ID:          "quest-stack-scan",
			Title:       "Initialize Dependency Radar",
			Description: "Connect your GitHub or paste a manifest on /stack to scan your production dependencies.",
			KarmaReward: 50,
			IsCompleted: activity.HasScannedStack,
			ProgressPct: boolToPct(activity.HasScannedStack),
			Category:    "onboarding",
			IconName:    "Radar",
		},
		{
			ID:          "quest-issue-sniper",
			Title:       "Arm the Issue Sniper",
			Description: "Subscribe to instant or weekly beginner issue alerts in your favorite language or target repo.",
			KarmaReward: 50,
			IsCompleted: activity.HasActiveSniper,
			ProgressPct: boolToPct(activity.HasActiveSniper),
			Category:    "onboarding",
			IconName:    "Crosshair",
		},
		{
			ID:          "quest-sweet-spot",
			Title:       "Calibrate PR Velocity",
			Description: "Check the PR Size Sweet Spot on a repository scorecard to optimize your pull request diff.",
			KarmaReward: 50,
			IsCompleted: activity.HasViewedSweetSpot,
			ProgressPct: boolToPct(activity.HasViewedSweetSpot),
			Category:    "exploration",
			IconName:    "Zap",
		},
		{
			ID:          "quest-first-merge",
			Title:       "First Verified PR Merge",
			Description: "Get a pull request merged into any audited open-source repository.",
			KarmaReward: 100,
			IsCompleted: activity.MergedPRCount > 0,
			ProgressPct: boolToPct(activity.MergedPRCount > 0),
			Category:    "contribution",
			IconName:    "GitMerge",
		},
		{
			ID:          "quest-peer-review",
			Title:       "Review a Maintainer",
			Description: "Leave verified Glassdoor-style community feedback on a repository you've contributed to.",
			KarmaReward: 50,
			IsCompleted: activity.HasSubmittedReview,
			ProgressPct: boolToPct(activity.HasSubmittedReview),
			Category:    "contribution",
			IconName:    "Award",
		},
	}

	completedCount := 0
	totalKarma := 0
	for _, q := range quests {
		if q.IsCompleted {
			completedCount++
			totalKarma += q.KarmaReward
		}
	}

	rate := 0.0
	if len(quests) > 0 {
		rate = (float64(completedCount) / float64(len(quests))) * 100.0
	}

	return QuestTrack{
		TotalQuests:      len(quests),
		CompletedQuests:  completedCount,
		TotalKarmaEarned: totalKarma,
		CompletionRate:   rate,
		Quests:           quests,
	}
}

func boolToPct(v bool) int {
	if v {
		return 100
	}
	return 0
}

// QuestLogEntry represents an event record in user history
type QuestLogEntry struct {
	QuestID   string    `json:"quest_id"`
	Title     string    `json:"title"`
	Karma     int       `json:"karma"`
	AwardedAt time.Time `json:"awarded_at"`
}
