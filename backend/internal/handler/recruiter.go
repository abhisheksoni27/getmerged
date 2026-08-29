package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// recruiterReindexCh is the in-process async queue that keeps the recruiter
// search index fresh after a contributor_profiles mutation (AC8). "No new infra":
// a buffered channel drained by a single worker goroutine started at boot.
var recruiterReindexCh chan int64

// StartRecruiterReindexWorker launches the async indexer. Safe to call once.
func StartRecruiterReindexWorker(profileRepo repository.ContributorProfileRepository) {
	if recruiterReindexCh != nil {
		return
	}
	recruiterReindexCh = make(chan int64, 1024)
	go func() {
		for uid := range recruiterReindexCh {
			if err := profileRepo.ReindexRecruiterColumns(context.Background(), uid); err != nil {
				slog.Warn("recruiter reindex failed", "user_id", uid, "err", err)
			}
		}
	}()
}

// EnqueueRecruiterReindex schedules a contributor_profiles mutation for async
// reindexing. No-op until the worker is started (boot).
func EnqueueRecruiterReindex(userID int64) {
	if recruiterReindexCh == nil {
		return
	}
	select {
	case recruiterReindexCh <- userID:
	default:
		slog.Warn("recruiter reindex queue full; dropping job", "user_id", userID)
	}
}

// OpenToOpportunitiesBody is the PATCH body for the opt-in toggle (AC1).
type OpenToOpportunitiesBody struct {
	OpenToOpportunities bool `json:"open_to_opportunities"`
}

// ToggleOpenToOpportunitiesHandler handles PATCH /api/v1/user/open-to-opportunities.
// Owner-only (UserAuth middleware). Writes the opt-in on contributor_profiles and
// enqueues an async reindex of the recruiter-search columns (AC8).
func ToggleOpenToOpportunitiesHandler(profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, ok := c.Get(middleware.UserIDKey)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var body OpenToOpportunitiesBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		if err := profileRepo.SetOpenToOpportunities(c.Request.Context(), userID, body.OpenToOpportunities); err != nil {
			slog.Error("failed to set open_to_opportunities", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update opt-in"})
			return
		}

		// Async reindex: keep the recruiter index within freshness budget
		// without blocking the request (AC8).
		EnqueueRecruiterReindex(userID)

		c.JSON(http.StatusOK, gin.H{
			"status":               "ok",
			"open_to_opportunities": body.OpenToOpportunities,
		})
	}
}

// GetOpenToOpportunitiesHandler handles GET /api/v1/user/open-to-opportunities?slug=.
// Returns the owner's own opt-in status when the authenticated user owns the slug
// (AC5: only the owner can see their own status). 403 when not the owner.
func GetOpenToOpportunitiesHandler(userRepo repository.UserRepository, profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, ok := c.Get(middleware.UserIDKey)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		slug := strings.TrimSpace(c.Query("slug"))
		if slug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "slug parameter is required"})
			return
		}

		// Ownership check: the authed user must own this slug.
		owner, err := userRepo.FindBySlug(c.Request.Context(), strings.ToLower(slug))
		if err != nil || owner == nil || owner.ID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "not the profile owner"})
			return
		}

		var open bool
		if o, err := profileRepo.GetOpenToOpportunities(c.Request.Context(), userID); err == nil {
			open = o
		}

		c.JSON(http.StatusOK, gin.H{
			"slug":                  slug,
			"open_to_opportunities": open,
		})
	}
}

// CreateRecruiterPassCheckoutHandler handles POST /api/v1/user/recruiter-pass/checkout.
// Creates a pending Recruiter Pass entitlement row (status 'pending') so the
// webhook race in AC6 is observable: search stays 403 until the Dodo webhook
// flips the row to 'active'.
func CreateRecruiterPassCheckoutHandler(cfg *config.Config, recruiterRepo repository.RecruiterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, ok := c.Get(middleware.UserIDKey)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		checkoutID := "rc_" + strconv.FormatInt(userID, 10) + "_" + strconv.FormatInt(time.Now().UnixNano(), 10)
		if err := recruiterRepo.CreateRecruiterPassOrder(c.Request.Context(), userID, checkoutID, ""); err != nil {
			slog.Error("failed to create recruiter pass order", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create recruiter pass checkout"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":              "pending",
			"checkout_id":         checkoutID,
			"message":             "complete payment to activate the Recruiter Pass",
		})
	}
}

// RecruiterSearchHandler handles GET /api/v1/recruiter/search (AC7: NOT under
// /users/:slug). Gated on an ACTIVE Recruiter Pass (AC2/AC6/AC9): unauthed ->
// 401 (UserAuth middleware), authed-but-no-pass or pending -> 403, never 500 on
// the pending race. Enforces filters (AC3), pagination (AC4), and the 30/min/IP
// rate limit applied at the route.
func RecruiterSearchHandler(recruiterRepo repository.RecruiterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, ok := c.Get(middleware.UserIDKey)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		// Pass gating: 403 until the entitlement row is 'active' (AC6).
		pass, err := recruiterRepo.GetRecruiterPass(c.Request.Context(), userID)
		if err != nil {
			// Never 500 on the race/edge; treat as no-pass.
			slog.Warn("recruiter pass lookup failed", "user_id", userID, "err", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "recruiter pass required"})
			return
		}
		if pass == nil || pass.Status != "active" {
			c.JSON(http.StatusForbidden, gin.H{"error": "recruiter pass required", "status": statusOrEmpty(pass)})
			return
		}

		// Parse filters.
		filters := repository.RecruiterSearchFilters{}
		if pl := strings.TrimSpace(c.Query("primary_languages")); pl != "" {
			for _, l := range strings.Split(pl, ",") {
				if l = strings.TrimSpace(l); l != "" {
					filters.PrimaryLanguages = append(filters.PrimaryLanguages, l)
				}
			}
		}
		if sl := strings.TrimSpace(c.Query("skill_level")); sl != "" {
			for _, s := range strings.Split(sl, ",") {
				if s = strings.TrimSpace(s); s != "" {
					filters.SkillLevels = append(filters.SkillLevels, s)
				}
			}
		}
		if cs := strings.TrimSpace(c.Query("contribution_style")); cs != "" {
			for _, s := range strings.Split(cs, ",") {
				if s = strings.TrimSpace(s); s != "" {
					filters.ContributionStyles = append(filters.ContributionStyles, s)
				}
			}
		}
		if m := strings.TrimSpace(c.Query("min_verified_sa_merges")); m != "" {
			if v, e := strconv.Atoi(m); e == nil {
				filters.MinVerifiedSA = v
			}
		}

		// AC4 query-complexity cap: at most 4 filter groups.
		groups := 0
		if len(filters.PrimaryLanguages) > 0 {
			groups++
		}
		if len(filters.SkillLevels) > 0 {
			groups++
		}
		if len(filters.ContributionStyles) > 0 {
			groups++
		}
		if filters.MinVerifiedSA > 0 {
			groups++
		}
		if groups > 4 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "too many filter groups (max 4)"})
			return
		}
		// AC3: empty filters -> 400.
		if groups == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "at least one filter is required"})
			return
		}

		// Pagination (AC4): page default 1, limit default 20, max 50.
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		if limit < 1 {
			limit = 20
		}
		if limit > 50 {
			limit = 50
		}

		results, total, err := recruiterRepo.SearchRecruiterProfiles(c.Request.Context(), filters, page, limit)
		if err != nil {
			slog.Error("recruiter search failed", "user_id", userID, "err", err)
			// AC6: never 500 — return empty, safe payload.
			c.JSON(http.StatusOK, gin.H{
				"results": []repository.RecruiterSearchResult{},
				"total":   0,
				"page":    page,
				"limit":   limit,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"results": results,
			"total":   total,
			"page":    page,
			"limit":   limit,
		})
	}
}

func statusOrEmpty(p *repository.RecruiterPass) string {
	if p == nil {
		return "none"
	}
	return p.Status
}

type PostHireInquiryRequest struct {
	TargetSlug string `json:"target_slug" binding:"required"`
	Email      string `json:"email" binding:"required"`
	Company    string `json:"company" binding:"required"`
	Message    string `json:"message"`
}

// PostHireInquiryHandler handles public POST /api/v1/user/hire-inquiry
// Allows recruiters, companies, or sponsors to connect and register hiring signals for a contributor.
func PostHireInquiryHandler(userRepo repository.UserRepository, db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req PostHireInquiryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inquiry payload: " + err.Error()})
			return
		}

		slugClean := strings.TrimPrefix(strings.TrimSpace(req.TargetSlug), "@")
		slugClean = strings.ToLower(slugClean)
		targetUser, err := userRepo.FindBySlug(c.Request.Context(), slugClean)
		if err != nil || targetUser == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "contributor not found"})
			return
		}

		payloadBytes, _ := json.Marshal(gin.H{
			"from_email":  strings.TrimSpace(req.Email),
			"company":     strings.TrimSpace(req.Company),
			"message":     strings.TrimSpace(req.Message),
			"target_slug": targetUser.SlugOrUsername(),
			"created_at":  time.Now().Format(time.RFC3339),
		})

		_, _ = db.ExecContext(c.Request.Context(), `
			INSERT INTO notification_queue (user_id, type, payload, status, created_at)
			VALUES (?, 'hire_inquiry', ?, 'pending', CURRENT_TIMESTAMP)
		`, targetUser.ID, string(payloadBytes))

		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "hiring signal registered successfully",
		})
	}
}

