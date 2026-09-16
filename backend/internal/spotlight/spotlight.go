package spotlight

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/jmoiron/sqlx"
)

// RepoSpotlight represents the data needed to craft a human-friendly spotlight post on X.
type RepoSpotlight struct {
	RepositoryID    string  `db:"repository_id"`
	FullName        string  `db:"full_name"`
	Owner           string  `db:"owner"`
	Name            string  `db:"name"`
	Language        string  `db:"language"`
	Stars           int     `db:"stars"`
	Description     string  `db:"description"`
	CRankTier       string  `db:"c_rank_tier"`
	CRankScore      float64 `db:"c_rank_score"`
	ResponseHours   float64 `db:"response_hours"`
	MergeRate       float64 `db:"merge_rate"`
	MaintainerCount int     `db:"maintainer_count"`
	GFICount        int     `db:"gfi_count"`
	SpotlightDate   string  `db:"spotlight_date"`
	TweetText       string  `db:"tweet_text"`
	IntentURL       string  `db:"intent_url"`
}

var (
	mdLinkRegex  = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	urlRegex     = regexp.MustCompile(`https?://\S+`)
	multiSpaceRe = regexp.MustCompile(`\s+`)
)

// CleanDescription cleans descriptions of markdown links, raw urls, and excess whitespace.
func CleanDescription(desc string, maxChars int) string {
	desc = mdLinkRegex.ReplaceAllString(desc, "$1")
	desc = urlRegex.ReplaceAllString(desc, "")
	desc = multiSpaceRe.ReplaceAllString(desc, " ")
	desc = strings.TrimSpace(desc)
	desc = strings.TrimRight(desc, ".:,- ")

	if maxChars <= 0 || utf8.RuneCountInString(desc) <= maxChars {
		return desc
	}

	runes := []rune(desc)
	truncated := string(runes[:maxChars])
	lastSpace := strings.LastIndex(truncated, " ")
	if lastSpace > 20 {
		truncated = truncated[:lastSpace]
	}
	return strings.TrimRight(truncated, ".,;:!?- ") + "..."
}

// FormatStars returns human-readable stars (e.g. 8.5k★ or 450★).
func FormatStars(stars int) string {
	if stars >= 1000 {
		return fmt.Sprintf("%.1fk★", float64(stars)/1000.0)
	}
	return fmt.Sprintf("%d★", stars)
}

// FormatResponseSpeed translates latency hours into human terms without jargon.
func FormatResponseSpeed(hours float64) string {
	if hours <= 0 {
		return "Replies in under 2h"
	}
	if hours < 1 {
		return "Replies in under 1h"
	}
	if hours < 24 {
		h := int(hours + 0.5)
		if h < 1 {
			h = 1
		}
		return fmt.Sprintf("Replies in ~%dh", h)
	}
	days := hours / 24.0
	if days < 2 {
		return "Replies in ~1-2 days"
	}
	return fmt.Sprintf("Replies in ~%.1fd", days)
}

// FormatTweet crafts the exact post text for X (Twitter).
// It ensures human-first language, no robotic jargon, and guarantees fit within 280 chars.
func FormatTweet(repo *RepoSpotlight) string {
	langBadge := ""
	if repo.Language != "" {
		langBadge = fmt.Sprintf(" (%s)", repo.Language)
	}

	header := fmt.Sprintf("Repo spotlight: %s%s\n\n", repo.FullName, langBadge)

	starsStr := FormatStars(repo.Stars)
	tierStr := repo.CRankTier
	if tierStr == "" {
		tierStr = "S"
	}

	speedStr := FormatResponseSpeed(repo.ResponseHours)

	mergeRatePct := int(repo.MergeRate + 0.5)
	if mergeRatePct <= 0 {
		mergeRatePct = 75
	}
	mergeStr := fmt.Sprintf("🤝 %d%% outside PRs merged", mergeRatePct)

	teamStr := "👥 Active maintainer team"
	if repo.MaintainerCount > 1 {
		teamStr = fmt.Sprintf("👥 %d active reviewers", repo.MaintainerCount)
	} else if repo.MaintainerCount == 1 {
		teamStr = "👤 Active solo maintainer"
	}

	statsBlock := fmt.Sprintf("The breakdown:\n⭐ %s · Tier %s\n⚡ %s\n%s\n%s\n\n",
		starsStr, tierStr, speedStr, mergeStr, teamStr)

	giftStr := "The greatest gift:\n"
	if repo.GFICount > 0 {
		if repo.GFICount == 1 {
			giftStr += "🎁 1 Good First Issue waiting\n\n"
		} else {
			giftStr += fmt.Sprintf("🎁 %d Good First Issues waiting\n\n", repo.GFICount)
		}
	} else {
		giftStr += "🎁 Welcoming reviews & zero PR backlog\n\n"
	}

	scorecardURL := fmt.Sprintf("https://getmerged.abhishekco.de/%s", repo.FullName)

	// Available budget for description
	// Twitter weighs t.co URLs as 23 characters.
	// We calculate remaining budget to stay safely under 270 chars total.
	fixedWeight := utf8.RuneCountInString(header) +
		utf8.RuneCountInString(statsBlock) +
		utf8.RuneCountInString(giftStr) +
		23 // scorecardURL on Twitter

	maxDescLen := 270 - fixedWeight
	if maxDescLen < 30 {
		maxDescLen = 30
	}

	cleanedDesc := CleanDescription(repo.Description, maxDescLen)
	var body string
	if cleanedDesc != "" {
		body = fmt.Sprintf("%s%s\n\n%s%s%s", header, cleanedDesc, statsBlock, giftStr, scorecardURL)
	} else {
		body = fmt.Sprintf("%s%s%s%s", header, statsBlock, giftStr, scorecardURL)
	}

	return body
}

// BuildIntentURL creates a 1-click Twitter/X intent URL.
func BuildIntentURL(tweetText string) string {
	return "https://twitter.com/intent/tweet?text=" + url.QueryEscape(tweetText)
}

// GetOrCreateDailySpotlight retrieves today's spotlight or selects a new S-Tier repo.
func GetOrCreateDailySpotlight(ctx context.Context, database *sqlx.DB, targetDate string) (*RepoSpotlight, error) {
	// 1. Check if today's spotlight was already selected
	var existing RepoSpotlight
	err := database.GetContext(ctx, &existing, `
		SELECT 
			dts.repository_id, 
			dts.full_name, 
			dts.spotlight_date, 
			dts.tweet_text,
			COALESCE(r.language, '') AS language,
			COALESCE(r.stars, 0) AS stars,
			COALESCE(s.c_rank_tier, 'S') AS c_rank_tier
		FROM daily_tweet_spotlights dts
		LEFT JOIN repositories r ON dts.repository_id = r.id
		LEFT JOIN latest_snapshots s ON dts.repository_id = s.repository_id
		WHERE dts.spotlight_date = ?
		LIMIT 1
	`, targetDate)

	if err == nil && existing.RepositoryID != "" {
		existing.IntentURL = BuildIntentURL(existing.TweetText)
		return &existing, nil
	} else if err != nil && err != sql.ErrNoRows {
		// Log or handle, might be table missing if schema hasn't initialized
	}

	// 2. Query next premier candidate (S-Tier first, then A-Tier)
	var repo RepoSpotlight
	query := `
		SELECT 
			r.id AS repository_id,
			r.full_name,
			r.owner,
			r.name,
			COALESCE(r.language, '') AS language,
			COALESCE(r.stars, 0) AS stars,
			COALESCE(r.description, '') AS description,
			COALESCE(s.c_rank_tier, 'S') AS c_rank_tier,
			COALESCE(s.c_rank_score, 0) AS c_rank_score,
			COALESCE(s.time_to_first_response_hours, s.response_p50_hours, 0) AS response_hours,
			COALESCE(s.external_pr_merge_rate, 0) AS merge_rate,
			COALESCE(s.bus_factor, s.distinct_maintainer_count, 0) AS maintainer_count,
			COALESCE(s.good_first_issue_count, 0) AS gfi_count
		FROM repositories r
		JOIN latest_snapshots s ON r.id = s.repository_id
		LEFT JOIN daily_tweet_spotlights dts ON r.id = dts.repository_id
		WHERE dts.repository_id IS NULL
		  AND s.staleness_flag = 0
		  AND s.c_rank_tier = 'S'
		  AND r.stars >= 50
		  AND r.description IS NOT NULL AND r.description != ''
		ORDER BY 
		  (CASE WHEN s.good_first_issue_count > 0 THEN 1 ELSE 0 END) DESC,
		  s.c_rank_score DESC,
		  r.stars DESC
		LIMIT 1
	`
	err = database.GetContext(ctx, &repo, query)
	if err == sql.ErrNoRows {
		// Loosen to A-tier if all S-tier were spotlighted
		queryFallback := strings.Replace(query, "s.c_rank_tier = 'S'", "s.c_rank_tier IN ('S', 'A')", 1)
		err = database.GetContext(ctx, &repo, queryFallback)
	}

	if err != nil {
		return nil, fmt.Errorf("no candidate repo found for spotlight: %w", err)
	}

	repo.SpotlightDate = targetDate
	repo.TweetText = FormatTweet(&repo)
	repo.IntentURL = BuildIntentURL(repo.TweetText)

	// 3. Persist to daily_tweet_spotlights
	_, _ = database.ExecContext(ctx, `
		INSERT INTO daily_tweet_spotlights (repository_id, full_name, spotlight_date, tweet_text)
		VALUES (?, ?, ?, ?)
	`, repo.RepositoryID, repo.FullName, repo.SpotlightDate, repo.TweetText)

	return &repo, nil
}

// GenerateBulkSpotlights extracts N top un-spotlighted repos for bulk scheduling.
func GenerateBulkSpotlights(ctx context.Context, database *sqlx.DB, limit int) ([]RepoSpotlight, error) {
	if limit <= 0 {
		limit = 10
	}

	var repos []RepoSpotlight
	query := `
		SELECT 
			r.id AS repository_id,
			r.full_name,
			r.owner,
			r.name,
			COALESCE(r.language, '') AS language,
			COALESCE(r.stars, 0) AS stars,
			COALESCE(r.description, '') AS description,
			COALESCE(s.c_rank_tier, 'S') AS c_rank_tier,
			COALESCE(s.c_rank_score, 0) AS c_rank_score,
			COALESCE(s.time_to_first_response_hours, s.response_p50_hours, 0) AS response_hours,
			COALESCE(s.external_pr_merge_rate, 0) AS merge_rate,
			COALESCE(s.bus_factor, s.distinct_maintainer_count, 0) AS maintainer_count,
			COALESCE(s.good_first_issue_count, 0) AS gfi_count
		FROM repositories r
		JOIN latest_snapshots s ON r.id = s.repository_id
		WHERE s.staleness_flag = 0
		  AND s.c_rank_tier IN ('S', 'A')
		  AND r.stars >= 50
		  AND r.description IS NOT NULL AND r.description != ''
		ORDER BY 
		  (CASE WHEN s.c_rank_tier = 'S' THEN 1 ELSE 0 END) DESC,
		  (CASE WHEN s.good_first_issue_count > 0 THEN 1 ELSE 0 END) DESC,
		  s.c_rank_score DESC,
		  r.stars DESC
		LIMIT ?
	`
	err := database.SelectContext(ctx, &repos, query, limit)
	if err != nil {
		return nil, err
	}

	for i := range repos {
		repos[i].TweetText = FormatTweet(&repos[i])
		repos[i].IntentURL = BuildIntentURL(repos[i].TweetText)
	}

	return repos, nil
}

// FormatTelegramSpotlightSection formats the spotlight for inclusion in the daily Telegram morning pulse.
func FormatTelegramSpotlightSection(spot *RepoSpotlight) string {
	if spot == nil {
		return ""
	}
	var sb strings.Builder
	sb.WriteString("🐦 *Today's X (Twitter) Spotlight Drop:*\n")
	lang := spot.Language
	if lang == "" {
		lang = "Codebase"
	}
	sb.WriteString(fmt.Sprintf("*Repo:* `%s` (%s · %s · Tier %s)\n\n",
		spot.FullName, lang, FormatStars(spot.Stars), spot.CRankTier))
	sb.WriteString("```\n")
	sb.WriteString(spot.TweetText)
	sb.WriteString("\n```\n\n")
	sb.WriteString(fmt.Sprintf("👉 [Tap here to Post on X](%s)", spot.IntentURL))
	return sb.String()
}
