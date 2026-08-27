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
	Store  *Store
	Tokens auth.TokenManager
	GitHub *GHClient
	DB     *sqlx.DB
	// Sink generates the "Merged via OpenDoor" proof card on merge (AC6).
	// Nil => merge artifacts are skipped (safe default).
	Sink MergeArtifactSink
}

func NewService(store *Store, tokens auth.TokenManager, gh *GHClient, db *sqlx.DB) *Service {
	return &Service{Store: store, Tokens: tokens, GitHub: gh, DB: db}
}

// SetSink installs the merge-artifact generator used by the sync loop (AC6).
func (s *Service) SetSink(sink MergeArtifactSink) { s.Sink = sink }

// ensureMergeArtifact generates the proof card for a merged tracked PR exactly
// once (idempotent: unique pr_id lock via pr_merge_artifacts PK).
func (s *Service) ensureMergeArtifact(ctx context.Context, userID int64, tp TrackedPRRow, detail *PRDetail, mergedAt *time.Time) {
	if cardID, ok, _ := s.Store.GetMergeArtifact(ctx, tp.PRID); ok && cardID != "" {
		return
	}
	if s.Sink == nil {
		return
	}
	cardID, err := s.Sink.OnMerged(ctx, userID, tp.Owner, tp.Repo, tp.Number, tp.PRID, tp.Title, detail.HtmlURLStr, derefTime(mergedAt))
	if err != nil {
		slog.Warn("prtracker: merge artifact generation failed", "err", err, "pr_id", tp.PRID)
		return
	}
	if cardID == "" {
		return
	}
	_ = s.Store.InsertMergeArtifact(ctx, tp.PRID, userID, tp.Owner+"/"+tp.Repo, tp.Number, cardID, mergedAt)
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
	// Draft/ready anchors carried from the previous snapshot (AC5 stall clock).
	prevDrafts, err := s.Store.LatestDraftByPR(ctx, userID)
	if err != nil {
		return res, err
	}

	now := time.Now().UTC()
	seen := map[string]bool{}
	synced := 0
	// Stall-episode events (AC1): review submissions restart the episode at
	// their exact instant; draft->ready emits a fresh 'review_requested'.
	var events []notification.PRReviewEvent

	for _, item := range items {
		if synced >= MaxTrackedPRs || item.Repository == nil || item.PullRequest == nil {
			break
		}
		prID := fmt.Sprintf("%s#%d", item.Repository.FullName, item.Number)
		seen[prID] = true

		state := StateOpen
		var mergedAt *time.Time
		var reviewers []string
		// Draft clock carry-forward: unknown draft state keeps the previous
		// values so a rate-limited pass never regresses the anchor (AC5).
		isDraft := prevDrafts[prID].Draft
		readyAt := prevDrafts[prID].ReadyAt
		if !limited { // detail calls are skipped entirely when rate-limited (AC5)
			owner, repo, _ := strings.Cut(item.Repository.FullName, "/")
			reviews, revRes, rerr := s.GitHub.FetchReviews(ctx, userID, token, owner, repo, item.Number)
			if rerr == nil && !revRes.Limited {
				state = DeriveState(nil, reviews)
				reviewers = reviewerLogins(reviews) // stall-rescue nudge mentions (AC6)
				for _, rv := range reviews { // AC1: every submission restarts the stall episode
					if rv.SubmittedAt.IsZero() {
						continue
					}
					events = append(events, notification.PRReviewEvent{
						PRID:         prID,
						UserID:       userID,
						RepositoryID: item.Repository.FullName,
						EventType:    notification.PRReviewEventSubmitted,
						EventID:      fmt.Sprintf("%s|%s|%s|%d", prID, rv.User.Login, rv.State, rv.SubmittedAt.Unix()),
						OccurredAt:   rv.SubmittedAt,
					})
				}
			} else if revRes.Limited {
				limited = true
				state = DeriveState(nil, nil)
			}
			detail, dres, derr := s.GitHub.FetchPRDetail(ctx, userID, token, owner, repo, item.Number)
			if derr == nil && dres != nil && !dres.Limited && detail != nil {
				if detail.Draft && !isDraft {
					readyAt = nil // re-drafted: reset any stale ready anchor
				}
				isDraft = detail.Draft
				if prevDrafts[prID].Draft && !detail.Draft && readyAt == nil {
					ts := now // AC5: freeze the draft->ready transition instant
					readyAt = &ts
					// AC1: draft->ready emits a fresh 'review_requested'.
					events = append(events, notification.PRReviewEvent{
						PRID:         prID,
						UserID:       userID,
						RepositoryID: item.Repository.FullName,
						EventType:    notification.PRReviewEventRequested,
						EventID:      fmt.Sprintf("%s|ready|%d", prID, ts.Unix()),
						OccurredAt:   ts,
					})
				}
			} else if dres != nil && dres.Limited {
				limited = true
			}
		}
		mergedAt = item.PullRequest.MergedAt

		upd := item.UpdatedAt
		created := item.CreatedAt
		err := s.Store.UpsertSnapshot(ctx, PRSnapshot{
			PRID:               prID,
			UserID:             userID,
			RepositoryID:       item.Repository.FullName,
			PRNumber:           item.Number,
			Title:              item.Title,
			HTMLURL:            item.HTMLURL,
			State:              state,
			PRCreatedAt:        &created,
			GithubUpdatedAt:    &upd,
			MergedAt:           mergedAt,
			FetchedAt:          now,
			SnapshotAt:         now,
			RequestedReviewers: marshalReviewers(reviewers),
			IsDraft:            isDraft,
			ReadyForReviewAt:   readyAt,
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

	// AC1/AC2: ingest collected review events (idempotent per (pr_id, event_id);
	// monotonic vs the PR's current episode start).
	if len(events) > 0 {
		if _, err := notification.IngestPRReviewEvents(ctx, s.DB, events); err != nil {
			slog.Warn("prtracker sync: review event ingest failed", "err", err)
		}
	}

	// AC3/AC6: explicitly tracked PRs may be merged (absent from the open-PR
	// search), so fetch each by number, keep the snapshot fresh, and on merge
	// generate the verifiable "Merged via OpenDoor" proof card.
	if !limited {
		tracked, terr := s.Store.ListTrackedPRs(ctx, userID)
		if terr == nil {
			for _, tp := range tracked {
				detail, dres, derr := s.GitHub.FetchPRDetail(ctx, userID, token, tp.Owner, tp.Repo, tp.Number)
				if derr != nil || dres == nil || dres.Limited || detail == nil {
					continue
				}
				state := DeriveState(detail, nil)
				if detail.Merged || (detail.State == "closed" && detail.MergedAt != nil) {
					state = StateMerged
				}
				nowT := time.Now().UTC()
				_ = s.Store.UpsertSnapshot(ctx, PRSnapshot{
					PRID:            tp.PRID,
					UserID:          userID,
					RepositoryID:    tp.Owner + "/" + tp.Repo,
					PRNumber:        tp.Number,
					Title:           tp.Title,
					HTMLURL:         detail.HtmlURLStr,
					State:           state,
					GithubUpdatedAt: &nowT,
					MergedAt:        detail.MergedAt,
					FetchedAt:       nowT,
					SnapshotAt:      nowT,
				})
				if state == StateMerged {
					s.ensureMergeArtifact(ctx, userID, tp, detail, detail.MergedAt)
				}
			}
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

// reviewerLogins extracts distinct review-author logins in submission order
// (max 5) for stall-rescue nudge mentions (AC6); empty input yields nil.
func reviewerLogins(reviews []Review) []string {
	seen := map[string]bool{}
	out := make([]string, 0, 5)
	for _, r := range reviews {
		login := strings.TrimSpace(r.User.Login)
		if login == "" || seen[strings.ToLower(login)] {
			continue
		}
		seen[strings.ToLower(login)] = true
		out = append(out, login)
		if len(out) == 5 {
			break
		}
	}
	return out
}

// marshalReviewers encodes reviewer logins as a JSON array; empty input
// yields ” (column default).
func marshalReviewers(reviewers []string) string {
	if len(reviewers) == 0 {
		return ""
	}
	b, err := json.Marshal(reviewers)
	if err != nil {
		return ""
	}
	return string(b)
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
		"pr_id":       prID,
		"from_state":  from,
		"to_state":    to,
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
