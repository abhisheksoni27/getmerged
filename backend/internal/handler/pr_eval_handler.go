package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/gin-gonic/gin"
)

// RegisterPREvalHandler records a shared evaluation's join key (repo full_name
// + PR number captured at eval time, AC4) so prtracker sync can resolve a
// verified outcome against it. Public: payloads are non-sensitive share data.
func RegisterPREvalHandler(store *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body struct {
			EvalID    string `json:"eval_id"`
			Repo      string `json:"repo"`
			PRNumber  int    `json:"pr_number"`
			Score     int    `json:"score"`
			Timestamp int64  `json:"timestamp"`
		}
		if err := c.ShouldBindJSON(&body); err != nil || body.EvalID == "" || body.Repo == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "eval_id and repo are required"})
			return
		}
		if len(body.EvalID) > 128 || len(body.Repo) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload too long"})
			return
		}
		createdAt := time.Now().UTC()
		if body.Timestamp > 0 {
			createdAt = time.UnixMilli(body.Timestamp).UTC()
		}
		if err := store.RegisterEval(c.Request.Context(), prtracker.EvalRegistration{
			EvalID:    body.EvalID,
			Repo:      body.Repo,
			PRNumber:  body.PRNumber,
			Score:     body.Score,
			CreatedAt: createdAt,
		}); err != nil {
			slog.Error("register pr-eval failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register evaluation"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetPREvalOutcomeHandler serves the verified verdict for /share/pr-eval/[id]
// pages, dashboard cards and OG rendering (AC1/AC3). Unknown evals return 404;
// callers degrade to the static snapshot with 'Outcome unavailable' (AC4).
func GetPREvalOutcomeHandler(store *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, err := store.GetEvalOutcome(c.Request.Context(), c.Param("id"))
		if err != nil {
			slog.Error("load pr-eval outcome failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load outcome"})
			return
		}
		if out == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found"})
			return
		}
		out.EvalID = "" // already known to the caller via path
		c.JSON(http.StatusOK, out)
	}
}
