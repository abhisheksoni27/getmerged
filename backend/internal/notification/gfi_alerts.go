package notification

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	// GFIVerifyTokenTTL bounds the double opt-in verification link (AC1).
	GFIVerifyTokenTTL = 24 * time.Hour
	// GFIUnsubTokenTTL bounds the embedded unsubscribe link (AC6).
	GFIUnsubTokenTTL = 90 * 24 * time.Hour
	// MaxHardBounces auto-disables a subscription past this many strikes (AC5).
	MaxHardBounces = 3
	// GFIDigestCap caps the weekly digest at the top N repos by C-Rank (AC8).
	GFIDigestCap         = 10
	gfiDigestMaxAttempts = 3
)

// GFIAlertConfig carries the dependencies of one instant-alert/digest run.
type GFIAlertConfig struct {
	Mailer    DigestMailer
	BaseURL   string
	JobSecret string
}

type gfiSubscriber struct {
	ID             int64        `db:"id"`
	Email          string       `db:"email"`
	Languages      string       `db:"languages"`
	TechStacks     string       `db:"tech_stacks"`
	Tiers          string       `db:"tiers"`
	Frequency      string       `db:"frequency"`
	VerifiedAt     sql.NullTime `db:"verified_at"`
	UnsubscribedAt sql.NullTime `db:"unsubscribed_at"`
	Disabled       bool         `db:"disabled"`
	HardBounces    int          `db:"hard_bounces"`
}

func (s *gfiSubscriber) prefsComplete() bool {
	return csvNonEmpty(s.Languages) && csvNonEmpty(s.Tiers)
}

// suppressed reports whether sends must be dropped for this subscriber right
// now (dequeue-time suppression, AC4).
func (s *gfiSubscriber) suppressed() bool {
	if !s.VerifiedAt.Valid || s.VerifiedAt.Time.IsZero() {
		return true
	}
	if s.UnsubscribedAt.Valid && !s.UnsubscribedAt.Time.IsZero() {
		return true
	}
	return s.Disabled || s.HardBounces >= MaxHardBounces || strings.TrimSpace(s.Email) == ""
}

func csvNonEmpty(csv string) bool {
	return strings.TrimSpace(strings.ReplaceAll(csv, ",", "")) != ""
}

func csvSet(csv string) map[string]string {
	set := map[string]string{}
	for _, part := range strings.Split(csv, ",") {
		v := strings.ToLower(strings.TrimSpace(part))
		if v != "" {
			set[v] = v
		}
	}
	return set
}

var gfiValidTiers = map[string]bool{"S": true, "A": true, "B": true, "C": true, "D": true}

// NormalizeGFITiers validates an allow-list of C-Rank tiers ("S,A,B").
func NormalizeGFITiers(tiers []string) string {
	var out []string
	seen := map[string]bool{}
	for _, t := range tiers {
		u := strings.ToUpper(strings.TrimSpace(t))
		if gfiValidTiers[u] && !seen[u] {
			seen[u] = true
			out = append(out, u)
		}
	}
	return strings.Join(out, ",")
}

// NormalizeGFIList trims, de-duplicates and comma-joins a pref list.
func NormalizeGFIList(items []string) string {
	var out []string
	seen := map[string]bool{}
	for _, it := range items {
		v := strings.TrimSpace(it)
		key := strings.ToLower(v)
		if v != "" && !seen[key] && len(v) <= 50 {
			seen[key] = true
			out = append(out, v)
		}
	}
	return strings.Join(out, ",")
}

// --- Tokens ---------------------------------------------------------------

func gfiToken(sid int64, scope string, secret string, exp time.Time) string {
	expUnix := exp.UTC().Unix()
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
	return fmt.Sprintf("%d.%s", expUnix, hex.EncodeToString(mac.Sum(nil)))
}

func verifyGFIToken(sidStr, token, scope, secret string) (int64, bool) {
	if secret == "" || sidStr == "" || token == "" {
		return 0, false
	}
	var sid int64
	if _, err := fmt.Sscanf(sidStr, "%d", &sid); err != nil || sid <= 0 {
		return 0, false
	}
	dot := strings.IndexByte(token, '.')
	if dot <= 0 || dot == len(token)-1 {
		return 0, false
	}
	var expUnix int64
	if _, err := fmt.Sscanf(token[:dot], "%d", &expUnix); err != nil {
		return 0, false
	}
	if time.Now().UTC().Unix() >= expUnix {
		return 0, false // expired
	}
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(token[dot+1:])) {
		return 0, false
	}
	return sid, true
}

// GFIVerifyToken builds the single-use double opt-in token (24h TTL, AC1).
func GFIVerifyToken(sid int64, secret string) string {
	return gfiToken(sid, "gfiverify", secret, time.Now().UTC().Add(GFIVerifyTokenTTL))
}

// VerifyGFIVerifyToken validates a verification token.
func VerifyGFIVerifyToken(sidStr, token, secret string) (int64, bool) {
	return verifyGFIToken(sidStr, token, "gfiverify", secret)
}

// GFIUnsubscribeToken builds the 90-day expiring unsubscribe token (AC6).
func GFIUnsubscribeToken(sid int64, secret string) string {
	return gfiToken(sid, "gfiunsub", secret, time.Now().UTC().Add(GFIUnsubTokenTTL))
}

// VerifyGFIUnsubscribeToken validates an unsubscribe token.
func VerifyGFIUnsubscribeToken(sidStr, token, secret string) (int64, bool) {
	return verifyGFIToken(sidStr, token, "gfiunsub", secret)
}

// --- Instant alerts --------------------------------------------------------

type gfiRepoCtx struct {
	FullName                 string  `db:"full_name"`
	Language                 string  `db:"language"`
	Tier                     string  `db:"c_rank_tier"`
	Score                    float64 `db:"c_rank_score"`
	MaintainerResponsiveness float64 `db:"maintainer_responsiveness"`
	ResponseP50Hours         float64 `db:"response_p50_hours"`
}

// EnqueueGFIInstantAlerts matches freshly ingested good-first issues on one
// repo against verified instant-alert subscribers and inserts one email_queue
// row per (repo, issue, subscriber) inside a single transaction (AC2, AC3).
// Duplicate idempotency keys are silent no-ops, killing race double-fires.
func EnqueueGFIInstantAlerts(ctx context.Context, db *sqlx.DB, repoID string, issueNumbers []int, now time.Time) (int, error) {
	if len(issueNumbers) == 0 {
		return 0, nil
	}

	repo, err := getGFIRepoCtx(ctx, db, repoID)
	if err != nil {
		return 0, err
	}
	subs, err := selectEligibleSubscribers(ctx, db, "instant")
	if err != nil {
		return 0, err
	}
	topics, err := selectRepoTopics(ctx, db, repoID)
	if err != nil {
		return 0, err
	}

	fresh := freshIssueNumbers(issueNumbers, ctx, db, repoID, now)
	if len(fresh) == 0 {
		return 0, nil
	}

	matched := 0
	tx, err := db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	insertQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, created_at) VALUES (?, ?, ?, ?, ?)"
	if db.DriverName() == "sqlite" {
		insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, created_at) VALUES (?, ?, ?, ?, ?)"
	}

	for _, sub := range subs {
		if !subscriberMatchesRepo(sub, repo, topics) {
			continue
		}
		for _, num := range fresh {
			res, err := tx.ExecContext(ctx, insertQ,
				sub.ID, fmt.Sprintf("%s:%d:%d", repoID, num, sub.ID), repoID, num, now.UTC())
			if err != nil {
				return matched, fmt.Errorf("gfi-alert enqueue: %w", err)
			}
			if n, _ := res.RowsAffected(); n > 0 {
				matched++
			}
		}
	}
	if err := tx.Commit(); err != nil {
		return matched, err
	}
	return matched, nil
}

// freshIssueNumbers keeps only issues opened within the last 7 days that are
// actually stored (guards backfills of stale issue lists from alert spam).
func freshIssueNumbers(nums []int, ctx context.Context, db *sqlx.DB, repoID string, now time.Time) []int {
	cutoff := now.UTC().Add(-7 * 24 * time.Hour)
	var known []int
	query := `SELECT issue_number FROM repo_good_first_issues WHERE repository_id = ? AND created_at >= ? AND issue_number IN (?)`
	query, args, err := sqlx.In(query, repoID, cutoff, nums)
	if err != nil {
		return nil
	}
	if err := db.SelectContext(ctx, &known, query, args...); err != nil {
		return nil
	}
	return known
}

func getGFIRepoCtx(ctx context.Context, db *sqlx.DB, repoID string) (gfiRepoCtx, error) {
	var repo gfiRepoCtx
	err := db.GetContext(ctx, &repo, `
		SELECT r.full_name, COALESCE(r.language,'') AS language,
		       COALESCE(s.c_rank_tier,'') AS c_rank_tier, COALESCE(s.c_rank_score,0) AS c_rank_score,
		       COALESCE(s.maintainer_responsiveness,0) AS maintainer_responsiveness,
		       COALESCE(s.response_p50_hours,0) AS response_p50_hours
		FROM repositories r LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE r.id = ?
	`, repoID)
	return repo, err
}

func selectRepoTopics(ctx context.Context, db *sqlx.DB, repoID string) ([]string, error) {
	var topics []string
	err := db.SelectContext(ctx, &topics, `SELECT topic FROM repository_topics WHERE repository_id = ?`, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return topics, nil
}

// selectEligibleSubscribers returns verified, non-suppressed subscribers with
// complete prefs for the given delivery mode (AC8 filters incomplete prefs).
func selectEligibleSubscribers(ctx context.Context, db *sqlx.DB, frequency string) ([]gfiSubscriber, error) {
	var subs []gfiSubscriber
	err := db.SelectContext(ctx, &subs, `
		SELECT id, email, COALESCE(languages,'') AS languages, COALESCE(tech_stacks,'') AS tech_stacks,
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, disabled, hard_bounces
		FROM gfi_subscribers
		WHERE frequency = ? AND verified_at IS NOT NULL AND unsubscribed_at IS NULL
		  AND disabled = FALSE AND hard_bounces < ?
	`, frequency, MaxHardBounces)
	if subs == nil {
		subs = []gfiSubscriber{}
	}
	kept := subs[:0]
	for _, s := range subs {
		if s.prefsComplete() {
			kept = append(kept, s)
		}
	}
	return kept, err
}

// subscriberMatchesRepo applies language, C-Rank tier and optional tech-stack
// topic filters for one subscriber/repo pair.
func subscriberMatchesRepo(sub gfiSubscriber, repo gfiRepoCtx, topics []string) bool {
	langs := csvSet(sub.Languages)
	if len(langs) > 0 && !csvHas(langs, strings.ToLower(repo.Language)) {
		return false
	}
	tiers := csvSet(sub.Tiers)
	if len(tiers) > 0 && !csvHas(tiers, strings.ToUpper(repo.Tier)) {
		return false
	}
	stacks := csvSet(sub.TechStacks)
	if len(stacks) > 0 {
		hit := false
		for _, t := range topics {
			if csvHas(stacks, strings.ToLower(t)) {
				hit = true
				break
			}
		}
		if !hit {
			return false
		}
	}
	return true
}

func csvHas(set map[string]string, key string) bool {
	_, ok := set[strings.ToLower(strings.TrimSpace(key))]
	return ok
}

// --- Send pipeline ---------------------------------------------------------

type gfiQueueSummary struct {
	Dequeued int `json:"dequeued"`
	Sent     int `json:"sent"`
	Dropped  int `json:"dropped"`
	Failed   int `json:"failed"`
}

// gfiIssueEmailCtx carries everything needed to render one alert email.
type gfiIssueEmailCtx struct {
	gfiRepoCtx
	IssueNo int    `db:"issue_number"`
	Title   string `db:"title"`
	URL     string `db:"url"`
}

// ProcessGFIEmailQueue dequeues pending alert emails. Suppression is checked
// here, at dequeue time (AC4): subscribers who unsubscribed, bounced out or
// were disabled after enqueue are silently dropped. Survivors go out via the
// provider.
func ProcessGFIEmailQueue(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig) (*gfiQueueSummary, error) {
	summary := &gfiQueueSummary{}

	var rows []struct {
		ID         int64  `db:"id"`
		Subscriber int64  `db:"subscriber_id"`
		RepoID     string `db:"repo_id"`
		IssueNo    int    `db:"issue_number"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT id, subscriber_id, repo_id, issue_number FROM gfi_email_queue
		WHERE status = 'pending' ORDER BY created_at ASC LIMIT 200
	`); err != nil {
		return nil, err
	}

	subCache := map[int64]*gfiSubscriber{}
	for _, row := range rows {
		sub, ok := subCache[row.Subscriber]
		if !ok {
			s, err := getGFISubscriber(ctx, db, row.Subscriber)
			if err != nil {
				slog.Error("gfi-queue: subscriber lookup failed", "subscriber_id", row.Subscriber, "err", err)
				continue
			}
			sub = s
			subCache[row.Subscriber] = sub
		}

		if sub == nil || sub.suppressed() {
			markGFIQueued(ctx, db, row.ID, "dropped", "")
			summary.Dropped++
			continue
		}

		item, err := getGFIIssueEmailCtx(ctx, db, row.RepoID, row.IssueNo)
		if err != nil {
			markGFIQueued(ctx, db, row.ID, "dropped", "issue no longer available")
			summary.Dropped++
			continue
		}

		payload := buildGFIAlertEmail(cfg.BaseURL, cfg.JobSecret, sub.ID, item)
		sendErr := cfg.Mailer.Send(ctx, sub.Email, payload.Subject, payload.TextBody, payload.HTMLBody)
		if sendErr == nil {
			markGFIQueued(ctx, db, row.ID, "sent", "")
			summary.Sent++
			continue
		}
		if IsHardBounce(sendErr) {
			if _, berr := ApplyGFIEmailBounce(ctx, db, sub.Email, true); berr != nil {
				slog.Error("gfi-queue: bounce bookkeeping failed", "email", sub.Email, "err", berr)
			}
			markGFIQueued(ctx, db, row.ID, "failed", sendErr.Error())
			summary.Failed++
			continue
		}
		summary.Failed++
		var attempts int
		_ = db.GetContext(ctx, &attempts, `SELECT attempts FROM gfi_email_queue WHERE id = ?`, row.ID)
		if attempts+1 >= gfiDigestMaxAttempts {
			markGFIQueued(ctx, db, row.ID, "failed", sendErr.Error())
		} else {
			markGFIQueued(ctx, db, row.ID, "retry", sendErr.Error())
		}
	}
	return summary, nil
}

func getGFISubscriber(ctx context.Context, db *sqlx.DB, id int64) (*gfiSubscriber, error) {
	var s gfiSubscriber
	err := db.GetContext(ctx, &s, `
		SELECT id, email, COALESCE(languages,'') AS languages, COALESCE(tech_stacks,'') AS tech_stacks,
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, disabled, hard_bounces
		FROM gfi_subscribers WHERE id = ?
	`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func getGFIIssueEmailCtx(ctx context.Context, db *sqlx.DB, repoID string, issueNo int) (gfiIssueEmailCtx, error) {
	var item gfiIssueEmailCtx
	err := db.GetContext(ctx, &item, `
		SELECT g.repository_id AS repo_id, g.issue_number, g.title, g.url,
		       r.full_name, COALESCE(r.language,'') AS language,
		       COALESCE(s.c_rank_tier,'') AS c_rank_tier, COALESCE(s.c_rank_score,0) AS c_rank_score,
		       COALESCE(s.maintainer_responsiveness,0) AS maintainer_responsiveness,
		       COALESCE(s.response_p50_hours,0) AS response_p50_hours
		FROM repo_good_first_issues g
		JOIN repositories r ON r.id = g.repository_id
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE g.repository_id = ? AND g.issue_number = ?
	`, repoID, issueNo)
	return item, err
}

// markGFIQueued advances a queue row's status; 'retry' keeps it pending with
// a bumped attempt counter.
func markGFIQueued(ctx context.Context, db *sqlx.DB, id int64, status, lastErr string) {
	if status == "retry" {
		_, _ = db.ExecContext(ctx, `
			UPDATE gfi_email_queue SET attempts = attempts + 1, last_error = ? WHERE id = ? AND status = 'pending'
		`, lastErr, id)
		return
	}
	if status == "sent" {
		_, _ = db.ExecContext(ctx,
			`UPDATE gfi_email_queue SET status=?, last_error=?, sent_at=? WHERE id=?`,
			status, lastErr, time.Now().UTC(), id)
		return
	}
	_, _ = db.ExecContext(ctx, `UPDATE gfi_email_queue SET status=?, last_error=? WHERE id=?`, status, lastErr, id)
}

// --- Weekly digest ---------------------------------------------------------

type GFIDigestSummary struct {
	WeekStart         string `json:"week_start"`
	Subscribers       int    `json:"subscribers"`
	DigestsSent       int    `json:"digests_sent"`
	MatchesFound      int    `json:"matches_found"`
	SkippedNoMatch    int    `json:"skipped_no_match"`
	SkippedIncomplete int    `json:"skipped_incomplete"`
	Failed            int    `json:"failed"`
}

type gfiDigestItem struct {
	gfiRepoCtx
	RepoID      string `db:"repo_id"`
	IssueNumber int    `db:"issue_number"`
	Title       string `db:"title"`
	URL         string `db:"url"`
}

var (
	gfiDigestMu   sync.Mutex
	gfiDigestLock = map[string]bool{}
)

// RunGFIDigest emails every eligible subscriber the week's newly matched
// good-first issues (top 10 by C-Rank, AC8). Issues already covered by an
// instant alert share the same gfi_email_queue cursor and are never re-sent
// (AC2). Zero-match weeks send nothing (AC8).
func RunGFIDigest(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig) (*GFIDigestSummary, error) {
	now := time.Now().UTC()
	weekStart := currentWeekStart(now)
	summary := &GFIDigestSummary{WeekStart: weekStart}

	gfiDigestMu.Lock()
	if gfiDigestLock[weekStart] {
		gfiDigestMu.Unlock()
		summary.SkippedNoMatch = -1
		return summary, nil
	}
	gfiDigestLock[weekStart] = true
	gfiDigestMu.Unlock()

	var all []gfiSubscriber
	err := db.SelectContext(ctx, &all, `
		SELECT id, email, COALESCE(languages,'') AS languages, COALESCE(tech_stacks,'') AS tech_stacks,
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, disabled, hard_bounces
		FROM gfi_subscribers
		WHERE verified_at IS NOT NULL AND unsubscribed_at IS NULL AND disabled = FALSE AND hard_bounces < ?
	`, MaxHardBounces)
	if err != nil {
		return nil, err
	}

	windowStart := mondayAnchor(now)

	for _, sub := range all {
		if !sub.prefsComplete() {
			summary.SkippedIncomplete++
			continue
		}
		items, err := selectDigestMatches(ctx, db, sub, windowStart)
		if err != nil {
			summary.Failed++
			slog.Error("gfi-digest: match query failed", "subscriber_id", sub.ID, "err", err)
			continue
		}
		summary.MatchesFound += len(items)
		if len(items) == 0 {
			summary.SkippedNoMatch++ // zero-match week: no email (AC8)
			continue
		}

		payload := buildGFIDigestEmail(cfg.BaseURL, cfg.JobSecret, sub.ID, sub.Email, items)
		sendErr := cfg.Mailer.Send(ctx, sub.Email, payload.Subject, payload.TextBody, payload.HTMLBody)
		if sendErr != nil {
			summary.Failed++
			if IsHardBounce(sendErr) {
				if _, berr := ApplyGFIEmailBounce(ctx, db, sub.Email, true); berr != nil {
					slog.Error("gfi-digest: bounce bookkeeping failed", "email", sub.Email, "err", berr)
				}
			}
			slog.Error("gfi-digest: send failed", "subscriber_id", sub.ID, "err", sendErr)
			continue
		}
		summary.DigestsSent++

		// Record the shared sent-issue cursor so later runs never re-send.
		if err := recordGFICursorRows(ctx, db, sub.ID, items, now); err != nil {
			slog.Error("gfi-digest: cursor write failed", "subscriber_id", sub.ID, "err", err)
		}
	}
	return summary, nil
}

// selectDigestMatches finds this week's issues matching the subscriber's
// prefs, excluding anything already alerted/queued for them, capped at the
// top 10 repos by C-Rank score (AC2, AC8).
func selectDigestMatches(ctx context.Context, db *sqlx.DB, sub gfiSubscriber, windowStart time.Time) ([]gfiDigestItem, error) {
	tierList := strings.Split(strings.ToUpper(sub.Tiers), ",")
	for i := range tierList {
		tierList[i] = strings.TrimSpace(tierList[i])
	}
	query, args, err := sqlx.In(`
		SELECT g.repository_id AS repo_id, r.full_name, COALESCE(r.language,'') AS language,
		       COALESCE(s.c_rank_tier,'') AS c_rank_tier, COALESCE(s.c_rank_score,0) AS c_rank_score,
		       COALESCE(s.maintainer_responsiveness,0) AS maintainer_responsiveness,
		       COALESCE(s.response_p50_hours,0) AS response_p50_hours,
		       g.issue_number, g.title, g.url
		FROM repo_good_first_issues g
		JOIN repositories r ON r.id = g.repository_id
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE g.created_at >= ? AND g.quality_score >= 0
		  AND LOWER(r.language) IN (?)
		  AND COALESCE(s.c_rank_tier,'') IN (?)
		  AND NOT EXISTS (
			SELECT 1 FROM gfi_email_queue q
			WHERE q.subscriber_id = ? AND q.repo_id = g.repository_id AND q.issue_number = g.issue_number
		  )
		ORDER BY s.c_rank_score DESC, g.quality_score DESC, g.created_at DESC
		LIMIT ?
	`, windowStart, strLowerList(csvSet(sub.Languages)), tierList, sub.ID, GFIDigestCap)
	if err != nil {
		return nil, err
	}
	var items []gfiDigestItem
	err = db.SelectContext(ctx, &items, query, args...)
	return items, err
}

func strLowerList(set map[string]string) []string {
	out := make([]string, 0, len(set))
	for v := range set {
		out = append(out, v)
	}
	return out
}

func recordGFICursorRows(ctx context.Context, db *sqlx.DB, subID int64, items []gfiDigestItem, now time.Time) error {
	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	insertQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'sent', ?, ?)"
	if db.DriverName() == "sqlite" {
		insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'sent', ?, ?)"
	}
	for _, it := range items {
		if _, err := tx.ExecContext(ctx, insertQ,
			subID, fmt.Sprintf("%s:%d:%d", it.RepoID, it.IssueNumber, subID),
			it.RepoID, it.IssueNumber, now.UTC(), now.UTC()); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// --- Bounce/complaint handling ---------------------------------------------

// ApplyGFIEmailBounce records a provider bounce/complaint for the matching
// subscriber. The third hard bounce auto-disables the subscription (AC5).
func ApplyGFIEmailBounce(ctx context.Context, db *sqlx.DB, email string, hard bool) (bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false, nil
	}
	if !hard {
		return false, nil // soft bounces never count toward disabling
	}
	res, err := db.ExecContext(ctx, `
		UPDATE gfi_subscribers
		SET hard_bounces = hard_bounces + 1,
		    disabled = CASE WHEN hard_bounces + 1 >= ? THEN TRUE ELSE disabled END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE LOWER(email) = ?
	`, MaxHardBounces, email)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		var bounces int
		disabled := false
		if err := db.GetContext(ctx, &bounces, `SELECT hard_bounces FROM gfi_subscribers WHERE LOWER(email) = ?`, email); err == nil && bounces >= MaxHardBounces {
			disabled = true
		}
		slog.Warn("gfi-alerts: provider bounce recorded", "email", email, "hard", hard, "auto_disabled", disabled)
	}
	return n > 0, nil
}

// --- Email bodies -----------------------------------------------------------

func gfiLinks(baseURL string) string {
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	return strings.TrimRight(baseURL, "/")
}

func gfiClaimURL(baseURL, fullName string) string {
	return fmt.Sprintf("%s/%s", gfiLinks(baseURL), fullName)
}

func gfiStatLine(item gfiRepoCtx) string {
	resp := "n/a"
	if item.MaintainerResponsiveness > 0 {
		resp = formatHours(item.MaintainerResponsiveness)
	}
	p50 := "n/a"
	if item.ResponseP50Hours > 0 {
		p50 = formatHours(item.ResponseP50Hours)
	}
	return fmt.Sprintf("Maintainer responsiveness: %s · Median first response: %s", resp, p50)
}

func formatHours(hours float64) string {
	if hours < 24 {
		return fmt.Sprintf("%.1fh", hours)
	}
	return fmt.Sprintf("%.1fd", hours/24)
}

// buildGFIAlertEmail renders a single-issue instant alert with C-Rank
// responsiveness stats and public-page Claim & Setup links (AC9).
func buildGFIAlertEmail(baseURL, jobSecret string, subscriberID int64, item gfiIssueEmailCtx) DigestPayload {
	base := gfiLinks(baseURL)
	repoURL := gfiClaimURL(base, item.FullName)
	allURL := base + "/good-first-issue"
	unsubURL := fmt.Sprintf("%s/api/v1/gfi-alerts/unsubscribe?sid=%d&token=%s", base, subscriberID, GFIUnsubscribeToken(subscriberID, jobSecret))

	subject := fmt.Sprintf("🎯 New good first issue in %s [%s tier]", item.FullName, item.Tier)

	text := strings.Join([]string{
		fmt.Sprintf("New good first issue in %s:", item.FullName),
		"",
		fmt.Sprintf("#%d %s", item.IssueNo, item.Title),
		fmt.Sprintf("%s", item.URL),
		"",
		fmt.Sprintf("C-Rank: %.1f (%s tier)", item.Score, item.Tier),
		gfiStatLine(item.gfiRepoCtx),
		"",
		fmt.Sprintf("Claim & Setup: %s", repoURL),
		fmt.Sprintf("Browse all good first issues: %s", allURL),
		"",
		fmt.Sprintf("Unsubscribe: %s", unsubURL),
	}, "\n")

	html := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
<h2 style="color:#0f172a;">🎯 New good first issue in <a href="%s" title="View repository scorecard" style="color:#0284c7;">%s</a></h2>
<p style="font-size:14px;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="font-size:14px;color:#475569;">C-Rank: <strong>%.1f (%s tier)</strong><br>%s</p>
<p style="margin:20px 0;"><a href="%s" title="Claim and set up this repository" style="background:#0284c7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Claim &amp; Setup →</a></p>
<p style="font-size:12px;color:#94a3b8;"><a href="%s" title="Browse all good first issues" style="color:#64748b;">View all good first issues</a> · <a href="%s" title="Unsubscribe from good first issue alerts" style="color:#64748b;">Unsubscribe</a></p>
</div>`,
		html.EscapeString(repoURL), html.EscapeString(item.FullName), html.EscapeString(item.URL),
		item.IssueNo, html.EscapeString(item.Title), item.Score, html.EscapeString(item.Tier),
		html.EscapeString(gfiStatLine(item.gfiRepoCtx)), html.EscapeString(repoURL),
		html.EscapeString(allURL), html.EscapeString(unsubURL))

	return DigestPayload{Subject: subject, TextBody: text, HTMLBody: html}
}

// buildGFIDigestEmail renders the weekly digest capped at GFIDigestCap items.
func buildGFIDigestEmail(baseURL, jobSecret string, subscriberID int64, email string, items []gfiDigestItem) DigestPayload {
	base := gfiLinks(baseURL)
	allURL := base + "/good-first-issue"
	unsubURL := fmt.Sprintf("%s/api/v1/gfi-alerts/unsubscribe?sid=%d&token=%s", base, subscriberID, GFIUnsubscribeToken(subscriberID, jobSecret))

	subject := fmt.Sprintf("Your weekly good first issues (%d matches)", len(items))

	var text strings.Builder
	text.WriteString("Newly opened good first issues matching your stack:\n\n")
	var htmlB strings.Builder
	htmlB.WriteString(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
<h2 style="color:#0f172a;">Your weekly good first issues</h2>`)

	for i, it := range items {
		text.WriteString(fmt.Sprintf("%d. %s [%s tier | %s] — C-Rank %.1f\n   #%d %s\n   %s\n   %s\n\n",
			i+1, it.FullName, it.Tier, it.Language, it.Score, it.IssueNumber, it.Title, it.URL, gfiStatLine(it.gfiRepoCtx)))
		htmlB.WriteString(fmt.Sprintf(`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px;background:#f8fafc;">
<h3 style="margin:0 0 6px 0;color:#0284c7;"><a href="%s" title="View repository scorecard" style="color:#0284c7;text-decoration:none;">%s</a> <span style="font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">%s Tier</span></h3>
<p style="margin:4px 0;font-size:13px;color:#475569;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="margin:4px 0;font-size:13px;color:#475569;">C-Rank %.1f · %s</p>
</div>`,
			html.EscapeString(gfiClaimURL(base, it.FullName)), html.EscapeString(it.FullName), html.EscapeString(it.Tier),
			html.EscapeString(it.URL), it.IssueNumber, html.EscapeString(it.Title), it.Score,
			html.EscapeString(gfiStatLine(it.gfiRepoCtx))))
	}
	if len(items) == GFIDigestCap {
		text.WriteString(fmt.Sprintf("Showing top %d by C-Rank. View all: %s\n", GFIDigestCap, allURL))
	}
	htmlB.WriteString(fmt.Sprintf(`<p style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
<a href="%s" title="View all good first issues" style="color:#64748b;">View all matches</a> · <a href="%s" title="Unsubscribe from good first issue digests" style="color:#64748b;">Unsubscribe</a></p></div>`,
		html.EscapeString(allURL), html.EscapeString(unsubURL)))

	return DigestPayload{Subject: subject, TextBody: text.String(), HTMLBody: htmlB.String()}
}

// ValidateGFIEmail normalizes and syntax-checks a signup address.
func ValidateGFIEmail(raw string) (string, bool) {
	e := strings.ToLower(strings.TrimSpace(raw))
	if e == "" || len(e) > 254 {
		return "", false
	}
	addr, err := mail.ParseAddress(e)
	if err != nil || addr.Address != e {
		return "", false
	}
	return e, true
}

// ResetGFIDigestLockForTest clears the in-memory week lock so tests can re-run.
func ResetGFIDigestLockForTest() {
	gfiDigestMu.Lock()
	defer gfiDigestMu.Unlock()
	gfiDigestLock = map[string]bool{}
}

// SelectDigestMatchesForTest exposes digest matching queries for unit tests.
func SelectDigestMatchesForTest(ctx context.Context, db *sqlx.DB, subID int64, languages, tiers string, windowStart time.Time) ([]gfiDigestItem, error) {
	sub := gfiSubscriber{
		ID:        subID,
		Languages: languages,
		Tiers:     tiers,
	}
	return selectDigestMatches(ctx, db, sub, windowStart)
}

