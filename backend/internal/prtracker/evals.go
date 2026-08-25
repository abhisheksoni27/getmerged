package prtracker

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

// Verified-outcome taxonomy for saved PR evaluations (AC1/AC2):
//
//	hit     = merged within 30 days of eval creation with predicted probability >= 50
//	miss    = merged after the window, closed unmerged (incl. duplicate/robot), or window expired unmerged
//	pending = still inside the 30-day window without a terminal state (incl. reopened)
const (
	EvalOutcomeHit     = "hit"
	EvalOutcomeMiss    = "miss"
	EvalOutcomePending = "pending"

	// EvalVerdictWindow bounds how long a forecast has to come true (AC1).
	EvalVerdictWindow = 30 * 24 * time.Hour
)

// EvalRegistration captures the join key at eval time (AC4): repo full_name +
// PR number, plus the predicted probability and creation timestamp.
type EvalRegistration struct {
	EvalID    string
	Repo      string // "owner/repo" full_name
	PRNumber  int    // 0 when the eval is not tied to a specific PR
	Score     int    // predicted merge probability 0-100
	CreatedAt time.Time
}

// Accuracy is the public per-user hit rate (AC3).
type Accuracy struct {
	Rate float64 `json:"rate"`
	N    int     `json:"n"`
}

// EvalOutcome is the public verdict payload consumed by /share/pr-eval pages,
// dashboard cards and OG rendering (AC5: all render from this same field set).
type EvalOutcome struct {
	EvalID      string     `json:"eval_id"`
	State       string     `json:"state"`
	Predicted   int        `json:"predicted_score"`
	DaysToMerge *float64   `json:"days_to_merge"`
	ResolvedAt  *time.Time `json:"resolved_at"`
	MergedAt    *time.Time `json:"merged_at"`
	OutcomeHash string     `json:"outcome_hash"`
	PRNumber    *int       `json:"pr_number"`
	Creator     string     `json:"creator_login,omitempty"`
	ResolvedN   int        `json:"resolved_n"`
	Accuracy    *Accuracy  `json:"accuracy"`
}

// RegisterEval upserts an evaluation keyed by its public eval_id. Re-sharing
// refreshes the join key/prediction but never clobbers a computed verdict.
func (s *Store) RegisterEval(ctx context.Context, reg EvalRegistration) error {
	mysql := `
		INSERT INTO pr_evaluations (eval_id, repository_full_name, pr_number, predicted_score, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE repository_full_name=VALUES(repository_full_name),
			pr_number=VALUES(pr_number), predicted_score=VALUES(predicted_score),
			created_at=VALUES(created_at), updated_at=CURRENT_TIMESTAMP`
	sqlite := `
		INSERT INTO pr_evaluations (eval_id, repository_full_name, pr_number, predicted_score, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(eval_id) DO UPDATE SET repository_full_name=excluded.repository_full_name,
			pr_number=excluded.pr_number, predicted_score=excluded.predicted_score,
			created_at=excluded.created_at, updated_at=CURRENT_TIMESTAMP`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	var num any
	if reg.PRNumber > 0 {
		num = reg.PRNumber
	}
	_, err := s.db.ExecContext(ctx, q, reg.EvalID, reg.Repo, num, reg.Score, reg.CreatedAt.UTC())
	return err
}

// UpdateEvalOutcomes recomputes every registered evaluation against the latest
// tracked snapshot for its join key (AC4). Changed terminal verdicts enqueue a
// single idempotent OG regeneration job keyed (eval_id, outcome_hash) (AC5).
// Returns how many rows changed.
func (s *Store) UpdateEvalOutcomes(ctx context.Context) (int, error) {
	rows := []struct {
		ID          int64      `db:"id"`
		EvalID      string     `db:"eval_id"`
		Score       int        `db:"predicted_score"`
		CreatedAt   time.Time  `db:"created_at"`
		OutcomeHash string     `db:"outcome_hash"`
		State       *string    `db:"state"`
		EffMergedAt *time.Time `db:"eff_merged_at"`
		OwnerUID    *int64     `db:"owner_uid"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT e.id, e.eval_id, e.predicted_score, e.created_at, e.outcome_hash,
		       latest.state AS state,
		       COALESCE(mm.max_merged, latest.merged_at) AS eff_merged_at,
		       ow.uid AS owner_uid
		FROM pr_evaluations e
		LEFT JOIN (
			SELECT ps.pr_id, ps.repository_id, ps.pr_number, ps.state, ps.merged_at
			FROM pr_snapshots ps
			JOIN (SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots GROUP BY pr_id) t
			  ON t.pr_id = ps.pr_id AND t.ms = ps.snapshot_at
		) latest ON latest.repository_id = e.repository_full_name AND latest.pr_number = e.pr_number
		LEFT JOIN (
			SELECT pr_id, MAX(merged_at) AS max_merged FROM pr_snapshots WHERE merged_at IS NOT NULL GROUP BY pr_id
		) mm ON mm.pr_id = latest.pr_id
		LEFT JOIN (SELECT pr_id, MIN(user_id) AS uid FROM pr_snapshots GROUP BY pr_id) ow
		       ON ow.pr_id = latest.pr_id
		WHERE e.pr_number IS NOT NULL`)
	if err != nil {
		return 0, err
	}

	now := time.Now().UTC()
	changed := 0
	for i := range rows {
		r := &rows[i]
		outcome, resolved, merged, days := deriveEvalOutcome(r.Score, r.CreatedAt, r.State, r.EffMergedAt, now)
		hash := OutcomeHash(r.EvalID, outcome, resolved)
		if hash == r.OutcomeHash {
			continue
		}
		var owner any
		if r.OwnerUID != nil {
			owner = *r.OwnerUID
		}
		if _, err := s.db.ExecContext(ctx, `
			UPDATE pr_evaluations SET outcome=?, resolved_at=?, merged_at=?, days_to_merge=?,
				outcome_hash=?, owner_user_id=COALESCE(?, owner_user_id), updated_at=?
			WHERE id=?`,
			outcome, resolved, merged, days, hash, owner, now, r.ID); err != nil {
			continue
		}
		changed++
		if outcome != EvalOutcomePending {
			s.EnqueueOGRegen(ctx, r.EvalID, hash)
		}
	}
	return changed, nil
}

// deriveEvalOutcome implements AC1/AC2. A merge event observed after a close
// wins (latest merge event via MAX(merged_at)); 'closed' without a merge event
// is terminal (closed_unmerged incl. duplicate/robot); reopened PRs simply read
// as open/latest again and fall back to pending while inside the window.
func deriveEvalOutcome(score int, createdAt time.Time, state *string, mergedAt *time.Time, now time.Time) (string, *time.Time, *time.Time, *float64) {
	deadline := createdAt.UTC().Add(EvalVerdictWindow)
	created := createdAt.UTC()
	if mergedAt != nil {
		m := mergedAt.UTC()
		d := m.Sub(created).Hours() / 24
		if d < 0 {
			d = 0
		}
		dd := d
		resolved := m
		if score >= 50 && !m.After(deadline) {
			return EvalOutcomeHit, &resolved, &m, &dd
		}
		return EvalOutcomeMiss, &resolved, &m, &dd
	}
	if state != nil && *state == "closed" { // closed_unmerged is terminal (AC2)
		resolved := now
		return EvalOutcomeMiss, &resolved, nil, nil
	}
	if now.After(deadline) {
		resolved := deadline
		return EvalOutcomeMiss, &resolved, nil, nil
	}
	return EvalOutcomePending, nil, nil, nil
}

// OutcomeHash fingerprints a verdict; it doubles as the cache-bust version on
// OG image URLs and the dedupe key of the regen queue (AC5/AC6).
func OutcomeHash(evalID, outcome string, resolvedAt *time.Time) string {
	var ts int64
	if resolvedAt != nil {
		ts = resolvedAt.Unix()
	}
	h := sha1.Sum([]byte(fmt.Sprintf("%s|%s|%d", evalID, outcome, ts)))
	return hex.EncodeToString(h[:])[:12]
}

// EnqueueOGRegen inserts one idempotent job per (eval_id, outcome_hash); the
// UNIQUE key dedupes concurrent syncs racing on the same transition (AC5).
func (s *Store) EnqueueOGRegen(ctx context.Context, evalID, hash string) {
	mysql := `INSERT IGNORE INTO og_regen_queue (eval_id, outcome_hash, status, attempts, created_at)
		VALUES (?, ?, 'pending', 0, CURRENT_TIMESTAMP)`
	sqlite := `INSERT OR IGNORE INTO og_regen_queue (eval_id, outcome_hash, status, attempts, created_at)
		VALUES (?, ?, 'pending', 0, CURRENT_TIMESTAMP)`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	_, _ = s.db.ExecContext(ctx, q, evalID, hash)
}

// CompleteOGRegenJobs drains pending jobs. Regeneration itself is lazy: the
// verdict's new outcome_hash busts CDN caches via the ?v= URL param on the OG
// route, so marking done bounds staleness to the next fetch (AC5/AC6).
func (s *Store) CompleteOGRegenJobs(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE og_regen_queue SET status='done', completed_at=CURRENT_TIMESTAMP WHERE status='pending'`)
	return err
}

// GetEvalOutcome loads the stored verdict plus the owner's public accuracy
// rate (AC3: only published once >= 5 evals have resolved).
func (s *Store) GetEvalOutcome(ctx context.Context, evalID string) (*EvalOutcome, error) {
	row := struct {
		EvalID      string      `db:"eval_id"`
		FullName    string      `db:"repository_full_name"`
		PRNumber    sql.NullInt64 `db:"pr_number"`
		Predicted   int         `db:"predicted_score"`
		OwnerUID    sql.NullInt64 `db:"owner_user_id"`
		Outcome     string      `db:"outcome"`
		ResolvedAt  *time.Time  `db:"resolved_at"`
		MergedAt    *time.Time  `db:"merged_at"`
		DaysToMerge *float64    `db:"days_to_merge"`
		OutcomeHash string      `db:"outcome_hash"`
	}{}
	err := s.db.GetContext(ctx, &row, `
		SELECT eval_id, repository_full_name, pr_number, predicted_score, owner_user_id,
		       outcome, resolved_at, merged_at, days_to_merge, outcome_hash
		FROM pr_evaluations WHERE eval_id = ?`, evalID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	out := &EvalOutcome{
		EvalID:      row.EvalID,
		State:       row.Outcome,
		Predicted:   row.Predicted,
		DaysToMerge: row.DaysToMerge,
		ResolvedAt:  row.ResolvedAt,
		MergedAt:    row.MergedAt,
		OutcomeHash: row.OutcomeHash,
	}
	if row.PRNumber.Valid {
		n := int(row.PRNumber.Int64)
		out.PRNumber = &n
	}

	// Owner identity + public accuracy (AC3). Any failure degrades silently:
	// the page still renders the verdict, just without accuracy extras.
	if row.OwnerUID.Valid {
		uid := row.OwnerUID.Int64
		var login string
		if err := s.db.GetContext(ctx, &login,
			`SELECT COALESCE(github_login,'') FROM pr_connections WHERE user_id = ?`, uid); err == nil {
			out.Creator = login
		}
		var stats struct {
			Resolved int `db:"resolved"`
			Hits     int `db:"hits"`
		}
		if err := s.db.GetContext(ctx, &stats, `
			SELECT COUNT(*) AS resolved,
			       SUM(CASE WHEN outcome = '` + EvalOutcomeHit + `' THEN 1 ELSE 0 END) AS hits
			FROM pr_evaluations WHERE owner_user_id = ? AND outcome IN ('` + EvalOutcomeHit + `','` + EvalOutcomeMiss + `')`, uid); err == nil {
			out.ResolvedN = stats.Resolved
			if stats.Resolved >= 5 {
				out.Accuracy = &Accuracy{Rate: float64(stats.Hits) / float64(stats.Resolved), N: stats.Resolved}
			}
		}
	}
	return out, nil
}
