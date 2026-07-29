package pipeline

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

const (
	prWindowDays = 180
	staleHours   = 24
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
		meta ghclient.RepoMeta
	}
	all := make([]repoMetrics, 0, len(repos))

	for _, r := range repos {
		slog.Info("cron: processing repo", "repo", r.FullName)

		prs, meta, err := gh.FetchPRs(r.Owner, r.Name, prWindowDays)
		if err != nil {
			slog.Error("cron: FetchPRs failed — skipping", "repo", r.FullName, "err", err)
			continue
		}

		stale, err := gh.IsStalenessFlag(r.Owner, r.Name)
		if err != nil {
			slog.Warn("cron: IsStalenessFlag failed — assuming not stale", "repo", r.FullName, "err", err)
		}

		slog.Debug("cron: fetched data", "repo", r.FullName, "prs", len(prs), "stale", stale)

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

		raw := scoring.ComputeMetrics(scoringPRs, stale)
		all = append(all, repoMetrics{repo: r, raw: raw, meta: meta})
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
		if err := touchRepo(db, rm.repo.ID, rm.meta.Language, rm.meta.Stars, rm.meta.Description); err != nil {
			slog.Error("cron: touchRepo failed", "repo", rm.repo.FullName, "err", err)
		}
	}

	slog.Info("cron complete", "scored", len(all), "attempted", len(repos))

	// Process up to 10 queued repo indexing requests (FIFO)
	if err := ProcessIndexingQueue(db, gh, 10); err != nil {
		slog.Error("cron: ProcessIndexingQueue failed", "err", err)
	}

	// Regenerate static XML sitemaps for CDN/Nginx serving
	publicDir := "../frontend/public"
	if _, err := os.Stat(publicDir); os.IsNotExist(err) {
		publicDir = "public"
	}
	if err := GenerateStaticSitemaps(db, publicDir); err != nil {
		slog.Error("cron: sitemap generation failed", "err", err)
	}

	return nil
}

type queueItem struct {
	ID                int64  `db:"id"`
	FullName          string `db:"full_name"`
	Owner             string `db:"owner"`
	Name              string `db:"name"`
	RequestedByUserID *int64 `db:"requested_by_user_id"`
}

// ProcessIndexingQueue picks up to batchSize pending repositories from indexing_queue in FIFO order,
// scores them via GitHub API, inserts snapshots into DB, and marks status as completed.
func ProcessIndexingQueue(db *sqlx.DB, gh *ghclient.Client, batchSize int) error {
	if batchSize <= 0 {
		batchSize = 10
	}

	var items []queueItem
	err := db.Select(&items, `
		SELECT id, full_name, owner, name, requested_by_user_id
		FROM indexing_queue
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT ?
	`, batchSize)
	if err != nil || len(items) == 0 {
		return nil
	}

	slog.Info("cron: processing indexing_queue batch", "count", len(items))

	existingMetrics, _ := fetchDBMetrics(db)

	for _, item := range items {
		slog.Info("cron queue: processing item", "repo", item.FullName)
		_, _ = db.Exec("UPDATE indexing_queue SET status = 'processing' WHERE id = ?", item.ID)

		// Fetch & score repo
		repoID, err := upsertRepoRow(db, item.Owner, item.Name, item.FullName)
		if err != nil {
			slog.Error("cron queue: upsertRepo failed", "repo", item.FullName, "err", err)
			_, _ = db.Exec("UPDATE indexing_queue SET status = 'failed' WHERE id = ?", item.ID)
			continue
		}

		updatedMetrics, scoreErr := scoreAndSaveRepo(db, gh, repoID, item.Owner, item.Name, item.FullName, existingMetrics)
		if scoreErr != nil {
			slog.Error("cron queue: scoreAndSaveRepo failed", "repo", item.FullName, "err", scoreErr)
			_, _ = db.Exec("UPDATE indexing_queue SET status = 'failed' WHERE id = ?", item.ID)
			continue
		}
		existingMetrics = updatedMetrics

		// Mark as completed
		_, _ = db.Exec("UPDATE indexing_queue SET status = 'completed', processed_at = ? WHERE id = ?", time.Now().UTC(), item.ID)
		slog.Info("cron queue: item completed successfully", "repo", item.FullName)

		// Queue user notification if requested_by_user_id is present
		if item.RequestedByUserID != nil && *item.RequestedByUserID > 0 {
			payload := fmt.Sprintf(`{"repo_full_name":"%s","message":"Your requested repository %s has been scored!"}`, item.FullName, item.FullName)
			_, _ = db.Exec(`
				INSERT INTO notification_queue (user_id, type, payload, status, created_at)
				VALUES (?, 'repo_indexed', ?, 'pending', ?)
			`, *item.RequestedByUserID, payload, time.Now().UTC())
		}
	}

	return nil
}

func upsertRepoRow(db *sqlx.DB, owner, name, fullName string) (string, error) {
	var id string
	err := db.QueryRow("SELECT id FROM repositories WHERE full_name = ?", fullName).Scan(&id)
	if err == nil && id != "" {
		return id, nil
	}
	id = uuid.New().String()
	_, err = db.Exec(`
		INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
		VALUES (?, ?, ?, ?, 'Other', 0, '', ?, ?)
	`, id, fullName, owner, name, "https://github.com/"+fullName, time.Now().UTC())
	return id, err
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
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
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

func touchRepo(db *sqlx.DB, id, language string, stars int, description string) error {
	_, err := db.Exec(`
		UPDATE repositories
		SET updated_at = ?, language = ?, stars = ?, description = ?
		WHERE id = ?
	`, time.Now().UTC(), language, stars, description, id)
	return err
}
