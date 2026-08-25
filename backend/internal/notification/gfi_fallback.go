package notification

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// gfiFallbackDigestCap bounds one fallback digest email (AC2 overflow batch).
const gfiFallbackDigestCap = 20

var (
	gfiFallbackMu   sync.Mutex
	gfiFallbackLock = map[string]bool{}
)

type GFIFallbackSummary struct {
	Day          string `json:"day"`
	Subscribers  int    `json:"subscribers"`
	FallbackSent int    `json:"fallback_sent"`
	Skipped      int    `json:"skipped_no_match"`
	Failed       int    `json:"failed"`
}

// RunGFIDailyFallbackDigest delivers, at most once per UTC day, one batched
// email per subscriber holding 'fallback' rows — issues that overflowed the
// 5/day instant cap (AC2). Send failures leave rows parked for the next
// day's run; hard bounces dead-letter immediately.
func RunGFIDailyFallbackDigest(ctx context.Context, db *sqlx.DB, cfg GFIAlertConfig) (*GFIFallbackSummary, error) {
	now := time.Now().UTC()
	day := startOfUTCDay(now).Format("2006-01-02")
	summary := &GFIFallbackSummary{Day: day}

	gfiFallbackMu.Lock()
	if gfiFallbackLock[day] {
		gfiFallbackMu.Unlock()
		return summary, nil
	}
	gfiFallbackMu.Unlock()

	var subIDs []int64
	if err := db.SelectContext(ctx, &subIDs,
		`SELECT DISTINCT subscriber_id FROM gfi_email_queue WHERE status='fallback' ORDER BY subscriber_id LIMIT 500`); err != nil {
		return nil, err
	}

	for _, sid := range subIDs {
		sub, err := getGFISubscriber(ctx, db, sid)
		if err != nil {
			summary.Failed++
			slog.Error("gfi-fallback: subscriber lookup failed", "subscriber_id", sid, "err", err)
			continue
		}
		if sub == nil || sub.suppressed() || IsEmailSuppressed(ctx, db, sub.Email) {
			dropGFIFallbackRows(ctx, db, sid)
			continue
		}

		items := loadGFIFallbackItems(ctx, db, sid)
		if len(items) == 0 {
			summary.Skipped++
			continue
		}

		claimURLs := map[string]string{}
		for _, it := range items {
			if u, err := newGFIClaimLink(ctx, db, cfg.BaseURL, sid, it.RepoID, it.FullName, it.IssueNo, now); err == nil && u != "" {
				claimURLs[fmt.Sprintf("%s:%d", it.RepoID, it.IssueNo)] = u
			}
		}

		payload := buildGFIBatchAlertEmail(cfg, sid, sub.Email, items, claimURLs)
		if sendErr := sendGFIPayload(ctx, cfg, sub.Email, payload, gfiUnsubscribeURL(cfg.BaseURL, cfg.unsubKey(), sid, sub.Email)); sendErr != nil {
			summary.Failed++
			if IsHardBounce(sendErr) {
				if _, berr := ApplyGFIEmailBounce(ctx, db, sub.Email, true); berr != nil {
					slog.Error("gfi-fallback: bounce bookkeeping failed", "email", sub.Email, "err", berr)
				}
				markGFIFallbackRows(ctx, db, sid, "failed", sendErr.Error())
			} else {
				slog.Error("gfi-fallback: send failed, retrying tomorrow", "subscriber_id", sid, "err", sendErr)
			}
			continue
		}

		completeGFIFallbackRows(ctx, db, sid, items, now)
		summary.FallbackSent++
	}

	gfiFallbackMu.Lock()
	gfiFallbackLock[day] = true
	gfiFallbackMu.Unlock()
	return summary, nil
}

// loadGFIFallbackItems fetches up to gfiFallbackDigestCap issue contexts for
// a subscriber's parked fallback rows, oldest first.
func loadGFIFallbackItems(ctx context.Context, db *sqlx.DB, subID int64) []gfiIssueEmailCtx {
	var rows []struct {
		ID      int64  `db:"id"`
		RepoID  string `db:"repo_id"`
		IssueNo int    `db:"issue_number"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT id, repo_id, issue_number FROM gfi_email_queue
		WHERE subscriber_id=? AND status='fallback' ORDER BY created_at ASC LIMIT ?`,
		subID, gfiFallbackDigestCap); err != nil {
		return nil
	}
	items := make([]gfiIssueEmailCtx, 0, len(rows))
	for _, r := range rows {
		item, err := getGFIIssueEmailCtx(ctx, db, r.RepoID, r.IssueNo)
		if err != nil {
			_, _ = db.ExecContext(ctx,
				`UPDATE gfi_email_queue SET status='dropped', last_error='issue no longer available' WHERE id=? AND status='fallback'`, r.ID)
			continue
		}
		items = append(items, item)
	}
	return items
}

// completeGFIFallbackRows marks the batch sent and writes the weekly-mode
// sent-log cursor so the Monday digest never re-sends them (AC3).
func completeGFIFallbackRows(ctx context.Context, db *sqlx.DB, subID int64, items []gfiIssueEmailCtx, now time.Time) {
	tx, err := db.Beginx()
	if err != nil {
		return
	}
	defer tx.Rollback()
	markQ := "UPDATE gfi_email_queue SET status='sent', sent_at=?, claimed_at=NULL WHERE subscriber_id=? AND status='fallback'"
	if _, err := tx.ExecContext(ctx, markQ, now.UTC(), subID); err != nil {
		return
	}
	insertQ := "INSERT IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'weekly', 'sent', ?, ?)"
	if db.DriverName() == "sqlite" {
		insertQ = "INSERT OR IGNORE INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, sent_at, created_at) VALUES (?, ?, ?, ?, 'weekly', 'sent', ?, ?)"
	}
	for _, it := range items {
		if _, err := tx.ExecContext(ctx, insertQ,
			subID, fmt.Sprintf("%s:%d:%d", it.RepoID, it.IssueNo, subID),
			it.RepoID, it.IssueNo, now.UTC(), now.UTC()); err != nil {
			slog.Error("gfi-fallback: cursor write failed", "subscriber_id", subID, "err", err)
			return
		}
	}
	_ = tx.Commit()
}

func dropGFIFallbackRows(ctx context.Context, db *sqlx.DB, subID int64) {
	_, _ = db.ExecContext(ctx, `UPDATE gfi_email_queue SET status='dropped', last_error='suppressed' WHERE subscriber_id=? AND status='fallback'`, subID)
}

func markGFIFallbackRows(ctx context.Context, db *sqlx.DB, subID int64, status, lastErr string) {
	_, _ = db.ExecContext(ctx, `UPDATE gfi_email_queue SET status=?, last_error=?, claimed_at=NULL WHERE subscriber_id=? AND status='fallback'`, status, lastErr, subID)
}

// ResetGFIFallbackLockForTest clears the in-memory day lock so tests can re-run.
func ResetGFIFallbackLockForTest() {
	gfiFallbackMu.Lock()
	defer gfiFallbackMu.Unlock()
	gfiFallbackLock = map[string]bool{}
}

// RunGFIMatcherSweep is the AC6 hourly matcher pass: it re-enqueues recent
// good-first issues whose permanent alert-dedup stamp (the cursor) is still
// empty — catching anything missed while ingestion or the server was down.
// Per-repo failures are logged and resume on the next hourly cycle; no data
// loss because only stamped issues are considered done. Upstream GitHub
// calls go through the token-bucket rate-limited paginated client via
// send-time revalidation.
func RunGFIMatcherSweep(ctx context.Context, db *sqlx.DB) int {
	var rows []struct {
		RepoID     string `db:"repository_id"`
		IssueNumber int   `db:"issue_number"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT repository_id, issue_number FROM repo_good_first_issues
		WHERE COALESCE(alert_dedup_key,'')='' AND created_at >= ?
		ORDER BY repository_id, issue_number LIMIT 500`,
		time.Now().UTC().Add(-48*time.Hour)); err != nil {
		slog.Error("gfi-matcher: sweep query failed", "err", err)
		return 0
	}
	byRepo := map[string][]int{}
	var order []string
	for _, r := range rows {
		if _, seen := byRepo[r.RepoID]; !seen {
			order = append(order, r.RepoID)
		}
		byRepo[r.RepoID] = append(byRepo[r.RepoID], r.IssueNumber)
	}
	enqueued := 0
	for _, repoID := range order {
		n, err := EnqueueGFIInstantAlerts(ctx, db, repoID, byRepo[repoID], time.Now())
		if err != nil {
			slog.Warn("gfi-matcher: enqueue failed, resuming next cycle", "repo_id", repoID, "err", err)
			continue
		}
		enqueued += n
	}
	return enqueued
}
