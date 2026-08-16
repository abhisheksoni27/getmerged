package notification

import (
	"fmt"
	"html"
	"strings"
)

type MatchCandidate struct {
	RepoFullName       string  `json:"repo_full_name"`
	Language           string  `json:"language"`
	CRankTier          string  `json:"c_rank_tier"`
	ExternalMergeRate  float64 `json:"external_merge_rate"`
	OptimalWindow      string  `json:"optimal_window"` // e.g. "14:00 - 18:00 UTC"
	GoodFirstIssueURL  string  `json:"good_first_issue_url"`
	GoodFirstIssueText string  `json:"good_first_issue_text"`
}

type DigestUser struct {
	Username string
	Email    string
}

type DigestPayload struct {
	Subject  string
	TextBody string
	HTMLBody string
}

// GenerateWeeklyDigest creates personalized, bounded weekly digest email content for a contributor.
func GenerateWeeklyDigest(user DigestUser, matches []MatchCandidate) DigestPayload {
	if len(matches) > 3 {
		matches = matches[:3]
	}

	subject := fmt.Sprintf("Your Weekly Contributor Matches on GetMerged (%d high-probability repos)", len(matches))
	if len(matches) == 0 {
		subject = "Your Weekly GetMerged Open-Source Update"
	}

	var textBuilder strings.Builder
	var htmlBuilder strings.Builder

	textBuilder.WriteString(fmt.Sprintf("Hi %s,\n\nHere are your personalized high-probability open-source repository matches for this week on GetMerged:\n\n", user.Username))
	htmlBuilder.WriteString(fmt.Sprintf("<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;\"><h2 style=\"color: #0f172a;\">Hi %s,</h2><p>Here are your personalized high-probability open-source repository matches for this week:</p><div style=\"margin: 20px 0;\">", html.EscapeString(user.Username)))

	for i, m := range matches {
		textBuilder.WriteString(fmt.Sprintf("%d. %s [%s Tier | %s] - %.1f%% Merge Rate\n", i+1, m.RepoFullName, m.CRankTier, m.Language, m.ExternalMergeRate))
		if m.OptimalWindow != "" {
			textBuilder.WriteString(fmt.Sprintf("   Optimal Submission: %s\n", m.OptimalWindow))
		}
		if m.GoodFirstIssueURL != "" {
			textBuilder.WriteString(fmt.Sprintf("   Recommended Issue: %s (%s)\n", m.GoodFirstIssueText, m.GoodFirstIssueURL))
		}
		textBuilder.WriteString("\n")

		htmlBuilder.WriteString(fmt.Sprintf(`
			<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #f8fafc;">
				<h3 style="margin: 0 0 8px 0; color: #0284c7;"><a href="https://getmerged.abhishekco.de/%s" title="View repository scorecard on GetMerged" style="color: #0284c7; text-decoration: none;">%s</a> <span style="font-size: 12px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: normal;">%s Tier</span></h3>
				<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Language:</strong> %s | <strong>Merge Rate:</strong> %.1f%%</p>
				<p style="margin: 4px 0; font-size: 14px; color: #475569;"><strong>Optimal Submission:</strong> %s</p>
				%s
			</div>
		`, html.EscapeString(m.RepoFullName), html.EscapeString(m.RepoFullName), html.EscapeString(m.CRankTier), html.EscapeString(m.Language), m.ExternalMergeRate, html.EscapeString(m.OptimalWindow), formatIssueHTML(m)))
	}

	htmlBuilder.WriteString("</div><p style=\"font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;\">You received this because you are an active contributor on GetMerged. <a href=\"https://getmerged.abhishekco.de/settings\" title=\"Manage email preferences\" style=\"color: #64748b;\">Manage preferences</a></p></div>")

	return DigestPayload{
		Subject:  subject,
		TextBody: textBuilder.String(),
		HTMLBody: htmlBuilder.String(),
	}
}

func formatIssueHTML(m MatchCandidate) string {
	if m.GoodFirstIssueURL == "" {
		return ""
	}
	return fmt.Sprintf("<p style=\"margin: 6px 0 0 0; font-size: 13px;\"><a href=\"%s\" title=\"View good first issue on GitHub\" style=\"color: #10b981; font-weight: bold; text-decoration: none;\">🎯 %s →</a></p>", html.EscapeString(m.GoodFirstIssueURL), html.EscapeString(m.GoodFirstIssueText))
}
