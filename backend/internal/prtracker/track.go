package prtracker

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// Errors returned by TrackPR (AC3/AC8).
var (
	ErrTrackLimitReached = errors.New("track limit reached")
)

// TrackedPRRow is one explicitly-tracked PR joined with its newest snapshot and
// any generated "Merged via OpenDoor" proof card (AC6).
type TrackedPRRow struct {
	PRID        string    `db:"pr_id" json:"pr_id"`
	Owner       string    `db:"owner" json:"owner"`
	Repo        string    `db:"repo" json:"repo"`
	Number      int       `db:"pr_number" json:"pr_number"`
	LatestState string    `db:"latest_state" json:"latest_state"`
	Title       string    `db:"title" json:"title"`
	HTMLURL     string    `db:"html_url" json:"html_url"`
	FetchedAt   time.Time `db:"fetched_at" json:"fetched_at"`
	HasArtifact bool      `db:"has_artifact" json:"has_artifact"`
	CardID      string    `db:"card_id" json:"card_id"`
}

// MergeArtifact is a public Hall-of-Fame / profile entry for a merged tracked PR.
type MergeArtifact struct {
	PRID         string    `db:"pr_id" json:"pr_id"`
	UserID       int64     `db:"user_id" json:"user_id"`
	RepoFullName string    `db:"repo_full_name" json:"repo_full_name"`
	PRNumber     int       `db:"pr_number" json:"pr_number"`
	CardID       string    `db:"card_id" json:"card_id"`
	MergedAt     *time.Time `db:"merged_at" json:"merged_at"`
	Username     string    `db:"username" json:"username"`
	Slug         string    `db:"slug" json:"slug"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

// inTx runs fn inside a single transaction, rolling back on error.
func (s *Store) inTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

// TrackPR records an explicit user-pasted PR (AC2/AC3/AC8). unlimited=true means
// the user is on a paid tier (no per-PR cap). Free tier allows exactly 1 active
// (open, not merged/closed) tracked PR; the cap check runs inside a transaction
// so concurrent calls cannot both pass the limit.
func (s *Store) TrackPR(ctx context.Context, userID int64, owner, repo string, number int, unlimited bool) error {
	prID := fmt.Sprintf("%s/%s#%d", owner, repo, number)
	return s.inTx(ctx, func(tx *sqlx.Tx) error {
		// Idempotent insert first so the active-count below reflects this call,
		// preventing two concurrent tracks from both passing the free-tier cap.
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO pr_tracked (user_id, pr_id, owner, repo, pr_number, created_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, pr_id) DO NOTHING`, userID, prID, owner, repo, number); err != nil {
			return err
		}
		if unlimited {
			return nil
		}
		var active int
		err := tx.GetContext(ctx, &active, `
			SELECT COUNT(*) FROM pr_tracked t
			LEFT JOIN (
				SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots WHERE user_id = ? GROUP BY pr_id
			) s ON s.pr_id = t.pr_id
			LEFT JOIN pr_snapshots ps ON ps.pr_id = s.pr_id AND ps.snapshot_at = s.ms
			WHERE t.user_id = ? AND (ps.state IS NULL OR ps.state NOT IN ('merged','closed'))`, userID, userID)
		if err != nil {
			return err
		}
		if active > 1 {
			// Roll back this insert (keep any pre-existing row) to honor the 1-active-PR cap.
			_, _ = tx.ExecContext(ctx, `DELETE FROM pr_tracked WHERE user_id = ? AND pr_id = ? AND NOT EXISTS (
				SELECT 1 FROM pr_snapshots ps2 WHERE ps2.pr_id = ? AND ps2.user_id = ?)`, userID, prID, prID, userID)
			return ErrTrackLimitReached
		}
		return nil
	})
}

// ListTrackedPRs returns the user's explicitly tracked PRs with their newest
// snapshot state and any generated proof card (AC5/AC6).
func (s *Store) ListTrackedPRs(ctx context.Context, userID int64) ([]TrackedPRRow, error) {
	q := `
		SELECT t.pr_id, t.owner, t.repo, t.pr_number,
		       COALESCE(ps.state, 'open') AS latest_state,
		       COALESCE(ps.title, '') AS title,
		       COALESCE(ps.html_url, '') AS html_url,
		       COALESCE(ps.fetched_at, t.created_at) AS fetched_at,
		       CASE WHEN a.pr_id IS NOT NULL THEN 1 ELSE 0 END AS has_artifact,
		       COALESCE(a.card_id, '') AS card_id
		FROM pr_tracked t
		LEFT JOIN (
			SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots WHERE user_id = ? GROUP BY pr_id
		) s ON s.pr_id = t.pr_id
		LEFT JOIN pr_snapshots ps ON ps.pr_id = s.pr_id AND ps.snapshot_at = s.ms
		LEFT JOIN pr_merge_artifacts a ON a.pr_id = t.pr_id
		WHERE t.user_id = ?
		ORDER BY t.created_at DESC`
	var rows []TrackedPRRow
	if err := s.db.SelectContext(ctx, &rows, q, userID, userID); err != nil {
		return nil, err
	}
	return rows, nil
}

// GetMergeArtifact returns the proof-card ID for a PR if one was generated.
func (s *Store) GetMergeArtifact(ctx context.Context, prID string) (string, bool, error) {
	var cardID string
	err := s.db.GetContext(ctx, &cardID, `SELECT card_id FROM pr_merge_artifacts WHERE pr_id = ?`, prID)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return cardID, true, nil
}

// InsertMergeArtifact records the proof card for a merged PR (idempotent PK).
func (s *Store) InsertMergeArtifact(ctx context.Context, prID string, userID int64, repoFullName string, number int, cardID string, mergedAt *time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO pr_merge_artifacts (pr_id, user_id, repo_full_name, pr_number, card_id, merged_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(pr_id) DO NOTHING`, prID, userID, repoFullName, number, cardID, mergedAt)
	return err
}

// ListMergeArtifacts returns newest proof cards for the Hall of Fame (AC6).
func (s *Store) ListMergeArtifacts(ctx context.Context, limit int) ([]MergeArtifact, error) {
	var rows []MergeArtifact
	err := s.db.SelectContext(ctx, &rows, `
		SELECT a.pr_id, a.user_id, a.repo_full_name, a.pr_number, a.card_id, a.merged_at,
		       COALESCE(u.username, '') AS username, COALESCE(u.slug, '') AS slug, a.created_at
		FROM pr_merge_artifacts a
		LEFT JOIN users u ON u.id = a.user_id
		ORDER BY a.created_at DESC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// MergeArtifactsForUser returns proof cards for one user's public profile (AC6).
func (s *Store) MergeArtifactsForUser(ctx context.Context, userID int64) ([]MergeArtifact, error) {
	var rows []MergeArtifact
	err := s.db.SelectContext(ctx, &rows, `
		SELECT a.pr_id, a.user_id, a.repo_full_name, a.pr_number, a.card_id, a.merged_at,
		       COALESCE(u.username, '') AS username, COALESCE(u.slug, '') AS slug, a.created_at
		FROM pr_merge_artifacts a
		LEFT JOIN users u ON u.id = a.user_id
		WHERE a.user_id = ?
		ORDER BY a.created_at DESC
		LIMIT 50`, userID)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// MergeArtifactSink generates the "Merged via OpenDoor" proof card when a tracked
// PR is detected merged (AC6). Implemented in the handler package to reuse the
// ShareCard + OG pipeline; set on Service so the cron sync can call it.
type MergeArtifactSink interface {
	OnMerged(ctx context.Context, userID int64, owner, repo string, number int, prID, title, htmlURL string, mergedAt time.Time) (cardID string, err error)
}

func derefTime(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return *t
}
