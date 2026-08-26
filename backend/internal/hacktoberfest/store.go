package hacktoberfest

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// StoredMerge is one persisted qualifying merge ID (the AC2 source-of-truth set).
type StoredMerge struct {
	PRID         string     `db:"pr_id" json:"pr_id"`
	RepositoryID string     `db:"repository_id" json:"repository_id"`
	Number       int        `db:"pr_number" json:"pr_number"`
	Title        string     `db:"title" json:"title"`
	HTMLURL      string     `db:"html_url" json:"html_url"`
	MergedAt     *time.Time `db:"merged_at" json:"merged_at"`
}

// Progress is the per-user/year persisted state.
type Progress struct {
	UserID           int64      `db:"user_id"`
	Year             int        `db:"year"`
	CardIssued       bool       `db:"card_issued"`
	CardID           string     `db:"card_id"`
	TotalQualifying  int        `db:"total_qualifying"` // last reconciled total, -1 = unknown
	LastReconciledAt *time.Time `db:"last_reconciled_at"`
	LastNudgedAt     *time.Time `db:"last_nudged_at"`
	BackoffUntil     *time.Time `db:"backoff_until"`
	BackoffAttempts  int        `db:"backoff_attempts"`
}

// Viewer is an active page owner for lazy polling (AC5).
type Viewer struct {
	UserID int64  `db:"user_id"`
	Login  string `db:"login"`
}

// ReconcileOutcome reports what one transactional reconcile pass changed.
type ReconcileOutcome struct {
	Total      int    // all qualifying merges persisted (extras included, AC8)
	IssuedCard bool   // won the card_issued CAS in this pass
	CardID     string // set when IssuedCard or already issued previously
}

type Store struct {
	db *sqlx.DB
}

func NewStore(db *sqlx.DB) *Store { return &Store{db: db} }

func (s *Store) Driver() string { return s.db.DriverName() }

// GetProgress loads per-user/year progress; zero-value row when absent.
func (s *Store) GetProgress(ctx context.Context, userID int64, year int) (Progress, error) {
	var p Progress
	err := s.db.GetContext(ctx, &p, `
		SELECT user_id, year, card_issued, card_id, total_qualifying,
		       last_reconciled_at, last_nudged_at, backoff_until, backoff_attempts
		FROM hacktoberfest_progress WHERE user_id = ? AND year = ?`, userID, year)
	if err != nil {
		return Progress{}, err
	}
	return p, nil
}

// HasProgress reports whether a progress row exists.
func (s *Store) HasProgress(ctx context.Context, userID int64, year int) bool {
	var one int
	err := s.db.GetContext(ctx, &one,
		`SELECT 1 FROM hacktoberfest_progress WHERE user_id = ? AND year = ?`, userID, year)
	return err == nil && one == 1
}

// ListStoredMerges returns every persisted qualifying merge, oldest first
// (display order); extras beyond TargetMergeCount stay listed (AC8).
func (s *Store) ListStoredMerges(ctx context.Context, userID int64, year int) ([]StoredMerge, error) {
	var out []StoredMerge
	err := s.db.SelectContext(ctx, &out, `
		SELECT pr_id, repository_id, pr_number, COALESCE(title,'') AS title,
		       COALESCE(html_url,'') AS html_url, merged_at
		FROM hacktoberfest_merges WHERE user_id = ? AND year = ?
		ORDER BY merged_at ASC, pr_id ASC`, userID, year)
	return out, err
}

// ReconcileMerges persists the qualifying merge set inside ONE transaction and,
// when the count reaches the target, checks-and-sets card_issued in that same
// transaction before inserting the share_cards completion row (AC4). Upserts
// are idempotent so concurrent page-load/cron/nudge writers converge.
func (s *Store) ReconcileMerges(ctx context.Context, userID int64, year int, candidates []MergeCandidate, linkedLogin string, card CardParams) (*ReconcileOutcome, error) {
	out := &ReconcileOutcome{}
	tx, err := s.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	for _, c := range candidates {
		if !IsQualifyingMerge(c, linkedLogin, year) {
			continue
		}
		if s.db.DriverName() == "sqlite" {
			_, err = tx.ExecContext(ctx, `
				INSERT INTO hacktoberfest_merges (user_id, year, pr_id, repository_id, pr_number, title, html_url, merged_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(user_id, year, pr_id) DO NOTHING`, userID, year, c.PRID, c.RepoFullName, c.Number, c.Title, c.HTMLURL, utcOrNil(c.MergedAt))
		} else {
			_, err = tx.ExecContext(ctx, `
				INSERT INTO hacktoberfest_merges (user_id, year, pr_id, repository_id, pr_number, title, html_url, merged_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE pr_id = pr_id`, userID, year, c.PRID, c.RepoFullName, c.Number, c.Title, c.HTMLURL, utcOrNil(c.MergedAt))
		}
		if err != nil {
			return nil, err
		}
	}

	var total int
	if err := tx.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM hacktoberfest_merges WHERE user_id = ? AND year = ?`, userID, year); err != nil {
		return nil, err
	}
	out.Total = total

	if s.db.DriverName() == "sqlite" {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO hacktoberfest_progress (user_id, year, total_qualifying, updated_at)
			VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, year) DO UPDATE SET total_qualifying = excluded.total_qualifying, updated_at = CURRENT_TIMESTAMP`,
			userID, year, total)
	} else {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO hacktoberfest_progress (user_id, year, total_qualifying, updated_at)
			VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE total_qualifying = VALUES(total_qualifying), updated_at = CURRENT_TIMESTAMP`,
			userID, year, total)
	}
	if err != nil {
		return nil, err
	}

	if err := tx.GetContext(ctx, &out.CardID,
		`SELECT card_id FROM hacktoberfest_progress WHERE user_id = ? AND year = ?`, userID, year); err != nil {
		return nil, err
	}

	if total >= TargetMergeCount {
		res, err := tx.ExecContext(ctx, `
			UPDATE hacktoberfest_progress SET card_issued = TRUE, card_id = ?, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? AND year = ? AND card_issued = FALSE`, card.ID, userID, year)
		if err != nil {
			return nil, err
		}
		if affected, _ := res.RowsAffected(); affected == 1 {
			// CAS won: this caller finalizes the 4th merge and issues the card atomically.
			if err := issueShareCardTx(ctx, tx, userID, year, card); err != nil {
				return nil, err
			}
			out.IssuedCard = true
			out.CardID = card.ID
		}
	}

	return out, tx.Commit()
}

// CardParams carries the pre-built completion card payload so the store can
// insert it inside the reconcile transaction.
type CardParams struct {
	ID       string
	RefToken string
	Summary  string
	ExpiresAt time.Time
}

const shareCardRepoLabel = "Hacktoberfest"

func issueShareCardTx(ctx context.Context, tx *sqlx.Tx, userID int64, year int, card CardParams) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO share_cards (id, user_id, repo_full_name, pr_title, summary, overall_score, ready_to_merge, ref_token, consent_given, created_at, expires_at)
		VALUES (?, ?, ?, NULL, ?, ?, TRUE, ?, TRUE, CURRENT_TIMESTAMP, ?)`,
		card.ID, userID, shareCardLabel(year), card.Summary, float64(100), card.RefToken, card.ExpiresAt)
	return err
}

func shareCardLabel(year int) string {
	return fmt.Sprintf("%s %d", shareCardRepoLabel, year)
}

// MarkReconciled stamps a successful GitHub reconcile (cache/throttle anchor).
func (s *Store) MarkReconciled(ctx context.Context, userID int64, year int, at time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE hacktoberfest_progress
		SET last_reconciled_at = ?, backoff_until = NULL, backoff_attempts = 0, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND year = ?`, at.UTC(), userID, year)
	return err
}

// MarkNudged records the last stream-triggered poll attempt (AC3 throttle).
func (s *Store) MarkNudged(ctx context.Context, userID int64, year int, at time.Time) error {
	ensureSQL := `
		INSERT INTO hacktoberfest_progress (user_id, year, last_nudge_at, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
	if s.db.DriverName() == "sqlite" {
		ensureSQL += ` ON CONFLICT(user_id, year) DO UPDATE SET last_nudge_at = excluded.last_nudge_at, updated_at = CURRENT_TIMESTAMP`
	} else {
		ensureSQL += ` ON DUPLICATE KEY UPDATE last_nudge_at = VALUES(last_nudge_at), updated_at = CURRENT_TIMESTAMP`
	}
	if _, err := s.db.ExecContext(ctx, ensureSQL, userID, year, at.UTC()); err != nil {
		return err
	}
	return nil
}

// SetBackoff persists exponential-backoff state after a limited/failed fetch (AC5).
func (s *Store) SetBackoff(ctx context.Context, userID int64, year int, attempts int, until time.Time) error {
	ensureSQL := `
		INSERT INTO hacktoberfest_progress (user_id, year, backoff_until, backoff_attempts, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
	args := []any{userID, year, until.UTC(), attempts}
	if s.db.DriverName() == "sqlite" {
		ensureSQL += ` ON CONFLICT(user_id, year) DO UPDATE SET backoff_until = excluded.backoff_until, backoff_attempts = excluded.backoff_attempts, updated_at = CURRENT_TIMESTAMP`
	} else {
		ensureSQL += ` ON DUPLICATE KEY UPDATE backoff_until = VALUES(backoff_until), backoff_attempts = VALUES(backoff_attempts), updated_at = CURRENT_TIMESTAMP`
	}
	_, err := s.db.ExecContext(ctx, ensureSQL, args...)
	return err
}

// TouchActive marks a viewer page as open for lazy cron polling (AC5).
func (s *Store) TouchActive(ctx context.Context, userID int64, at time.Time) error {
	sql := `
		INSERT INTO hacktoberfest_activity (user_id, last_active_at)
		VALUES (?, ?)`
	if s.db.DriverName() == "sqlite" {
		sql += ` ON CONFLICT(user_id) DO UPDATE SET last_active_at = excluded.last_active_at`
	} else {
		sql += ` ON DUPLICATE KEY UPDATE last_active_at = VALUES(last_active_at)`
	}
	_, err := s.db.ExecContext(ctx, sql, userID, at.UTC())
	return err
}

// ActiveUserIDs lists users whose page was seen open since cutoff (AC5 lazy).
func (s *Store) ActiveUserIDs(ctx context.Context, cutoff time.Time) ([]int64, error) {
	var ids []int64
	err := s.db.SelectContext(ctx, &ids,
		`SELECT user_id FROM hacktoberfest_activity WHERE last_active_at >= ?`, cutoff.UTC())
	return ids, err
}

// ActiveViewers lists active page owners with their best-known GitHub login
// (connection login first, username fallback) for lazy cron polling (AC5).
func (s *Store) ActiveViewers(ctx context.Context, cutoff time.Time) ([]Viewer, error) {
	var out []Viewer
	err := s.db.SelectContext(ctx, &out, `
		SELECT a.user_id, COALESCE(NULLIF(c.github_login,''), u.username) AS login
		FROM hacktoberfest_activity a
		JOIN users u ON u.id = a.user_id
		LEFT JOIN pr_connections c ON c.user_id = a.user_id
		WHERE a.last_active_at >= ?`, cutoff.UTC())
	return out, err
}

func utcOrNil(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	u := t.UTC()
	return &u
}
