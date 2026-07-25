package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
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
		// Body is optional — ignore parse errors.
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
func DeleteRepo() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		slog.Info("delete repo requested", "id", id, "ip", c.ClientIP())

		// Delete snapshots first
		if _, err := db.Exec("DELETE FROM daily_snapshots WHERE repository_id = ?", id); err != nil {
			slog.Error("delete snapshots failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete snapshots"})
			return
		}

		// Delete repository
		res, err := db.Exec("DELETE FROM repositories WHERE id = ?", id)
		if err != nil {
			slog.Error("delete repo failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete repository"})
			return
		}

		affected, _ := res.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		slog.Info("delete repo success", "id", id)
		c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": id})
	}
}
