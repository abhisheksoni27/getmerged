package notification

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	scoreDeltaAlertThreshold = 10.0
	staleRunTimeout          = 60 * time.Minute
)

// DigestMailer abstracts email delivery for the weekly digest.
type DigestMailer interface {
	Send(ctx context.Context, to, subject, textBody, htmlBody string) error
}

// WeeklyDigestConfig carries the dependencies of a digest run.
type WeeklyDigestConfig struct {
	Mailer    DigestMailer
	BaseURL   string
	JobSecret string

	// Slack/Discord webhook fan-out (optional, additive channel):
	EncryptionKey []byte
	Telegram      *TelegramNotifier
	WebhookClient *http.Client
}

// WeeklyDigestSummary reports the outcome of one weekly-digest run.
type WeeklyDigestSummary struct {
	WeekStart       string `json:"week_start"`
	Status          string `json:"status"`
	UsersConsidered int    `json:"users_considered"`
	AlertsFound     int    `json:"alerts_found"`
	Sent            int    `json:"sent"`
	Failed          int    `json:"failed"`
	SkippedNew      int    `json:"skipped_new"`

	EmailsSent   int `json:"emails_sent"`
	EmailsFailed int `json:"emails_failed"`

	WebhooksSent     int `json:"webhooks_sent"`
	WebhooksFailed   int `json:"webhooks_failed"`
	WebhooksDisabled int `json:"webhooks_disabled"`
}

// RepoAlert captures a C-Rank change on one watched repo.
type RepoAlert struct {
	RepoID      string
	FullName    string
	Language    string
	PrevTier    string
	NewTier     string
	PrevScore   float64
	NewScore    float64
	Delta       float64
	TierChanged bool
	MergeRate   float64
	GFIURL      string
	GFIText     string
}

type snapRow struct {
	Date      string  `db:"snapshot_date"`
	Score     float64 `db:"c_rank_score"`
	Tier      string  `db:"c_rank_tier"`
	MergeRate float64 `db:"external_pr_merge_rate"`
}

type watchedRepo struct {
	RepoID   string `db:"repo_id"`
	FullName string `db:"full_name"`
	Language string `db:"language"`
}

type digestUser struct {
	ID       int64  `db:"id"`
	Username string `db:"username"`
	Email    string `db:"email"`
}

// UnsubscribeToken derives the per-user unsubscribe HMAC token.
func UnsubscribeToken(userID int64, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(strconv.FormatInt(userID, 10)))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyUnsubscribeToken validates an unsubscribe request's uid/token pair.
func VerifyUnsubscribeToken(uidStr, token, secret string) bool {
	if secret == "" || uidStr == "" || token == "" {
		return false
	}
	uid, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return false
	}
	expected := UnsubscribeToken(uid, secret)
	return hmac.Equal([]byte(expected), []byte(token))
}

// mondayAnchor returns the Monday 00:00 UTC anchor of the week containing now (AC5).
func mondayAnchor(now time.Time) time.Time {
	now = now.UTC()
	offset := (int(now.Weekday()) + 6) % 7 // days since Monday
	day := now.AddDate(0, 0, -offset)
	return time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
}

func currentWeekStart(now time.Time) string {
	return mondayAnchor(now).Format("2006-01-02")
}

// In-process lock keyed by week-start date (AC3): one digest run per week per
// process; every concurrent or duplicate call for that week is rejected.
var (
	digestWeekMu   sync.Mutex
	digestWeekLock = map[string]bool{}
)

func claimDigestWeek(weekStart string) bool {
	digestWeekMu.Lock()
	defer digestWeekMu.Unlock()
	if digestWeekLock[weekStart] {
		return false
	}
	digestWeekLock[weekStart] = true
	return true
}

// ResetDigestWeeklyLock clears all in-process week locks (test seam simulating a process restart).
func ResetDigestWeeklyLock() {
	digestWeekMu.Lock()
	defer digestWeekMu.Unlock()
	digestWeekLock = map[string]bool{}
}

// RunWeeklyDigest executes one synchronous weekly-digest run. It takes the
// in-process lock for the week (AC3), computes per-user watchlist C-Rank
// alerts against the Monday 00:00 UTC anchor (AC5) and emails a digest to
// alerting users. Duplicate calls within the same week return status
// 'already_queued' and send nothing.
func RunWeeklyDigest(ctx context.Context, db *sqlx.DB, cfg WeeklyDigestConfig) (*WeeklyDigestSummary, error) {
	now := time.Now().UTC()
	weekStart := currentWeekStart(now)
	summary := &WeeklyDigestSummary{WeekStart: weekStart}

	// AC3: in-process lock keyed by week-start date. Concurrent/duplicate
	// calls within the same week are answered without sending anything.
	if !claimDigestWeek(weekStart) {
		summary.Status = "already_queued"
		return summary, nil
	}

	// Cross-process crash recovery: mark long-running runs stale so another
	// replica may take over the week.
	cutoff := now.Add(-staleRunTimeout)
	if _, err := db.ExecContext(ctx,
		`UPDATE digest_runs SET status='stale', finished_at=? WHERE status='running' AND started_at<?`,
		now, cutoff); err != nil {
		return nil, fmt.Errorf("digest stale sweep: %w", err)
	}

	var runStatus string
	err := db.GetContext(ctx, &runStatus, `SELECT status FROM digest_runs WHERE week_start=?`, weekStart)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if _, err := db.ExecContext(ctx,
			`INSERT INTO digest_runs (week_start, status, started_at) VALUES (?, 'running', ?)`,
			weekStart, now); err != nil {
			summary.Status = "already_queued" // another replica won the unique-index race
			return summary, nil
		}
	case err != nil:
		return nil, fmt.Errorf("digest lock check: %w", err)
	case runStatus == "running":
		summary.Status = "already_queued" // genuinely concurrent cross-replica run
		return summary, nil
	default:
		if _, err := db.ExecContext(ctx,
			`UPDATE digest_runs SET status='running', started_at=?, finished_at=NULL WHERE week_start=?`,
			now, weekStart); err != nil {
			return nil, fmt.Errorf("digest lock reacquire: %w", err)
		}
	}

	users, err := selectDigestUsers(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("digest users query: %w", err)
	}
	summary.UsersConsidered = len(users)

	for _, u := range users {
		alerts, newRepos, err := computeUserAlerts(ctx, db, u.ID, mondayAnchor(now))
		if err != nil {
			slog.Error("weekly-digest: alerts computation failed", "user_id", u.ID, "err", err)
			continue
		}
		summary.SkippedNew += len(newRepos)
		summary.AlertsFound += len(alerts)

		// Slack/Discord fan-out (AC1): every alert event reaches all enabled
		// webhooks of the user, independent of the email path.
		RunUserWebhookAlerts(ctx, db, u.ID, alerts, WebhookAlertDeps{
			HTTPClient:    cfg.WebhookClient,
			EncryptionKey: cfg.EncryptionKey,
			Telegram:      cfg.Telegram,
			Mailer:        cfg.Mailer,
			BaseURL:       cfg.BaseURL,
		}, summary)

		// No email without at least one alerting repo.
		if len(alerts) == 0 {
			continue
		}

		// Cross-replica idempotency: skip users already emailed this week.
		var recStatus string
		err = db.GetContext(ctx, &recStatus,
			`SELECT status FROM digest_recipients WHERE week_start=? AND user_id=?`, weekStart, u.ID)
		if err == nil && recStatus == "sent" {
			continue
		}
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			slog.Error("weekly-digest: recipient lookup failed", "user_id", u.ID, "err", err)
			continue
		}

		payload := buildWatchlistDigestPayload(u, alerts, newRepos, cfg.BaseURL, cfg.JobSecret)
		var sendErr error
		if cfg.Mailer == nil {
			sendErr = fmt.Errorf("no mailer configured")
		} else {
			sendErr = cfg.Mailer.Send(ctx, u.Email, payload.Subject, payload.TextBody, payload.HTMLBody)
		}

		status := "sent"
		errMsg := ""
		if sendErr != nil {
			// AC4: one notifier failure is logged, skipped, never counted as sent.
			status = "failed"
			errMsg = sendErr.Error()
			slog.Error("weekly-digest: send failed", "user_id", u.ID, "email", u.Email, "err", sendErr)
		}
		if err := recordDigestRecipient(ctx, db, weekStart, u, status, errMsg); err != nil {
			slog.Error("weekly-digest: recipient record failed", "user_id", u.ID, "err", err)
		}

		if status == "sent" {
			summary.EmailsSent++
		} else {
			summary.EmailsFailed++
		}
	}
	summary.Sent = summary.EmailsSent
	summary.Failed = summary.EmailsFailed

	final := "done_empty"
	switch {
	case summary.Failed > 0:
		final = "partial_failed"
	case summary.AlertsFound > 0:
		final = "done"
	}
	summary.Status = final
	if _, err := db.ExecContext(ctx,
		`UPDATE digest_runs SET status=?, finished_at=?, alerted_repos=?, emails_sent=?, emails_failed=?, skipped_new=? WHERE week_start=?`,
		final, time.Now().UTC(), summary.AlertsFound, summary.EmailsSent, summary.EmailsFailed, summary.SkippedNew, weekStart); err != nil {
		return nil, fmt.Errorf("digest finalize: %w", err)
	}

	slog.Info("weekly-digest complete",
		"week_start", summary.WeekStart,
		"status", summary.Status,
		"users_considered", summary.UsersConsidered,
		"alerts_found", summary.AlertsFound,
		"emails_sent", summary.EmailsSent,
		"emails_failed", summary.EmailsFailed,
		"skipped_new", summary.SkippedNew,
	)
	return summary, nil
}

func selectDigestUsers(ctx context.Context, db *sqlx.DB) ([]digestUser, error) {
	var users []digestUser
	err := db.SelectContext(ctx, &users, `
		SELECT DISTINCT u.id, u.username, COALESCE(u.email,'') AS email
		FROM users u
		JOIN user_watchlists w ON w.user_id = u.id
		WHERE w.notify_rank_change = TRUE
		  AND COALESCE(u.digest_unsubscribed, FALSE) = FALSE
		  AND u.deleted_at IS NULL
		  AND COALESCE(u.email,'') <> ''
	`)
	if users == nil {
		users = []digestUser{}
	}
	return users, err
}

// computeUserAlerts evaluates AC1/AC2/AC5 for every repo watched by the user.
// The comparison anchor is Monday 00:00 UTC of this week; 'prior' is the
// latest snapshot strictly before that anchor, so missed weeks collapse into
// the most recent prior anchor (no backfill spam).
func computeUserAlerts(ctx context.Context, db *sqlx.DB, userID int64, anchor time.Time) ([]RepoAlert, []string, error) {
	var repos []watchedRepo
	err := db.SelectContext(ctx, &repos, `
		SELECT w.repo_id, r.full_name, COALESCE(r.language,'') AS language
		FROM user_watchlists w
		JOIN repositories r ON r.id = w.repo_id
		WHERE w.user_id = ? AND w.notify_rank_change = TRUE
		ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		return nil, nil, err
	}

	anchorDate := anchor.Format("2006-01-02")
	var alerts []RepoAlert
	var newRepos []string
	for _, wr := range repos {
		var latest snapRow
		err := db.GetContext(ctx, &latest, `
			SELECT snapshot_date, c_rank_score, COALESCE(c_rank_tier,'') AS c_rank_tier,
			       external_pr_merge_rate
			FROM daily_snapshots
			WHERE repository_id = ?
			ORDER BY snapshot_date DESC
			LIMIT 1
		`, wr.RepoID)
		if errors.Is(err, sql.ErrNoRows) {
			newRepos = append(newRepos, wr.FullName) // AC2: never snapshotted
			continue
		}
		if err != nil {
			return nil, nil, err
		}

		// AC5: prior = latest snapshot before this week's Monday anchor.
		var prior snapRow
		err = db.GetContext(ctx, &prior, `
			SELECT snapshot_date, c_rank_score, COALESCE(c_rank_tier,'') AS c_rank_tier,
			       external_pr_merge_rate
			FROM daily_snapshots
			WHERE repository_id = ? AND date(snapshot_date) < ?
			ORDER BY snapshot_date DESC
			LIMIT 1
		`, wr.RepoID, anchorDate)
		if errors.Is(err, sql.ErrNoRows) {
			newRepos = append(newRepos, wr.FullName) // AC2: no baseline in window
			continue
		}
		if err != nil {
			return nil, nil, err
		}

		delta := latest.Score - prior.Score
		tierChanged := prior.Tier != "" && latest.Tier != "" && prior.Tier != latest.Tier

		// AC1 (pinned): material change = tier change OR |score delta| >= 10.
		if tierChanged || math.Abs(delta) >= scoreDeltaAlertThreshold {
			a := RepoAlert{
				RepoID:      wr.RepoID,
				FullName:    wr.FullName,
				Language:    wr.Language,
				PrevTier:    prior.Tier,
				NewTier:     latest.Tier,
				PrevScore:   prior.Score,
				NewScore:    latest.Score,
				Delta:       delta,
				TierChanged: tierChanged,
				MergeRate:   latest.MergeRate,
			}
			enrichAlert(ctx, db, &a)
			alerts = append(alerts, a)
		}
	}
	return alerts, newRepos, nil
}

func enrichAlert(ctx context.Context, db *sqlx.DB, a *RepoAlert) {
	var gfi struct {
		Title string `db:"title"`
		URL   string `db:"url"`
	}
	err := db.GetContext(ctx, &gfi, `
		SELECT title, url FROM repo_good_first_issues
		WHERE repository_id = ? AND quality_score > 0
		ORDER BY quality_score DESC, created_at DESC LIMIT 1
	`, a.RepoID)
	if err == nil && gfi.URL != "" {
		a.GFIURL = gfi.URL
		a.GFIText = gfi.Title
	}
}

var tierRank = map[string]int{"S": 0, "A": 1, "B": 2, "C": 3, "D": 4}

func tierDown(prev, next string) bool {
	p, okp := tierRank[prev]
	n, okn := tierRank[next]
	return okp && okn && n > p
}

// buildWatchlistDigestPayload renders the personalized digest email via
// GenerateWeeklyDigest, reframed around watchlist C-Rank changes. Repos with
// no prior snapshot are listed as 'new to watchlist', not alerted (AC2).
func buildWatchlistDigestPayload(u digestUser, alerts []RepoAlert, newRepos []string, baseURL, jobSecret string) DigestPayload {
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}

	matches := make([]MatchCandidate, 0, len(alerts))
	for _, a := range alerts {
		matches = append(matches, MatchCandidate{
			RepoFullName:       a.FullName,
			Language:           a.Language,
			CRankTier:          a.NewTier,
			ExternalMergeRate:  a.MergeRate * 100,
			GoodFirstIssueURL:  a.GFIURL,
			GoodFirstIssueText: a.GFIText,
		})
	}

	user := DigestUser{Username: u.Username, Email: u.Email}
	payload := GenerateWeeklyDigest(user, matches)
	payload.Subject = watchlistSubject(alerts)

	unsubURL := fmt.Sprintf("%s/unsubscribe?uid=%d&token=%s", baseURL, u.ID, UnsubscribeToken(u.ID, jobSecret))

	var textChanges strings.Builder
	textChanges.WriteString("C-Rank changes this week:\n")
	var htmlChanges strings.Builder
	htmlChanges.WriteString("<div style=\"margin: 20px 0;\">")
	for i, a := range alerts {
		dir := "+"
		if a.Delta < 0 {
			dir = ""
		}
		// AC3: deep link each changed repo to its C-Rank trend page.
		trendURL := fmt.Sprintf("%s/repos/%s/trend", baseURL, a.RepoID)
		tierLine := fmt.Sprintf("%.1f → %.1f (%s%.1f pts)", a.PrevScore, a.NewScore, dir, a.Delta)
		if a.TierChanged {
			tierLine += fmt.Sprintf(", tier %s → %s", a.PrevTier, a.NewTier)
		}
		textChanges.WriteString(fmt.Sprintf("%d. %s: %s\n   Trend: %s\n", i+1, a.FullName, tierLine, trendURL))
		htmlChanges.WriteString(fmt.Sprintf(
			"<p style=\"margin:4px 0; font-size:14px; color:#475569;\"><strong><a href=\"%s\" style=\"color:#2563eb;\">%s</a></strong>: %s · <a href=\"%s\" style=\"color:#2563eb;\">view trend</a></p>",
			trendURL, a.FullName, tierLine, trendURL))
	}

	// AC2: repos without a comparable prior snapshot are listed, not alerted.
	if len(newRepos) > 0 {
		textChanges.WriteString("\nNew to your watchlist (first baseline pending, no alerts yet):\n")
		htmlChanges.WriteString("<p style=\"margin:8px 0 4px 0; font-size:14px; color:#475569;\"><strong>New to your watchlist</strong> (no alerts yet): ")
		for i, name := range newRepos {
			textChanges.WriteString(fmt.Sprintf("- %s\n", name))
			if i > 0 {
				htmlChanges.WriteString(", ")
			}
			htmlChanges.WriteString(name)
		}
		htmlChanges.WriteString("</p>")
	}

	textChanges.WriteString("\n")
	htmlChanges.WriteString("</div>")

	payload.TextBody += "\n" + textChanges.String()
	payload.HTMLBody = insertBeforeFooter(payload.HTMLBody, htmlChanges.String())

	unsubText := fmt.Sprintf("\nDon't want these emails? Unsubscribe: %s\n", unsubURL)
	unsubHTML := fmt.Sprintf("<p style=\"font-size:12px; color:#94a3b8;\"><a href=\"%s\" style=\"color:#64748b;\">Unsubscribe from weekly digests</a></p>", unsubURL)
	payload.TextBody += unsubText
	payload.HTMLBody = strings.Replace(payload.HTMLBody, "</div>", "</div>"+unsubHTML, 1)

	return payload
}

func watchlistSubject(alerts []RepoAlert) string {
	n := len(alerts)
	noun := "repos"
	if n == 1 {
		noun = "repo"
	}
	drops := 0
	for _, a := range alerts {
		if a.Delta < 0 || tierDown(a.PrevTier, a.NewTier) {
			drops++
		}
	}
	if drops == n {
		return fmt.Sprintf("%d %s you're watching dropped a tier this week", n, noun)
	}
	return fmt.Sprintf("%d %s you're watching changed C-Rank this week", n, noun)
}

func insertBeforeFooter(htmlBody, fragment string) string {
	marker := "<div style=\"font-size: 12px; color: #94a3b8; border-top:"
	idx := strings.Index(htmlBody, marker)
	if idx < 0 {
		return htmlBody + fragment
	}
	return htmlBody[:idx] + fragment + htmlBody[idx:]
}

// recordDigestRecipient persists per-user sent/failed status (AC4),
// dialect-neutral upsert keyed by (week_start, user_id).
func recordDigestRecipient(ctx context.Context, db *sqlx.DB, weekStart string, u digestUser, status, errMsg string) error {
	now := time.Now().UTC()
	res, err := db.ExecContext(ctx, `
		UPDATE digest_recipients
		SET status=?, error=?, attempts=attempts+1, updated_at=?
		WHERE week_start=? AND user_id=?
	`, status, errMsg, now, weekStart, u.ID)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected > 0 {
		return nil
	}
	_, err = db.ExecContext(ctx, `
		INSERT INTO digest_recipients (week_start, user_id, email, status, error, attempts, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 1, ?, ?)
	`, weekStart, u.ID, u.Email, status, errMsg, now, now)
	return err
}
