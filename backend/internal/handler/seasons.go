package handler

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

// Season-rank cards flow through the existing /api/v1/cards/:id pipeline
// (AC4) using deterministic ids shaped "sr<uid36><sig>" so no extra table or
// creation step is needed; they are distinct from the 32-hex forecast ids.
const (
	seasonIDPrefix  = "sr"
	seasonUIDFieldW = 13 // zero-padded base36 user id width (max int64)
)

var seasonCardPattern = regexp.MustCompile(`^sr[0-9a-z]{19}$`)

func seasonChecksum(secret string, userID int64) string {
	sum := sha256.Sum256([]byte("season-card:" + secret + ":" + strconv.FormatInt(userID, 10)))
	return hex.EncodeToString(sum[:])[:6]
}

func SeasonCardID(secret string, userID int64) string {
	uid := strconv.FormatInt(userID, 36)
	for len(uid) < seasonUIDFieldW {
		uid = "0" + uid
	}
	return seasonIDPrefix + strings.ToLower(uid) + seasonChecksum(secret, userID)
}

func parseSeasonCardID(secret, id string) (int64, bool) {
	if !seasonCardPattern.MatchString(id) {
		return 0, false
	}
	trimmed := strings.TrimLeft(id[2:2+seasonUIDFieldW], "0")
	if trimmed == "" {
		return 0, false
	}
	uid, err := strconv.ParseInt(trimmed, 36, 64)
	if err != nil || uid <= 0 || SeasonCardID(secret, uid) != id {
		return 0, false
	}
	return uid, true
}

// GetUserSeasonHandler serves GET /api/v1/user/season (authenticated): XP,
// level, streak plus the shareable season-rank card URLs (AC1/AC3/AC4).
func GetUserSeasonHandler(store *prtracker.Store, jwtSecret string) gin.HandlerFunc {
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
		stats, err := store.GetSeasonStats(c.Request.Context(), userID)
		if err != nil {
			slog.Error("season stats failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load season stats"})
			return
		}
		cardID := SeasonCardID(jwtSecret, userID)
		c.Header("Cache-Control", "private, max-age=300")
		c.JSON(http.StatusOK, gin.H{
			"season":       stats,
			"card_id":      cardID,
			"share_url":    "/c/" + cardID,
			"og_image_url": "/api/v1/cards/" + cardID + "/og.png",
		})
	}
}

// GetContributorLeaderboardHandler serves GET /api/v1/contributor-leaderboard
// (public): top N=20 contributors ranked by season-week XP, then streak, then
// username — fully deterministic (AC6).
func GetContributorLeaderboardHandler(store *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit := prtracker.DefaultLeaderboardSize
		if v := c.Query("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= prtracker.MaxLeaderboardSize {
				limit = n
			}
		}
		entries, err := store.WeeklyContributorLeaderboard(c.Request.Context(), limit)
		if err != nil {
			slog.Error("contributor leaderboard failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load leaderboard"})
			return
		}
		if entries == nil {
			entries = []prtracker.LeaderboardEntry{}
		}
		season := prtracker.SeasonLabel(time.Now())
		if s := store.CurrentSeasonLabel(c.Request.Context(), time.Now()); s != "" {
			season = s
		}
		c.Header("Cache-Control", "public, max-age=600")
		c.JSON(http.StatusOK, gin.H{
			"season":  season,
			"entries": entries,
		})
	}
}

// lookupSeasonCard resolves an "sr…" card id against live season stats;
// returns false when the id is not a season card. Renders for any profile,
// including zero-XP users (AC7).
func lookupSeasonCard(c *gin.Context, store *prtracker.Store, jwtSecret, id string) (*prtracker.SeasonStats, bool) {
	userID, ok := parseSeasonCardID(jwtSecret, id)
	if !ok {
		return nil, false
	}
	stats, err := store.GetSeasonStats(c.Request.Context(), userID)
	if err != nil || stats == nil {
		return nil, false
	}
	return stats, true
}

const seasonCacheTTL = int64(3600)

// serveSeasonCardJSON backs GET /api/v1/cards/:id for "sr…" ids (AC4).
func serveSeasonCardJSON(c *gin.Context, vk valkey.Client, id string, stats *prtracker.SeasonStats) {
	c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", seasonCacheTTL, seasonCacheTTL))
	body, err := json.Marshal(seasonCardPublicPayload(id, stats))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode card"})
		return
	}
	if vk != nil {
		_ = vk.Do(c.Request.Context(), vk.B().Setex().Key("apicache:card:"+id).Seconds(seasonCacheTTL).Value(string(body)).Build())
	}
	c.Data(http.StatusOK, "application/json", body)
}

// serveSeasonCardPNG backs GET /api/v1/cards/:id/og.png for "sr…" ids.
func serveSeasonCardPNG(c *gin.Context, vk valkey.Client, id string, stats *prtracker.SeasonStats) {
	pngBytes := renderSeasonCardPNG(stats)
	c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", seasonCacheTTL, seasonCacheTTL))
	if vk != nil {
		_ = vk.Do(c.Request.Context(), vk.B().Setex().Key("apicache:cardog:"+id).Seconds(seasonCacheTTL).Value(base64.StdEncoding.EncodeToString(pngBytes)).Build())
	}
	c.Data(http.StatusOK, "image/png", pngBytes)
}

func seasonCardPublicPayload(id string, stats *prtracker.SeasonStats) gin.H {
	// AC3: weeks are UTC Mon-weeks; the card expires after the current week
	// plus a one-week grace window.
	expires := prtracker.WeekStart(time.Now()).AddDate(0, 0, 14)
	return gin.H{
		"id":               id,
		"kind":             "season_rank",
		"season":           stats.Season,
		"username":         stats.Username,
		"total_xp":         stats.TotalXP,
		"season_xp":        stats.SeasonXP,
		"weekly_xp":        stats.WeeklyXP,
		"level":            stats.Level,
		"xp_to_next_level": stats.XPToNext,
		"streak_weeks":     stats.StreakWeeks,
		"merged_count":     stats.MergedCount,
		"season_rank":      stats.SeasonRank,
		"created_at":       time.Now().UTC(),
		"expires_at":       expires,
	}
}

// renderSeasonCardPNG draws the 1200x630 season-rank OG card with the shared
// scaled-text renderer from the forecast OG pipeline (AC4).
func renderSeasonCardPNG(stats *prtracker.SeasonStats) []byte {
	const (
		w = 1200
		h = 630
	)
	bg := color.RGBA{0x22, 0x28, 0x31, 0xff}    // brand dark #222831
	panel := color.RGBA{0x2c, 0x33, 0x3e, 0xff} // #2C333E
	white := color.RGBA{0xfd, 0xfb, 0xf7, 0xff} // #FDFBF7
	grey := color.RGBA{0x9c, 0xa3, 0xaf, 0xff}
	lightGrey := color.RGBA{0xd4, 0xd4, 0xd8, 0xff}
	emerald := color.RGBA{0x10, 0xb9, 0x81, 0xff}
	amber := color.RGBA{0xf5, 0x9e, 0x0b, 0xff}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, w, 10), &image.Uniform{emerald}, image.Point{}, draw.Src)

	drawScaledText(img, "GETMERGED - CONTRIBUTOR SEASON RANK", 64, 64, 2, emerald)
	drawScaledText(img, truncateRunes("@"+stats.Username, 34), 64, 120, 6, white)
	drawScaledText(img, truncateRunes(stats.Season+" SEASON", 60), 64, 210, 2, lightGrey)

	levelText := fmt.Sprintf("LEVEL %d", stats.Level)
	drawScaledText(img, levelText, 64, 300, 10, white)
	nextLine := fmt.Sprintf("%d XP TO NEXT LEVEL", stats.XPToNext)
	if stats.Level >= prtracker.MaxLevel {
		nextLine = "MAX LEVEL REACHED"
	}
	drawScaledText(img, fmt.Sprintf("%d SEASON XP · %s", stats.SeasonXP, nextLine), 68, 450, 2, grey)

	rankLabel := "UNRANKED THIS SEASON"
	if stats.SeasonRank != nil && *stats.SeasonRank > 0 {
		rankLabel = fmt.Sprintf("#%d IN SEASON", *stats.SeasonRank)
	}
	drawScaledText(img, rankLabel, 620, 310, 5, emerald)

	streakText := fmt.Sprintf("%d-WEEK STREAK", stats.StreakWeeks)
	textW := approxTextWidth(streakText, 3)
	draw.Draw(img, image.Rect(620, 400, 620+textW+56, 400+72), &image.Uniform{panel}, image.Point{}, draw.Src)
	drawScaledText(img, streakText, 648, 424, 3, amber)

	drawScaledText(img, "Climb the weekly contributor board -> getmerged.abhishekco.de/leaderboard", 64, 552, 2, grey)

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}
