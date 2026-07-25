package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

var (
	// CommitHash is set at build time via -ldflags="-X github.com/abhisheksoni27/opendoor/internal/handler.CommitHash=..."
	CommitHash = "dev"
	startTime  = time.Now().UTC()
)

// HealthResponse represents the payload returned by GET /health
type HealthResponse struct {
	Status    string `json:"status"`
	Commit    string `json:"commit"`
	Uptime    string `json:"uptime"`
	Database  string `json:"database"`
	Cache     string `json:"cache"`
	Timestamp string `json:"timestamp"`
}

// Health handles GET /health and GET /api/v1/health
//
//	@Summary      Health Check
//	@Description  Returns service health status, uptime, database/cache connectivity, and deployed git commit hash.
//	@Tags         system
//	@Produce      json
//	@Success      200  {object}  HealthResponse
//	@Router       /health [get]
func Health() gin.HandlerFunc {
	return func(c *gin.Context) {
		dbStatus := "ok"
		db := middleware.MustDB(c)
		if db != nil {
			if err := db.Ping(); err != nil {
				dbStatus = "error: " + err.Error()
			}
		} else {
			dbStatus = "unavailable"
		}

		cacheStatus := "ok"
		vk := middleware.MustCache(c)
		if vk != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := vk.Do(ctx, vk.B().Ping().Build()).Error(); err != nil {
				cacheStatus = "error: " + err.Error()
			}
		} else {
			cacheStatus = "disabled"
		}

		status := "ok"
		if dbStatus != "ok" {
			status = "degraded"
		}

		c.JSON(http.StatusOK, HealthResponse{
			Status:    status,
			Commit:    CommitHash,
			Uptime:    time.Since(startTime).Truncate(time.Second).String(),
			Database:  dbStatus,
			Cache:     cacheStatus,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		})
	}
}
