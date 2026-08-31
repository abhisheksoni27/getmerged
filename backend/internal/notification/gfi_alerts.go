package notification

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/bounty"
	"github.com/jmoiron/sqlx"
)

const (
	// GFIVerifyTokenTTL bounds the double opt-in verification link (AC1).
	GFIVerifyTokenTTL = 24 * time.Hour
	// GFIUnsubTokenTTL bounds legacy unsubscribe tokens.
	GFIUnsubTokenTTL = 90 * 24 * time.Hour
	// GFIUnsubscribeTokenTTL bounds current one-click unsubscribe tokens:
	// HMAC with scoped claims {sub_id, email_hash, purpose='unsub',
	// exp=30d} (AC4).
	GFIUnsubscribeTokenTTL = 30 * 24 * time.Hour
	// MaxHardBounces auto-disables a subscription past this many strikes (AC5).
	MaxHardBounces = 3
	// GFIDigestCap caps the weekly digest at the top N repos by C-Rank (AC8).
	GFIDigestCap = 10
	// GFIDailyAlertCap is the hard per-user instant-email ceiling per UTC day
	// (AC2): enforced atomically via the gfi_daily_send_counts counter at send
	// time and pre-filtered at enqueue; overflow issues leave the queue and
	// roll into the weekly digest.
	GFIDailyAlertCap = 5
	// gfiSendLogTTL bounds send-log rows: after 30 days they purge so
	// reopened issues or updated prefs can re-alert (AC3).
	gfiSendLogTTL = 30 * 24 * time.Hour
	// GFIEmailMaxAttempts bounds sends before a row is dead-lettered for
	// manual review (AC7): initial send + 3 retries.
	GFIEmailMaxAttempts = 4
	// gfiBatchWindow is the instant-alert coalescing window (AC3): every new
	// match pushes the subscriber's pending batch out 15 minutes, so all
	// matches inside the window collapse into at most one email per user per
	// 15-minute window (burst control).
	gfiBatchWindow = 15 * time.Minute
	// GFIHourlyInstantCap is the per-subscriber instant-alert rate limit
	// (AC3): at most 10 issues enter the current 15-min batch; overflow rows
	// carry into the next window's batch instead of being dropped.
	GFIHourlyInstantCap = 10
	// gfiDefaultSendInterval spaces consecutive provider sends to respect
	// typical SMTP rate limits during instant-alert fan-out (AC3).
	gfiDefaultSendInterval = 100 * time.Millisecond
	// gfiClaimStaleAfter reclaims 'sending' rows whose worker died mid-send.
	gfiClaimStaleAfter = 15 * time.Minute
)

// gfiRetrySchedule is the AC7 exponential backoff: retry n waits
// schedule[n-1] — 5m after fail 1, 1h after fail 2, 6h after fail 3.
var gfiRetrySchedule = [3]time.Duration{5 * time.Minute, time.Hour, 6 * time.Hour}

// GFIClaimLinkTTL bounds server-side single-use Claim & Setup tokens (AC5).
const GFIClaimLinkTTL = 14 * 24 * time.Hour

// GFIGitHubRevalidator is the minimal GitHub API surface needed for AC4
// send-time revalidation (issue still open and unassigned).
type GFIGitHubRevalidator interface {
	FetchIssueOpenUnassigned(owner, name string, number int) (open bool, unassigned bool, err error)
}

// GFIAlertConfig carries the dependencies of one instant-alert/digest run.
type GFIAlertConfig struct {
	Mailer    DigestMailer
	BaseURL   string
	JobSecret string

	// UnsubscribeKey is the purpose-scoped HMAC key used to sign one-click
	// unsubscribe links (AC5/AC7); empty falls back to JobSecret.
	UnsubscribeKey string

	// AdminEmail receives dead-letter alerts when sends exhaust retries (AC5).
	// Empty disables admin notifications.
	AdminEmail string

	// GitHub optionally revalidates issue state at send time (AC4). nil or
	// API failure fails open so a dead API never blocks the queue.
	GitHub GFIGitHubRevalidator

	// PhysicalAddress is the CAN-SPAM postal sender address stamped in the
	// footer of every alert/digest email (AC7). Empty omits the line.
	PhysicalAddress string

	// MinSendInterval throttles fan-out; zero falls back to
	// gfiDefaultSendInterval (AC3 provider rate-limit safety).
	MinSendInterval time.Duration
}

func (c GFIAlertConfig) sendInterval() time.Duration {
	if c.MinSendInterval > 0 {
		return c.MinSendInterval
	}
	return gfiDefaultSendInterval
}

// gfiBackoffDelay returns the wait before retry n (1-based), capped at the
// last schedule entry.
func gfiBackoffDelay(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > len(gfiRetrySchedule) {
		attempt = len(gfiRetrySchedule)
	}
	return gfiRetrySchedule[attempt-1]
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
	OptOut         bool         `db:"opt_out"`
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
	if s.OptOut || (s.UnsubscribedAt.Valid && !s.UnsubscribedAt.Time.IsZero()) {
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

// MaxGFIPrefItems caps each normalized preference list (AC6): a subscriber
// can select at most 50 languages/repos/tiers entries per list.
const MaxGFIPrefItems = 50

// MaxSubscribePrefItems caps languages/tech_stacks lists at subscribe time
// (AC1): max 20 items each, every item a non-empty string of ≤50 chars.
const MaxSubscribePrefItems = 20

// ValidateGFIPrefs enforces the subscribe preference schema (AC1):
// languages/stacks at most MaxSubscribePrefItems items with trimmed lengths
// ≤50 chars, and tiers restricted to the C-Rank enum {S,A,B,C,D}. A non-nil
// error maps to HTTP 400.
func ValidateGFIPrefs(languages, stacks, tiers []string) error {
	for _, list := range [][]string{languages, stacks} {
		if len(list) > MaxSubscribePrefItems {
			return fmt.Errorf("at most %d items per list", MaxSubscribePrefItems)
		}
		for _, it := range list {
			if v := strings.TrimSpace(it); len(v) > 50 {
				return errors.New("list items must be at most 50 characters")
			}
		}
	}
	for _, t := range tiers {
		if !gfiValidTiers[strings.ToUpper(strings.TrimSpace(t))] {
			return errors.New("tiers must be chosen from S, A, B, C, D")
		}
	}
	return nil
}

// capList enforces the AC6 per-list entry ceiling.
func capList(items []string) []string {
	if len(items) > MaxGFIPrefItems {
		return items[:MaxGFIPrefItems]
	}
	return items
}

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
	return strings.Join(capList(out), ",")
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
	return strings.Join(capList(out), ",")
}

// --- Tokens ---------------------------------------------------------------

func gfiToken(sid int64, scope string, secret string, exp time.Time) string {
	expUnix := exp.UTC().Unix()
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
	return fmt.Sprintf("%d.%s", expUnix, hex.EncodeToString(mac.Sum(nil)))
}

// verifyGFIToken validates "exp.hmac" tokens. exp==0 marks a legacy
// no-expiry token; anything else must not be in the past. prevSecrets are
// the rotation old keys (AC7): during the dual-key window a token signed
// with either key verifies.
func verifyGFIToken(sidStr, token, scope, secret string, prevSecrets ...string) (int64, bool) {
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
	if expUnix != 0 && time.Now().UTC().Unix() >= expUnix {
		return 0, false // expired
	}
	for _, key := range append([]string{secret}, prevSecrets...) {
		if key == "" {
			continue
		}
		mac := hmac.New(sha256.New, []byte(key))
		fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
		expected := hex.EncodeToString(mac.Sum(nil))
		if hmac.Equal([]byte(expected), []byte(token[dot+1:])) {
			return sid, true
		}
	}
	return 0, false
}

// GFIVerifyToken builds the single-use double opt-in token (24h TTL, AC1).
func GFIVerifyToken(sid int64, secret string) string {
	return gfiToken(sid, "gfiverify", secret, time.Now().UTC().Add(GFIVerifyTokenTTL))
}

// VerifyGFIVerifyToken validates a verification token; extra args are the
// rotation old keys accepted during the dual-key window (AC7).
func VerifyGFIVerifyToken(sidStr, token, secret string, prevSecrets ...string) (int64, bool) {
	return verifyGFIToken(sidStr, token, "gfiverify", secret, prevSecrets...)
}

// GFIUnsubscribeToken builds the one-click unsubscribe token with scoped
// claims {sub_id, email_hash, purpose='unsub', exp=30d} (AC4). The token is
// bound to the subscriber's current email: rotating the signing secret or
// deleting/changing the subscriber invalidates outstanding tokens, because
// verification runs against the current secret and live subscriber record.
func GFIUnsubscribeToken(sid int64, email, secret string) string {
	return gfiToken(sid, gfiUnsubScope(email), secret, time.Now().UTC().Add(GFIUnsubscribeTokenTTL))
}

// VerifyGFIUnsubscribeToken validates an unsubscribe token bound to the given
// email; extra args are the rotation old keys (AC7).
func VerifyGFIUnsubscribeToken(sidStr, token, email, secret string, prevSecrets ...string) (int64, bool) {
	return verifyGFIToken(sidStr, token, gfiUnsubScope(email), secret, prevSecrets...)
}

// gfiUnsubScope scopes unsubscribe-token MACs to subscriber_id + email hash
// (AC4 binding).
func gfiUnsubScope(email string) string {
	sum := sha256.Sum256([]byte("gfiunsub:" + strings.ToLower(strings.TrimSpace(email))))
	return "gfiunsub:" + hex.EncodeToString(sum[:8])
}

// GFIUnsubscribeSigToken builds the /u/{userId}?sig= unsubscribe signature
// (AC6): HMAC(secret, userId+expiry) with a fixed 30-day expiry embedded as
// "<exp>.<hexmac>" so a single query param carries both.
func GFIUnsubscribeSigToken(userID int64, secret string) string {
	return gfiToken(userID, "gfu1", secret, time.Now().UTC().Add(GFIUnsubscribeTokenTTL))
}

// VerifyGFIUnsubscribeSig validates a /u/{userId}?sig= signature; extra args
// are the rotation old keys accepted during the dual-key window.
func VerifyGFIUnsubscribeSig(userIDStr, sig, secret string, prevSecrets ...string) (int64, bool) {
	return verifyGFIToken(userIDStr, sig, "gfu1", secret, prevSecrets...)
}

// gfiLabelTokens are the accepted 'good first issue' label spellings (AC2),
// matched case-insensitively inside the stored labels_json blob.
var gfiLabelTokens = []string{
	"good first issue", "good-first-issue", "good_first_issue",
	"first-timers-only", "first-timer", "beginner", "beginner-friendly",
	"beginner friendly", "starter", "up-for-grabs", "help wanted", "help-wanted",
	"easy-fix", "easy fix", "low-hanging-fruit", "low hanging fruit",
}

// gfiHeuristicRe matches beginner-friendly phrasing in unlabeled issues (AC2).
var gfiHeuristicRe = regexp.MustCompile(`(?i)first[- ]time|beginner`)

// IsGoodFirstIssueMatch reports whether an issue qualifies as a good first
// issue: a known welcome label OR the title/body heuristic fallback for
// unlabeled repos (AC2). Never panics on malformed labels_json.
func IsGoodFirstIssueMatch(title, body, labelsJSON string) bool {
	labels := strings.ToLower(labelsJSON)
	for _, tok := range gfiLabelTokens {
		if strings.Contains(labels, tok) {
			return true
		}
	}
	return gfiHeuristicRe.MatchString(title) || gfiHeuristicRe.MatchString(body)
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
// Every successful insert rolls the subscriber's whole pending batch out to
// now+1h, so bursts coalesce into one email per window (AC4).
func EnqueueGFIInstantAlerts(ctx context.Context, db *sqlx.DB, repoID string, issueNumbers []int, now time.Time) (int, error) {
	if len(issueNumbers) == 0 {
		return 0, nil
	}

	repo, err := getGFIRepoCtx(ctx, db, repoID)
	if err != nil {
		return 0, err
	}
	subs, err := selectEligibleSubscribers(ctx, db, []string{"instant", "both"})
	if err != nil {
		return 0, err
	}
	topics, err := selectRepoTopics(ctx, db, repoID)
	if err != nil {
		return 0, err
	}

	fresh, fireHashes, refreshNums, updAts := gfiAlertFires(ctx, db, repoID, issueNumbers)
	if len(fresh) == 0 {
		return 0, nil
	}

	matched := 0
	stampedNums := map[int]bool{}
	tx, err := db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	insertQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, next_attempt_at, created_at) VALUES (?, ?, ?, ?, 'instant', ?, ?)"
	if db.DriverName() == "sqlite" {
		insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, next_attempt_at, created_at) VALUES (?, ?, ?, ?, 'instant', ?, ?)"
	}
	// AC2 overflow: issues beyond the daily instant cap enter as 'fallback'
	// and roll into the once-a-day fallback digest instead of an instant send.
	fallbackQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, created_at) VALUES (?, ?, ?, ?, 'instant', 'fallback', ?)"
	if db.DriverName() == "sqlite" {
		fallbackQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, created_at) VALUES (?, ?, ?, ?, 'instant', 'fallback', ?)"
	}
	// AC2 rate limit: issues beyond the 10/hour per-subscriber instant cap
	// park as 'carry' scheduled for the next hourly batch — never dropped.
	carryQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, next_attempt_at, created_at) VALUES (?, ?, ?, ?, 'instant', 'carry', ?, ?)"
	if db.DriverName() == "sqlite" {
		carryQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, next_attempt_at, created_at) VALUES (?, ?, ?, ?, 'instant', 'carry', ?, ?)"
	}
	batchDue := now.UTC().Add(gfiBatchWindow)
	// AC3: overflow rows carry into the next 15-min batch bucket.
	nextWindow := now.UTC().Truncate(gfiBatchWindow).Add(gfiBatchWindow)

	for _, sub := range subs {
		if !subscriberMatchesRepo(sub, repo, topics) {
			continue
		}
		// AC5: per-user instant-alert ceiling per UTC day; overflow issues
		// become fallback rows so the daily fallback digest picks them up.
		sentToday := countGFIQueuedSince(ctx, tx, sub.ID, startOfUTCDay(now))
		// AC2: per-user instant-alert ceiling per rolling hour; overflow
		// carries into the next hourly batch.
		sentHour := countGFIQueuedSince(ctx, tx, sub.ID, now.UTC().Add(-time.Hour))
		for _, num := range fresh {
			var res sql.Result
			var err error
			key := fmt.Sprintf("%s:%d:%d", repoID, num, sub.ID)
			instant := true
			switch {
			case sentToday >= GFIDailyAlertCap:
				instant = false
				res, err = tx.ExecContext(ctx, fallbackQ, sub.ID, key, repoID, num, now.UTC())
			case sentHour >= GFIHourlyInstantCap:
				instant = false
				res, err = tx.ExecContext(ctx, carryQ, sub.ID, key, repoID, num, nextWindow, now.UTC())
			default:
				res, err = tx.ExecContext(ctx, insertQ, sub.ID, key, repoID, num, batchDue, now.UTC())
			}
			if err != nil {
				return matched, fmt.Errorf("gfi-alert enqueue: %w", err)
			}
			if n, _ := res.RowsAffected(); n > 0 {
				matched++
				if instant {
					sentHour++
					if sentToday < GFIDailyAlertCap {
						sentToday++
					}
				}
				stampedNums[num] = true

				// In-App Notification Center: emit alert if subscriber is a registered user
				var uID int64
				if err := tx.GetContext(ctx, &uID, `SELECT id FROM users WHERE email = ? LIMIT 1`, sub.Email); err == nil && uID > 0 {
					notifTitle := fmt.Sprintf("New Good First Issue in %s", repo.FullName)
					notifMsg := fmt.Sprintf("Issue #%d matched your preferred languages and tech stack.", num)
					notifLink := fmt.Sprintf("/repos/%s", repoID)
					go WriteNotification(db, uID, CategoryGFI, NotificationPayload{Title: notifTitle, Message: notifMsg, LinkURL: notifLink})
				}
			}
		}
		if matched > 0 {
			// Rolling debounce: push every still-pending row of this
			// subscriber to the end of the current coalescing window (AC4).
			if _, err := tx.ExecContext(ctx,
				`UPDATE gfi_email_queue SET next_attempt_at=? WHERE subscriber_id=? AND status='pending'`,
				batchDue, sub.ID); err != nil {
				return matched, fmt.Errorf("gfi-alert batch roll: %w", err)
			}
		}
	}

	// Dispatch real-time webhooks (Discord / Custom Webhooks) for newly indexed issues
	for _, num := range fresh {
		issueURL := fmt.Sprintf("https://getmerged.abhishekco.de/good-first-issue")
		go DispatchSniperWebhooks(context.Background(), db, repo, num, fmt.Sprintf("Issue #%d in %s", num, repo.FullName), issueURL)
	}
	if err := tx.Commit(); err != nil {
		return matched, err
	}
	// AC1/AC3: stamp the permanent dedup key + content hash + last-alerted
	// updated_at on every issue row whose alert actually entered the queue,
	// so re-ingest never re-fires while a newer updated_at (reopen, labels
	// added post-creation) does.
	for _, num := range fresh {
		if !stampedNums[num] {
			continue
		}
		upd := updAts[num]
		if refreshNums[num] && !upd.IsZero() {
			_, _ = db.ExecContext(ctx,
				`UPDATE repo_good_first_issues SET alert_dedup_key=?, alert_content_hash=?, alert_refresh_fired_at=COALESCE(alert_refresh_fired_at,?), alert_last_updated_at=? WHERE repository_id=? AND issue_number=?`,
				fmt.Sprintf("%s:%d", repoID, num), fireHashes[num], now.UTC(), upd, repoID, num)
		} else if refreshNums[num] {
			_, _ = db.ExecContext(ctx,
				`UPDATE repo_good_first_issues SET alert_dedup_key=?, alert_content_hash=?, alert_refresh_fired_at=? WHERE repository_id=? AND issue_number=?`,
				fmt.Sprintf("%s:%d", repoID, num), fireHashes[num], now.UTC(), repoID, num)
		} else if !upd.IsZero() {
			_, _ = db.ExecContext(ctx,
				`UPDATE repo_good_first_issues SET alert_dedup_key=?, alert_content_hash=?, alert_last_updated_at=? WHERE repository_id=? AND issue_number=?`,
				fmt.Sprintf("%s:%d", repoID, num), fireHashes[num], upd, repoID, num)
		} else {
			_, _ = db.ExecContext(ctx,
				`UPDATE repo_good_first_issues SET alert_dedup_key=?, alert_content_hash=? WHERE repository_id=? AND issue_number=?`,
				fmt.Sprintf("%s:%d", repoID, num), fireHashes[num], repoID, num)
		}
	}
	return matched, nil
}

// gfiIssueAlertState is one stored issue's permanent AC1/AC3 alert-dedup
// state: dedup is keyed on the GitHub node_id + updated_at (not created
// state), so reopened issues and labels added post-creation re-fire.
type gfiIssueAlertState struct {
	IssueNumber       int          `db:"issue_number"`
	Title             string       `db:"title"`
	BodyText          string       `db:"body_text"`
	LabelsJSON        string       `db:"labels_json"`
	DedupKey          string       `db:"alert_dedup_key"`
	ContentHash       string       `db:"alert_content_hash"`
	RefreshFiredAt    sql.NullTime `db:"alert_refresh_fired_at"`
	UpdatedAt         sql.NullTime `db:"issue_updated_at"`
	AlertLastUpdateAt sql.NullTime `db:"alert_last_updated_at"`
}

// gfiContentHash fingerprints the matched fields of an issue (AC1): a later
// edit can trigger at most one refresh alert per issue lifetime.
func gfiContentHash(title, bodyText, labelsJSON string) string {
	sum := sha256.Sum256([]byte(title + "\x00" + bodyText + "\x00" + labelsJSON))
	return hex.EncodeToString(sum[:])
}

// gfiAlertFires classifies stored issues for alerting under the AC3 rule:
// dedup is keyed on issue node_id + updated_at (never created state), so an
// issue fires once when its row carries no permanent dedup stamp, and
// re-fires whenever its GitHub updated_at advances past what was last
// alerted (reopened, labels added post-creation). Rows without updated_at
// data fall back to the matched-fields content hash with a single refresh.
func gfiAlertFires(ctx context.Context, db *sqlx.DB, repoID string, nums []int) ([]int, map[int]string, map[int]bool, map[int]time.Time) {
	query, args, err := sqlx.In(`
		SELECT issue_number, title, COALESCE(body_text,'') AS body_text, COALESCE(labels_json,'') AS labels_json,
		       COALESCE(alert_dedup_key,'') AS alert_dedup_key, COALESCE(alert_content_hash,'') AS alert_content_hash,
		       alert_refresh_fired_at, issue_updated_at, alert_last_updated_at
		FROM repo_good_first_issues WHERE repository_id = ? AND issue_number IN (?)`, repoID, nums)
	if err != nil {
		return nil, nil, nil, nil
	}
	var rows []gfiIssueAlertState
	if err := db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, nil, nil, nil
	}
	var out []int
	hashes := map[int]string{}
	refresh := map[int]bool{}
	updAts := map[int]time.Time{}
	for _, r := range rows {
		if !IsGoodFirstIssueMatch(r.Title, r.BodyText, r.LabelsJSON) {
			continue
		}
		hash := gfiContentHash(r.Title, r.BodyText, r.LabelsJSON)
		hashes[r.IssueNumber] = hash
		if r.UpdatedAt.Valid && !r.UpdatedAt.Time.IsZero() {
			updAts[r.IssueNumber] = r.UpdatedAt.Time
		}
		switch {
		case r.DedupKey == "":
			out = append(out, r.IssueNumber)
		case r.UpdatedAt.Valid && !r.UpdatedAt.Time.IsZero():
			if !r.AlertLastUpdateAt.Valid || r.AlertLastUpdateAt.Time.IsZero() || r.UpdatedAt.Time.After(r.AlertLastUpdateAt.Time) {
				out = append(out, r.IssueNumber)
				refresh[r.IssueNumber] = true
			}
		case r.ContentHash != hash && !r.RefreshFiredAt.Valid && !r.RefreshFiredAt.Time.After(time.Unix(0, 0)):
			out = append(out, r.IssueNumber)
			refresh[r.IssueNumber] = true
		}
	}
	return out, hashes, refresh, updAts
}

// countGFIQueuedSince counts instant-mode queue rows created for a subscriber
// since t, i.e. today's instant-alert usage against GFIDailyAlertCap (AC5).
// 'fallback' overflow rows never consume instant capacity.
func countGFIQueuedSince(ctx context.Context, q sqlx.QueryerContext, subID int64, t time.Time) int {
	var n int
	_ = q.QueryRowxContext(ctx,
		`SELECT COUNT(*) FROM gfi_email_queue WHERE subscriber_id = ? AND delivery_mode='instant' AND status IN ('pending','pending_retry','sending','sent') AND created_at >= ?`,
		subID, t).Scan(&n)
	return n
}

func startOfUTCDay(now time.Time) time.Time {
	t := now.UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
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
// complete prefs for the given delivery modes (AC8 filters incomplete prefs;
// 'both' subscribers receive instant alerts and digests).
func selectEligibleSubscribers(ctx context.Context, db *sqlx.DB, modes []string) ([]gfiSubscriber, error) {
	query, args, err := sqlx.In(`
		SELECT id, email, COALESCE(languages,'') AS languages, COALESCE(tech_stacks,'') AS tech_stacks,
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, COALESCE(opt_out,FALSE) AS opt_out,
		       disabled, hard_bounces
		FROM gfi_subscribers
		WHERE frequency IN (?) AND verified_at IS NOT NULL AND unsubscribed_at IS NULL
		  AND COALESCE(opt_out,FALSE) = FALSE AND disabled = FALSE AND hard_bounces < ?
	`, modes, MaxHardBounces)
	if err != nil {
		return nil, err
	}
	var subs []gfiSubscriber
	if err := db.SelectContext(ctx, &subs, query, args...); err != nil {
		return nil, err
	}
	kept := subs[:0]
	for _, s := range subs {
		if s.prefsComplete() {
			kept = append(kept, s)
		}
	}
	return kept, nil
}

// subscriberMatchesRepo applies language, C-Rank tier and optional tech-stack
// topic filters for one subscriber/repo pair.
func subscriberMatchesRepo(sub gfiSubscriber, repo gfiRepoCtx, topics []string) bool {
	langs := csvSet(sub.Languages)
	if len(langs) > 0 && !csvHas(langs, strings.ToLower(repo.Language)) {
		return false
	}
	tiers := csvSet(sub.Tiers)
	if len(tiers) > 0 && !csvHas(tiers, strings.ToLower(repo.Tier)) {
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
	Dequeued         int `json:"dequeued"`
	Sent             int `json:"sent"`
	Dropped          int `json:"dropped"`
	Failed           int `json:"failed"`
	RolledIntoDigest int `json:"rolled_into_digest"`
}

// gfiFlushMu serializes outbox drains into a single worker queue (AC5):
// overlapping cron and internal-trigger flushes would double-send batches.
var gfiFlushMu sync.Mutex

// gfiIssueEmailCtx carries everything needed to render one alert email.
type gfiIssueEmailCtx struct {
	RepoID                   string  `db:"repo_id"`
	FullName                 string  `db:"full_name"`
	Language                 string  `db:"language"`
	Tier                     string  `db:"c_rank_tier"`
	Score                    float64 `db:"c_rank_score"`
	MaintainerResponsiveness float64 `db:"maintainer_responsiveness"`
	ResponseP50Hours         float64 `db:"response_p50_hours"`
	IssueNo                  int     `db:"issue_number"`
	Title                    string  `db:"title"`
	URL                      string  `db:"url"`
	LabelsJSON               string  `db:"labels_json"`
}

func (c gfiIssueEmailCtx) repoCtx() gfiRepoCtx {
	return gfiRepoCtx{
		FullName:                 c.FullName,
		Language:                 c.Language,
		Tier:                     c.Tier,
		Score:                    c.Score,
		MaintainerResponsiveness: c.MaintainerResponsiveness,
		ResponseP50Hours:         c.ResponseP50Hours,
	}
}

// ProcessGFIEmailQueue drains the GFI outbox with per-subscriber batching
// (AC2): all due rows of one subscriber collapse into a single email listing
// every matched issue. Per batch it follows the AC4/AC6 send pipeline:
// atomically claim the rows -> pre-send suppression + bounce check (AC5,
// including mid-fan-out) -> throttled send (AC3) -> mark sent. Soft failures
// are marked 'pending_retry' and retried up to 3 times with exponential
// backoff, then marked 'failed' (AC5); provider rate limits (429/4xx
// throttle) pause the whole queue until the backoff elapses without
// consuming attempts.
func ProcessGFIEmailQueue(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig) (*gfiQueueSummary, error) {
	// AC5: one worker per provider flush — concurrent triggers queue up here.
	gfiFlushMu.Lock()
	defer gfiFlushMu.Unlock()

	// AC7: cross-process advisory lock — overlapping 15-min cron runs no-op
	// instead of double-sending.
	release, ok := TryJobLock(ctx, db, "gfi_queue_flush", 10*time.Minute)
	if !ok {
		slog.Info("gfi-queue: another flush holds the advisory lock, skipping")
		return &gfiQueueSummary{}, nil
	}
	defer release()

	summary := &gfiQueueSummary{}
	now := time.Now().UTC()

	purgeExpiredGFISendLog(ctx, db, now)

	var rows []struct {
		ID         int64  `db:"id"`
		Subscriber int64  `db:"subscriber_id"`
		RepoID     string `db:"repo_id"`
		IssueNo    int    `db:"issue_number"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT id, subscriber_id, repo_id, issue_number FROM gfi_email_queue
		WHERE (status IN ('pending','pending_retry','carry') AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
		   OR (status = 'sending' AND claimed_at IS NOT NULL AND claimed_at <= ?)
		ORDER BY subscriber_id, created_at ASC LIMIT 400
	`, now, now.Add(-gfiClaimStaleAfter)); err != nil {
		return nil, err
	}

	type queueRow = struct {
		ID         int64  `db:"id"`
		Subscriber int64  `db:"subscriber_id"`
		RepoID     string `db:"repo_id"`
		IssueNo    int    `db:"issue_number"`
	}
	groups := map[int64][]queueRow{}
	var order []int64
	for _, r := range rows {
		if _, seen := groups[r.Subscriber]; !seen {
			order = append(order, r.Subscriber)
		}
		groups[r.Subscriber] = append(groups[r.Subscriber], r)
	}

	subCache := map[int64]*gfiSubscriber{}
	for _, sid := range order {
		group := groups[sid]

		// AC4 step 1: atomic claim of the whole subscriber batch. Losers of
		// a concurrent cron race skip.
		ids := make([]int64, len(group))
		for i, r := range group {
			ids[i] = r.ID
		}
		claimQ, claimArgs, err := sqlx.In(`
			UPDATE gfi_email_queue SET status='sending', claimed_at=?
			WHERE id IN (?) AND status IN ('pending','pending_retry','carry','sending')
		`, now, ids)
		if err != nil {
			continue
		}
		res, err := db.ExecContext(ctx, claimQ, claimArgs...)
		if err != nil {
			slog.Error("gfi-queue: batch claim failed", "subscriber_id", sid, "err", err)
			continue
		}
		if n, _ := res.RowsAffected(); n == 0 {
			continue // already claimed by another worker
		}

		sub, ok := subCache[sid]
		if !ok {
			s, err := getGFISubscriber(ctx, db, sid)
			if err != nil {
				slog.Error("gfi-queue: subscriber lookup failed", "subscriber_id", sid, "err", err)
				continue // leave claimed; reclaimed after gfiClaimStaleAfter
			}
			sub = s
			subCache[sid] = sub
		}

		// AC4 step 2 / AC5: suppression + bounce check at send time, every
		// attempt — unsubscribed, opted-out, bounced out, disabled or on the
		// standalone suppression list are silently dropped.
		if sub == nil || sub.suppressed() || IsEmailSuppressed(ctx, db, sub.Email) {
			for _, r := range group {
				markGFIQueued(ctx, db, r.ID, "dropped", "suppressed")
				summary.Dropped++
			}
			continue
		}

		// AC2: hard 5-emails/user/day ceiling via a single atomic counter
		// UPDATE ... WHERE count < 5. Overflow rows park as 'fallback' so the
		// once-a-day fallback digest delivers them in one batched email.
		if !claimGFIDailyEmailSlot(ctx, db, sid, startOfUTCDay(now)) {
			for _, r := range group {
				parkGFIQueuedFallback(ctx, db, r.ID)
				summary.RolledIntoDigest++
			}
			slog.Info("gfi-queue: daily email cap reached, parking for fallback digest", "subscriber_id", sid)
			continue
		}

		// Collect the issue contexts for the batch; missing issues drop.
		// AC4: every item is revalidated against the live GitHub API
		// (open + unassigned); stale items are dropped and the next best
		// match on that repo is swapped in so no dead links are emailed.
		items := make([]gfiIssueEmailCtx, 0, len(group))
		valid := group[:0]
		for _, r := range group {
			item, err := getGFIIssueEmailCtx(ctx, db, r.RepoID, r.IssueNo)
			if err != nil {
				slog.Error("gfi-queue: issue ctx lookup failed", "repo_id", r.RepoID, "issue_no", r.IssueNo, "err", err)
				markGFIQueued(ctx, db, r.ID, "dropped", "issue no longer available")
				summary.Dropped++
				continue
			}
			if !gfiIssueStillFresh(cfg, item.FullName, item.IssueNo) {
				markGFIQueued(ctx, db, r.ID, "dropped", "issue closed or assigned at send time")
				summary.Dropped++
				if swap, swapID := swapInNextMatch(ctx, db, cfg, sid, r.RepoID, map[int]bool{r.IssueNo: true}, time.Now().UTC()); swap != nil {
					items = append(items, *swap)
					valid = append(valid, queueRow{ID: swapID, Subscriber: sid, RepoID: r.RepoID, IssueNo: swap.IssueNo})
				}
				continue
			}
			items = append(items, item)
			valid = append(valid, r)
		}
		group = valid
		if len(group) == 0 {
			continue
		}

		// AC4: hard cap of 10 items per email. Overflow rows park as
		// 'fallback' and roll into the daily fallback digest instead.
		if len(items) > GFIDigestCap {
			for _, r := range group[GFIDigestCap:] {
				parkGFIQueuedFallback(ctx, db, r.ID)
				summary.RolledIntoDigest++
			}
			items = items[:GFIDigestCap]
			group = group[:GFIDigestCap]
		}

		// AC5: single-use server-side Claim & Setup links for each issue.
		claimURLs := map[string]string{}
		for _, it := range items {
			if u, err := newGFIClaimLink(ctx, db, cfg.BaseURL, sid, it.RepoID, it.FullName, it.IssueNo, now); err == nil && u != "" {
				claimURLs[fmt.Sprintf("%s:%d", it.RepoID, it.IssueNo)] = u
			} else if err != nil {
				slog.Warn("gfi-queue: claim link creation failed", "repo_id", it.RepoID, "err", err)
			}
		}

		// AC4 step 3: one throttled send per subscriber batch (AC2 burst
		// protection) with List-Unsubscribe headers (AC1).
		payload := buildGFIBatchAlertEmail(cfg, sid, sub.Email, items, claimURLs)
		sendErr := sendGFIPayload(ctx, cfg, sub.Email, payload, gfiUnsubscribeURL(cfg.BaseURL, cfg.unsubKey(), sid, sub.Email))
		if sendErr == nil {
			for _, r := range group {
				markGFIQueued(ctx, db, r.ID, "sent", "")
				summary.Sent++
			}
			continue
		}

		// AC6: provider rate limit — pause the queue: re-schedule this batch
		// with backoff WITHOUT consuming attempts and stop draining.
		if IsRateLimited(sendErr) {
			next := time.Now().UTC().Add(gfiBackoffDelay(1))
			for _, r := range group {
				pauseGFIQueued(ctx, db, r.ID, sendErr.Error(), next)
			}
			slog.Warn("gfi-queue: provider rate limited, pausing queue", "subscriber_id", sid, "resume_at", next)
			return summary, nil
		}

		// AC4 step 4: classify failure. Hard bounces feed the suppression
		// list (AC5) and dead-letter immediately; soft failures back off and
		// retry until GFIEmailMaxAttempts is exhausted.
		if IsHardBounce(sendErr) {
			if _, berr := ApplyGFIEmailBounce(ctx, db, sub.Email, true); berr != nil {
				slog.Error("gfi-queue: bounce bookkeeping failed", "email", sub.Email, "err", berr)
			}
			for _, r := range group {
				markGFIQueued(ctx, db, r.ID, "failed", sendErr.Error())
				summary.Failed++
			}
			notifyGFIAdmin(ctx, cfg, "GFI alert dead-lettered: hard bounce",
				fmt.Sprintf("subscriber_id=%d email=%s error=%v", sid, sub.Email, sendErr))
			continue
		}
		for _, r := range group {
			summary.Failed++
			var attempts int
			_ = db.GetContext(ctx, &attempts, `SELECT attempts FROM gfi_email_queue WHERE id = ?`, r.ID)
			attempts++ // this attempt just failed
			if attempts >= GFIEmailMaxAttempts {
				markGFIQueued(ctx, db, r.ID, "failed", sendErr.Error())
				slog.Warn("gfi-queue: dead-lettered after max retries", "row_id", r.ID, "attempts", attempts)
				notifyGFIAdmin(ctx, cfg, "GFI alert dead-lettered after retries",
					fmt.Sprintf("subscriber_id=%d row_id=%d attempts=%d error=%v", sid, r.ID, attempts, sendErr))
			} else {
				markGFIQueued(ctx, db, r.ID, "pending_retry", sendErr.Error(), gfiBackoffDelay(attempts))
			}
		}
	}
	return summary, nil
}

// claimGFIDailyEmailSlot atomically reserves one instant-email slot for the
// subscriber's UTC day (AC2): a single UPDATE guarded on count < cap means
// concurrent workers can never exceed GFIDailyAlertCap emails per day.
func claimGFIDailyEmailSlot(ctx context.Context, db *sqlx.DB, subID int64, day time.Time) bool {
	dayKey := day.Format("2006-01-02")
	insQ := `INSERT INTO gfi_daily_send_counts (subscriber_id, day, email_count) VALUES (?, ?, 0)`
	if db.DriverName() == "sqlite" {
		insQ = `INSERT OR IGNORE INTO gfi_daily_send_counts (subscriber_id, day, email_count) VALUES (?, ?, 0)`
	} else {
		insQ = `INSERT IGNORE INTO gfi_daily_send_counts (subscriber_id, day, email_count) VALUES (?, ?, 0)`
	}
	if _, err := db.ExecContext(ctx, insQ, subID, dayKey); err != nil {
		return false
	}
	res, err := db.ExecContext(ctx,
		`UPDATE gfi_daily_send_counts SET email_count = email_count + 1 WHERE subscriber_id = ? AND day = ? AND email_count < ?`,
		subID, dayKey, GFIDailyAlertCap)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

// parkGFIQueuedFallback moves a claimed row into the 'fallback' holding state
// so the daily fallback digest delivers it (AC2 overflow roll-in).
func parkGFIQueuedFallback(ctx context.Context, db *sqlx.DB, id int64) {
	_, _ = db.ExecContext(ctx, `UPDATE gfi_email_queue SET status='fallback', claimed_at=NULL WHERE id=? AND status='sending'`, id)
}

// notifyGFIAdmin sends the dead-letter alert to the ops address (AC5);
// best-effort — failures are logged, never propagated to the flush loop.
func notifyGFIAdmin(ctx context.Context, cfg GFIAlertConfig, subject, body string) {
	if cfg.AdminEmail == "" || cfg.Mailer == nil {
		return
	}
	if err := cfg.Mailer.Send(ctx, cfg.AdminEmail, subject, body, body); err != nil {
		slog.Error("gfi-queue: admin dead-letter alert failed", "err", err)
	}
}

// purgeExpiredGFISendLog drops terminal send-log rows past the 30-day TTL.
// Storage hygiene only: AC1 permanence lives on the issue-row dedup stamps,
// so purged queue rows can never re-fire an alert.
func purgeExpiredGFISendLog(ctx context.Context, db *sqlx.DB, now time.Time) {
	cutoff := now.Add(-gfiSendLogTTL)
	if _, err := db.ExecContext(ctx,
		`DELETE FROM gfi_email_queue WHERE created_at < ? AND status IN ('sent','failed','dropped')`, cutoff); err != nil {
		slog.Warn("gfi-queue: send-log purge failed", "err", err)
	}
}

// gfiIssueStillFresh revalidates live issue state via the GitHub API at send
// time: open and unassigned (AC4). Fails open when no client is wired or the
// API errors — a flaky API never blocks the queue.
func gfiIssueStillFresh(cfg GFIAlertConfig, fullName string, number int) bool {
	if cfg.GitHub == nil {
		return true
	}
	parts := strings.Split(fullName, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false
	}
	open, unassigned, err := cfg.GitHub.FetchIssueOpenUnassigned(parts[0], parts[1], number)
	if err != nil {
		return true
	}
	return open && unassigned
}

// swapInNextMatch finds the next best still-fresh issue on a repo that this
// subscriber has not been alerted for (AC4 swap-in rule) and inserts its
// already-claimed queue row pre-send. Returns the email context and its row id.
func swapInNextMatch(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig, subID int64, repoID string, taken map[int]bool, now time.Time) (*gfiIssueEmailCtx, int64) {
	var candidates []gfiIssueEmailCtx
	query := `
		SELECT g.repository_id AS repo_id, g.issue_number, g.title, g.url,
		       COALESCE(g.labels_json, '') AS labels_json,
		       r.full_name, COALESCE(r.language,'') AS language,
		       COALESCE(s.c_rank_tier,'') AS c_rank_tier, COALESCE(s.c_rank_score,0) AS c_rank_score,
		       COALESCE(s.maintainer_responsiveness,0) AS maintainer_responsiveness,
		       COALESCE(s.response_p50_hours,0) AS response_p50_hours
		FROM repo_good_first_issues g
		JOIN repositories r ON r.id = g.repository_id
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE g.repository_id = ?
		ORDER BY g.quality_score DESC, g.created_at DESC
		LIMIT 15
	`
	if err := db.SelectContext(ctx, &candidates, query, repoID); err != nil {
		return nil, 0
	}
	for _, cand := range candidates {
		num := cand.IssueNo
		if taken[num] {
			continue
		}
		taken[num] = true
		if !gfiIssueStillFresh(cfg, cand.FullName, num) {
			continue
		}
		insertQ := "INSERT INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, claimed_at, created_at) VALUES (?, ?, ?, ?, 'instant', 'sending', ?, ?)"
		if db.DriverName() == "sqlite" {
			insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, claimed_at, created_at) VALUES (?, ?, ?, ?, 'instant', 'sending', ?, ?)"
		} else {
			insertQ = "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, claimed_at, created_at) VALUES (?, ?, ?, ?, 'instant', 'sending', ?, ?)"
		}
		res, err := db.ExecContext(ctx, insertQ,
			subID, fmt.Sprintf("%s:%d:%d", repoID, num, subID), repoID, num, now, now)
		if err != nil {
			return nil, 0
		}
		if n, _ := res.RowsAffected(); n > 0 {
			rowID, _ := res.LastInsertId()
			cand2 := cand
			return &cand2, rowID
		}
		return nil, 0 // already queued elsewhere; do not double-fire
	}
	return nil, 0
}

func getGFISubscriber(ctx context.Context, db *sqlx.DB, id int64) (*gfiSubscriber, error) {
	var s gfiSubscriber
	err := db.GetContext(ctx, &s, `
		SELECT id, email, COALESCE(languages,'') AS languages, COALESCE(tech_stacks,'') AS tech_stacks,
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, COALESCE(opt_out,FALSE) AS opt_out,
		       disabled, hard_bounces
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
		       COALESCE(g.labels_json, '') AS labels_json,
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

// pauseGFIQueued parks a claimed row back in 'pending_retry' with a future
// next_attempt_at WITHOUT consuming an attempt (AC6 rate-limit pause).
func pauseGFIQueued(ctx context.Context, db *sqlx.DB, id int64, lastErr string, next time.Time) {
	_, _ = db.ExecContext(ctx,
		`UPDATE gfi_email_queue SET status='pending_retry', last_error=?, next_attempt_at=? WHERE id=? AND status='sending'`,
		lastErr, next, id)
}

// markGFIQueued advances a claimed outbox row's status (AC5). 'pending_retry' keeps
// it in the retry state with a bumped attempt counter and exponential-backoff
// next_attempt_at; every transition is guarded on status='sending' so a row
// reclaimed by another worker is never clobbered.
func markGFIQueued(ctx context.Context, db *sqlx.DB, id int64, status, lastErr string, backoff ...time.Duration) {
	if status == "pending_retry" && len(backoff) > 0 {
		next := time.Now().UTC().Add(backoff[0])
		_, _ = db.ExecContext(ctx, `
			UPDATE gfi_email_queue SET status='pending_retry', attempts = attempts + 1, last_error=?, next_attempt_at=?
			WHERE id=? AND status='sending'
		`, lastErr, next, id)
		return
	}
	if status == "sent" {
		_, _ = db.ExecContext(ctx,
			`UPDATE gfi_email_queue SET status=?, last_error=?, sent_at=? WHERE id=? AND status='sending'`,
			status, lastErr, time.Now().UTC(), id)
		return
	}
	_, _ = db.ExecContext(ctx, `UPDATE gfi_email_queue SET status=?, last_error=? WHERE id=? AND status='sending'`, status, lastErr, id)
}

// --- Suppression list --------------------------------------------------------

// RecordEmailSuppression writes an address to the standalone suppression list
// (AC5). Bounces/complaints land here; duplicate writes are no-ops.
func RecordEmailSuppression(ctx context.Context, db *sqlx.DB, email, reason, source string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil
	}
	insertQ := `INSERT INTO email_suppressions (email, reason, source) VALUES (?, ?, ?)`
	if db.DriverName() == "sqlite" {
		insertQ = `INSERT OR IGNORE INTO email_suppressions (email, reason, source) VALUES (?, ?, ?)`
	} else {
		insertQ = `INSERT IGNORE INTO email_suppressions (email, reason, source) VALUES (?, ?, ?)`
	}
	_, err := db.ExecContext(ctx, insertQ, email, reason, source)
	return err
}

// IsEmailSuppressed reports whether an address is on the suppression list.
// Checked on every send attempt so mid-fan-out bounces stop remaining rows.
func IsEmailSuppressed(ctx context.Context, db *sqlx.DB, email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false
	}
	var one int
	if err := db.GetContext(ctx, &one, `SELECT 1 FROM email_suppressions WHERE email = ? LIMIT 1`, email); err != nil {
		return false
	}
	return true
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
	LabelsJSON  string `db:"labels_json"`
}

var (
	gfiDigestMu   sync.Mutex
	gfiDigestLock = map[string]bool{}
)

// RunGFIDigest emails every eligible subscriber the week's newly matched
// good-first issues (top 10 by C-Rank, AC8), scheduled Mondays 09:00 UTC.
// Issues already covered by an instant alert share the same gfi_email_queue
// cursor and are never re-sent (AC2). Zero-match weeks send nothing (AC8).
func RunGFIDigest(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig) (*GFIDigestSummary, error) {
	now := time.Now().UTC()
	weekStart := currentWeekStart(now)
	summary := &GFIDigestSummary{WeekStart: weekStart}

	// AC7: advisory lock so overlapping weekly runs (cron + manual trigger)
	// no-op; the in-memory week lock below remains the same-day fast path.
	releaseLock, locked := TryJobLock(ctx, db, "gfi_weekly_digest", 15*time.Minute)
	if !locked {
		summary.SkippedNoMatch = -1
		return summary, nil
	}
	defer releaseLock()

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
		       COALESCE(tiers,'') AS tiers, frequency, verified_at, unsubscribed_at, COALESCE(opt_out,FALSE) AS opt_out,
		       disabled, hard_bounces
		FROM gfi_subscribers
		WHERE frequency IN ('weekly','both') AND verified_at IS NOT NULL AND unsubscribed_at IS NULL
		  AND COALESCE(opt_out,FALSE) = FALSE AND disabled = FALSE AND hard_bounces < ?
	`, MaxHardBounces)
	if err != nil {
		return nil, err
	}

	// AC3: the match window opens at the previous Monday 09:00 UTC send
	// anchor, i.e. exactly since the last scheduled digest run.
	lastAnchor := mondayAnchor(now).AddDate(0, 0, -7)
	windowStart := time.Date(lastAnchor.Year(), lastAnchor.Month(), lastAnchor.Day(), 9, 0, 0, 0, time.UTC)

	for _, sub := range all {
		if !sub.prefsComplete() {
			summary.SkippedIncomplete++
			continue
		}
		items, err := selectDigestMatches(ctx, db, sub, windowStart, GFIDigestCap*3)
		if err != nil {
			summary.Failed++
			slog.Error("gfi-digest: match query failed", "subscriber_id", sub.ID, "err", err)
			continue
		}
		// AC4: revalidate candidates against the live API; stale issues are
		// skipped and the next best match fills the digest instead.
		items = filterFreshDigestItems(cfg, items)
		summary.MatchesFound += len(items)
		if len(items) == 0 {
			summary.SkippedNoMatch++ // zero-match week: no email (AC8)
			continue
		}

		// AC5: single-use server-side Claim & Setup links per issue.
		claimURLs := map[string]string{}
		for _, it := range items {
			if u, err := newGFIClaimLink(ctx, db, cfg.BaseURL, sub.ID, it.RepoID, it.FullName, it.IssueNumber, now); err == nil && u != "" {
				claimURLs[fmt.Sprintf("%s:%d", it.RepoID, it.IssueNumber)] = u
			} else if err != nil {
				slog.Warn("gfi-digest: claim link creation failed", "repo_id", it.RepoID, "err", err)
			}
		}

		payload := buildGFIDigestEmail(cfg, sub.ID, sub.Email, items, claimURLs)
		sendErr := sendGFIPayload(ctx, cfg, sub.Email, payload, gfiUnsubscribeURL(cfg.BaseURL, cfg.unsubKey(), sub.ID, sub.Email))
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
// prefs, excluding anything already alerted/queued for them, ordered best
// first (AC2, AC8). Callers revalidate and cap the result set.
func selectDigestMatches(ctx context.Context, db *sqlx.DB, sub gfiSubscriber, windowStart time.Time, limit int) ([]gfiDigestItem, error) {
	tierList := strings.Split(strings.ToUpper(sub.Tiers), ",")
	for i := range tierList {
		tierList[i] = strings.TrimSpace(tierList[i])
	}
	query, args, err := sqlx.In(`
		SELECT g.repository_id AS repo_id, r.full_name, COALESCE(r.language,'') AS language,
		       COALESCE(s.c_rank_tier,'') AS c_rank_tier, COALESCE(s.c_rank_score,0) AS c_rank_score,
		       COALESCE(s.maintainer_responsiveness,0) AS maintainer_responsiveness,
		       COALESCE(s.response_p50_hours,0) AS response_p50_hours,
		       g.issue_number, g.title, g.url, COALESCE(g.labels_json, '') AS labels_json
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
		  AND NOT EXISTS (
			SELECT 1 FROM repo_claims c
			WHERE c.repo_id = g.repository_id AND c.state = 'verified'
		  )
		ORDER BY s.c_rank_score DESC, g.quality_score DESC, g.created_at DESC
		LIMIT ?
	`, windowStart, strLowerList(csvSet(sub.Languages)), tierList, sub.ID, limit)
	if err != nil {
		return nil, err
	}
	var items []gfiDigestItem
	err = db.SelectContext(ctx, &items, query, args...)
	return items, nil
}

// SelectDigestMatchesForTest exposes selectDigestMatches for unit tests.
func SelectDigestMatchesForTest(ctx context.Context, db *sqlx.DB, subID int64, lang, tier string, windowStart time.Time) ([]gfiDigestItem, error) {
	sub := gfiSubscriber{
		ID:        subID,
		Languages: lang,
		Tiers:     tier,
	}
	return selectDigestMatches(ctx, db, sub, windowStart, 50)
}

// filterFreshDigestItems keeps at most GFIDigestCap candidates that pass AC4
// send-time revalidation; stale issues are skipped so the next best match
// takes their slot.
func filterFreshDigestItems(cfg GFIAlertConfig, cands []gfiDigestItem) []gfiDigestItem {
	out := make([]gfiDigestItem, 0, GFIDigestCap)
	for _, it := range cands {
		if len(out) >= GFIDigestCap {
			break
		}
		if gfiIssueStillFresh(cfg, it.FullName, it.IssueNumber) {
			out = append(out, it)
		}
	}
	return out
}

func strLowerList(set map[string]string) []string {
	out := make([]string, 0, len(set))
	for v := range set {
		out = append(out, v)
	}
	return out
}

// recordGFICursorRows records the per-mode weekly sent-log cursor (AC3) so
// later digest runs never re-send these issues. The cursor dedup key is
// mode-independent (AC4): switching delivery modes changes scheduling only
// and can never produce a second send for the same issue.
func recordGFICursorRows(ctx context.Context, db *sqlx.DB, subID int64, items []gfiDigestItem, now time.Time) error {
	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	insertQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'weekly', 'sent', ?, ?)"
	if db.DriverName() == "sqlite" {
		insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'weekly', 'sent', ?, ?)"
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
// subscriber. The third hard bounce auto-disables the subscription (AC6);
// soft bounces only decrement the reputation counter.
func ApplyGFIEmailBounce(ctx context.Context, db *sqlx.DB, email string, hard bool) (bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false, nil
	}
	if !hard {
		res, err := db.ExecContext(ctx, `
			UPDATE gfi_subscribers
			SET soft_bounces = soft_bounces + 1, updated_at = CURRENT_TIMESTAMP
			WHERE LOWER(email) = ?
		`, email)
		if err != nil {
			return false, err
		}
		n, _ := res.RowsAffected()
		return n > 0, nil
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
	// AC5: every recorded bounce/complaint also lands on the standalone
	// suppression list, which is checked on every send attempt.
	if err := RecordEmailSuppression(ctx, db, email, "hard_bounce", "provider"); err != nil {
		slog.Error("gfi-alerts: suppression write failed", "email", email, "err", err)
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

// headerMailer is implemented by mailers that accept extra RFC 5322 headers
// per message (AC1 List-Unsubscribe). Optional: fakes without it fall back
// to plain Send.
type headerMailer interface {
	SendWithHeaders(ctx context.Context, to, subject, textBody, htmlBody string, headers map[string]string) error
}

// sendGFIPayload delivers one GFI email with RFC 8058 one-click
// List-Unsubscribe headers when the mailer supports them (AC1), spacing
// sends at the configured interval to respect provider rate limits (AC3).
func sendGFIPayload(ctx context.Context, cfg GFIAlertConfig, to string, payload DigestPayload, unsubURL string) error {
	if cfg.Mailer == nil {
		return errors.New("no mailer configured")
	}
	var err error
	if hm, ok := cfg.Mailer.(headerMailer); ok {
		err = hm.SendWithHeaders(ctx, to, payload.Subject, payload.TextBody, payload.HTMLBody, map[string]string{
			"List-Unsubscribe":       "<" + unsubURL + ">",
			"List-Unsubscribe-Post":  "List-Unsubscribe=One-Click",
		})
	} else {
		err = cfg.Mailer.Send(ctx, to, payload.Subject, payload.TextBody, payload.HTMLBody)
	}
	if terr := ctx.Err(); terr != nil {
		return terr
	}
	if err == nil && cfg.sendInterval() > 0 {
		time.Sleep(cfg.sendInterval())
	}
	return err
}

func gfiLinks(baseURL string) string {
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	return strings.TrimRight(baseURL, "/")
}

func gfiClaimURL(baseURL, fullName string) string {
	return fmt.Sprintf("%s/%s", gfiLinks(baseURL), fullName)
}

// gfiUnsubscribeURL builds the one-click unsubscribe link embedded in every
// email and its List-Unsubscribe headers (AC6): /u/{userId}?sig=HMAC(secret,
// userId+expiry30d). Valid sigs unsubscribe instantly; invalid or expired
// ones land on a generic error page with no user-existence feedback.
func gfiUnsubscribeURL(baseURL, unsubKey string, subscriberID int64, _ string) string {
	return fmt.Sprintf("%s/u/%d?sig=%s",
		gfiLinks(baseURL), subscriberID, GFIUnsubscribeSigToken(subscriberID, unsubKey))
}

func (c GFIAlertConfig) unsubKey() string {
	if c.UnsubscribeKey != "" {
		return c.UnsubscribeKey
	}
	return c.JobSecret
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

// gfiCANSPAMFooter renders the physical sender address footer required on
// every commercial email (AC7). Empty address omits the line.
func gfiCANSPAMFooter(physicalAddr string) (textLine, htmlLine string) {
	if strings.TrimSpace(physicalAddr) == "" {
		return "", ""
	}
	textLine = fmt.Sprintf("\nGetMerged · Physical sender address: %s", physicalAddr)
	htmlLine = fmt.Sprintf(`<p style="font-size:11px;color:#94a3b8;">GetMerged · Physical sender address: %s</p>`, html.EscapeString(physicalAddr))
	return textLine, htmlLine
}

// claimLinkOr resolves the single-use Claim & Setup URL for an item, falling
// back to the public repo page when token creation failed (AC5).
func claimLinkOr(claimURLs map[string]string, key, baseURL, fullName string) string {
	if u, ok := claimURLs[key]; ok && u != "" {
		return u
	}
	return gfiClaimURL(baseURL, fullName)
}

// buildGFIBatchAlertEmail renders one instant-alert email listing every issue
// matched in the subscriber's current 30-min batch window (AC2), with C-Rank
// responsiveness stats, single-use Claim & Setup links (AC5), dedicated bounty
// section when >=1 bounty issue exists (AC7), unsubscribe and CAN-SPAM footer.
func buildGFIBatchAlertEmail(cfg GFIAlertConfig, subscriberID int64, email string, items []gfiIssueEmailCtx, claimURLs map[string]string) DigestPayload {
	base := gfiLinks(cfg.BaseURL)
	allURL := base + "/good-first-issue"
	unsubURL := gfiUnsubscribeURL(cfg.BaseURL, cfg.unsubKey(), subscriberID, email)
	footText, footHTML := gfiCANSPAMFooter(cfg.PhysicalAddress)

	subject := fmt.Sprintf("🎯 %d new good first issue(s) matching your stack", len(items))

	var bountyItems []gfiIssueEmailCtx
	var normalItems []gfiIssueEmailCtx
	for _, it := range items {
		if ok, _ := bounty.Detect(it.LabelsJSON); ok {
			bountyItems = append(bountyItems, it)
		} else {
			normalItems = append(normalItems, it)
		}
	}

	var text strings.Builder
	text.WriteString("Newly opened good first issues matching your stack:\n\n")
	var htmlB strings.Builder
	htmlB.WriteString(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
<h2 style="color:#0f172a;">🎯 New good first issues for you</h2>`)

	if len(bountyItems) > 0 {
		text.WriteString("💰 Cash-Bounty Issues (Bounty-labeled):\n")
		htmlB.WriteString(`<div style="margin-bottom:16px;"><h3 style="color:#15803d;margin:0 0 10px 0;font-size:16px;">💰 Cash-Bounty Issues (Bounty-labeled)</h3>`)
		for i, it := range bountyItems {
			key := fmt.Sprintf("%s:%d", it.RepoID, it.IssueNo)
			setupURL := claimLinkOr(claimURLs, key, base, it.FullName)
			_, amt := bounty.Detect(it.LabelsJSON)
			badge := "💰 Bounty-labeled"
			if amt != nil {
				badge = fmt.Sprintf("💰 $%.2f Bounty-labeled", *amt)
			}
			text.WriteString(fmt.Sprintf("%d. %s — #%d %s [%s]\n   %s\n   C-Rank: %.1f (%s tier)\n   %s\n   Claim & Setup: %s\n\n",
				i+1, it.FullName, it.IssueNo, it.Title, badge, it.URL, it.Score, it.Tier,
				gfiStatLine(it.repoCtx()), setupURL))
			htmlB.WriteString(fmt.Sprintf(`<div style="border:1px solid #86efac;border-radius:8px;padding:14px;margin-bottom:10px;background:#f0fdf4;">
<h3 style="margin:0 0 6px 0;color:#0284c7;"><a href="%s" title="View repository scorecard" style="color:#0284c7;text-decoration:none;">%s</a> <span style="font-size:12px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-weight:bold;">%s</span> <span style="font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">%s Tier</span></h3>
<p style="margin:4px 0;font-size:13px;color:#475569;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="margin:4px 0;font-size:13px;color:#475569;">C-Rank %.1f · %s</p>
<p style="margin:10px 0 2px 0;"><a href="%s" title="Claim and set up this repository" style="background:#15803d;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Claim &amp; Setup →</a></p>
</div>`,
				html.EscapeString(gfiClaimURL(base, it.FullName)), html.EscapeString(it.FullName), html.EscapeString(badge), html.EscapeString(it.Tier),
				html.EscapeString(it.URL), it.IssueNo, html.EscapeString(it.Title), it.Score,
				html.EscapeString(gfiStatLine(it.repoCtx())), html.EscapeString(setupURL)))
		}
		htmlB.WriteString(`</div>`)
	}

	for i, it := range normalItems {
		key := fmt.Sprintf("%s:%d", it.RepoID, it.IssueNo)
		setupURL := claimLinkOr(claimURLs, key, base, it.FullName)
		text.WriteString(fmt.Sprintf("%d. %s — #%d %s\n   %s\n   C-Rank: %.1f (%s tier)\n   %s\n   Claim & Setup: %s\n\n",
			i+1, it.FullName, it.IssueNo, it.Title, it.URL, it.Score, it.Tier,
			gfiStatLine(it.repoCtx()), setupURL))
		htmlB.WriteString(fmt.Sprintf(`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px;background:#f8fafc;">
<h3 style="margin:0 0 6px 0;color:#0284c7;"><a href="%s" title="View repository scorecard" style="color:#0284c7;text-decoration:none;">%s</a> <span style="font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">%s Tier</span></h3>
<p style="margin:4px 0;font-size:13px;color:#475569;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="margin:4px 0;font-size:13px;color:#475569;">C-Rank %.1f · %s</p>
<p style="margin:10px 0 2px 0;"><a href="%s" title="Claim and set up this repository" style="background:#0284c7;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Claim &amp; Setup →</a></p>
</div>`,
			html.EscapeString(gfiClaimURL(base, it.FullName)), html.EscapeString(it.FullName), html.EscapeString(it.Tier),
			html.EscapeString(it.URL), it.IssueNo, html.EscapeString(it.Title), it.Score,
			html.EscapeString(gfiStatLine(it.repoCtx())), html.EscapeString(setupURL)))
	}
	text.WriteString(fmt.Sprintf("Browse all good first issues: %s\nUnsubscribe: %s%s", allURL, unsubURL, footText))
	htmlB.WriteString(fmt.Sprintf(`<p style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
<a href="%s" title="Browse all good first issues" style="color:#64748b;">View all good first issues</a> · <a href="%s" title="Unsubscribe from good first issue alerts" style="color:#64748b;">Unsubscribe</a></p>%s</div>`,
		html.EscapeString(allURL), html.EscapeString(unsubURL), footHTML))

	return DigestPayload{Subject: subject, TextBody: text.String(), HTMLBody: htmlB.String()}
}

// buildGFIDigestEmail renders the weekly digest capped at GFIDigestCap items
// with single-use Claim & Setup links (AC5), dedicated bounty section when
// >=1 bounty issue exists (AC7), and CAN-SPAM footer.
func buildGFIDigestEmail(cfg GFIAlertConfig, subscriberID int64, email string, items []gfiDigestItem, claimURLs map[string]string) DigestPayload {
	base := gfiLinks(cfg.BaseURL)
	allURL := base + "/good-first-issue"
	unsubURL := gfiUnsubscribeURL(cfg.BaseURL, cfg.unsubKey(), subscriberID, email)
	footText, footHTML := gfiCANSPAMFooter(cfg.PhysicalAddress)

	subject := fmt.Sprintf("Your weekly good first issues (%d matches)", len(items))

	var bountyItems []gfiDigestItem
	var normalItems []gfiDigestItem
	for _, it := range items {
		if ok, _ := bounty.Detect(it.LabelsJSON); ok {
			bountyItems = append(bountyItems, it)
		} else {
			normalItems = append(normalItems, it)
		}
	}

	var text strings.Builder
	text.WriteString("Newly opened good first issues matching your stack:\n\n")
	var htmlB strings.Builder
	htmlB.WriteString(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
<h2 style="color:#0f172a;">Your weekly good first issues</h2>`)

	if len(bountyItems) > 0 {
		text.WriteString("💰 Cash-Bounty Issues (Bounty-labeled):\n")
		htmlB.WriteString(`<div style="margin-bottom:16px;"><h3 style="color:#15803d;margin:0 0 10px 0;font-size:16px;">💰 Cash-Bounty Issues (Bounty-labeled)</h3>`)
		for i, it := range bountyItems {
			key := fmt.Sprintf("%s:%d", it.RepoID, it.IssueNumber)
			setupURL := claimLinkOr(claimURLs, key, base, it.FullName)
			_, amt := bounty.Detect(it.LabelsJSON)
			badge := "💰 Bounty-labeled"
			if amt != nil {
				badge = fmt.Sprintf("💰 $%.2f Bounty-labeled", *amt)
			}
			text.WriteString(fmt.Sprintf("%d. %s [%s tier | %s] — C-Rank %.1f [%s]\n   #%d %s\n   %s\n   %s\n   Claim & Setup: %s\n\n",
				i+1, it.FullName, it.Tier, it.Language, it.Score, badge, it.IssueNumber, it.Title, it.URL,
				gfiStatLine(it.gfiRepoCtx), setupURL))
			htmlB.WriteString(fmt.Sprintf(`<div style="border:1px solid #86efac;border-radius:8px;padding:14px;margin-bottom:10px;background:#f0fdf4;">
<h3 style="margin:0 0 6px 0;color:#0284c7;"><a href="%s" title="View repository scorecard" style="color:#0284c7;text-decoration:none;">%s</a> <span style="font-size:12px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-weight:bold;">%s</span> <span style="font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">%s Tier</span></h3>
<p style="margin:4px 0;font-size:13px;color:#475569;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="margin:4px 0;font-size:13px;color:#475569;">C-Rank %.1f · %s</p>
<p style="margin:10px 0 2px 0;"><a href="%s" title="Claim and set up this repository" style="background:#15803d;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Claim &amp; Setup →</a></p>
</div>`,
				html.EscapeString(gfiClaimURL(base, it.FullName)), html.EscapeString(it.FullName), html.EscapeString(badge), html.EscapeString(it.Tier),
				html.EscapeString(it.URL), it.IssueNumber, html.EscapeString(it.Title), it.Score,
				html.EscapeString(gfiStatLine(it.gfiRepoCtx)), html.EscapeString(setupURL)))
		}
		htmlB.WriteString(`</div>`)
	}

	for i, it := range normalItems {
		key := fmt.Sprintf("%s:%d", it.RepoID, it.IssueNumber)
		setupURL := claimLinkOr(claimURLs, key, base, it.FullName)
		text.WriteString(fmt.Sprintf("%d. %s [%s tier | %s] — C-Rank %.1f\n   #%d %s\n   %s\n   %s\n   Claim & Setup: %s\n\n",
			i+1, it.FullName, it.Tier, it.Language, it.Score, it.IssueNumber, it.Title, it.URL,
			gfiStatLine(it.gfiRepoCtx), setupURL))
		htmlB.WriteString(fmt.Sprintf(`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px;background:#f8fafc;">
<h3 style="margin:0 0 6px 0;color:#0284c7;"><a href="%s" title="View repository scorecard" style="color:#0284c7;text-decoration:none;">%s</a> <span style="font-size:12px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">%s Tier</span></h3>
<p style="margin:4px 0;font-size:13px;color:#475569;"><a href="%s" title="View good first issue on GitHub" style="color:#10b981;font-weight:bold;">#%d %s</a></p>
<p style="margin:4px 0;font-size:13px;color:#475569;">C-Rank %.1f · %s</p>
<p style="margin:10px 0 2px 0;"><a href="%s" title="Claim and set up this repository" style="background:#0284c7;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Claim &amp; Setup →</a></p>
</div>`,
			html.EscapeString(gfiClaimURL(base, it.FullName)), html.EscapeString(it.FullName), html.EscapeString(it.Tier),
			html.EscapeString(it.URL), it.IssueNumber, html.EscapeString(it.Title), it.Score,
			html.EscapeString(gfiStatLine(it.gfiRepoCtx)), html.EscapeString(setupURL)))
	}
	if len(items) == GFIDigestCap {
		text.WriteString(fmt.Sprintf("Showing top %d by C-Rank. View all: %s\n", GFIDigestCap, allURL))
	}
	text.WriteString(fmt.Sprintf("Unsubscribe: %s%s", unsubURL, footText))
	htmlB.WriteString(fmt.Sprintf(`<p style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
<a href="%s" title="View all good first issues" style="color:#64748b;">View all matches</a> · <a href="%s" title="Unsubscribe from good first issue digests" style="color:#64748b;">Unsubscribe</a></p>%s</div>`,
		html.EscapeString(allURL), html.EscapeString(unsubURL), footHTML))

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

// DispatchSniperWebhooks triggers real-time Discord & Webhook alerts for active sniper subscriptions
func DispatchSniperWebhooks(ctx context.Context, db *sqlx.DB, repo gfiRepoCtx, issueNumber int, title, url string) {
	if db == nil {
		return
	}
	var snipers []struct {
		ID         int64  `db:"id"`
		UserID     *int64 `db:"user_id"`
		LangsJSON  string `db:"languages_json"`
		Channel    string `db:"channel"`
		WebhookURL string `db:"webhook_url"`
		Frequency  string `db:"frequency"`
	}

	query := `
		SELECT id, user_id, languages_json, channel, webhook_url, frequency
		FROM user_sniper_subscriptions
		WHERE is_active = TRUE AND webhook_url != ''
	`
	if err := db.SelectContext(ctx, &snipers, query); err != nil || len(snipers) == 0 {
		return
	}

	repoLang := strings.ToLower(strings.TrimSpace(repo.Language))
	msg := fmt.Sprintf("🎯 **[GetMerged Sniper Alert]**\nFresh Good First Issue in **%s** (%s):\n#%d - *%s*\nTurnaround: **~%.1fh** (Tier %s)\nLink: %s",
		repo.FullName, repo.Language, issueNumber, title, repo.ResponseP50Hours, repo.Tier, url)

	client := &http.Client{Timeout: 8 * time.Second}

	for _, s := range snipers {
		if s.Frequency != "instant" && s.Frequency != "" {
			continue
		}
		var langs []string
		_ = json.Unmarshal([]byte(s.LangsJSON), &langs)
		matched := len(langs) == 0
		for _, l := range langs {
			if strings.EqualFold(l, repoLang) || strings.EqualFold(l, "all") {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}

		go func(targetURL, ch string) {
			var payload any
			if strings.Contains(targetURL, "discord.com") || ch == "discord" {
				p, err := BuildDiscordPayload(msg)
				if err != nil {
					return
				}
				payload = p
			} else {
				payload = BuildSlackPayload(msg)
			}
			body, _ := json.Marshal(payload)
			req, err := http.NewRequestWithContext(context.Background(), "POST", targetURL, strings.NewReader(string(body)))
			if err != nil {
				return
			}
			req.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(req)
			if err == nil && resp != nil {
				_ = resp.Body.Close()
			}
		}(s.WebhookURL, s.Channel)
	}
}

