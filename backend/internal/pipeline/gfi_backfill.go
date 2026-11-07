package pipeline

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
)

// GFIBackfillService sweeps indexed repositories that have good_first_issue_count > 0
// and fills their repo_good_first_issues entries within safe GitHub GraphQL rate limits.
type GFIBackfillService struct {
	db      *sqlx.DB
	gh      *github.Client
	gfiRepo repository.GFIRepository
}

func NewGFIBackfillService(db *sqlx.DB, gh *github.Client) *GFIBackfillService {
	return &GFIBackfillService{
		db:      db,
		gh:      gh,
		gfiRepo: repository.NewGFIRepository(db),
	}
}

type gfiTargetRepo struct {
	ID       string `db:"id"`
	FullName string `db:"full_name"`
	Stars    int    `db:"stars"`
	Language string `db:"language"`
}

// RunSweep performs a single rate-controlled backfill batch across top welcoming repos with GFI > 0.
func (s *GFIBackfillService) RunSweep(ctx context.Context, batchSize int) (int, error) {
	if batchSize <= 0 {
		batchSize = 25
	}

	// Find repos with good_first_issue_count > 0 or with open issues that haven't been synced recently in repo_good_first_issues
	query := `
		SELECT r.id, r.full_name, r.stars, COALESCE(r.language, '') as language
		FROM repositories r
		LEFT JOIN latest_snapshots s ON r.id = s.repository_id
		WHERE (COALESCE(s.good_first_issue_count, 0) > 0 OR r.id IN (SELECT repository_id FROM repo_good_first_issues WHERE is_open = 1))
		  AND r.id NOT IN (
			SELECT repository_id FROM repo_good_first_issues
			WHERE synced_at > DATE_SUB(NOW(), INTERVAL 12 HOUR)
		  )
		ORDER BY COALESCE(s.c_rank_score, 0) DESC, r.stars DESC
		LIMIT ?
	`
	if s.db.DriverName() == "sqlite" {
		query = `
			SELECT r.id, r.full_name, r.stars, COALESCE(r.language, '') as language
			FROM repositories r
			LEFT JOIN latest_snapshots s ON r.id = s.repository_id
			WHERE (COALESCE(s.good_first_issue_count, 0) > 0 OR r.id IN (SELECT repository_id FROM repo_good_first_issues WHERE is_open = 1))
			  AND r.id NOT IN (
				SELECT repository_id FROM repo_good_first_issues
				WHERE synced_at > datetime('now', '-12 hours')
			  )
			ORDER BY COALESCE(s.c_rank_score, 0) DESC, r.stars DESC
			LIMIT ?
		`
	}

	var targets []gfiTargetRepo
	if err := s.db.SelectContext(ctx, &targets, query, batchSize); err != nil {
		return 0, err
	}

	if len(targets) == 0 {
		slog.Debug("gfi-backfill: no pending repos needing GFI sync")
		return 0, nil
	}

	slog.Info("gfi-backfill: starting batch sweep", "count", len(targets))
	syncedCount := 0

	for _, target := range targets {
		select {
		case <-ctx.Done():
			return syncedCount, ctx.Err()
		default:
		}

		if _, err := s.SyncRepo(ctx, target.ID, target.FullName); err != nil {
			slog.Warn("gfi-backfill: sync failed", "repo", target.FullName, "err", err)
			continue
		}
		syncedCount++

		// Rate limiter safety delay: 200ms between repos (max 5 reqs/sec)
		time.Sleep(200 * time.Millisecond)
	}

	slog.Info("gfi-backfill: batch sweep complete", "synced", syncedCount, "scanned", len(targets))
	return syncedCount, nil
}

// SyncRepo reconciles the good first issues for a single repository.
func (s *GFIBackfillService) SyncRepo(ctx context.Context, repoID, fullName string) (int, error) {
	parts := strings.Split(fullName, "/")
	if len(parts) != 2 {
		return 0, nil
	}
	owner, name := parts[0], parts[1]

	issues, count, err := s.gh.FetchGoodFirstIssuesList(owner, name, 8)
	if err != nil {
		return 0, err
	}

	if err := s.gfiRepo.UpsertIssues(ctx, repoID, issues); err != nil {
		return 0, err
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE latest_snapshots SET good_first_issue_count = ? WHERE repository_id = ?`, count, repoID)
	return count, nil
}
