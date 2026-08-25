package prtracker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
)

const (
	// MaxTrackedPRs bounds detail fetches per sync; matches AC1's newest-50 page.
	MaxTrackedPRs = 50
	// pageLoadRefreshInterval is the AC2 per-user page-load refresh throttle.
	pageLoadRefreshInterval = 5 * time.Minute
)

// SyncResult reports one user-sync outcome.
type SyncResult struct {
	Limited      bool
	Synced       bool
	ReconnectReq bool
	Skipped      bool
}

// Service wires store, token manager and GitHub client together.
type Service struct {
	Store   *Store
	Tokens  auth.TokenManager
	GitHub  *GHClient
	DB      *sqlx.DB
}

func NewService(store *Store, tokens auth.TokenManager, gh *GHClient, db *sqlx.DB) *Service {
	return &Service{Store: store, Tokens: tokens, GitHub: gh, DB: db}
}

// SyncUserThrottled enforces AC2: page-load refresh at most 1x/5min/user.
// Cron syncs call SyncUser directly.
func (s *Service) SyncUserThrottled(ctx context.Context, userID int64, login string) (*SyncResult, error) {
	conn, err := s.Store.GetConnection(ctx, userID)
	if err == nil && conn != nil && conn.LastSyncedAt != nil &&
		time.Since(*conn.LastSyncedAt) < pageLoadRefreshInterval {
		return &SyncResult{Skipped: true}, nil
	}
	return s.SyncUser(ctx, userID, login)
}

// SyncUser refreshes one user's open PRs into pr_snapshots and fires
// transition notifications (AC8). Safe to call from page-load and cron.
func (s *Service) SyncUser(ctx context.Context, userID int64, login string) (*SyncResult, error) {
	res := &SyncResult{}

	conn, err := s.Store.GetConnection(ctx, userID)
	if err != nil {
		return res, err
	}
	if conn != nil && conn.Status == ConnectionReconnectRequired {
		res.Skipped = true // AC6: skip cron fetches until reconnect
		return res, nil
	}

	token, err := s.Tokens.GetValidGithubToken(ctx, userID)
	if err != nil || token == "" {
		_ = s.Store.SetConnection(ctx, userID, login, ConnectionReconnectRequired, false, "GitHub token expired or missing")
		res.ReconnectReq = true
		return res, err
	}

	items, listRes, err := s.GitHub.SearchOpenPRs(ctx, userID, token, login, MaxTrackedPRs)
	if err != nil {
		_ = s.Store.SetConnection(ctx, userID, login, ConnectionActive, true, "github fetch failed: served cached data")
		return res, err
	}
	if listRes.Unauthorized {
		_ = s.Store.SetConnection(ctx, userID, login, ConnectionReconnectRequired, conn != nil && conn.LastLimited, "401 from GitHub: reconnect required")
		res.ReconnectReq = true
		return res, nil
	}
	limited := listRes.Limited

	prevStates, err := s.Store.LatestStateByPR(ctx, userID)
	if err != nil {
		return res, err
	}

	now := time.Now().UTC()
	seen := map[string]bool{}
	synced := 0

	for _, item := range items {
		if synced >= MaxTrackedPRs || item.Repository == nil || item.PullRequest == nil {
			break
		}
		prID := fmt.Sprintf("%s#%d", item.Repository.FullName, item.Number)
		seen[prID] = true

		state := StateOpen
		var mergedAt *time.Time
		if !limited { // review calls are skipped entirely when rate-limited (AC5)
			owner, repo, _ := strings.Cut(item.Repository.FullName, "/")
			reviews, revRes, rerr := s.GitHub.FetchReviews(ctx, userID, token, owner, repo, item.Number)
			if rerr == nil && !revRes.Limited {
				state = DeriveState(nil, reviews)
			} else if revRes.Limited {
				limited = true
				state = DeriveState(nil, nil)
			}
		}
		mergedAt = item.PullRequest.MergedAt

		upd := item.UpdatedAt
		created := item.CreatedAt
		err := s.Store.UpsertSnapshot(ctx, PRSnapshot{
			PRID:            prID,
			UserID:          userID,
			RepositoryID:    item.Repository.FullName,
			PRNumber:        item.Number,
			Title:           item.Title,
			HTMLURL:         item.HTMLURL,
			State:           state,
			PRCreatedAt:     &created,
			GithubUpdatedAt: &upd,
			MergedAt:        mergedAt,
			FetchedAt:       now,
			SnapshotAt:      now,
		})
		if err != nil {
			continue
		}
		synced++

		prev := prevStates[prID]
		if prev != "" && prev != state {
			s.recordAndNotify(ctx, prID, userID, prev, state, now)
		} else if prev == "" {
			// First sighting: baseline the log without notifying.
			_ = s.Store.RecordTransition(ctx, prID, userID, "", state, now)
		}
	}

	// Detect merges of PRs that left the open-search window (never silently dropped, AC8).
	if !limited {
		for prID, prevState := range prevStates {
			if seen[prID] || prevState == StateMerged {
				continue
			}
			owner, repo, number, ok := ParsePRID(prID)
			if !ok {
				continue
			}
			detail, dres, derr := s.GitHub.FetchPRDetail(ctx, userID, token, owner, repo, number)
			if derr != nil || dres.Limited || detail == nil {
				limited = limited || (dres != nil && dres.Limited)
				continue
			}
			newState := DeriveState(detail, nil)
			if newState != prevState {
				nowT := time.Now().UTC()
				_ = s.Store.RecordTransition(ctx, prID, userID, prevState, newState, nowT)
				s.recordAndNotify(ctx, prID, userID, prevState, newState, nowT)
			}
		}
	}

	if err := s.Store.SetConnection(ctx, userID, login, ConnectionActive, limited, ""); err != nil {
		return res, err
	}
	if err := s.Store.TouchSynced(ctx, userID, now, limited); err != nil {
		return res, err
	}
	// Resolve saved eval forecasts against the fresh snapshots (AC1/AC2);
	// changed terminal verdicts enqueue their OG regen job (AC5).
	if _, err := s.Store.UpdateEvalOutcomes(ctx); err != nil {
		slog.Warn("prtracker sync: eval outcome update failed", "err", err)
	}
	res.Limited = limited
	res.Synced = true
	return res, nil
}

// recordAndNotify logs the transition and enqueues a notification honoring AC8
// dedupe rules, reusing the existing notifier cron queue.
func (s *Service) recordAndNotify(ctx context.Context, prID string, userID int64, from, to string, at time.Time) {
	history, err := s.Store.RecentTransitions(ctx, prID, 20)
	cur := Transition{PRID: prID, UserID: userID, FromState: from, ToState: to, OccurredAt: at}
	if err == nil && !ShouldNotify(history, cur) {
		_ = s.Store.RecordTransition(ctx, prID, userID, from, to, at) // logged, not notified
		return
	}
	if err := s.Store.RecordTransition(ctx, prID, userID, from, to, at); err != nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{
		"pr_id":      prID,
		"from_state": from,
		"to_state":   to,
		"occurred_at": at.Format(time.RFC3339),
	})
	_, _ = s.DB.ExecContext(ctx, `
		INSERT INTO notification_queue (user_id, type, payload, status, created_at)
		VALUES (?, 'pr_state_changed', ?, 'pending', CURRENT_TIMESTAMP)`, userID, string(payload))
	_ = s.Store.MarkTransitionsNotified(ctx, prID, at)
}

// SyncAllConnectedUsers runs a full cron pass over enrolled users (AC2: 15min).
func (s *Service) SyncAllConnectedUsers(ctx context.Context) (synced, skipped int) {
	ids, err := s.Store.ConnectedUserIDs(ctx)
	if err != nil {
		slog.Warn("prtracker cron: load users failed", "err", err)
		return 0, 0
	}
	logins := map[int64]string{}
	rows := []struct {
		UserID      int64  `db:"user_id"`
		GithubLogin string `db:"github_login"`
	}{}
	_ = s.DB.SelectContext(ctx, &rows, `SELECT user_id, COALESCE(github_login,'') AS github_login FROM pr_connections`)
	for _, r := range rows {
		logins[r.UserID] = r.GithubLogin
	}

	for _, id := range ids {
		select {
		case <-ctx.Done():
			return
		default:
		}
		res, err := s.SyncUser(ctx, id, logins[id])
		if err != nil {
			slog.Warn("prtracker cron: sync failed", "user_id", id, "err", err)
			continue
		}
		if res.Skipped || res.ReconnectReq {
			skipped++
			continue
		}
		synced++
	}
	return synced, skipped
}

// StartCron launches the 15-minute poll loop and drains the existing notifier
// queue after each pass. Returns a stop function.
func (s *Service) StartCron(interval time.Duration) (stop func()) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		s.runPass(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.runPass(ctx)
			}
		}
	}()
	return func() {
		cancel()
		<-done
	}
}

func (s *Service) runPass(ctx context.Context) {
	passCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()
	synced, _ := s.SyncAllConnectedUsers(passCtx)
	// Reconciliation fallback (AC7): re-resolve every registered eval against
	// fresh snapshots even for users whose own sync was skipped this pass.
	if _, err := s.Store.UpdateEvalOutcomes(passCtx); err != nil {
		slog.Warn("prtracker cron: eval outcome reconciliation failed", "err", err)
	}
	if n, err := notification.ProcessPendingNotifications(passCtx, s.DB, notification.NewPlaceholderCommunicationClient()); err != nil {
		slog.Warn("prtracker cron: notify drain failed", "err", err)
	} else if n > 0 {
		slog.Info("prtracker cron: notifications delivered", "count", n)
	}
	_ = s.Store.CompleteOGRegenJobs(passCtx) // drain OG regen queue (AC5/AC6 cache-bust)
	slog.Info("prtracker cron pass complete", "synced", synced)
}
