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

// SeedBody is the optional request body for the seed endpoint.
type SeedBody struct {
	Languages []string `json:"languages"`
}

// Seed handles POST /internal/seed
// Seeds the repositories table with top repos for the given languages.
//
//	@Summary      Seed repositories
//	@Description  Fetches and inserts top repositories from GitHub for the given languages.
//	@Tags         internal
//	@Accept       json
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Param        body  body  SeedBody  false  "Language list (defaults to Go, Python, JavaScript)"
//	@Success      202  {object}  map[string]string
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

		slog.Info("seed triggered", "job_id", jobID, "languages", body.Languages, "ip", c.ClientIP())

		go func() {
			if err := pipeline.Seed(db, gh, body.Languages); err != nil {
				slog.Error("seed: pipeline error", "job_id", jobID, "err", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "started",
			"job_id": jobID,
		})
	}
}
