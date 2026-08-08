package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UpdateScores handles POST /internal/update-scores
// Triggers the daily scoring pipeline asynchronously.
//
//	@Summary      Trigger score update
//	@Description  Fetches GitHub data for stale repos and recomputes C-Rank scores.
//	@Tags         internal
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Success      202  {object}  map[string]string
//	@Router       /internal/update-scores [post]
func UpdateScores(gh *github.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		jobID := uuid.New().String()

		slog.Info("update-scores triggered", "job_id", jobID, "ip", c.ClientIP())

		go func() {
			if err := pipeline.UpdateScores(db, gh); err != nil {
				slog.Error("update-scores: pipeline error", "job_id", jobID, "err", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "started",
			"job_id": jobID,
		})
	}
}

// SeedBody is the request body for triggering the initial database seed.
type SeedBody struct {
	Languages []string `json:"languages"`
	Force     bool     `json:"force"`
}

// Seed handles POST /internal/seed
// Triggers an asynchronous seed job to populate top repos across target languages.
//
//	@Summary      Trigger database seed job
//	@Description  Searches top repositories per language and runs initial C-Rank scoring.
//	@Tags         internal
//	@Accept       json
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Param        body  body      SeedBody  true  "Target languages"
//	@Success      202   {object}  map[string]string
//	@Failure      500   {object}  map[string]string
//	@Router       /internal/seed [post]
func Seed(gh *github.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		var body SeedBody
		// Body is optional - ignore parse errors.
		_ = c.ShouldBindJSON(&body)

		jobID := uuid.New().String()

		slog.Info("seed triggered", "job_id", jobID, "languages", body.Languages, "force", body.Force, "ip", c.ClientIP())

		go func() {
			if err := pipeline.Seed(db, gh, body.Languages, body.Force); err != nil {
				slog.Error("seed: pipeline error", "job_id", jobID, "err", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "started",
			"job_id": jobID,
		})
	}
}

// SyncTrending handles POST /internal/sync-trending
// Fetches trending repos from OSSInsight and marks matching DB repos as trending.
//
//	@Summary      Sync trending repos
//	@Description  Fetches repos trending in the last 24h from OSSInsight and marks them in the database.
//	@Tags         internal
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Success      202  {object}  map[string]any
//	@Router       /internal/sync-trending [post]
func SyncTrending() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		jobID := uuid.New().String()

		slog.Info("sync-trending triggered", "job_id", jobID, "ip", c.ClientIP())

		go func() {
			marked, err := pipeline.SyncTrendingRepos(c.Request.Context(), db)
			if err != nil {
				slog.Error("sync-trending: pipeline error", "job_id", jobID, "err", err)
				return
			}
			slog.Info("sync-trending: complete", "job_id", jobID, "marked", marked)
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "started",
			"job_id": jobID,
		})
	}
}

// DeleteRepo handles DELETE /internal/repos/:id
// Deletes a repository and all of its associated daily_snapshots.
//
//	@Summary      Delete repository and snapshots
//	@Description  Deletes a repository record and all of its daily snapshot history.
//	@Tags         internal
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Param        id   path      string  true  "Repository ID"
//	@Success      200  {object}  map[string]string
//	@Failure      500  {object}  map[string]string
//	@Router       /internal/repos/{id} [delete]
func DeleteRepo(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		slog.Info("delete repo requested", "id", id, "ip", c.ClientIP())

		if err := repoStore.Delete(c.Request.Context(), id); err != nil {
			slog.Error("delete repo failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete repository"})
			return
		}

		slog.Info("delete repo success", "id", id)
		c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": id})
	}
}
// Clears all Valkey cached API responses (apicache:repos:*, apicache:repo:*, macro stats).
//
//	@Summary      Purge API Cache
//	@Description  Flushes all Valkey cached API responses in one request.
//	@Tags         internal
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Success      200  {object}  map[string]string
//	@Router       /internal/purge-cache [post]
func PurgeCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		vk := middleware.MustCache(c)
		if vk == nil {
			c.JSON(http.StatusOK, gin.H{"status": "skipped", "message": "no cache configured"})
			return
		}

		slog.Info("purge-cache requested", "ip", c.ClientIP())

		ctx := c.Request.Context()

		// Scan and delete all apicache:* keys in Valkey
		var keysToDelete []string
		if keys, err := vk.Do(ctx, vk.B().Keys().Pattern("apicache:*").Build()).AsStrSlice(); err == nil {
			keysToDelete = append(keysToDelete, keys...)
		}

		deletedCount := 0
		for _, k := range keysToDelete {
			if err := vk.Do(ctx, vk.B().Del().Key(k).Build()).Error(); err == nil {
				deletedCount++
			}
		}

		db := middleware.MustDB(c)
		if db != nil {
			_, _ = analytics.ComputeAndCacheMacroStats(ctx, db)
		}

		c.JSON(http.StatusOK, gin.H{
			"status":        "purged",
			"deleted_keys":  deletedCount,
			"total_matched": len(keysToDelete),
			"macro_updated": db != nil,
		})
	}
}

// MigrateLatestSnapshots handles POST /internal/migrate-latest-snapshots
// Populates/backfills latest_snapshots from existing daily_snapshots table.
//
//	@Summary      Migrate latest snapshots
//	@Description  Backfills latest_snapshots table with latest record for each repo.
//	@Tags         internal
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Success      200  {object}  map[string]any
//	@Router       /internal/migrate-latest-snapshots [post]
func MigrateLatestSnapshots() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database context missing"})
			return
		}

		slog.Info("migrate-latest-snapshots requested", "ip", c.ClientIP())

		query := `
			INSERT INTO latest_snapshots (
				repository_id, snapshot_date,
				external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
				first_timer_success_rate, repeat_contributor_rate,
				maintainer_responsiveness, last_activity_days, review_rounds,
				distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, updated_at
			)
			SELECT
				s.repository_id, s.snapshot_date,
				s.external_pr_merge_rate, s.time_to_first_response_hours, s.time_to_merge_hours,
				s.first_timer_success_rate, s.repeat_contributor_rate,
				s.maintainer_responsiveness, s.last_activity_days, s.review_rounds,
				s.distinct_maintainer_count, s.staleness_flag, s.c_rank_score, s.c_rank_tier, s.good_first_issue_count, CURRENT_TIMESTAMP
			FROM daily_snapshots s
			INNER JOIN (
				SELECT repository_id, MAX(snapshot_date) as max_date
				FROM daily_snapshots
				GROUP BY repository_id
			) latest ON s.repository_id = latest.repository_id AND s.snapshot_date = latest.max_date
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
				staleness_flag                = VALUES(staleness_flag),
				c_rank_score                  = VALUES(c_rank_score),
				c_rank_tier                   = VALUES(c_rank_tier),
				good_first_issue_count        = VALUES(good_first_issue_count),
				updated_at                    = CURRENT_TIMESTAMP;
		`

		res, err := db.ExecContext(c.Request.Context(), query)
		if err != nil {
			slog.Error("migrate-latest-snapshots failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		rowsAffected, _ := res.RowsAffected()
		slog.Info("migrate-latest-snapshots completed", "rows_migrated", rowsAffected)

		c.JSON(http.StatusOK, gin.H{
			"status":        "success",
			"rows_migrated": rowsAffected,
		})
	}
}
