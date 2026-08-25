package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/claim"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// PostClaimRepoHandler handles POST /api/v1/repos/:owner/:name/claim (AC1)
// and POST /repo/:owner/:name/claim
func PostClaimRepoHandler(claimSvc *claim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		owner := c.Param("owner")
		name := c.Param("name")
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}

		resp, err := claimSvc.InitiateClaim(c.Request.Context(), owner, name, userClaims.UserID, userClaims.Username)
		if err != nil {
			if strings.Contains(err.Error(), "409") || strings.Contains(err.Error(), "already claimed") {
				c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

// PostVerifyRepoHandler handles POST /api/v1/repos/:owner/:name/verify (AC2, AC3, AC5, AC7)
func PostVerifyRepoHandler(claimSvc *claim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		owner := c.Param("owner")
		name := c.Param("name")
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}

		claimRecord, err := claimSvc.VerifyClaim(c.Request.Context(), owner, name, userClaims.UserID, userClaims.Username)
		if err != nil {
			errStr := err.Error()
			if strings.Contains(errStr, "409") || strings.Contains(errStr, "already claimed") || strings.Contains(errStr, "conflict") {
				c.JSON(http.StatusConflict, gin.H{"error": errStr})
				return
			}
			if strings.Contains(errStr, "404") || strings.Contains(errStr, "not found") {
				c.JSON(http.StatusNotFound, gin.H{"error": errStr})
				return
			}
			if strings.Contains(errStr, "retryable") || strings.Contains(errStr, "fail-closed") || strings.Contains(errStr, "timeout") {
				c.JSON(http.StatusBadGateway, gin.H{"error": errStr, "retryable": true})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": errStr})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "verified",
			"message": "Repository ownership verified successfully",
			"claim":   claimRecord,
		})
	}
}

// GetMaintainerConsoleHandler handles GET /api/v1/repos/:owner/:name/console (AC6)
func GetMaintainerConsoleHandler(claimSvc *claim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		owner := c.Param("owner")
		name := c.Param("name")
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}

		consoleData, err := claimSvc.GetMaintainerConsole(c.Request.Context(), owner, name, userClaims.UserID)
		if err != nil {
			errStr := err.Error()
			if strings.Contains(errStr, "403") || strings.Contains(errStr, "unauthorized") {
				c.JSON(http.StatusForbidden, gin.H{"error": errStr})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": errStr})
			return
		}

		c.JSON(http.StatusOK, consoleData)
	}
}

// GetPublicClaimStatusHandler handles GET /api/v1/repos/:owner/:name/claim-status (AC8)
func GetPublicClaimStatusHandler(claimRepo repository.ClaimRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name

		claimRecord, err := claimRepo.GetVerifiedClaimByRepoID(c.Request.Context(), fullName)
		if err != nil || claimRecord == nil {
			c.JSON(http.StatusOK, gin.H{
				"is_claimed":  false,
				"is_verified": false,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"is_claimed":  true,
			"is_verified": true,
			"verified_at": claimRecord.VerifiedAt,
		})
	}
}

// GetUserClaimsListHandler handles GET /api/v1/user/claims
func GetUserClaimsListHandler(claimRepo repository.ClaimRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		claimsList, err := claimRepo.ListVerifiedClaimsByUser(c.Request.Context(), userClaims.UserID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusOK, gin.H{"claims": []any{}})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"claims": claimsList})
	}
}

// PostClaimDisputeHandler handles POST /api/v1/repos/:owner/:name/claim-dispute (AC3).
// A second claimant who sees "already claimed by @user" files a report into
// the admin review queue; no auto-transfer happens.
func PostClaimDisputeHandler(claimRepo repository.ClaimRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		owner := c.Param("owner")
		name := c.Param("name")
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}
		fullName := owner + "/" + name

		var body struct {
			Note string `json:"note"`
		}
		_ = c.ShouldBindJSON(&body)

		existing, err := claimRepo.GetVerifiedClaimByRepoID(c.Request.Context(), fullName)
		if err != nil || existing == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "no verified claim exists for this repository"})
			return
		}

		if err := claimRepo.CreateDispute(c.Request.Context(), fullName, userClaims.UserID, existing.OwnerUserID, body.Note); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not file dispute"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"status":  "dispute_filed",
			"message": "Dispute submitted to the admin review queue. An admin will review ownership evidence; the claim is not transferred automatically.",
		})
	}
}
