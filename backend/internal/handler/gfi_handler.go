package handler

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// ListGoodFirstIssues handles GET /api/v1/issues/good-first?language=Go&limit=25&bounty=1
// The bounty flag filters to bounty-labeled (self-reported) issues only (AC3).
func ListGoodFirstIssues(gfiRepo repository.GFIRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		language := c.Query("language")
		limitStr := c.DefaultQuery("limit", "25")
		limit, _ := strconv.Atoi(limitStr)
		if limit <= 0 || limit > 100 {
			limit = 25
		}
		bountyOnly := c.Query("bounty") == "1" || strings.EqualFold(c.Query("bounty"), "true")

		issues, err := gfiRepo.ListByLanguage(c.Request.Context(), language, limit, bountyOnly)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch good first issues"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  issues,
			"count": len(issues),
		})
	}
}

// GetRepoGoodFirstIssues handles GET /api/v1/repos/:id/good-first-issues (Story 10.2)
// Supports bounty=1 for the Paid filter tab (AC3). Cache TTL is capped at
// 5 minutes so boosts appear immediately while non-boost fields stay cached
// (AC4).
func GetRepoGoodFirstIssues(gfiRepo repository.GFIRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		identifier := c.Param("id")
		if unescaped, err := url.QueryUnescape(identifier); err == nil {
			identifier = unescaped
		}
		c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), identifier)
		if err != nil || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		bountyOnly := c.Query("bounty") == "1" || strings.EqualFold(c.Query("bounty"), "true")
		issues, err := gfiRepo.ListByRepoID(c.Request.Context(), repo.ID, 5, bountyOnly)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch repository good first issues"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  issues,
			"count": len(issues),
		})
	}
}
