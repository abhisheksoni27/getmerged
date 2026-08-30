package notification

import (
	"fmt"
	"html"
	"strings"
)

type ContributorWeeklyStats struct {
	StreakWeeks      int    `json:"streak_weeks"`
	TotalKarma       int    `json:"total_karma"`
	KarmaDeltaWeekly int    `json:"karma_delta_weekly"`
	LevelTitle       string `json:"level_title"`
	LeagueRank       int    `json:"league_rank"`
	TopLanguage      string `json:"top_language"`
	PercentileTier   string `json:"percentile_tier"`
}

type SpotlightRepo struct {
	RepoFullName       string  `json:"repo_full_name"`
	CRankTier          string  `json:"c_rank_tier"`
	Language           string  `json:"language"`
	ExternalMergeRate  float64 `json:"external_merge_rate"`
	MedianReviewHours  float64 `json:"median_review_hours"`
	Description        string  `json:"description"`
}

type MatchCandidate struct {
	RepoFullName       string  `json:"repo_full_name"`
	Language           string  `json:"language"`
	CRankTier          string  `json:"c_rank_tier"`
	ExternalMergeRate  float64 `json:"external_merge_rate"`
	OptimalWindow      string  `json:"optimal_window"` // e.g. "14:00 - 18:00 UTC"
	GoodFirstIssueURL  string  `json:"good_first_issue_url"`
	GoodFirstIssueText string  `json:"good_first_issue_text"`
	IssueNumber        int     `json:"issue_number"`
}

type DigestUser struct {
	Username string
	Email    string
	Stats    ContributorWeeklyStats
}

type DigestPayload struct {
	Subject  string
	TextBody string
	HTMLBody string
}

// GenerateWeeklyDigest creates a personalized, high-retention weekly wrap for a contributor.
func GenerateWeeklyDigest(user DigestUser, matches []MatchCandidate) DigestPayload {
	if len(matches) > 3 {
		matches = matches[:3]
	}

	streakText := ""
	if user.Stats.StreakWeeks > 0 {
		streakText = fmt.Sprintf("🔥 %d-Wk Streak · ", user.Stats.StreakWeeks)
	}

	subject := fmt.Sprintf("%s+%d Karma & Your Weekly Contributor Wrap | GetMerged", streakText, user.Stats.KarmaDeltaWeekly)
	if user.Stats.KarmaDeltaWeekly == 0 && user.Stats.TotalKarma > 0 {
		subject = fmt.Sprintf("%sYour Weekly Open-Source Contributor Wrap | GetMerged", streakText)
	} else if user.Stats.TotalKarma == 0 {
		subject = "Your Weekly Open-Source Opportunity Wrap | GetMerged"
	}

	var textBuilder strings.Builder
	var htmlBuilder strings.Builder

	// Text Version
	textBuilder.WriteString(fmt.Sprintf("Hi %s,\n\nHere is your GetMerged Weekly Contributor Wrap:\n\n", user.Username))
	textBuilder.WriteString("=== YOUR WEEKLY MOMENTUM ===\n")
	if user.Stats.StreakWeeks > 0 {
		textBuilder.WriteString(fmt.Sprintf("🔥 Active Streak: %d weeks\n", user.Stats.StreakWeeks))
	}
	textBuilder.WriteString(fmt.Sprintf("⚡ Total Karma: %d (%s)\n", user.Stats.TotalKarma, user.Stats.LevelTitle))
	if user.Stats.LeagueRank > 0 {
		textBuilder.WriteString(fmt.Sprintf("🏆 Monthly League Rank: #%d in %s (%s)\n", user.Stats.LeagueRank, user.Stats.TopLanguage, user.Stats.PercentileTier))
	}
	textBuilder.WriteString("\n=== FRESH GOOD FIRST ISSUES IN YOUR STACK ===\n")
	for i, m := range matches {
		textBuilder.WriteString(fmt.Sprintf("%d. [%s Tier %s] %s\n", i+1, m.RepoFullName, m.CRankTier, m.GoodFirstIssueText))
		textBuilder.WriteString(fmt.Sprintf("   Merge Rate: %.0f%% | URL: %s\n", m.ExternalMergeRate, m.GoodFirstIssueURL))
	}
	textBuilder.WriteString("\n=== ⚡ PRO SNIPER TEASER ===\n")
	textBuilder.WriteString("18 beginner issues in top repos were claimed in <3 mins this week.\nPro members ($9/mo) get instant sub-30s Telegram & Discord alerts.\nUpgrade: https://getmerged.abhishekco.de/pricing?tab=contributors\n\n")

	// HTML Version (Responsive, Dark-Card Styling with Zero Jargon)
	htmlBuilder.WriteString(fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px 0; background-color: #0c0c0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #141416; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    
    <!-- Brand Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 20px;">
      <div style="font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
        <span style="color: #10b981;">⚡</span> GetMerged <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-left: 6px;">Weekly Wrap</span>
      </div>
      <div style="font-size: 12px; font-family: monospace; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 9999px; padding: 2px 10px; font-weight: bold;">
        Proof of Work
      </div>
    </div>

    <!-- Personal Momentum Banner -->
    <div style="background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,78,59,0.3)); border: 1px solid rgba(16,185,129,0.3); border-radius: 14px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #6ee7b7; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">
        Your Weekly Contributor Momentum
      </div>
      <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
        Hi %s, you're at <span style="color: #10b981;">⚡ %d Karma</span>
      </div>
      
      <table style="width: 100%%; border-collapse: collapse; text-align: center; font-family: monospace; font-size: 12px;">
        <tr>
          <td style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; width: 33%%;">
            <div style="color: #a1a1aa; font-size: 10px; text-transform: uppercase;">Active Streak</div>
            <div style="color: #f59e0b; font-size: 16px; font-weight: 900; margin-top: 2px;">🔥 %d Wks</div>
          </td>
          <td style="width: 2%%;"></td>
          <td style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; width: 33%%;">
            <div style="color: #a1a1aa; font-size: 10px; text-transform: uppercase;">Reputation</div>
            <div style="color: #ffffff; font-size: 14px; font-weight: 800; margin-top: 4px;">%s</div>
          </td>
          <td style="width: 2%%;"></td>
          <td style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; width: 33%%;">
            <div style="color: #a1a1aa; font-size: 10px; text-transform: uppercase;">This Week</div>
            <div style="color: #10b981; font-size: 16px; font-weight: 900; margin-top: 2px;">+%d XP</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Fresh Issue Drop -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="font-size: 14px; font-weight: bold; color: #ffffff;">
          🎯 Fresh Good First Issues in Your Tech Stack
        </div>
      </div>
`, html.EscapeString(user.Username), user.Stats.TotalKarma, user.Stats.StreakWeeks, html.EscapeString(user.Stats.LevelTitle), user.Stats.KarmaDeltaWeekly))

	for _, m := range matches {
		htmlBuilder.WriteString(fmt.Sprintf(`
      <div style="background: #09090b; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-family: monospace; font-size: 11px; font-weight: bold; color: #38bdf8;">%s</span>
          <span style="font-family: monospace; font-size: 10px; background: rgba(16,185,129,0.15); color: #34d399; padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3);">Tier %s · %.0f%%%% Merge</span>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #f4f4f5; margin-bottom: 8px; line-height: 1.4;">
          %s
        </div>
        <div>
          <a href="%s" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-size: 11px; font-family: monospace; font-weight: bold; padding: 5px 12px; border-radius: 6px;">⚡ Claim Issue on GitHub →</a>
        </div>
      </div>
`, html.EscapeString(m.RepoFullName), html.EscapeString(m.CRankTier), m.ExternalMergeRate, html.EscapeString(m.GoodFirstIssueText), html.EscapeString(m.GoodFirstIssueURL)))
	}

	// Pro Snipper Upgrade Teaser
	htmlBuilder.WriteString(`
    </div>

    <!-- Pro Contributor Upgrade Callout -->
    <div style="background: linear-gradient(135deg, #1e1b4b, #0f172a); border: 1px solid rgba(129,140,248,0.3); border-radius: 14px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 12px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-family: monospace; letter-spacing: 0.5px;">
        ⚡ Never Miss a Beginner Issue
      </div>
      <div style="font-size: 13px; color: #e2e8f0; margin: 6px 0 12px 0;">
        Beginner issues in top repos get claimed in &lt;3 minutes. <strong>Pro members ($9/mo)</strong> get instant real-time Telegram &amp; Discord push alerts within 30 seconds.
      </div>
      <a href="https://getmerged.abhishekco.de/pricing?tab=contributors" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; font-size: 12px; font-family: monospace; font-weight: bold; padding: 8px 18px; border-radius: 8px; box-shadow: 0 4px 12px rgba(99,102,241,0.4);">
        Unlock Instant Issue Sniper ($9/mo) →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; font-size: 11px; font-family: monospace; color: #71717a; text-align: center;">
      <span>Sent by GetMerged Open Source Index · </span>
      <a href="https://getmerged.abhishekco.de/settings/notifications" style="color: #a1a1aa; text-decoration: underline;">Manage Preferences</a>
      <span> · </span>
      <a href="https://getmerged.abhishekco.de/dashboard" style="color: #a1a1aa; text-decoration: underline;">View Dashboard</a>
    </div>

  </div>
</body>
</html>`)

	return DigestPayload{
		Subject:  subject,
		TextBody: textBuilder.String(),
		HTMLBody: htmlBuilder.String(),
	}
}
