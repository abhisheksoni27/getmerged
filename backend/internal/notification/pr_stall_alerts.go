package notification

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/jmoiron/sqlx"
	"golang.org/x/time/rate"
)

const (
	// PRStallMaxAttempts bounds total delivery attempts (initial + exactly one
	// retry, AC7) before the alert row is dead-lettered — never silently
	// dropped.
	PRStallMaxAttempts = 2
	// PRStallRetryDelay gates the single delivery retry after the first
	// failure (AC7): the cron's next cycle always lands past this gate.
	PRStallRetryDelay = 60 * time.Second
	// PRStallBatchCap is the per-run drain ceiling, oldest first;
	// overflow rows stay 'pending' and are picked up by the next run.
	PRStallBatchCap = 50
	// PRStallMinReviewSamples is the completed-review-sample floor for a repo
	// p75 (AC2): below it the 24h fallback threshold applies.
	PRStallMinReviewSamples = 5
	// PRStallFallbackP75Hours is the 24h stall threshold used when a repo has
	// fewer than PRStallMinReviewSamples merged-PR samples (AC2).
	PRStallFallbackP75Hours = 24.0
	// PRStallSuggestionCount is the exact number of discovery picks per alert
	// (AC4); padded from the global top-C-Rank pool when needed.
	PRStallSuggestionCount = 3
	// PRStallDefaultRPS is the pre-send read token-bucket refill rate (AC2).
	PRStallDefaultRPS = 1.0
	// PRStallDefaultBudget caps pre-send GitHub reads per sweep (AC2);
	// overflow candidates are deferred to the next cycle, never dropped.
	PRStallDefaultBudget = 200
	// PRStallDigestMaxItems caps how many stalled PRs one digest lists;
	// overflow stays pending for the next run.
	PRStallDigestMaxItems = 10
	// PRStallWebhookMaxChars caps the Slack/Discord message size (Discord
	// rejects content >2000 chars).
	PRStallWebhookMaxChars = 1900
	// PRStallWebhookMaxAttempts bounds best-effort Slack/Discord delivery
	// (AC4): at most 3 tries with exponential backoff, then the channel is
	// marked delivered=false and logged — the alert never re-fires either way.
	PRStallWebhookMaxAttempts = 3
	// PRStallWebhookBackoff is the exponential-backoff base between webhook
	// retries (AC4).
	PRStallWebhookBackoff = time.Second
	prStallLockName       = "pr_stall_alert_sweep"
)

// Review-event vocabulary (AC1): every accepted event restarts the stall
// episode at its timestamp; close->reopen and draft->ready are delivered as
// fresh review_requested events by sync — no special cases downstream.
const (
	PRReviewEventRequested = "review_requested"
	PRReviewEventSubmitted = "review_submitted"
	PRReviewEventComment   = "comment"
	PRReviewEventForcePush = "force_push"
	PRReviewEventClosed    = "closed"
)

// errPRStallDefer signals a candidate that must be deferred to the next
// sweep without any status change or retry accounting (AC2).
var errPRStallDefer = errors.New("pr-stall: deferred to next cycle")

// PRReviewEvent is one lifecycle event that can restart a stall episode.
type PRReviewEvent struct {
	PRID         string // e.g. "acme/widget#11"
	UserID       int64
	RepositoryID string
	EventType    string // one of the PRReviewEvent* constants
	EventID      string // caller-assigned stable id; deduped per PR
	OccurredAt   time.Time
}

// IngestPRReviewEvents implements AC1/AC2 event ingestion: events are applied
// oldest-first inside one transaction; duplicates are idempotent by
// (pr_id, event_id); any event older than (or equal to) the PR's current
// episode start is dropped (monotonic guard); an accepted event restarts the
// episode at its timestamp and clears the episode's alert flag so the next
// threshold crossing may fire again. Returns the number of accepted events.
func IngestPRReviewEvents(ctx context.Context, db *sqlx.DB, events []PRReviewEvent) (int, error) {
	if len(events) == 0 {
		return 0, nil
	}
	ordered := make([]PRReviewEvent, len(events))
	copy(ordered, events)
	// Single ordered rule (AC1): apply oldest-first so a batch replays history.
	sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].OccurredAt.Before(ordered[j].OccurredAt) })

	tx, err := db.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	ignoreClause := " OR IGNORE"
	if db.DriverName() != "sqlite" {
		ignoreClause = " IGNORE"
	}
	now := time.Now().UTC()
	accepted := 0
	for _, ev := range ordered {
		ts := ev.OccurredAt.UTC().Truncate(time.Second)
		if ev.PRID == "" || ev.EventID == "" || ts.IsZero() {
			continue
		}
		ins, err := tx.ExecContext(ctx,
			"INSERT"+ignoreClause+" INTO pr_review_events (pr_id, event_id, event_type, occurred_at) VALUES (?, ?, ?, ?)",
			ev.PRID, ev.EventID, ev.EventType, ts)
		if err != nil {
			return accepted, fmt.Errorf("pr-stall: insert review event: %w", err)
		}
		if n, _ := ins.RowsAffected(); n == 0 {
			continue // duplicate (pr_id, event_id): already ingested (AC2)
		}
		var cur sql.NullTime
		err = tx.GetContext(ctx, &cur, `SELECT episode_start FROM pr_stall_state WHERE pr_id = ?`, ev.PRID)
		if err == nil && cur.Valid && !ts.After(cur.Time.Truncate(time.Second)) {
			continue // older than current episode start: monotonic drop (AC2)
		}
		upd, err := tx.ExecContext(ctx,
			`UPDATE pr_stall_state SET user_id=?, repository_id=?, episode_start=?, alerted_at=NULL, updated_at=?
			  WHERE pr_id=? AND (episode_start IS NULL OR episode_start < ?)`,
			ev.UserID, ev.RepositoryID, ts, now, ev.PRID, ts)
		if err != nil {
			return accepted, fmt.Errorf("pr-stall: restart episode: %w", err)
		}
		if n, _ := upd.RowsAffected(); n > 0 {
			accepted++
			continue
		}
		insState, err := tx.ExecContext(ctx,
			"INSERT"+ignoreClause+" INTO pr_stall_state (pr_id, user_id, repository_id, last_crossed_at, below_p50_since, episode_start, alerted_at, updated_at) VALUES (?, ?, ?, NULL, NULL, ?, NULL, ?)",
			ev.PRID, ev.UserID, ev.RepositoryID, ts, now)
		if err != nil {
			return accepted, fmt.Errorf("pr-stall: create episode: %w", err)
		}
		if n, _ := insState.RowsAffected(); n > 0 {
			accepted++
			continue
		}
		// Lost a race against a newer event: re-check under this transaction.
		var latest sql.NullTime
		if err := tx.GetContext(ctx, &latest, `SELECT episode_start FROM pr_stall_state WHERE pr_id = ?`, ev.PRID); err != nil ||
			(latest.Valid && !ts.After(latest.Time.Truncate(time.Second))) {
			continue
		}
		accepted++
	}
	return accepted, tx.Commit()
}

// PRStallAlertConfig carries the dependencies of one stall-alert sweep.
type PRStallAlertConfig struct {
	Mailer  DigestMailer
	BaseURL string

	// WebhookClient posts to the user's configured Slack/Discord channels;
	// nil falls back to http.DefaultClient.
	WebhookClient *http.Client

	// EncryptionKey decrypts stored webhook URLs; empty disables the
	// webhook channel (webhooks-only users then dead-letter per AC7).
	EncryptionKey []byte

	// GitHubToken enables the pre-send fresh-read lifecycle guard (AC2);
	// empty falls back to local-snapshot staleness checks only.
	GitHubToken string
	// GitHubAPIBase overrides the REST root (tests); empty = api.github.com.
	GitHubAPIBase string
	// PreSendRPS is the shared token-bucket refill for pre-send reads
	// (AC2); <=0 means the 1 req/s default.
	PreSendRPS float64
	// PreSendBudget caps pre-send reads per sweep (AC2); <=0 means the
	// default budget. Exhausted budget defers remaining candidates.
	PreSendBudget int
	// WebhookRetryBackoff is the exponential-backoff base between best-effort
	// Slack/Discord retries (AC4); <=0 means 1s.
	WebhookRetryBackoff time.Duration
}

// PRStallSummary reports one sweep's outcome.
type PRStallSummary struct {
	Evaluated           int `json:"evaluated"`
	InsufficientSamples int `json:"insufficient_samples_repos"`
	DraftSkipped        int `json:"draft_skipped"`
	Queued              int `json:"queued"`
	Drained             int `json:"drained"`
	Sent                int `json:"sent"`
	Retrying            int `json:"retrying"`
	Failed              int `json:"failed"`
	StaleSkipped        int `json:"stale_skipped"`
	Deferred            int `json:"deferred"`
}

// PRStallSuggestion is one same-language repo with a better C-Rank (AC6).
type PRStallSuggestion struct {
	FullName string  `json:"full_name"`
	URL      string  `json:"url"`
	Score    float64 `json:"c_rank_score"`
	Tier     string  `json:"c_rank_tier"`
}

// PRStallPayload is the rendered alert body snapshotted at enqueue time:
// insert-first in a transaction, delivered after commit (AC3).
type PRStallPayload struct {
	FullName     string              `json:"full_name"`
	Title        string              `json:"title"`
	DeepLink     string              `json:"deep_link"`
	NudgeComment string              `json:"nudge_comment"`
	Reviewers    []string            `json:"reviewers,omitempty"`
	HoursWaiting float64             `json:"hours_waiting"`
	P75Hours     float64             `json:"p75_hours"`
	Suggestions  []PRStallSuggestion `json:"suggestions"`
}

type prStallCandidate struct {
	PRID         string     `db:"pr_id"`
	UserID       int64      `db:"user_id"`
	RepositoryID string     `db:"repository_id"`
	FullName     string     `db:"full_name"`
	Language     string     `db:"language"`
	CRankScore   float64    `db:"c_rank_score"`
	PRNumber     int        `db:"pr_number"`
	Title        string     `db:"title"`
	HTMLURL      string     `db:"html_url"`
	PRCreatedAt  *time.Time `db:"pr_created_at"`
	ReadyAt      *time.Time `db:"ready_for_review_at"`
	IsDraft      bool       `db:"is_draft"`
	ReviewersRaw string     `db:"reviewers_json"`
}

type prStallQueueRow struct {
	ID      int64  `db:"id"`
	UserID  int64  `db:"user_id"`
	PRID    string `db:"pr_id"`
	Payload []byte `db:"payload"`
}

// RunPRStallAlerts evaluates every tracked open PR against its repo's merged
// p75 wait over its current review-event episode (one alert per episode,
// restarted by accepted review events), then drains pending alerts as one
// digest per user. One advisory lock serializes overlapping cron runs (AC2).
func RunPRStallAlerts(ctx context.Context, db *sqlx.DB, cfg PRStallAlertConfig) (*PRStallSummary, error) {
	release, ok := TryJobLock(ctx, db, prStallLockName, 10*time.Minute)
	if !ok {
		return &PRStallSummary{}, nil
	}
	defer release()

	summary := &PRStallSummary{}
	if err := EvaluatePRStallAlerts(ctx, db, cfg, summary); err != nil {
		return summary, err
	}
	if err := ProcessPRStallAlerts(ctx, db, cfg, summary); err != nil {
		return summary, err
	}
	return summary, nil
}

// EvaluatePRStallAlerts implements AC1/AC3: every tracked open PR's wait is
// measured from its current stall episode start (the most recent accepted
// review event; bootstrap anchor is ready_for_review_at, else opened_at) and
// compared against its repo's merged p75 wait — or the 24h fallback when the
// repo has fewer than 5 completed review samples (AC2). An alert fires only
// when the PR is open at dispatch time (checked
// again in ProcessPRStallAlerts), the wait has reached p75 and no alert has
// fired yet in the current episode. The claim — pin episode_start + flip
// alerted_at under a last-alerted-at guard inside the enqueue transaction —
// is atomic per PR (AC2), so concurrent sweeps queue exactly once.
func EvaluatePRStallAlerts(ctx context.Context, db *sqlx.DB, cfg PRStallAlertConfig, summary *PRStallSummary) error {
	var candidates []prStallCandidate
	err := db.SelectContext(ctx, &candidates, `
		SELECT ps.pr_id, ps.user_id, ps.repository_id, r.full_name,
		       COALESCE(r.language,'') AS language,
		       COALESCE(ls.c_rank_score,0) AS c_rank_score,
		       ps.pr_number, COALESCE(ps.title,'') AS title,
		       COALESCE(ps.html_url,'') AS html_url, ps.pr_created_at,
		       ps.ready_for_review_at, COALESCE(ps.is_draft,FALSE) AS is_draft,
		       COALESCE(ps.requested_reviewers,'') AS reviewers_json
		FROM (
			SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots GROUP BY pr_id
		) t
		JOIN pr_snapshots ps ON ps.pr_id = t.pr_id AND ps.snapshot_at = t.ms
		JOIN repositories r ON r.id = ps.repository_id
		JOIN latest_snapshots ls ON ls.repository_id = ps.repository_id
		WHERE ps.state = 'open' AND ps.pr_created_at IS NOT NULL
		  AND ls.c_rank_tier IN ('S','A','B','C')`)
	if err != nil {
		return fmt.Errorf("pr-stall: list open PRs: %w", err)
	}
	summary.Evaluated += len(candidates)

	now := time.Now().UTC().Truncate(time.Second)

	type fire struct {
		cand         prStallCandidate
		p75          float64
		waiting      float64
		episodeStart time.Time
	}
	var fires []fire

	pctCache := map[string]float64{}
	for _, cand := range candidates {
		// AC4: draft flag or WIP/Draft-style titles never alert.
		if cand.IsDraft || isWIPTitle(cand.Title) {
			summary.DraftSkipped++
			continue
		}
		p75, ok := pctCache[cand.RepositoryID]
		if !ok {
			hours, n := mergedReviewHours(ctx, db, cand.RepositoryID)
			if n >= PRStallMinReviewSamples {
				p75 = percentile(hours, 0.75)
				slog.Debug("pr-stall: repo percentile computed", "repo_id", cand.RepositoryID, "p75_hours", p75, "merged_prs", n)
			} else {
				// AC2: <5 completed review samples -> 24h fallback threshold
				// ('insufficient_samples' still logged for visibility).
				p75 = PRStallFallbackP75Hours
				summary.InsufficientSamples++
				slog.Warn("insufficient_samples",
					"repo_id", cand.RepositoryID, "full_name", cand.FullName,
					"samples", n, "required", PRStallMinReviewSamples,
					"fallback_threshold_hours", PRStallFallbackP75Hours)
			}
			pctCache[cand.RepositoryID] = p75
		}
		// Episode clock (AC1): most recent accepted review event wins;
		// bootstrap at the ready_for_review instant when a draft->ready
		// transition exists, else at opened_at; UTC second precision.
		st := loadPRStallState(ctx, db, cand.PRID)
		var anchor time.Time
		switch {
		case st != nil && st.EpisodeStart != nil:
			anchor = st.EpisodeStart.Truncate(time.Second)
		case cand.ReadyAt != nil:
			anchor = cand.ReadyAt.UTC().Truncate(time.Second)
		default:
			anchor = cand.PRCreatedAt.UTC().Truncate(time.Second)
		}
		if anchor.IsZero() {
			continue
		}
		// AC3: time-in-review = hours since last reviewer activity on the PR (clock resets on push/re-request).
		waiting := now.Sub(anchor).Hours()
		if waiting >= p75 { // AC2: fire at max(repo_p75, 24h fallback)
			fires = append(fires, fire{cand: cand, p75: p75, waiting: waiting, episodeStart: anchor})
		}
	}
	if len(fires) == 0 {
		return nil
	}

	reviewersByCand := map[string][]string{}
	for _, f := range fires {
		reviewersByCand[f.cand.PRID] = parseReviewerJSON(f.cand.ReviewersRaw)
	}

	// Suggestions resolve before the insert transaction opens so the tx never
	// nests queries (deadlocks single-connection SQLite pools).
	type rendered struct {
		fire    fire
		payload PRStallPayload
	}
	renderedFires := make([]rendered, 0, len(fires))
	for _, f := range fires {
		renderedFires = append(renderedFires, rendered{
			fire: f,
			payload: PRStallPayload{
				FullName:     f.cand.FullName,
				Title:        f.cand.Title,
				DeepLink:     PRDeepLink(f.cand.FullName, f.cand.PRNumber, f.cand.HTMLURL),
				NudgeComment: reviewerNudgeComment(f.cand.PRNumber, reviewersByCand[f.cand.PRID], f.waiting, f.p75),
				Reviewers:    reviewersByCand[f.cand.PRID],
				HoursWaiting: f.waiting,
				P75Hours:     f.p75,
				Suggestions:  stallSuggestions(ctx, db, f.cand.RepositoryID, f.cand.Language, f.cand.CRankScore),
			},
		})
	}

	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	ignoreClause := " OR IGNORE"
	if db.DriverName() != "sqlite" {
		ignoreClause = " IGNORE"
	}

	for _, f := range renderedFires {
		body, err := json.Marshal(f.payload)
		if err != nil {
			return fmt.Errorf("pr-stall: marshal payload: %w", err)
		}
		// AC2/AC3 claim, all inside this transaction: pin/advance the
		// episode monotonically, then flip alerted_at only if this episode
		// has not alerted yet. Zero rows anywhere => lost race or already
		// alerted in the current episode -> skip silently.
		pin, err := tx.ExecContext(ctx,
			`UPDATE pr_stall_state SET user_id=?, repository_id=?, episode_start=?, updated_at=?
			  WHERE pr_id=? AND (episode_start IS NULL OR episode_start < ?)`,
			f.fire.cand.UserID, f.fire.cand.RepositoryID, f.fire.episodeStart, now, f.fire.cand.PRID, f.fire.episodeStart)
		if err != nil {
			return fmt.Errorf("pr-stall: pin episode: %w", err)
		}
		if n, _ := pin.RowsAffected(); n == 0 {
			var cur sql.NullTime
			err := tx.GetContext(ctx, &cur, `SELECT episode_start FROM pr_stall_state WHERE pr_id = ?`, f.fire.cand.PRID)
			switch {
			case err != nil: // no state row yet: create it
				insQ := "INSERT" + ignoreClause + ` INTO pr_stall_state (pr_id, user_id, repository_id, last_crossed_at, below_p50_since, episode_start, alerted_at, updated_at)
					VALUES (?, ?, ?, NULL, NULL, ?, NULL, ?)`
				insRes, err := tx.ExecContext(ctx, insQ, f.fire.cand.PRID, f.fire.cand.UserID, f.fire.cand.RepositoryID, f.fire.episodeStart, now)
				if err != nil {
					return fmt.Errorf("pr-stall: create episode: %w", err)
				}
				if n, _ := insRes.RowsAffected(); n == 0 {
					continue // concurrent creation won; next sweep re-evaluates
				}
			case !cur.Valid:
				continue // inconsistent row; next sweep re-evaluates
			case !cur.Time.Truncate(time.Second).Equal(f.fire.episodeStart):
				continue // episode moved on (reset event): stale fire
			}
		}
		// AC2 last-alerted-at check + AC3 atomic persistence of
		// (alerted_at, episode_start) with the enqueue below.
		flip, err := tx.ExecContext(ctx,
			`UPDATE pr_stall_state SET alerted_at=?, updated_at=? WHERE pr_id=? AND episode_start=? AND alerted_at IS NULL`,
			now, now, f.fire.cand.PRID, f.fire.episodeStart)
		if err != nil {
			return fmt.Errorf("pr-stall: alert-flag flip: %w", err)
		}
		if n, _ := flip.RowsAffected(); n == 0 {
			continue // already alerted in the current episode (AC3)
		}
		// AC3 gate: unique (pr_id, last_crossed_at) on alerts_sent; insert
		// success is the sole permission to send.
		gateQ := "INSERT" + ignoreClause + " INTO alerts_sent (pr_id, last_crossed_at, user_id, repository_id, created_at) VALUES (?, ?, ?, ?, ?)"
		gateRes, err := tx.ExecContext(ctx, gateQ,
			f.fire.cand.PRID, f.fire.episodeStart, f.fire.cand.UserID, f.fire.cand.RepositoryID, now)
		if err != nil {
			return fmt.Errorf("pr-stall: insert alerts_sent gate: %w", err)
		}
		if n, _ := gateRes.RowsAffected(); n == 0 {
			continue // episode already alerted
		}
		insertQ := "INSERT" + ignoreClause + ` INTO pr_stall_alerts (pr_id, user_id, repository_id, stall_epoch_bucket, status, attempts, payload, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`
		res, err := tx.ExecContext(ctx, insertQ,
			f.fire.cand.PRID, f.fire.cand.UserID, f.fire.cand.RepositoryID, f.fire.episodeStart.Unix(), string(body), now, now)
		if err != nil {
			return fmt.Errorf("pr-stall: insert alert: %w", err)
		}
		if n, _ := res.RowsAffected(); n > 0 {
			summary.Queued++

			// In-App Notification Center: emit PR milestone/stall alert
			notifTitle := fmt.Sprintf("PR Review Update: %s", f.fire.cand.PRID)
			notifMsg := fmt.Sprintf("Your pull request %s has crossed the maintainer response threshold.", f.fire.cand.PRID)
			notifLink := "/dashboard"
			go WriteNotification(db, f.fire.cand.UserID, CategoryPR, NotificationPayload{Title: notifTitle, Message: notifMsg, LinkURL: notifLink})
		}
	}
	// AC3: send only after commit — a crash here leaves clean pending rows.
	return tx.Commit()
}

// ProcessPRStallAlerts drains due pending rows oldest first (batch cap),
// groups them into ONE digest per user per run listing up to
// PRStallDigestMaxItems stalled PRs, and delivers via email plus each
// configured Slack/Discord webhook with a size-capped payload. Before
// dispatch every row gets a fresh GitHub lifecycle read (AC2): a PR that
// closed/merged or converted back to draft since the last poll is marked
// 'stale' and skipped; pre-send reads share a token bucket (default 1 req/s)
// with exponential backoff on 403/429, and an exhausted budget defers the
// remaining candidates to the next cycle without dropping them. Without a
// configured token the local snapshot is used as the staleness source. Each
// row is one attempt across all channels: any channel success marks it sent;
// on total failure the error lands in alerts_failed (AC7) and the row is
// retried exactly once next cycle before being dead-lettered.
func ProcessPRStallAlerts(ctx context.Context, db *sqlx.DB, cfg PRStallAlertConfig, summary *PRStallSummary) error {
	now := time.Now().UTC()
	var rows []prStallQueueRow
	if err := db.SelectContext(ctx, &rows, `
		SELECT id, user_id, pr_id, payload FROM pr_stall_alerts
		WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
		ORDER BY created_at ASC LIMIT ?`, now, PRStallBatchCap); err != nil {
		return fmt.Errorf("pr-stall: load pending: %w", err)
	}

	gh := newPRStallGitHub(cfg)

	// Per-user digest buckets; overflow beyond PRStallDigestMaxItems stays
	// pending for the next run.
	type item struct {
		rowID   int64
		userID  int64
		prID    string
		payload PRStallPayload
	}
	perUser := map[int64][]item{}
	for _, row := range rows {
		var payload PRStallPayload
		if err := json.Unmarshal(row.Payload, &payload); err != nil {
			markPRStall(ctx, db, row.ID, "failed", "corrupt payload")
			if summary != nil {
				summary.Drained++
				summary.Failed++
			}
			continue
		}

		// AC2: pre-send fresh lifecycle read when credentials allow.
		if gh != nil {
			live, err := gh.fetch(ctx, payload.FullName, pullNumberFromLink(payload.DeepLink))
			if err != nil {
				// Budget exhausted / rate-limited / transport trouble:
				// defer the candidate untouched to the next cycle (AC2).
				if summary != nil {
					summary.Deferred++
				}
				slog.Warn("pr-stall: pre-send read deferred", "pr_id", row.PRID, "err", err)
				continue
			}
			if live.Closed || live.Merged || live.Draft {
				reason := "closed_or_merged"
				if !live.Closed && !live.Merged {
					reason = "converted_to_draft"
				}
				markPRStall(ctx, db, row.ID, "stale", reason)
				deletePRStallState(ctx, db, row.PRID)
				if summary != nil {
					summary.Drained++
					summary.StaleSkipped++
				}
				continue
			}
		} else {
			// Fallback staleness guard from the newest local snapshot.
			var state string
			_ = db.GetContext(ctx, &state,
				`SELECT state FROM pr_snapshots WHERE pr_id = ? ORDER BY snapshot_at DESC LIMIT 1`, row.PRID)
			if state != "" && state != "open" {
				markPRStall(ctx, db, row.ID, "stale", "")
				deletePRStallState(ctx, db, row.PRID)
				if summary != nil {
					summary.Drained++
					summary.StaleSkipped++
				}
				continue
			}
		}
		perUser[row.UserID] = append(perUser[row.UserID], item{rowID: row.ID, userID: row.UserID, prID: row.PRID, payload: payload})
	}

	client := cfg.WebhookClient
	if client == nil {
		client = http.DefaultClient
	}

	userIDs := make([]int64, 0, len(perUser))
	for uid := range perUser {
		userIDs = append(userIDs, uid)
	}
	sort.Slice(userIDs, func(i, j int) bool { return userIDs[i] < userIDs[j] })

	for _, uid := range userIDs {
		items := perUser[uid]
		if summary != nil {
			summary.Drained += len(items)
		}
		if len(items) > PRStallDigestMaxItems {
			slog.Info("pr-stall: digest capped, overflow stays pending",
				"user_id", uid, "listed", PRStallDigestMaxItems, "overflow", len(items)-PRStallDigestMaxItems)
			if summary != nil {
				summary.Drained -= len(items) - PRStallDigestMaxItems
			}
			items = items[:PRStallDigestMaxItems]
		}
		payloads := make([]PRStallPayload, len(items))
		rowIDs := make([]int64, len(items))
		prIDs := make([]string, len(items))
		for i, it := range items {
			payloads[i] = it.payload
			rowIDs[i] = it.rowID
			prIDs[i] = it.prID
		}

		email := ""
		_ = db.GetContext(ctx, &email, `SELECT COALESCE(email,'') FROM users WHERE id = ?`, uid)
		channels := prStallWebhookChannels(ctx, db, uid)

		// No channel at all: flag immediately so the gap is visible (AC7).
		if email == "" && len(channels) == 0 {
			for i, id := range rowIDs {
				markPRStall(ctx, db, id, "failed", "no channel configured")
				recordPRStallFailure(ctx, db, prIDs[i], uid, "", "no channel configured", true)
			}
			if summary != nil {
				summary.Failed += len(rowIDs)
			}
			slog.Error("pr-stall: alert has no delivery channel", "user_id", uid, "rows", rowIDs)
			continue
		}

		text := BuildPRStallDigestText(payloads, cfg.BaseURL)
		delivered := false
		var errs []string
		if cfg.Mailer != nil && email != "" {
			subject := fmt.Sprintf("%d of your PRs are stalled in review — nudge templates inside", len(payloads))
			if err := cfg.Mailer.Send(ctx, email, subject, text, "<pre style=\"white-space:pre-wrap\">"+text+"</pre>"); err != nil {
				errs = append(errs, "email: "+err.Error())
			} else {
				delivered = true
			}
		}
		webhookText := capWebhookText(text)
		backoff := cfg.WebhookRetryBackoff
		if backoff <= 0 {
			backoff = PRStallWebhookBackoff
		}
		for _, ch := range channels {
			url, err := crypto.DecryptAESGCM(ch.URLEnc, cfg.EncryptionKey)
			if err != nil || !ValidWebhookLabel(NormalizeWebhookLabel(ch.Label)) {
				errs = append(errs, fmt.Sprintf("webhook %d: undecryptable", ch.ID))
				continue
			}
			// AC4: Slack/Discord are best-effort — at most 3 attempts with
			// exponential backoff; then the channel is marked delivered=false
			// and logged. The alert never re-fires within the episode either
			// way (alerted_at stays set regardless of channel outcomes).
			var werr error
			for attempt := 0; attempt < PRStallWebhookMaxAttempts; attempt++ {
				werr = deliverWebhook(ctx, client, NormalizeWebhookLabel(ch.Label), url, WebhookMessage{Text: webhookText})
				if werr == nil {
					break
				}
				if attempt == PRStallWebhookMaxAttempts-1 {
					break
				}
				select {
				case <-ctx.Done():
				case <-time.After(backoff):
				}
				backoff *= 2
			}
			if werr != nil {
				errs = append(errs, fmt.Sprintf("webhook %d: %v", ch.ID, werr))
				slog.Warn("pr-stall: webhook delivery failed after retries",
					"webhook_id", ch.ID, "label", ch.Label, "attempts", PRStallWebhookMaxAttempts, "err", werr)
			} else {
				delivered = true
			}
		}

		if delivered {
			for _, id := range rowIDs {
				markPRStall(ctx, db, id, "sent", "")
			}
			if summary != nil {
				summary.Sent += len(rowIDs)
			}
			continue
		}
		lastErr := strings.Join(errs, "; ")
		for i, id := range rowIDs {
			var attempts int
			_ = db.GetContext(ctx, &attempts, `SELECT attempts FROM pr_stall_alerts WHERE id = ?`, id)
			attempts++ // this attempt just failed
			if attempts >= PRStallMaxAttempts {
				// AC7 final failure: dead-letter the row with the error and
				// final retry_count in alerts_failed — visible, never a
				// silent drop.
				markPRStallWithAttempts(ctx, db, id, "failed", lastErr, attempts)
				recordPRStallFailure(ctx, db, prIDs[i], uid, "", lastErr, true)
				if summary != nil {
					summary.Failed++
				}
				slog.Error("pr-stall: alert delivery failed after single retry",
					"row_id", id, "attempts", attempts, "err", lastErr)
				continue
			}
			// AC7 first failure: log to alerts_failed (retry) and schedule
			// the single retry for the next cycle.
			markPRStallRetry(ctx, db, id, lastErr, attempts, now.Add(PRStallRetryDelay))
			recordPRStallFailure(ctx, db, prIDs[i], uid, "", lastErr, false)
			if summary != nil {
				summary.Retrying++
			}
		}
	}
	return nil
}

// mergedReviewHours returns time-to-merge hours for the repo's MERGED PRs
// only (AC2) plus the sample count, computed driver-portably in Go.
func mergedReviewHours(ctx context.Context, db *sqlx.DB, repoID string) ([]float64, int) {
	var rows []struct {
		PRCreatedAt *time.Time `db:"pr_created_at"`
		MergedAt    *time.Time `db:"merged_at"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT pr_created_at, merged_at FROM pr_snapshots
		WHERE repository_id = ? AND state = 'merged'
		  AND merged_at IS NOT NULL AND pr_created_at IS NOT NULL
		ORDER BY snapshot_at DESC LIMIT 500`, repoID); err != nil {
		slog.Warn("pr-stall: merged history query failed", "repo_id", repoID, "err", err)
		return nil, 0
	}
	hours := make([]float64, 0, len(rows))
	for _, r := range rows {
		if r.PRCreatedAt == nil || r.MergedAt == nil {
			continue
		}
		h := r.MergedAt.Sub(*r.PRCreatedAt).Hours()
		if h >= 0 {
			hours = append(hours, h)
		}
	}
	return hours, len(hours)
}

// percentile returns the nearest-rank p-th percentile of a sorted copy.
func percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)
	idx := int(math.Ceil(p*float64(len(sorted)))) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

// stallSuggestions returns exactly PRStallSuggestionCount discovery picks
// (AC4): same-language repos with a strictly better C-Rank score first, then
// padded deterministically from the global top-C-Rank pool (never including
// the stalled PR's own repo or duplicates).
func stallSuggestions(ctx context.Context, db *sqlx.DB, repoID, language string, score float64) []PRStallSuggestion {
	type row struct {
		FullName  string  `db:"full_name"`
		GithubURL *string `db:"github_url"`
		Score     float64 `db:"c_rank_score"`
		Tier      string  `db:"c_rank_tier"`
	}
	picked := map[string]bool{repoID: true}
	out := make([]PRStallSuggestion, 0, PRStallSuggestionCount)
	appendRows := func(rows []row) {
		for _, r := range rows {
			if len(out) == PRStallSuggestionCount {
				return
			}
			if r.FullName == "" || picked[r.FullName] {
				continue
			}
			picked[r.FullName] = true
			out = append(out, PRStallSuggestion{
				FullName: r.FullName,
				URL:      deepLinkOf("", r.FullName),
				Score:    r.Score,
				Tier:     r.Tier,
			})
		}
	}
	language = strings.TrimSpace(language)
	if language != "" {
		var rows []row
		if err := db.SelectContext(ctx, &rows, `
			SELECT r.full_name, r.github_url,
			       COALESCE(ls.c_rank_score,0) AS c_rank_score,
			       COALESCE(ls.c_rank_tier,'') AS c_rank_tier
			FROM repositories r
			JOIN latest_snapshots ls ON ls.repository_id = r.id
			WHERE TRIM(COALESCE(r.language,'')) = ? AND r.id != ?
			  AND COALESCE(ls.c_rank_score,0) > ?
			ORDER BY ls.c_rank_score DESC, r.full_name ASC LIMIT ?`,
			language, repoID, score, PRStallSuggestionCount); err != nil {
			slog.Warn("pr-stall: suggestion query failed", "language", language, "err", err)
		} else {
			appendRows(rows)
		}
	}
	// AC4 padding: global top-C-Rank pool when <3 same-language repos qualify.
	if len(out) < PRStallSuggestionCount {
		var rows []row
		if err := db.SelectContext(ctx, &rows, `
			SELECT r.full_name, r.github_url,
			       COALESCE(ls.c_rank_score,0) AS c_rank_score,
			       COALESCE(ls.c_rank_tier,'') AS c_rank_tier
			FROM repositories r
			JOIN latest_snapshots ls ON ls.repository_id = r.id
			WHERE r.id != ?
			ORDER BY ls.c_rank_score DESC, r.full_name ASC LIMIT 25`, repoID); err != nil {
			slog.Warn("pr-stall: suggestion padding query failed", "err", err)
		} else {
			appendRows(rows)
		}
	}
	return out
}

type prStallWebhookChannel struct {
	ID     int64  `db:"id"`
	UserID int64  `db:"user_id"`
	Label  string `db:"label"`
	URLEnc string `db:"url_enc"`
}

func prStallWebhookChannels(ctx context.Context, db *sqlx.DB, userID int64) []prStallWebhookChannel {
	var channels []prStallWebhookChannel
	if err := db.SelectContext(ctx, &channels,
		`SELECT id, user_id, label, url_enc FROM user_webhooks WHERE user_id = ? AND enabled = TRUE`, userID); err != nil {
		return nil
	}
	return channels
}

func markPRStall(ctx context.Context, db *sqlx.DB, id int64, status, lastErr string) {
	_, _ = db.ExecContext(ctx,
		`UPDATE pr_stall_alerts SET status=?, last_error=?, sent_at=CASE WHEN ?='sent' THEN CURRENT_TIMESTAMP ELSE sent_at END, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'`,
		status, lastErr, status, id)
}

func markPRStallWithAttempts(ctx context.Context, db *sqlx.DB, id int64, status, lastErr string, attempts int) {
	_, _ = db.ExecContext(ctx,
		`UPDATE pr_stall_alerts SET status=?, last_error=?, attempts=?, sent_at=CASE WHEN ?='sent' THEN CURRENT_TIMESTAMP ELSE sent_at END, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'`,
		status, lastErr, attempts, status, id)
}

// markPRStallRetry keeps the row pending but gates the single retry until
// nextDue (AC7).
func markPRStallRetry(ctx context.Context, db *sqlx.DB, id int64, lastErr string, attempts int, nextDue time.Time) {
	_, _ = db.ExecContext(ctx,
		`UPDATE pr_stall_alerts SET status='pending', last_error=?, attempts=?, next_attempt_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'`,
		lastErr, attempts, nextDue, id)
}

// --- AC1/AC3 stall episode state -------------------------------------------

// prStallEpisode is the per-PR episode state: episode_start is the most
// recent accepted review-event instant (AC1); alerted_at pins the alert
// already fired within that episode (AC3).
type prStallEpisode struct {
	EpisodeStart *time.Time `db:"episode_start"`
	AlertedAt    *time.Time `db:"alerted_at"`
}

func loadPRStallState(ctx context.Context, db *sqlx.DB, prID string) *prStallEpisode {
	var st prStallEpisode
	if err := db.GetContext(ctx, &st,
		`SELECT episode_start, alerted_at FROM pr_stall_state WHERE pr_id = ?`, prID); err != nil {
		return nil
	}
	return &st
}

func deletePRStallState(ctx context.Context, db *sqlx.DB, prID string) {
	_, _ = db.ExecContext(ctx, `DELETE FROM pr_stall_state WHERE pr_id=?`, prID)
}

// isWIPTitle implements the AC4 draft/WIP skip: case-insensitive match on
// 'wip', 'draft', '[wip]', '[draft]' (substring semantics cover all four).
func isWIPTitle(title string) bool {
	t := strings.ToLower(title)
	return strings.Contains(t, "wip") || strings.Contains(t, "draft")
}

var prStallPullNumRe = regexp.MustCompile(`/pull/(\d+)`)

// pullNumberFromLink extracts the PR number from a GitHub pull URL; 0 when
// the link does not parse (the fresh read then degrades gracefully).
func pullNumberFromLink(link string) int {
	m := prStallPullNumRe.FindStringSubmatch(link)
	if m == nil {
		return 0
	}
	n, err := strconv.Atoi(m[1])
	if err != nil {
		return 0
	}
	return n
}

// --- AC2 pre-send lifecycle reads -----------------------------------------

type prStallLiveState struct {
	State  string
	Merged bool
	Draft  bool
	Closed bool
}

// prStallGitHub performs budgeted, rate-limited pre-send reads (AC2): a
// shared token bucket (default 1 req/s), exponential backoff on 403/429 and
// a per-sweep read budget; exhausted budget defers candidates untouched.
type prStallGitHub struct {
	apiBase   string
	token     string
	hc        *http.Client
	lim       *rate.Limiter
	budget    int
	maxBudget int
}

func newPRStallGitHub(cfg PRStallAlertConfig) *prStallGitHub {
	if strings.TrimSpace(cfg.GitHubToken) == "" {
		return nil // no credentials: local-snapshot staleness guard only
	}
	rps := cfg.PreSendRPS
	if rps <= 0 {
		rps = PRStallDefaultRPS
	}
	budget := cfg.PreSendBudget
	if budget <= 0 {
		budget = PRStallDefaultBudget
	}
	apiBase := cfg.GitHubAPIBase
	if strings.TrimSpace(apiBase) == "" {
		apiBase = "https://api.github.com"
	}
	hc := cfg.WebhookClient
	if hc == nil {
		hc = http.DefaultClient
	}
	return &prStallGitHub{
		apiBase:   strings.TrimSuffix(apiBase, "/"),
		token:     cfg.GitHubToken,
		hc:        hc,
		lim:       rate.NewLimiter(rate.Limit(rps), 1),
		budget:    budget,
		maxBudget: budget,
	}
}

// fetch reads the PR's live state/draft/merged flags. Errors mean "cannot
// confirm right now" — callers defer the candidate without dropping it.
func (g *prStallGitHub) fetch(ctx context.Context, fullName string, number int) (*prStallLiveState, error) {
	if g == nil {
		return nil, errPRStallDefer
	}
	if fullName == "" || number <= 0 {
		return &prStallLiveState{}, nil // unparseable target: no remote info, proceed locally
	}
	if g.budget <= 0 {
		return nil, fmt.Errorf("%w: budget exhausted", errPRStallDefer)
	}
	g.budget--
	if err := g.lim.Wait(ctx); err != nil {
		return nil, fmt.Errorf("%w: %v", errPRStallDefer, err)
	}

	url := fmt.Sprintf("%s/repos/%s/pulls/%d", g.apiBase, fullName, number)
	backoff := time.Second
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+g.token)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
		req.Header.Set("User-Agent", "opendoor-pr-stall-alerts")

		resp, err := g.hc.Do(req)
		if err != nil {
			lastErr = err
		} else {
			switch resp.StatusCode {
			case http.StatusOK:
				var body struct {
					State  string `json:"state"`
					Merged bool   `json:"merged"`
					Draft  bool   `json:"draft"`
				}
				err = json.Unmarshal(readBodyLimited(resp), &body)
				resp.Body.Close()
				if err != nil {
					return nil, err
				}
				return &prStallLiveState{State: body.State, Merged: body.Merged, Draft: body.Draft}, nil
			case http.StatusNotFound, http.StatusGone:
				resp.Body.Close()
				return &prStallLiveState{State: "closed", Closed: true}, nil
			case http.StatusForbidden, http.StatusTooManyRequests:
				wait := backoff
				if ra := parseRetryAfterHeader(resp.Header.Get("Retry-After")); ra > 0 {
					if ra > 30*time.Second {
						ra = 30 * time.Second
					}
					wait = ra
				}
				resp.Body.Close()
				lastErr = fmt.Errorf("github %d on pre-send read", resp.StatusCode)
				backoff *= 2 // exponential backoff on 403/429 (AC2)
				select {
				case <-ctx.Done():
					return nil, fmt.Errorf("%w: %v", errPRStallDefer, ctx.Err())
				case <-time.After(wait):
				}
				continue
			default:
				resp.Body.Close()
				return nil, fmt.Errorf("github %d on pre-send read", resp.StatusCode)
			}
		}
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("%w: %v", errPRStallDefer, ctx.Err())
		case <-time.After(backoff):
		}
		backoff *= 2
	}
	return nil, lastErr
}

func readBodyLimited(resp *http.Response) []byte {
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	return b
}

func parseRetryAfterHeader(v string) time.Duration {
	secs, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || secs < 0 {
		return 0
	}
	return time.Duration(secs) * time.Second
}

// --- AC7 failure log -------------------------------------------------------

// recordPRStallFailure upserts one alerts_failed row per stalled PR: error +
// retry_count while retrying, dead-lettered on the final allowed attempt.
func recordPRStallFailure(ctx context.Context, db *sqlx.DB, prID string, userID int64, channel, errMsg string, final bool) {
	status := "retry"
	if final {
		status = "dead_letter"
	}
	now := time.Now().UTC()
	if db.DriverName() == "sqlite" {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO alerts_failed (pr_id, user_id, channel, error, retry_count, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, 1, ?, ?, ?)
			ON CONFLICT(pr_id) DO UPDATE SET
				user_id=excluded.user_id, channel=excluded.channel, error=excluded.error,
				retry_count=alerts_failed.retry_count+1, status=excluded.status, updated_at=excluded.updated_at`,
			prID, userID, channel, errMsg, status, now, now)
		return
	}
	_, _ = db.ExecContext(ctx, `
		INSERT INTO alerts_failed (pr_id, user_id, channel, error, retry_count, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, 1, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			user_id=VALUES(user_id), channel=VALUES(channel), error=VALUES(error),
			retry_count=alerts_failed.retry_count+1, status=VALUES(status), updated_at=VALUES(updated_at)`,
		prID, userID, channel, errMsg, status, now, now)
}

// reviewerNudgeComment renders the ready-to-copy comment body (AC6): assigned
// reviewers are @-mentioned when known; otherwise the generic '@maintainers'
// variant is used.
func reviewerNudgeComment(number int, reviewers []string, waiting, p75 float64) string {
	who := "@maintainers"
	if mentions := reviewerMentions(reviewers); len(mentions) > 0 {
		who = strings.Join(mentions, " ")
	}
	return fmt.Sprintf(
		"%s Friendly ping on #%d — it has been waiting for review for %s, which is past this repo's typical turnaround (%s at p75). Could someone take a look? Happy to address feedback or rebase if needed. Thank you!",
		who, number, humanHours(waiting), humanHours(p75))
}

// reviewerMentions normalizes reviewer logins into safe @-mentions (max 3),
// tolerating missing/garbage input without panicking (AC6).
func reviewerMentions(reviewers []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, 3)
	for _, r := range reviewers {
		login := strings.TrimPrefix(strings.TrimSpace(r), "@")
		if login == "" || seen[strings.ToLower(login)] {
			continue
		}
		if strings.ContainsAny(login, " \t/@") {
			continue // not a plain login
		}
		seen[strings.ToLower(login)] = true
		out = append(out, "@"+login)
		if len(out) == 3 {
			break
		}
	}
	return out
}

// parseReviewerJSON decodes the snapshot's requested_reviewers JSON array;
// corrupt or empty values yield nil (AC6 fallback path).
func parseReviewerJSON(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

// renderStallItem renders one stalled-PR block: deep link, wait vs p75,
// ready-to-copy nudge, and same-language better-C-Rank picks (AC6).
func renderStallItem(p PRStallPayload) string {
	var b strings.Builder
	link := p.DeepLink
	if link == "" {
		link = deepLinkOf("", p.FullName)
	}
	fmt.Fprintf(&b, ":hourglass: *PR stalled in review* — <%s|%s>\n", link, p.FullName)
	fmt.Fprintf(&b, "*%s* has been open *%s*, above this repo's p75 wait (*%s*).\n",
		orDash(p.Title), humanHours(p.HoursWaiting), humanHours(p.P75Hours))
	fmt.Fprintf(&b, "Ready-to-copy reviewer nudge:\n```\n%s\n```\n", p.NudgeComment)
	if len(p.Suggestions) > 0 {
		parts := make([]string, 0, len(p.Suggestions))
		for _, s := range p.Suggestions {
			u := s.URL
			if u == "" {
				u = deepLinkOf("", s.FullName)
			}
			parts = append(parts, fmt.Sprintf("<%s|%s> (%.1f, %s)", u, s.FullName, s.Score, orDash(s.Tier)))
		}
		b.WriteString("Same-language repos with better C-Ranks: " + strings.Join(parts, " · "))
	}
	return b.String()
}

// BuildPRStallWebhookText renders a single-PR Slack/Discord message (AC6).
func BuildPRStallWebhookText(p PRStallPayload, baseURL string) string {
	return BuildPRStallDigestText([]PRStallPayload{p}, baseURL)
}

// BuildPRStallDigestText renders one per-user digest listing every stalled PR
// (max items capped by caller, AC5).
func BuildPRStallDigestText(payloads []PRStallPayload, baseURL string) string {
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	_ = baseURL // reserved for future dashboard deep links
	if len(payloads) == 1 {
		return renderStallItem(payloads[0])
	}
	var b strings.Builder
	fmt.Fprintf(&b, ":hourglass: *%d PRs stalled in review*\n", len(payloads))
	for i, p := range payloads {
		fmt.Fprintf(&b, "\n— %d/%d —\n", i+1, len(payloads))
		b.WriteString(renderStallItem(p))
		if i < len(payloads)-1 {
			b.WriteString("\n")
		}
	}
	return b.String()
}

// capWebhookText hard-caps the Slack/Discord payload size (AC5); Discord
// rejects content over 2000 chars outright.
func capWebhookText(text string) string {
	if len(text) <= PRStallWebhookMaxChars {
		return text
	}
	cut := text[:PRStallWebhookMaxChars]
	if idx := strings.LastIndex(cut, "\n"); idx > PRStallWebhookMaxChars/2 {
		cut = cut[:idx]
	}
	return cut + "\n…truncated — full digest in your email/dashboard"
}

func deepLinkOf(htmlURL, fullName string) string {
	if strings.TrimSpace(htmlURL) != "" {
		return htmlURL
	}
	if strings.TrimSpace(fullName) != "" {
		return "https://github.com/" + fullName
	}
	return ""
}

// PRDeepLink builds the canonical GitHub PR deep link (AC5): full_name +
// number always win over any stored html_url (which may be stale or
// repo-id-shaped); degrade to html_url, then the repo root.
func PRDeepLink(fullName string, number int, htmlURL string) string {
	if fn := strings.TrimSpace(fullName); fn != "" && number > 0 {
		return fmt.Sprintf("https://github.com/%s/pull/%d", fn, number)
	}
	return deepLinkOf(htmlURL, fullName)
}

func humanHours(h float64) string {
	switch {
	case h >= 48:
		return fmt.Sprintf("%.1fd", h/24)
	case h >= 1:
		return fmt.Sprintf("%.1fh", h)
	default:
		return fmt.Sprintf("%dm", int(math.Round(h*60)))
	}
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "—"
	}
	return s
}
