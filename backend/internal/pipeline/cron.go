package pipeline

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
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
	ID                      string    `db:"id"`
	FullName                string    `db:"full_name"`
	Owner                   string    `db:"owner"`
	Name                    string    `db:"name"`
	UpdatedAt               time.Time `db:"updated_at"`
	ConsecutiveStagnantScans int       `db:"consecutive_stagnant_scans"`
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

	const concurrency = 3
	jobs := make(chan repoRow, len(repos))
	results := make(chan repoMetrics, len(repos))

	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range jobs {
				slog.Info("cron: processing repo", "repo", r.FullName)

				prs, meta, err := gh.FetchPRs(r.Owner, r.Name, prWindowDays)
				if err != nil {
					slog.Error("cron: FetchPRs failed - skipping", "repo", r.FullName, "err", err)
					continue
				}

				if len(meta.Topics) > 0 {
					if err := repository.NewRepoRepository(db).UpsertTopics(context.Background(), r.ID, meta.Topics); err != nil {
						slog.Warn("cron: UpsertTopics failed", "repo", r.FullName, "err", err)
					}
				}

				gfiIssues, gfiCount, err := gh.FetchGoodFirstIssuesList(r.Owner, r.Name, 5)
				if err != nil {
					slog.Warn("cron: FetchGoodFirstIssuesList failed - assuming none", "repo", r.FullName, "err", err)
				} else if len(gfiIssues) > 0 {
					gfiRepo := repository.NewGFIRepository(db)
					_ = gfiRepo.UpsertIssues(context.Background(), r.ID, gfiIssues)
				}

				slog.Debug("cron: fetched data", "repo", r.FullName, "prs", len(prs))

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

				raw := scoring.ComputeMetrics(scoringPRs, false, scoring.BusFactorWindowDays())
				raw.GoodFirstIssueCount = gfiCount
				raw.PRsCreated6m = len(prs)
				if issueCount, err := gh.FetchIssuesCreatedCount(r.Owner, r.Name, prWindowDays); err != nil {
					slog.Warn("cron: FetchIssuesCreatedCount failed - assuming none", "repo", r.FullName, "err", err)
				} else {
					raw.IssuesCreated6m = issueCount
				}
				results <- repoMetrics{repo: r, raw: raw, meta: meta}
			}
		}()
	}

	for _, r := range repos {
		jobs <- r
	}
	close(jobs)

	wg.Wait()
	close(results)

	all := make([]repoMetrics, 0, len(results))
	for res := range results {
		all = append(all, res)
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

	// Issue #92: provenance guard. Percentile normalisation against fewer than
	// MinNormalisationPeers collapses every metric to the neutral 50th-percentile
	// prior, stamping fake ~50 scores. Mark those snapshots as fallback so
	// rankings can exclude them, and log the root cause.
	peerCount := len(rawSlice)
	scoreSource := scoring.ResolveScoreSource(peerCount)
	if scoreSource == scoring.ScoreSourceFallback {
		slog.Warn("cron: degraded score provenance - scores marked fallback",
			"reason", "insufficient_normalisation_peers",
			"peers", peerCount,
			"required", scoring.MinNormalisationPeers,
		)
	}

	normed := scoring.NormaliseAll(rawSlice)

	for i, rm := range all {
		score, tier := scoring.ComputeCRank(normed[i], rm.raw.StalenessFlag, rm.raw.GoodFirstIssueCount)

		slog.Info("cron: scored repo",
			"repo", rm.repo.FullName,
			"score", score,
			"tier", tier,
			"stale", rm.raw.StalenessFlag,
			"score_source", scoreSource,
		)

		if err := insertSnapshot(db, rm.repo.ID, rm.raw, score, tier, scoreSource); err != nil {
			slog.Error("cron: insertSnapshot failed", "repo", rm.repo.FullName, "err", err)
		}
		if err := touchRepoAdaptive(db, rm.repo.ID, rm.meta.Language, rm.meta.Stars, rm.meta.Description, tier, rm.raw, rm.repo.ConsecutiveStagnantScans); err != nil {
			slog.Error("cron: touchRepoAdaptive failed", "repo", rm.repo.FullName, "err", err)
		}
	}

	slog.Info("cron complete", "scored", len(all), "attempted", len(repos))

	// Process up to 10 queued repo indexing requests (FIFO)
	if err := ProcessIndexingQueue(db, gh, 3); err != nil {
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
	var rows []repoRow
	err := db.Select(&rows, `
		SELECT id, full_name, owner, name, updated_at, consecutive_stagnant_scans
		FROM repositories
		WHERE next_rescan_at <= CURRENT_TIMESTAMP OR updated_at < ?
		ORDER BY next_rescan_at ASC, updated_at ASC
	`, time.Now().UTC().Add(-24*time.Hour))
	return rows, err
}

func insertSnapshot(db *sqlx.DB, repoID string, m scoring.RawMetrics, score float64, tier string, scoreSource string) error {
	staleness := 0
	if m.StalenessFlag {
		staleness = 1
	}
	if scoreSource != scoring.ScoreSourceFallback {
		scoreSource = scoring.ScoreSourceComputed
	}
	today := time.Now().UTC().Format("2006-01-02")

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, score_source, good_first_issue_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			external_pr_merge_rate        = VALUES(external_pr_merge_rate),
			time_to_first_response_hours  = VALUES(time_to_first_response_hours),
			time_to_merge_hours           = VALUES(time_to_merge_hours),
			first_timer_success_rate      = VALUES(first_timer_success_rate),
			repeat_contributor_rate       = VALUES(repeat_contributor_rate),
			maintainer_responsiveness     = VALUES(maintainer_responsiveness),
			last_activity_days            = VALUES(last_activity_days),
			review_rounds                 = VALUES(review_rounds),
			distinct_maintainer_count     = VALUES(distinct_maintainer_count),
			bus_factor                    = VALUES(bus_factor),
			staleness_flag                = VALUES(staleness_flag),
			c_rank_score                  = VALUES(c_rank_score),
			c_rank_tier                   = VALUES(c_rank_tier),
			score_source                  = VALUES(score_source),
			good_first_issue_count        = VALUES(good_first_issue_count)
	`,
		uuid.New().String(),
		repoID,
		today,
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		m.BusFactor,
		staleness,
		score,
		tier,
		scoreSource,
		m.GoodFirstIssueCount,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		INSERT INTO latest_snapshots (
			repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, score_source, good_first_issue_count,
			pr_count_6m, issue_count_6m, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			snapshot_date                 = VALUES(snapshot_date),
			external_pr_merge_rate        = VALUES(external_pr_merge_rate),
			time_to_first_response_hours  = VALUES(time_to_first_response_hours),
			time_to_merge_hours           = VALUES(time_to_merge_hours),
			first_timer_success_rate      = VALUES(first_timer_success_rate),
			repeat_contributor_rate       = VALUES(repeat_contributor_rate),
			maintainer_responsiveness     = VALUES(maintainer_responsiveness),
			last_activity_days            = VALUES(last_activity_days),
			review_rounds                 = VALUES(review_rounds),
			distinct_maintainer_count     = VALUES(distinct_maintainer_count),
			bus_factor                    = VALUES(bus_factor),
			staleness_flag                = VALUES(staleness_flag),
			c_rank_score                  = VALUES(c_rank_score),
			c_rank_tier                   = VALUES(c_rank_tier),
			score_source                  = VALUES(score_source),
			good_first_issue_count        = VALUES(good_first_issue_count),
			pr_count_6m                   = VALUES(pr_count_6m),
			issue_count_6m                = VALUES(issue_count_6m),
			updated_at                    = CURRENT_TIMESTAMP
	`,
		repoID,
		today,
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		m.BusFactor,
		staleness,
		score,
		tier,
		scoreSource,
		m.GoodFirstIssueCount,
		m.PRsCreated6m,
		m.IssuesCreated6m,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func touchRepoAdaptive(db *sqlx.DB, id, language string, stars int, description string, tier string, raw scoring.RawMetrics, prevStagnantCount int) error {
	sched := scoring.CalculateAdaptiveRescan(tier, raw, prevStagnantCount)
	now := time.Now().UTC()
	nextRescan := now.AddDate(0, 0, sched.IntervalDays)

	slog.Info("cron: adaptive schedule updated",
		"repo_id", id,
		"tier", tier,
		"interval_days", sched.IntervalDays,
		"stagnant_scans", sched.ConsecutiveStagnant,
		"next_rescan", nextRescan.Format("2006-01-02 15:04:05"),
	)

	_, err := db.Exec(`
		UPDATE repositories
		SET updated_at = ?, language = ?, stars = ?, description = ?,
		    refresh_interval_days = ?, consecutive_stagnant_scans = ?, next_rescan_at = ?
		WHERE id = ?
	`, now, language, stars, description, sched.IntervalDays, sched.ConsecutiveStagnant, nextRescan, id)
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

