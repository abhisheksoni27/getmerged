package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/hacktoberfest"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

// GetHacktoberfestProgressHandler handles GET /api/v1/hacktoberfest/progress.
// The counter is derived from the persisted qualifying merge set (AC2); the
// GitHub search poll happens here lazily under the 5-min per-user cache and is
// the sole state mutator — eventstream hints only force re-polls (AC3).
func GetHacktoberfestProgressHandler(svc *hacktoberfest.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		ctx := c.Request.Context()
		svc.TouchActivity(ctx, userID)

		login := c.GetString(middleware.UsernameKey)
		if conn, err := svc.Conn.GetConnection(ctx, userID); err == nil && conn != nil && conn.GithubLogin != "" {
			login = conn.GithubLogin
		}
		res, err := svc.Reconcile(ctx, userID, login, false)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reconcile hacktoberfest progress"})
			return
		}
		c.JSON(http.StatusOK, progressPayload(svc, res))
	}
}

// PostHacktoberfestNudgeHandler handles POST /api/v1/hacktoberfest/nudge:
// merge-detection eventstream hints trigger an immediate re-poll, throttled to
// once per user per minute server-side (AC3). Hints never mutate the counter
// directly; the reconcile against the search API does (AC2).
func PostHacktoberfestNudgeHandler(svc *hacktoberfest.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		ctx := c.Request.Context()
		svc.TouchActivity(ctx, userID)

		login := c.GetString(middleware.UsernameKey)
		if conn, err := svc.Conn.GetConnection(ctx, userID); err == nil && conn != nil && conn.GithubLogin != "" {
			login = conn.GithubLogin
		}
		res, err := svc.Reconcile(ctx, userID, login, true)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh hacktoberfest progress"})
			return
		}
		c.JSON(http.StatusOK, progressPayload(svc, res))
	}
}

func progressPayload(svc *hacktoberfest.Service, res *hacktoberfest.Result) gin.H {
	p := res.Progress
	count := p.TotalQualifying
	if count < 0 {
		count = 0 // unknown until first successful reconcile: never show a fake zero as authoritative
	}
	capped := count
	if capped > hacktoberfest.TargetMergeCount {
		capped = hacktoberfest.TargetMergeCount // AC8 cap
	}

	connStatus := prtrackerConnectionStatus(svc, res)
	payload := gin.H{
		"year":              p.Year,
		"target":            hacktoberfest.TargetMergeCount,
		"merged_count":      capped,
		"total_qualifying":  count,
		"card_issued":       p.CardIssued,
		"last_checked_at":   p.LastReconciledAt,
		"cached":            res.Cached,
		"limited":           res.Limited,
		"reconnect_required": res.ReconnectReq,
		"connection":        connStatus,
	}
	if p.CardIssued && p.CardID != "" {
		payload["card"] = gin.H{
			"card_id":      p.CardID,
			"share_url":    "/c/" + p.CardID,
			"og_image_url": "/api/v1/cards/" + p.CardID + "/og.png",
		}
	} else {
		payload["card"] = nil
	}
	if len(res.Merges) > 0 {
		shown := res.Merges
		if len(shown) > hacktoberfest.TargetMergeCount {
			shown = shown[:hacktoberfest.TargetMergeCount]
		}
		payload["merges"] = shown
	} else {
		payload["merges"] = []gin.H{}
	}
	if res.Cached && p.LastReconciledAt != nil { // AC5: 'updated Xm ago' while cached
		payload["updated_ago_min"] = int(time.Since(*p.LastReconciledAt).Minutes())
	}
	if res.RetryAfter > 0 {
		payload["retry_after_sec"] = int(res.RetryAfter.Seconds())
	}
	return payload
}

func prtrackerConnectionStatus(svc *hacktoberfest.Service, res *hacktoberfest.Result) string {
	if res.ReconnectReq {
		return "reconnect_required"
	}
	return "active"
}

// GetHacktoberfestLeaderboardHandler handles GET /api/v1/hacktoberfest/leaderboard.
// Public: ranks newcomer-welcoming repos by C-Rank tier then GFI quality; the
// >60% first-timer merge rate rides along as a badge/weight, not a filter (AC7).
func GetHacktoberfestLeaderboardHandler(store *hacktoberfest.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := 50
		if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 && v <= 100 {
			limit = v
		}
		entries, err := store.Leaderboard(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load hacktoberfest leaderboard"})
			return
		}
		if entries == nil {
			entries = []hacktoberfest.LeaderboardEntry{}
		}
		c.JSON(http.StatusOK, gin.H{
			"year":   hacktoberfest.EventYear(time.Now()),
			"repos":  entries,
			"count":  len(entries),
		})
	}
}
