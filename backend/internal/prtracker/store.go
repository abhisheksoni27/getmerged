package prtracker

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// Connection states for a user's GitHub link (AC6).
const (
	ConnectionActive            = "active"
	ConnectionReconnectRequired = "reconnect_required"
)

// PR state vocabulary (AC2).
const (
	StateOpen             = "open"
	StateChangesRequested = "changes_requested"
	StateApproved         = "approved"
	StateMerged           = "merged"
)

// PRSnapshot is one point-in-time observation of a PR. Writes are idempotent
// upserts keyed (pr_id, snapshot_at); page-load and cron are safe concurrent
// writers with last-write-wins semantics (AC7).
type PRSnapshot struct {
	PRID            string     `db:"pr_id"`
	UserID          int64      `db:"user_id"`
	RepositoryID    string     `db:"repository_id"`
	PRNumber        int        `db:"pr_number"`
	Title           string     `db:"title"`
	HTMLURL         string     `db:"html_url"`
	State           string     `db:"state"`
	PRCreatedAt     *time.Time `db:"pr_created_at"`
	GithubUpdatedAt *time.Time `db:"github_updated_at"`
	MergedAt        *time.Time `db:"merged_at"`
	FetchedAt       time.Time  `db:"fetched_at"`
	SnapshotAt      time.Time  `db:"snapshot_at"`
	// RequestedReviewers is a JSON array of reviewer logins used by
	// stall-rescue nudge templates (empty when none observed).
	RequestedReviewers string `db:"requested_reviewers"`
	// IsDraft mirrors GitHub's draft flag; ReadyForReviewAt is set once at
	// the draft->ready transition and carried forward (stall clock anchor).
	IsDraft          bool       `db:"is_draft"`
	ReadyForReviewAt *time.Time `db:"ready_for_review_at"`
}

// Transition is one append-only row of the state-change log (AC8).
type Transition struct {
	ID         int64     `db:"id"`
	PRID       string    `db:"pr_id"`
	UserID     int64     `db:"user_id"`
	FromState  string    `db:"from_state"`
	ToState    string    `db:"to_state"`
	Notified   bool      `db:"notified"`
	OccurredAt time.Time `db:"occurred_at"`
}

// Connection mirrors the pr_connections row.
type Connection struct {
	UserID       int64      `db:"user_id"`
	GithubLogin  string     `db:"github_login"`
	Status       string     `db:"status"`
	LastLimited  bool       `db:"last_limited"`
	LastSyncedAt *time.Time `db:"last_synced_at"`
	LastError    *string    `db:"last_error"`
}

// TrackedPR is the dashboard row: newest snapshot joined with repo benchmarks.
type TrackedPR struct {
	PRID            string     `db:"pr_id" json:"pr_id"`
	UserID          int64      `db:"user_id" json:"-"`
	RepositoryID    string     `db:"repository_id" json:"repository_id"`
	FullName        string     `db:"full_name" json:"full_name"`
	CRankTier       string     `db:"c_rank_tier" json:"c_rank_tier"`
	PRNumber        int        `db:"pr_number" json:"pr_number"`
	Title           string     `db:"title" json:"title"`
	HTMLURL         string     `db:"html_url" json:"html_url"`
	State           string     `db:"state" json:"state"`
	PRCreatedAt     *time.Time `db:"pr_created_at" json:"pr_created_at"`
	GithubUpdatedAt *time.Time `db:"github_updated_at" json:"github_updated_at"`
	FetchedAt       time.Time  `db:"fetched_at" json:"fetched_at"`
	ResponseP50H    *float64   `db:"response_p50_hours" json:"response_p50_hours"`
	ResponseP90H    *float64   `db:"response_p90_hours" json:"response_p90_hours"`
	MergeMedianH    *float64   `db:"median_time_to_merge_hours" json:"median_time_to_merge_hours"`
}

type Store struct {
	db *sqlx.DB
}

func NewStore(db *sqlx.DB) *Store { return &Store{db: db} }

// UpsertSnapshot performs an idempotent last-write-wins upsert keyed
// (pr_id, snapshot_at) so concurrent page-load and cron writers are safe (AC7).
func (s *Store) UpsertSnapshot(ctx context.Context, snap PRSnapshot) error {
	mysql := `
		INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state,
			pr_created_at, github_updated_at, merged_at, fetched_at, snapshot_at, requested_reviewers, is_draft, ready_for_review_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			user_id = VALUES(user_id),
			repository_id = VALUES(repository_id),
			pr_number = VALUES(pr_number),
			title = VALUES(title),
			html_url = VALUES(html_url),
			state = VALUES(state),
			github_updated_at = VALUES(github_updated_at),
			merged_at = VALUES(merged_at),
			fetched_at = VALUES(fetched_at),
			requested_reviewers = VALUES(requested_reviewers),
			is_draft = VALUES(is_draft),
			ready_for_review_at = VALUES(ready_for_review_at)`
	sqlite := `
		INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state,
			pr_created_at, github_updated_at, merged_at, fetched_at, snapshot_at, requested_reviewers, is_draft, ready_for_review_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(pr_id, snapshot_at) DO UPDATE SET
			user_id = excluded.user_id,
			repository_id = excluded.repository_id,
			pr_number = excluded.pr_number,
			title = excluded.title,
			html_url = excluded.html_url,
			state = excluded.state,
			github_updated_at = excluded.github_updated_at,
			merged_at = excluded.merged_at,
			fetched_at = excluded.fetched_at,
			requested_reviewers = excluded.requested_reviewers,
			is_draft = excluded.is_draft,
			ready_for_review_at = excluded.ready_for_review_at`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	_, err := s.db.ExecContext(ctx, q,
		snap.PRID, snap.UserID, snap.RepositoryID, snap.PRNumber, snap.Title, snap.HTMLURL, snap.State,
		snap.PRCreatedAt, snap.GithubUpdatedAt, snap.MergedAt, snap.FetchedAt, snap.SnapshotAt,
		snap.RequestedReviewers, snap.IsDraft, snap.ReadyForReviewAt)
	return err
}

// ListLatestForUser returns the newest snapshot per open/merged PR for the
// user, restricted to C+-ranked repos (S/A/B/C) and capped at limit, newest
// first (AC1). Benchmarks come from latest_snapshots; nil when missing (AC3).
func (s *Store) ListLatestForUser(ctx context.Context, userID int64, limit int) ([]TrackedPR, error) {
	q := `
		SELECT ps.pr_id, ps.user_id, ps.repository_id, r.full_name, ls.c_rank_tier,
		       ps.pr_number, ps.title, ps.html_url, ps.state, ps.pr_created_at,
		       ps.github_updated_at, ps.fetched_at,
		       ls.response_p50_hours, ls.response_p90_hours, ls.time_to_merge_hours AS median_time_to_merge_hours
		FROM (
			SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots WHERE user_id = ? GROUP BY pr_id
		) t
		JOIN pr_snapshots ps ON ps.pr_id = t.prid AND ps.snapshot_at = t.ms
		JOIN latest_snapshots ls ON ls.repository_id = ps.repository_id
		JOIN repositories r ON r.id = ps.repository_id
		WHERE ps.user_id = ? AND ls.c_rank_tier IN ('S','A','B','C') AND ps.state != 'closed'
		ORDER BY COALESCE(ps.github_updated_at, ps.fetched_at) DESC
		LIMIT ?`
	q = strings.Replace(q, "t.prid", "t.pr_id", 1)
	var out []TrackedPR
	err := s.db.SelectContext(ctx, &out, q, userID, userID, limit)
	if err != nil {
		return nil, err
	}
	for i := range out {
		zeroToNil(&out[i].ResponseP50H)
		zeroToNil(&out[i].ResponseP90H)
		zeroToNil(&out[i].MergeMedianH)
	}
	return out, nil
}

func zeroToNil(p **float64) {
	if *p != nil && **p == 0 {
		*p = nil
	}
}

// LatestStateByPR maps pr_id -> most recent known state for the user's PRs.
func (s *Store) LatestStateByPR(ctx context.Context, userID int64) (map[string]string, error) {
	rows := []struct {
		PRID  string `db:"pr_id"`
		State string `db:"state"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT ps.pr_id, ps.state FROM pr_snapshots ps
		JOIN (SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots WHERE user_id = ? GROUP BY pr_id) t
		  ON t.pr_id = ps.pr_id AND t.ms = ps.snapshot_at
		WHERE ps.user_id = ?`, userID, userID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(rows))
	for _, r := range rows {
		out[r.PRID] = r.State
	}
	return out, nil
}

// DraftClock is the draft/ready anchor state carried between syncs (AC5).
type DraftClock struct {
	Draft    bool
	ReadyAt  *time.Time // set once at the draft->ready transition, then frozen
}

// LatestDraftByPR maps pr_id -> the newest snapshot's draft flag and stall-clock
// ready anchor so SyncUser can detect draft->ready transitions.
func (s *Store) LatestDraftByPR(ctx context.Context, userID int64) (map[string]DraftClock, error) {
	rows := []struct {
		PRID     string     `db:"pr_id"`
		IsDraft  bool       `db:"is_draft"`
		ReadyAt  *time.Time `db:"ready_for_review_at"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT ps.pr_id, COALESCE(ps.is_draft,FALSE) AS is_draft, ps.ready_for_review_at FROM pr_snapshots ps
		JOIN (SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots WHERE user_id = ? GROUP BY pr_id) t
		  ON t.pr_id = ps.pr_id AND t.ms = ps.snapshot_at
		WHERE ps.user_id = ?`, userID, userID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]DraftClock, len(rows))
	for _, r := range rows {
		out[r.PRID] = DraftClock{Draft: r.IsDraft, ReadyAt: r.ReadyAt}
	}
	return out, nil
}

// RecordTransition appends to the immutable transition log (AC8).
func (s *Store) RecordTransition(ctx context.Context, prID string, userID int64, from, to string, at time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO pr_state_transitions (pr_id, user_id, from_state, to_state, notified, occurred_at)
		VALUES (?, ?, ?, ?, FALSE, ?)`, prID, userID, from, to, at)
	return err
}

// MarkTransitionsNotified flips notified=TRUE for a logged transition (AC8 log stays append-only).
func (s *Store) MarkTransitionsNotified(ctx context.Context, prID string, at time.Time) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE pr_state_transitions SET notified = TRUE WHERE pr_id = ? AND occurred_at = ?`, prID, at)
	return err
}

// RecentTransitions returns the newest transitions for a PR, newest first.
func (s *Store) RecentTransitions(ctx context.Context, prID string, limit int) ([]Transition, error) {
	var out []Transition
	err := s.db.SelectContext(ctx, &out,
		`SELECT id, pr_id, user_id, from_state, to_state, notified, occurred_at
		 FROM pr_state_transitions WHERE pr_id = ? ORDER BY occurred_at DESC LIMIT ?`, prID, limit)
	return out, err
}

// ShouldNotify implements AC8: an identical from→to pair only re-notifies if
// it recurred after an intermediate distinct transition or >24h later.
func ShouldNotify(history []Transition, cur Transition) bool {
	if len(history) == 0 {
		return true // first observed change on this PR
	}
	samePair := func(t Transition) bool { return t.FromState == cur.FromState && t.ToState == cur.ToState }
	latest := history[0]
	if !samePair(latest) || !latest.Notified {
		return true // new pair, or previous identical pair never delivered
	}
	// Latest row repeats a pair that already fired. Scan for intermediate distinct transitions since then.
	for _, t := range history[1:] {
		if samePair(t) {
			continue
		}
		return true // cycle through an intermediate state happened after last notify
	}
	return time.Since(latest.OccurredAt) > 24*time.Hour
}

// GetConnection loads the GitHub connection row for a user.
func (s *Store) GetConnection(ctx context.Context, userID int64) (*Connection, error) {
	var c Connection
	err := s.db.GetContext(ctx, &c,
		`SELECT user_id, COALESCE(github_login,'') AS github_login, status, COALESCE(last_limited,FALSE) AS last_limited,
		        last_synced_at, last_error
		 FROM pr_connections WHERE user_id = ?`, userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// SetConnection upserts connection state (active / reconnect_required, AC6).
func (s *Store) SetConnection(ctx context.Context, userID int64, login, status string, limited bool, lastErr string) error {
	mysql := `
		INSERT INTO pr_connections (user_id, github_login, status, last_limited, last_error, updated_at)
		VALUES (?, ?, ?, ?, NULLIF(?, ''), CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			github_login = VALUES(github_login), status = VALUES(status), last_limited = VALUES(last_limited),
			last_error = VALUES(last_error), updated_at = CURRENT_TIMESTAMP`
	sqlite := `
		INSERT INTO pr_connections (user_id, github_login, status, last_limited, last_error, updated_at)
		VALUES (?, ?, ?, ?, NULLIF(?, ''), CURRENT_TIMESTAMP)
		ON CONFLICT(user_id) DO UPDATE SET
			github_login = excluded.github_login, status = excluded.status, last_limited = excluded.last_limited,
			last_error = excluded.last_error, updated_at = CURRENT_TIMESTAMP`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	_, err := s.db.ExecContext(ctx, q, userID, login, status, limited, lastErr)
	return err
}

// TouchSynced records a completed sync and clears transient flags.
func (s *Store) TouchSynced(ctx context.Context, userID int64, at time.Time, limited bool) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE pr_connections SET last_synced_at = ?, last_limited = ?, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
		at, limited, userID)
	return err
}

// ConnectedUserIDs lists users enrolled in PR tracking that are not in reconnect_required state (AC6 skips fetches).
func (s *Store) ConnectedUserIDs(ctx context.Context) ([]int64, error) {
	var ids []int64
	err := s.db.SelectContext(ctx, &ids,
		`SELECT user_id FROM pr_connections WHERE status != '` + ConnectionReconnectRequired + `'`)
	return ids, err
}

// StallAlertStatus is the lifecycle state of a PR's stall-rescue alert (AC3):
// pending/sent/stale/failed rows stay visible in the dashboard; failed rows
// await manual or next-cycle reset (AC6).
type StallAlertStatus struct {
	Status   string `db:"status" json:"status"`
	Attempts int    `db:"attempts" json:"attempts"`
}

// StallAlertStatuses maps pr_id -> newest stall-alert status for the user's PRs.
func (s *Store) StallAlertStatuses(ctx context.Context, userID int64) (map[string]StallAlertStatus, error) {
	var rows []struct {
		PRID     string `db:"pr_id"`
		Status   string `db:"status"`
		Attempts int    `db:"attempts"`
	}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT pr_id, status, attempts FROM pr_stall_alerts
		WHERE id IN (SELECT MAX(id) FROM pr_stall_alerts WHERE user_id = ? GROUP BY pr_id)`, userID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]StallAlertStatus, len(rows))
	for _, r := range rows {
		out[r.PRID] = StallAlertStatus{Status: r.Status, Attempts: r.Attempts}
	}
	return out, nil
}

// ParsePRID splits "owner/repo#123".
func ParsePRID(prID string) (owner, repo string, number int, ok bool) {
	hash := strings.LastIndex(prID, "#")
	if hash <= 0 || hash == len(prID)-1 {
		return "", "", 0, false
	}
	full := prID[:hash]
	num := 0
	for _, ch := range prID[hash+1:] {
		if ch < '0' || ch > '9' {
			return "", "", 0, false
		}
		num = num*10 + int(ch-'0')
	}
	slash := strings.Index(full, "/")
	if slash <= 0 || slash == len(full)-1 {
		return "", "", 0, false
	}
	return full[:slash], full[slash+1:], num, true
}
