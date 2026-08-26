package pipeline

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ScoreChangedEvent is emitted by the recalculate-history pipeline for every
// repo whose C-Rank moved during a successful recalculation (AC3).
type ScoreChangedEvent struct {
	RepoID   string
	FullName string
	OldScore float64
	NewScore float64
	OldTier  string
	NewTier  string
}

// EmitScoreChangedEvents persists one row per changed repo and refreshes the
// crank_playbook_cards before/after state for repos with a verified claim,
// so playbook cards advance from the recalc event itself — no polling loop
// (AC3). Best-effort per event; a single failure never aborts the batch.
func EmitScoreChangedEvents(ctx context.Context, db *sqlx.DB, events []ScoreChangedEvent) error {
	if len(events) == 0 {
		return nil
	}
	now := time.Now().UTC()
	emitted := 0
	for _, ev := range events {
		if err := emitOneScoreChangedEvent(ctx, db, ev, now); err != nil {
			slog.Warn("score-changed event emit failed", "repo_id", ev.RepoID, "err", err)
			continue
		}
		emitted++
	}
	slog.Info("score-changed events emitted from recalc pipeline", "total", len(events), "emitted", emitted)
	return nil
}

func emitOneScoreChangedEvent(ctx context.Context, db *sqlx.DB, ev ScoreChangedEvent, now time.Time) error {
	if _, err := db.ExecContext(ctx, `
		INSERT INTO score_changed_events
			(id, repo_id, old_score, new_score, old_tier, new_tier, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, uuid.New().String(), ev.RepoID, ev.OldScore, ev.NewScore, ev.OldTier, ev.NewTier, now); err != nil {
		return fmt.Errorf("insert score-changed event: %w", err)
	}

	fullName := ev.FullName
	if fullName == "" {
		if err := db.GetContext(ctx, &fullName, `SELECT full_name FROM repositories WHERE id = ?`, ev.RepoID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil // repo vanished mid-run; nothing to refresh
			}
			return fmt.Errorf("lookup full name: %w", err)
		}
	}

	var claimed int
	if err := db.GetContext(ctx, &claimed, `
		SELECT COUNT(1) FROM repo_claims WHERE repo_id = ? AND state = 'verified'
	`, ev.RepoID); err != nil {
		return fmt.Errorf("lookup verified claim: %w", err)
	}
	if claimed == 0 {
		return nil // unclaimed repos have no before/after card to refresh
	}

	outcome := scoring.OutcomeNoChange
	if scoring.CompareRescoreOutcome(ev.OldScore, ev.NewScore) == scoring.OutcomeImproved {
		outcome = scoring.OutcomeImproved
	}

	// Preserve any existing cooldown stamp; the pipeline refresh only moves
	// scores/tiers/status forward.
	var lastCardAt *time.Time
	if err := db.GetContext(ctx, &lastCardAt, `SELECT last_card_at FROM crank_playbook_cards WHERE repo_id = ?`, ev.RepoID); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup card cooldown: %w", err)
	}

	query := `
		INSERT INTO crank_playbook_cards
			(repo_id, full_name, before_score, before_tier, after_score, after_tier, status, last_card_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			full_name = VALUES(full_name),
			before_score = VALUES(before_score),
			before_tier = VALUES(before_tier),
			after_score = VALUES(after_score),
			after_tier = VALUES(after_tier),
			status = VALUES(status),
			last_card_at = VALUES(last_card_at),
			updated_at = VALUES(updated_at)
	`
	if db.DriverName() == "sqlite" {
		query = `
		INSERT INTO crank_playbook_cards
			(repo_id, full_name, before_score, before_tier, after_score, after_tier, status, last_card_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repo_id) DO UPDATE SET
			full_name = excluded.full_name,
			before_score = excluded.before_score,
			before_tier = excluded.before_tier,
			after_score = excluded.after_score,
			after_tier = excluded.after_tier,
			status = excluded.status,
			last_card_at = excluded.last_card_at,
			updated_at = excluded.updated_at
	`
	}

	if _, err := db.ExecContext(ctx, query,
		ev.RepoID, fullName, ev.OldScore, ev.OldTier, ev.NewScore, ev.NewTier, outcome, lastCardAt, now,
	); err != nil {
		return fmt.Errorf("refresh playbook card: %w", err)
	}
	return nil
}
