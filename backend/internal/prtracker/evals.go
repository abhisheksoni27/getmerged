package prtracker

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"time"
)

// Verified-outcome taxonomy for saved PR evaluations (AC1/AC2). Verdict rule
// (fixed): a forecast is a P(merge) score; it is CORRECT ("hit") when the PR
// merged and the prediction was >= 50%, or the PR did not merge and the
// prediction was < 50%; otherwise it is WRONG ("miss").
//
//	hit         = correct forecast under the fixed rule above
//	miss        = wrong forecast under the fixed rule above
//	pending     = PR still open, no terminal state yet (incl. reopened)
const (
	EvalOutcomeHit         = "hit"
	EvalOutcomeMiss        = "miss"
	EvalOutcomePending     = "pending"
	EvalOutcomeUnverifiable = "unverifiable" // no prtracker sync / repo renamed / deleted; excluded from accuracy (AC2)
	EvalOutcomeUnavailable = EvalOutcomeUnverifiable // legacy alias

	// evalStalenessCutoff auto-expires PENDING verdicts with no PR activity (AC8):
	// a dead sync or deleted repo can never resolve, so it turns Unverifiable.
	evalStalenessCutoff = 45 * 24 * time.Hour
	// evalMatchFailureAfter bounds the sync-lag grace before a zero-match join
	// key (rename/transfer/404, AC5) flips from Pending to Unverifiable; a
	// tracked PR always matches within minutes of registration.
	evalMatchFailureAfter = 24 * time.Hour
)

// EvalRegistration captures the join key at eval time (AC4): stored repo ID +
// PR number, plus the predicted probability, creation timestamp and publicness.
type EvalRegistration struct {
	EvalID   string
	Repo     string // "owner/repo" full_name
	PRNumber int    // 0 when the eval is not tied to a specific PR
	Score    int    // predicted merge probability 0-100
	IsPublic bool   // private-repo evals never enter the accuracy pool (AC3)
	Creator  string
	CreatedAt time.Time
}

// Accuracy is the public per-user hit rate (AC3): correct/settled counts over
// settled (merged-or-closed) evals only; open/unverifiable never count.
type Accuracy struct {
	Rate    float64 `json:"rate"`
	N       int     `json:"n"`
	Correct int     `json:"correct"`
}

// EvalOutcome is the public verdict payload consumed by /share/pr-eval pages,
// dashboard cards and OG rendering (AC5: all render from this same field set).
type EvalOutcome struct {
	EvalID          string     `json:"eval_id"`
	State           string     `json:"state"`
	Predicted       int        `json:"predicted_score"`
	DaysToMerge     *float64   `json:"days_to_merge"`
	ResolvedAt      *time.Time `json:"resolved_at"`
	MergedAt        *time.Time `json:"merged_at"`
	OutcomeHash     string     `json:"outcome_hash"`
	OutcomeUpdatedAt *time.Time `json:"outcome_updated_at"` // AC4: OG cache-bust version source
	PRNumber        *int       `json:"pr_number"`
	Creator         string     `json:"creator_login,omitempty"`
	ResolvedN       int        `json:"resolved_n"`
	Accuracy        *Accuracy  `json:"accuracy"`
	// AC1: outcome freshness — last outcome-sync time plus a sync-failure
	// flag; AC3 badges derive purely from these cached fields, never live calls.
	LastSyncedAt *time.Time `json:"last_synced_at"`
	SyncFailed   bool       `json:"sync_failed"`
	// AC4: accuracy snapshot version; OG cache key = f(outcome_hash, this).
	AccuracyVersion string `json:"accuracy_snapshot_version"`
	OwnerUID     int64      `json:"-"`
}

// RegisterEval upserts an evaluation keyed by its public eval_id. Re-sharing
// refreshes the join key/prediction but never clobbers a computed verdict.
func (s *Store) RegisterEval(ctx context.Context, reg EvalRegistration) error {
	mysql := `
		INSERT INTO pr_evaluations (eval_id, repository_full_name, pr_number, predicted_score, is_public, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE repository_full_name=VALUES(repository_full_name),
			pr_number=VALUES(pr_number), predicted_score=VALUES(predicted_score),
			is_public=VALUES(is_public), created_at=VALUES(created_at), updated_at=CURRENT_TIMESTAMP`
	sqlite := `
		INSERT INTO pr_evaluations (eval_id, repository_full_name, pr_number, predicted_score, is_public, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(eval_id) DO UPDATE SET repository_full_name=excluded.repository_full_name,
			pr_number=excluded.pr_number, predicted_score=excluded.predicted_score,
			is_public=excluded.is_public, created_at=excluded.created_at, updated_at=CURRENT_TIMESTAMP`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	var num any
	if reg.PRNumber > 0 {
		num = reg.PRNumber
	}
	_, err := s.db.ExecContext(ctx, q, reg.EvalID, reg.Repo, num, reg.Score, reg.IsPublic, reg.CreatedAt.UTC())
	return err
}

// UpdateEvalOutcomes recomputes every registered evaluation against the latest
// tracked snapshot for its join key (AC4). Changed terminal verdicts enqueue a
// single idempotent OG regeneration job keyed (eval_id, outcome_hash) (AC5).
// Returns how many rows changed.
func (s *Store) UpdateEvalOutcomes(ctx context.Context) (int, error) {
	rows := []struct {
		ID           int64      `db:"id"`
		EvalID       string     `db:"eval_id"`
		Repo         string     `db:"repo"`
		PRNumber     int        `db:"pr_number"`
		Score        int        `db:"predicted_score"`
		CreatedAt    time.Time  `db:"created_at"`
		OutcomeHash  string     `db:"outcome_hash"`
		State        *string    `db:"state"`
		EffMergedAt  *time.Time `db:"eff_merged_at"`
		LastActivity *time.Time `db:"last_activity"`
		FetchedAt    *time.Time `db:"snap_fetched_at"`
		OwnerUID     *int64     `db:"owner_uid"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT e.id, e.eval_id, e.repository_full_name AS repo, e.pr_number, e.predicted_score,
		       e.created_at, e.outcome_hash,
		       latest.state AS state,
		       COALESCE(mm.max_merged, latest.merged_at) AS eff_merged_at,
		       latest.github_updated_at AS last_activity,
		       latest.fetched_at AS snap_fetched_at,
		       ow.uid AS owner_uid
		FROM pr_evaluations e
		LEFT JOIN (
			SELECT ps.pr_id, ps.repository_id, ps.pr_number, ps.state, ps.merged_at, ps.github_updated_at, ps.fetched_at
			FROM pr_snapshots ps
			JOIN (SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots GROUP BY pr_id) t
			  ON t.pr_id = ps.pr_id AND t.ms = ps.snapshot_at
		) latest ON LOWER(latest.repository_id) = LOWER(e.repository_full_name) AND latest.pr_number = e.pr_number
		LEFT JOIN (
			SELECT pr_id, MAX(merged_at) AS max_merged FROM pr_snapshots WHERE merged_at IS NOT NULL GROUP BY pr_id
		) mm ON mm.pr_id = latest.pr_id
		LEFT JOIN (SELECT pr_id, MIN(user_id) AS uid FROM pr_snapshots GROUP BY pr_id) ow
		       ON ow.pr_id = latest.pr_id
		WHERE e.pr_number IS NOT NULL`)
	if err != nil {
		return 0, err
	}

	// AC5 re-resolve: on a join miss, retry once against the repo's CURRENT
	// full_name from the repositories catalog (rename/transfer case).
	for i := range rows {
		if rows[i].State != nil || rows[i].EffMergedAt != nil {
			continue
		}
		var cur string
		if err := s.db.GetContext(ctx, &cur, `
			SELECT full_name FROM repositories
			WHERE LOWER(full_name) = LOWER(?) OR LOWER(id) = LOWER(?)
			ORDER BY CASE WHEN LOWER(full_name) = LOWER(?) THEN 0 ELSE 1 END LIMIT 1`,
			rows[i].Repo, rows[i].Repo, rows[i].Repo); err != nil || cur == "" {
			continue
		}
		if strings.EqualFold(cur, rows[i].Repo) {
			continue // same name — genuinely no snapshot yet, not a rename
		}
		var m struct {
			State        *string    `db:"state"`
			MergedAt     *time.Time `db:"merged_at"`
			LastActivity *time.Time `db:"last_activity"`
			FetchedAt    *time.Time `db:"fetched_at"`
			OwnerUID     *int64     `db:"owner_uid"`
		}
		if err := s.db.GetContext(ctx, &m, `
			SELECT ps.state, ps.merged_at, ps.github_updated_at AS last_activity, ps.fetched_at, ow.uid AS owner_uid
			FROM pr_snapshots ps
			JOIN (SELECT pr_id, MAX(snapshot_at) AS ms FROM pr_snapshots GROUP BY pr_id) t
			  ON t.pr_id = ps.pr_id AND t.ms = ps.snapshot_at
			LEFT JOIN (SELECT pr_id, MIN(user_id) AS uid FROM pr_snapshots GROUP BY pr_id) ow
			       ON ow.pr_id = ps.pr_id
			WHERE LOWER(ps.repository_id) = LOWER(?) AND ps.pr_number = ?
			LIMIT 1`, cur, rows[i].PRNumber); err != nil {
			continue
		}
		rows[i].State = m.State
		rows[i].EffMergedAt = m.MergedAt
		rows[i].LastActivity = m.LastActivity
		rows[i].FetchedAt = m.FetchedAt
		rows[i].OwnerUID = m.OwnerUID
	}

	// Terminal transitions (merged/closed) are recorded by sync.go's
	// left-the-search-window detection but never upserted into pr_snapshots;
	// load the latest terminal transition per PR once and use it as a fallback
	// whenever it is newer than the newest snapshot (AC1).
	type termTransition struct {
		State string
		At    time.Time
	}
	term := map[string]termTransition{}
	trs := []struct {
		PID        string    `db:"pid"`
		ToState    string    `db:"to_state"`
		OccurredAt time.Time `db:"occurred_at"`
	}{}
	if err := s.db.SelectContext(ctx, &trs, `
		SELECT LOWER(t.pr_id) AS pid, t.to_state, t.occurred_at
		FROM pr_state_transitions t
		JOIN (SELECT LOWER(pr_id) AS pid, MAX(occurred_at) AS mo
		      FROM pr_state_transitions WHERE to_state IN ('`+StateMerged+`','closed') GROUP BY LOWER(pr_id)) x
		  ON x.pid = LOWER(t.pr_id) AND x.mo = t.occurred_at`); err == nil {
		for _, tr := range trs {
			term[tr.PID] = termTransition{State: tr.ToState, At: tr.OccurredAt.UTC()}
		}
	}

	now := time.Now().UTC()
	changed := 0
	for i := range rows {
		r := &rows[i]
		key := strings.ToLower(fmt.Sprintf("%s#%d", r.Repo, r.PRNumber))
		effState, effMerged := r.State, r.EffMergedAt
		if tr, ok := term[key]; ok && (r.State == nil || r.FetchedAt == nil || tr.At.After(r.FetchedAt.UTC())) {
			effState = &tr.State
			if tr.State == StateMerged && effMerged == nil {
				m := tr.At
				effMerged = &m
			}
		}
		outcome, resolved, merged, days := deriveEvalOutcome(r.Score, r.CreatedAt, effState, effMerged, r.LastActivity, now)
		if outcome == EvalOutcomePending && r.State == nil && r.EffMergedAt == nil && r.LastActivity == nil &&
			now.Sub(r.CreatedAt.UTC()) > evalMatchFailureAfter {
			// AC2/AC5: key never matched a tracked snapshot even after one
			// re-resolve (rename/transfer/404) -> Unverifiable, never a verdict.
			o := r.CreatedAt.UTC().Add(evalMatchFailureAfter)
			outcome, resolved = EvalOutcomeUnverifiable, &o
		}
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
	// AC2/AC4: every pass re-checks unresolved outcomes; stamp sync recency so
	// AC3 badges derive from real data. Terminal hit|miss verdicts stay
	// untouched (never re-synced).
	s.touchUnresolvedSynced(ctx, now)
	return changed, nil
}

// touchUnresolvedSynced marks unresolved (pending) evals as freshly synced
// (AC2). Terminal hit|miss verdicts are never re-synced.
func (s *Store) touchUnresolvedSynced(ctx context.Context, at time.Time) {
	_, _ = s.db.ExecContext(ctx,
		`UPDATE pr_evaluations SET last_synced_at = ? WHERE pr_number IS NOT NULL AND outcome = ?`,
		at, EvalOutcomePending)
}

// deriveEvalOutcome implements the fixed AC1 rule: hit when (merged AND
// predicted >= 50) OR (not merged AND predicted < 50), miss otherwise. A merge
// event observed after a close wins (latest merge event via MAX(merged_at));
// 'closed' without a merge event is terminal (closed_unmerged). Open PRs stay
// pending (AC2). Lookahead-violating evals (created after the merge), merged
// PRs with a null merge timestamp, and dead-sync/stale snapshots are
// UNVERIFIABLE: neutral, excluded from accuracy, never scored (AC2/AC3).
func deriveEvalOutcome(score int, createdAt time.Time, state *string, mergedAt *time.Time, lastActivity *time.Time, now time.Time) (string, *time.Time, *time.Time, *float64) {
	created := createdAt.UTC()
	if score < 0 || score > 100 { // missing/invalid prediction is never scored (AC3)
		return EvalOutcomePending, nil, nil, nil
	}
	if state != nil && *state == "merged" && mergedAt == nil { // merge seen, no timestamp (AC3)
		return EvalOutcomeUnverifiable, nil, nil, nil
	}
	if lastActivity != nil && now.Sub(lastActivity.UTC()) > evalStalenessCutoff && mergedAt == nil { // dead sync / deleted repo (AC8)
		resolved := lastActivity.UTC().Add(evalStalenessCutoff)
		return EvalOutcomeUnverifiable, &resolved, nil, nil
	}
	if mergedAt != nil {
		m := mergedAt.UTC()
		if m.Sub(created) < time.Minute { // lookahead guard: no retroactive verdicts (AC4)
			return EvalOutcomeUnverifiable, nil, &m, nil
		}
		d := math.Floor(m.Sub(created).Hours() / 24) // AC2: whole days, UTC
		if d < 0 {
			d = 0
		}
		dd := d
		resolved := m
		if score >= 50 { // merged AND predicted >= 50% -> correct (AC1)
			return EvalOutcomeHit, &resolved, &m, &dd
		}
		return EvalOutcomeMiss, &resolved, &m, &dd
	}
	if state != nil && *state == "closed" { // closed unmerged is terminal (AC2)
		resolved := now
		if score < 50 { // not merged AND predicted < 50% -> correct (AC1)
			return EvalOutcomeHit, &resolved, nil, nil
		}
		return EvalOutcomeMiss, &resolved, nil, nil
	}
	return EvalOutcomePending, nil, nil, nil // still open -> Pending (AC2)
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

// PendingOGRegenEvalIDs lists eval ids with pending regen jobs (AC3): the
// sync loop POSTs each to the frontend /api/revalidate endpoint.
func (s *Store) PendingOGRegenEvalIDs(ctx context.Context) ([]string, error) {
	var ids []string
	err := s.db.SelectContext(ctx, &ids,
		`SELECT DISTINCT eval_id FROM og_regen_queue WHERE status='pending' ORDER BY created_at LIMIT 200`)
	return ids, err
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
// rate (AC3: only published once >= 10 resolved non-private evals).
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
		LastSyncedAt *time.Time `db:"last_synced_at"`
		UpdatedAt   *time.Time  `db:"updated_at"`
	}{}
	err := s.db.GetContext(ctx, &row, `
		SELECT eval_id, repository_full_name, pr_number, predicted_score, owner_user_id,
		       outcome, resolved_at, merged_at, days_to_merge, outcome_hash, last_synced_at, updated_at
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
		LastSyncedAt: row.LastSyncedAt,
		// AC4: version source for the OG ?v= cache-bust param.
		OutcomeUpdatedAt: row.UpdatedAt,
	}
	if row.PRNumber.Valid {
		n := int(row.PRNumber.Int64)
		out.PRNumber = &n
	}

	// AC2 server-side privacy gate, checked before any outcome field leaves
	// the API: verified outcomes render on public share pages only when the
	// source repo is public (present in the public-repo catalog) or the owner
	// opted in via users.public_accuracy. Private-repo metadata (state,
	// merge time) is never exposed; callers degrade to the static snapshot.
	repoPublic := false
	if err := s.db.GetContext(ctx, &repoPublic,
		`SELECT EXISTS(SELECT 1 FROM repositories WHERE LOWER(full_name) = LOWER(?))`, row.FullName); err != nil {
		repoPublic = false
	}
	ownerOptIn := false
	if row.OwnerUID.Valid {
		if err := s.db.GetContext(ctx, &ownerOptIn,
			`SELECT COALESCE(public_accuracy, FALSE) FROM users WHERE id = ?`, row.OwnerUID.Int64); err != nil {
			ownerOptIn = false
		}
	}
	if !repoPublic && !ownerOptIn {
		return nil, nil
	}

	// Owner identity + public accuracy (AC3/AC5). Accuracy auto-includes ALL
	// of the user's settled evals that were shared publicly (share flag =
	// true); private evals never contribute and there is no cherry-picking.
	// Settled means terminal (hit/miss over merged-or-closed PRs); open and
	// unverifiable evals stay out of the denominator. Shown as 'X/Y verified'
	// by callers; hidden ('—') when nothing has settled yet. Any failure
	// degrades silently: the page still renders the verdict.
	if row.OwnerUID.Valid {
		uid := row.OwnerUID.Int64
		var login string
		if err := s.db.GetContext(ctx, &login,
			`SELECT COALESCE(github_login,'') FROM pr_connections WHERE user_id = ?`, uid); err == nil {
			out.Creator = login
		}
		// AC3: sync-failure signal for the freshness badge (distinct gray
		// state); derived from the cached connection row, never a live call.
		if conn, cerr := s.GetConnection(ctx, uid); cerr == nil && conn != nil {
			out.SyncFailed = conn.Status == ConnectionReconnectRequired ||
				(conn.LastError != nil && *conn.LastError != "")
		}
		// AC4: accuracy snapshot version bumps whenever any of the owner's
		// settled evals changes resolution; OG keys fold it in.
		out.AccuracyVersion = s.accuracySnapshotVersion(ctx, uid)
		// AC5: accuracy = hits / resolved evals (terminal hit|miss only);
		// pending and unverifiable stay out of numerator and denominator.
		var stats struct {
			Resolved int `db:"resolved"`
			Hits     int `db:"hits"`
		}
		q := `
			SELECT COUNT(*) AS resolved,
			       COALESCE(SUM(CASE WHEN pe.outcome = '` + EvalOutcomeHit + `' THEN 1 ELSE 0 END), 0) AS hits
			FROM pr_evaluations pe
			WHERE pe.owner_user_id = ? AND pe.is_public = TRUE
				AND pe.outcome IN ('` + EvalOutcomeHit + `','` + EvalOutcomeMiss + `')`
		if err := s.db.GetContext(ctx, &stats, q, uid); err == nil {
			out.ResolvedN = stats.Resolved
			if stats.Resolved >= 10 { // AC5: published once N >= 10 verified
				out.Accuracy = &Accuracy{Rate: float64(stats.Hits) / float64(stats.Resolved), N: stats.Resolved, Correct: stats.Hits}
			}
		}
	}
	return out, nil
}

// accuracySnapshotVersion fingerprints the owner's settled public outcomes so
// any resolution flip (recomputed by the same cron that updates them) busts
// dependent OG cache keys (AC4).
func (s *Store) accuracySnapshotVersion(ctx context.Context, uid int64) string {
	rows := []struct {
		EvalID  string `db:"eval_id"`
		Outcome string `db:"outcome"`
	}{}
	if err := s.db.SelectContext(ctx, &rows, `
		SELECT eval_id, outcome FROM pr_evaluations
		WHERE owner_user_id = ? AND is_public = TRUE AND outcome IN ('`+EvalOutcomeHit+`','`+EvalOutcomeMiss+`')
		ORDER BY eval_id`, uid); err != nil || len(rows) == 0 {
		return ""
	}
	h := sha1.New()
	for _, r := range rows {
		fmt.Fprintf(h, "%s=%s;", r.EvalID, r.Outcome)
	}
	return hex.EncodeToString(h.Sum(nil))[:12]
}

// OutcomesForUserPRs maps "repo#number" -> stored verdict for every tracked PR
// of the user that has a registered evaluation, so dashboard cards render the
// same verdict field set as share pages and OG images (AC2/AC5).
func (s *Store) OutcomesForUserPRs(ctx context.Context, userID int64) (map[string]EvalOutcome, error) {
	rows := []struct {
		EvalID      string     `db:"eval_id"`
		Repo        string     `db:"repository_id"`
		PRNumber    int        `db:"pr_number"`
		Predicted   int        `db:"predicted_score"`
		Outcome     string     `db:"outcome"`
		DaysToMerge *float64   `db:"days_to_merge"`
		MergedAt    *time.Time `db:"merged_at"`
		OutcomeHash string     `db:"outcome_hash"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT e.eval_id, e.repository_full_name AS repository_id, e.pr_number, e.predicted_score,
		       e.outcome, e.days_to_merge, e.merged_at, e.outcome_hash
		FROM pr_evaluations e
		JOIN (SELECT DISTINCT repository_id, pr_number FROM pr_snapshots WHERE user_id = ? AND pr_number IS NOT NULL) t
		  ON LOWER(t.repository_id) = LOWER(e.repository_full_name) AND t.pr_number = e.pr_number`, userID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]EvalOutcome, len(rows))
	for _, r := range rows {
		num := r.PRNumber
		out[fmt.Sprintf("%s#%d", r.Repo, r.PRNumber)] = EvalOutcome{
			EvalID:      r.EvalID,
			State:       r.Outcome,
			Predicted:   r.Predicted,
			DaysToMerge: r.DaysToMerge,
			MergedAt:    r.MergedAt,
			OutcomeHash: r.OutcomeHash,
			PRNumber:    &num,
		}
	}
	return out, nil
}
