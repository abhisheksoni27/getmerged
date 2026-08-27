package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// ReportCardHandler handles GET /api/v1/u/:username/report-card — the JSON
// backing the shareable contributor report-card OG image.
//
// AC3 privacy + not-found gates:
//   - unknown user / reserved name -> 404 JSON (drives the "user not found" card)
//   - private profile (is_public=false) -> 403 JSON (drives the neutral card)
//   - success -> 200 JSON with zero-safe aggregates (no div-by-zero)
//
// AC5: cached (Cache-Control: public, max-age=3600, ETag) and rate-limited
// upstream by the per-IP limiter registered on the route.
func ReportCardHandler(userRepo repository.UserRepository, prStore *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		if username == "" || !usernamePattern.MatchString(username) || repository.IsReservedSlug(username) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}

		user, err := userRepo.FindBySlug(c.Request.Context(), strings.ToLower(strings.TrimSpace(username)))
		if err != nil || user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		if !user.IsPublic {
			c.JSON(http.StatusForbidden, gin.H{"error": "profile is private"})
			return
		}

		stats := &prtracker.ReportCardStats{}
		if prStore != nil {
			if s, serr := prStore.ReportCardStats(c.Request.Context(), user.ID); serr == nil && s != nil {
				stats = s
			}
		}

		payload := gin.H{
			"username":        user.Username,
			"slug":            derefSlug(user.Slug),
			"avatar_url":      derefStr(user.AvatarURL),
			"merged_pr_count": stats.MergedPRCount,
			"first_merge_at":  firstMergeISONull(stats.FirstMergeAt),
			"top_languages":   stats.TopLanguages,
			"c_rank_tiers":    stats.CRankTiers,
		}

		body, _ := json.Marshal(payload)
		sum := sha256.Sum256(body)
		etag := `"` + hex.EncodeToString(sum[:]) + `"`

		if match := c.GetHeader("If-None-Match"); match != "" && match == etag {
			c.Header("Cache-Control", "public, max-age=3600")
			c.Header("ETag", etag)
			c.Status(http.StatusNotModified)
			return
		}

		cacheKey := "apicache:reportcard:" + strings.ToLower(username)
		if vk := middleware.MustCache(c); vk != nil {
			_ = vk.Do(c.Request.Context(), vk.B().Setex().Key(cacheKey).Seconds(3600).Value(string(body)).Build())
		}

		c.Header("Cache-Control", "public, max-age=3600")
		c.Header("ETag", etag)
		c.Data(http.StatusOK, "application/json", body)
	}
}

func derefSlug(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

func derefStr(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

func firstMergeISONull(t *time.Time) *string {
	if t == nil {
		return nil
	}
	iso := t.UTC().Format(time.RFC3339)
	return &iso
}
