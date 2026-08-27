package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/issueclaim"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// PostClaimIssueHandler handles POST /api/v1/issues/:owner/:name/:number/claim
// (AC1-AC9). Authenticated; posts a templated claim comment via the user's
// GitHub token and persists the claim server-side.
func PostClaimIssueHandler(svc *issueclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		user := claimsVal.(*auth.Claims)

		owner := strings.TrimSpace(c.Param("owner"))
		name := strings.TrimSpace(c.Param("name"))
		numStr := strings.TrimSpace(c.Param("number"))
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}
		issueNumber, err := strconv.Atoi(numStr)
		if err != nil || issueNumber <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid issue number"})
			return
		}

		res, claimErr := svc.ClaimIssue(c.Request.Context(), owner, name, issueNumber, user)
		if claimErr != nil {
			errStr := claimErr.Error()
			switch {
			case claimErr == issueclaim.ErrNoGithubToken:
				c.JSON(http.StatusUnauthorized, gin.H{"error": errStr, "needs_github_auth": true})
			case claimErr == repository.ErrClaimCommentRateLimited:
				c.JSON(http.StatusTooManyRequests, gin.H{"error": errStr, "retry_after_sec": 600})
			case strings.Contains(errStr, "unauthorized") || strings.Contains(errStr, "scope"):
				c.JSON(http.StatusUnauthorized, gin.H{"error": errStr, "needs_github_auth": true})
			case strings.Contains(errStr, "429"):
				c.JSON(http.StatusTooManyRequests, gin.H{"error": "github is rate limiting; try again shortly", "retry_after_sec": 60})
			default:
				c.JSON(http.StatusBadGateway, gin.H{"error": errStr, "retryable": true})
			}
			return
		}

		c.JSON(http.StatusOK, res)
	}
}

// GetUserIssueClaimsHandler handles GET /api/v1/user/issue-claims for dashboard
// sync and AC6 reload (idempotent reconciliation happens via ClaimIssue).
func GetUserIssueClaimsHandler(svc *issueclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		user := claimsVal.(*auth.Claims)

		claims, err := svc.ListUserClaims(c.Request.Context(), user.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"claims": claims})
	}
}
