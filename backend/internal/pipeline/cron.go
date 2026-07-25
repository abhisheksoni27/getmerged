package pipeline

import (
	"fmt"
	"log/slog"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

const (
	prWindowDays    = 180
	issueWindowDays = 180
	staleHours      = 24
)

// repoRow mirrors the repositories table for scanning.
type repoRow struct {
	ID        string    `db:"id"`
	FullName  string    `db:"full_name"`
	Owner     string    `db:"owner"`
	Name      string    `db:"name"`
	UpdatedAt time.Time `db:"updated_at"`
}

// UpdateScores fetches metrics for all repos not updated in the last staleHours,
// computes C-Rank scores, and inserts daily_snapshots rows.
func UpdateScores(db *sqlx.DB, gh *ghclient.Client) error {
	repos, err := reposNeedingUpdate(db)
	if err != nil {
		return fmt.Errorf("fetch repos: %w", err)
	}

	slog.Info("cron started", "repos_to_update", len(repos))

	if len(repos) == 0 {
		slog.Info("cron: nothing to update")
		return nil
	}

	type repoMetrics struct {
		repo repoRow
		raw  scoring.RawMetrics
	}
	all := make([]repoMetrics, 0, len(repos))

	for _, r := range repos {
		slog.Info("cron: processing repo", "repo", r.FullName)

		prs, err := gh.FetchPRs(r.Owner, r.Name, prWindowDays)
		if err != nil {
			slog.Error("cron: FetchPRs failed — skipping", "repo", r.FullName, "err", err)
			continue
		}

		issues, err := gh.FetchIssues(r.Owner, r.Name, issueWindowDays)
		if err != nil {
			slog.Error("cron: FetchIssues failed — skipping", "repo", r.FullName, "err", err)
			continue
		}

		stale, err := gh.IsStalenessFlag(r.Owner, r.Name)
		if err != nil {
			slog.Warn("cron: IsStalenessFlag failed — assuming not stale", "repo", r.FullName, "err", err)
		}

		slog.Debug("cron: fetched data", "repo", r.FullName, "prs", len(prs), "issues", len(issues), "stale", stale)

		// Convert github.PR → scoring.PR
		scoringPRs := make([]scoring.PR, len(prs))
		for i, p := range prs {
			scoringPRs[i] = scoring.PR{
				State:             p.State,
				CreatedAt:         p.CreatedAt,
				MergedAt:          p.MergedAt,
				AuthorAssociation: p.AuthorAssociation,
				AuthorLogin:       p.AuthorLogin,
				FirstCommentAt:    p.FirstCommentAt,
				TotalComments:     p.TotalComments,
				CommentAuthors:    p.CommentAuthors,
			}
		}

		// Convert github.Issue → scoring.Issue
		scoringIssues := make([]scoring.Issue, len(issues))
		for i, iss := range issues {
			scoringIssues[i] = scoring.Issue{
				CreatedAt:      iss.CreatedAt,
				FirstCommentAt: iss.FirstCommentAt,
			}
		}

		raw := scoring.ComputeMetrics(scoringPRs, scoringIssues, stale)
		all = append(all, repoMetrics{repo: r, raw: raw})
	}

	if len(all) == 0 {
		slog.Warn("cron: no repos scored after fetching (all failed)")
		return nil
	}

	// Normalise across all repos fetched in this run.
	rawSlice := make([]scoring.RawMetrics, len(all))
	for i, rm := range all {
		rawSlice[i] = rm.raw
	}
	normed := scoring.NormaliseAll(rawSlice)

	for i, rm := range all {
		score, tier := scoring.ComputeCRank(normed[i], rm.raw.StalenessFlag)

		slog.Info("cron: scored repo",
			"repo", rm.repo.FullName,
			"score", score,
			"tier", tier,
			"stale", rm.raw.StalenessFlag,
		)

		if err := insertSnapshot(db, rm.repo.ID, rm.raw, score, tier); err != nil {
			slog.Error("cron: insertSnapshot failed", "repo", rm.repo.FullName, "err", err)
		}
		if err := touchRepo(db, rm.repo.ID); err != nil {
			slog.Error("cron: touchRepo failed", "repo", rm.repo.FullName, "err", err)
		}
	}

	slog.Info("cron complete", "scored", len(all), "attempted", len(repos))
	return nil
}

func reposNeedingUpdate(db *sqlx.DB) ([]repoRow, error) {
	cutoff := time.Now().UTC().Add(-staleHours * time.Hour)
	var rows []repoRow
	err := db.Select(&rows, `
		SELECT id, full_name, owner, name, updated_at
		FROM repositories
		WHERE updated_at < ?
		ORDER BY updated_at ASC
	`, cutoff)
	return rows, err
}

func insertSnapshot(db *sqlx.DB, repoID string, m scoring.RawMetrics, score float64, tier string) error {
	staleness := 0
	if m.StalenessFlag {
		staleness = 1
	}
	_, err := db.Exec(`
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate, issue_triage_speed_hours,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			issue_triage_speed_hours      = excluded.issue_triage_speed_hours,
			maintainer_responsiveness     = excluded.maintainer_responsiveness,
			last_activity_days            = excluded.last_activity_days,
			review_rounds                 = excluded.review_rounds,
			distinct_maintainer_count     = excluded.distinct_maintainer_count,
			staleness_flag                = excluded.staleness_flag,
			c_rank_score                  = excluded.c_rank_score,
			c_rank_tier                   = excluded.c_rank_tier
	`,
		uuid.New().String(),
		repoID,
		time.Now().UTC().Format("2006-01-02"),
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.IssueTriageSpeedHours,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		staleness,
		score,
		tier,
	)
	return err
}

func touchRepo(db *sqlx.DB, id string) error {
	_, err := db.Exec(`UPDATE repositories SET updated_at = ? WHERE id = ?`, time.Now().UTC(), id)
	return err
}
