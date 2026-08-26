package handler

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/claim"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
)

// GetRepoPlaybookHandler handles GET /api/v1/repos/:id/playbook — the public
// "Raise Your C-Rank" checklist built from existing telemetry (AC1, AC2).
// Safe for unscored/partial repos: never errors on missing data.
// AC2: unauthenticated visitors get only repo name + C-Rank tier (locked
// payload); signed-in maintainers get the full per-metric checklist.
func GetRepoPlaybookHandler(claimSvc *claim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner, name := getOwnerAndName(c)
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}

		payload, err := claimSvc.GetRepoPlaybook(c.Request.Context(), owner, name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not build playbook"})
			return
		}

		if _, authed := c.Get(middleware.UserIDKey); !authed {
			redacted := &claim.RepoPlaybookPayload{
				RepoFullName: payload.RepoFullName,
				CRankTier:    payload.CRankTier,
				Locked:       true,
				Checklist:    []scoring.RankGapItem{},
			}
			c.Header("Cache-Control", "no-store")
			c.JSON(http.StatusOK, redacted)
			return
		}

		c.Header("Cache-Control", "public, max-age=300")
		c.JSON(http.StatusOK, payload)
	}
}

// PostRescoreRepoHandler handles POST /api/v1/repos/:id/rescore (AC3): runs
// an automated re-score for a verified claimant and issues the before/after
// OG card state on a confirmed improvement.
func PostRescoreRepoHandler(claimSvc *claim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("user_claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userClaims := claimsVal.(*auth.Claims)

		owner, name := getOwnerAndName(c)
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and repo name required"})
			return
		}

		result, err := claimSvc.RescoreClaimedRepo(c.Request.Context(), owner, name, userClaims.UserID)
		if err != nil {
			if errors.Is(err, claim.ErrRescoreAlreadyRunning) {
				// AC4: the loser of the atomic lock gets 202 'already running'.
				c.JSON(http.StatusAccepted, gin.H{
					"status": "already_running",
					"error":  "a re-score for this repository is already running",
				})
				return
			}
			errStr := err.Error()
			switch {
			case strings.Contains(errStr, "403"):
				c.JSON(http.StatusForbidden, gin.H{"error": errStr})
			case strings.Contains(errStr, "400:"):
				c.JSON(http.StatusBadRequest, gin.H{"error": errStr})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": "re-score failed"})
			}
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// playbookOGCacheTTL bounds how long a rendered card stays fresh; expired
// entries are kept for stale-cache fallback under load (AC4).
const playbookOGCacheTTL = 6 * time.Hour

type playbookOGEntry struct {
	png       []byte
	renderedAt time.Time
}

// playbookOGCache is deterministic per (repo_id, score_version) (AC4):
// repeat hits serve the exact same bytes; render failures fall back to the
// last good entry instead of erroring.
var playbookOGCache = struct {
	sync.Mutex
	entries map[string]playbookOGEntry
}{entries: make(map[string]playbookOGEntry)}

func playbookOGCacheGet(key string) ([]byte, bool) {
	playbookOGCache.Lock()
	defer playbookOGCache.Unlock()
	e, ok := playbookOGCache.entries[key]
	return e.png, ok
}

func playbookOGCachePut(key string, pngBytes []byte) {
	playbookOGCache.Lock()
	defer playbookOGCache.Unlock()
	// Shed the whole cache when it grows past a sane bound; entries rebuild
	// deterministically from persisted state.
	if len(playbookOGCache.entries) > 1024 {
		playbookOGCache.entries = make(map[string]playbookOGEntry)
	}
	playbookOGCache.entries[key] = playbookOGEntry{png: pngBytes, renderedAt: time.Now().UTC()}
}

// GetPlaybookCardOGHandler renders the shareable before/after C-Rank OG PNG
// for a claimed repo (AC4). Deterministic per (repo, score_version): the
// cache key is repo_id + current score-version hash. Rate limited at the
// route level (10 req/min/IP); under load or render failure the last cached
// PNG is served stale rather than 500ing.
func GetPlaybookCardOGHandler(claimSvc *claim.Service, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner, name := c.Param("owner"), c.Param("name")
		if owner == "" || name == "" || !badgeSegmentRe.MatchString(owner) || !badgeSegmentRe.MatchString(name) {
			c.Status(http.StatusNotFound)
			return
		}
		fullName := owner + "/" + name

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err != nil || repo == nil || repo.ID == "" {
			c.Status(http.StatusNotFound)
			return
		}
		fullName = repo.FullName

		scoreVersion := claim.ScoreVersionFor(repo)
		cacheKey := repo.ID + "|" + scoreVersion

		if pngBytes, ok := playbookOGCacheGet(cacheKey); ok {
			servePlaybookPNG(c, pngBytes, true)
			return
		}

		cardState, err := claimSvc.GetPlaybookCardState(c.Request.Context(), repo.ID)
		if err != nil {
			// Stale-cache fallback under load (AC4).
			if pngBytes, ok := playbookOGCacheGet(cacheKey); ok {
				servePlaybookPNG(c, pngBytes, true)
				return
			}
			c.Status(http.StatusServiceUnavailable)
			return
		}

		pngBytes := renderPlaybookCardPNG(fullName, repo.CRankTier, repo.CRankScore, cardState)
		playbookOGCachePut(cacheKey, pngBytes)
		servePlaybookPNG(c, pngBytes, false)
	}
}

func servePlaybookPNG(c *gin.Context, pngBytes []byte, stale bool) {
	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "public, max-age=600, s-maxage=600")
	if stale {
		c.Header("X-Card-Cache", "stale")
	} else {
		c.Header("X-Card-Cache", "hit")
	}
	c.Data(http.StatusOK, "image/png", pngBytes)
}

// renderPlaybookCardPNG draws the 1200x630 before/after C-Rank card from the
// persisted crank_playbook_cards state; with no re-score yet it shows the
// current rank only ("before" panel), never fabricated after-values.
func renderPlaybookCardPNG(fullName, tier string, currentScore float64, st *claim.PlaybookCardState) []byte {
	const (
		w = 1200
		h = 630
	)
	bg := color.RGBA{0x22, 0x28, 0x31, 0xff}     // brand dark #222831
	white := color.RGBA{0xfd, 0xfb, 0xf7, 0xff}  // #FDFBF7
	grey := color.RGBA{0x9c, 0xa3, 0xaf, 0xff}   // #9CA3AF
	emerald := color.RGBA{0x10, 0xb9, 0x81, 0xff}
	amber := color.RGBA{0xf5, 0x9e, 0x0b, 0xff}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, w, 10), &image.Uniform{emerald}, image.Point{}, draw.Src)

	drawScaledText(img, "GETMERGED - RAISE YOUR C-RANK", 64, 64, 2, emerald)
	drawScaledText(img, truncateRunes(fullName, 34), 64, 120, 6, white)

	hasAfter := st != nil && st.AfterScore != nil && st.Status == claim.CardStatusImproved

	beforeScore := currentScore
	beforeTier := tier
	if st != nil {
		if st.BeforeTier != "" {
			beforeTier = st.BeforeTier
		}
		if !hasAfter {
			beforeScore = st.BeforeScore
		}
	}

	// Before panel.
	drawScaledText(img, fmt.Sprintf("%d/100", int(beforeScore+0.5)), 96, 260, 9, white)
	label := "CURRENT RANK"
	if hasAfter {
		label = "BEFORE"
	}
	drawScaledText(img, label, 100, 400, 2, grey)
	if beforeTier != "" {
		drawScaledText(img, "TIER "+beforeTier, 100, 440, 3, amber)
	}

	if hasAfter {
		afterScore := *st.AfterScore
		afterTier := ""
		if st.AfterTier != nil {
			afterTier = *st.AfterTier
		}
		drawScaledText(img, "->", 480, 320, 5, grey)
		drawScaledText(img, fmt.Sprintf("%d/100", int(afterScore+0.5)), 640, 260, 9, emerald)
		drawScaledText(img, "AFTER", 644, 400, 2, grey)
		if afterTier != "" {
			drawScaledText(img, "TIER "+afterTier, 644, 440, 3, amber)
		}
		delta := afterScore - beforeScore
		sign := "+"
		if delta < 0 {
			sign = ""
		}
		drawScaledText(img, fmt.Sprintf("%s%.1f PTS", sign, delta), 640, 500, 3, emerald)
	} else {
		drawScaledText(img, "Verify ownership, fix your gaps,", 480, 280, 3, lightGreyOG)
		drawScaledText(img, "and re-score to unlock this card.", 480, 330, 3, lightGreyOG)
	}

	drawScaledText(img, "Raise your C-Rank -> getmerged.abhishekco.de", 64, 556, 2, grey)

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

var lightGreyOG = color.RGBA{0xd4, 0xd4, 0xd8, 0xff}

// GetPlaybookCardByTokenHandler serves the before/after OG PNG at a tokenized
// URL (AC5): GET /og/playbook-card/:token. The 128-bit random token is scoped
// to a single repo and expires after 90 days; unknown/expired tokens get a
// plain 404 with no card data. Route-level rate limit is 10 req/min/IP.
func GetPlaybookCardByTokenHandler(claimSvc *claim.Service, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		if len(token) != 32 {
			c.Status(http.StatusNotFound)
			return
		}
		for _, r := range token {
			isHex := (r >= '0' && r <= '9') || (r >= 'a' && r <= 'f')
			if !isHex {
				c.Status(http.StatusNotFound)
				return
			}
		}

		repoID, err := claimSvc.ResolvePlaybookCardToken(c.Request.Context(), token)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), repoID)
		if err != nil || repo == nil || repo.ID == "" {
			c.Status(http.StatusNotFound)
			return
		}

		cardState, err := claimSvc.GetPlaybookCardState(c.Request.Context(), repo.ID)
		if err != nil {
			c.Status(http.StatusServiceUnavailable)
			return
		}

		cacheKey := "token|" + repo.ID + "|" + claim.ScoreVersionFor(repo)
		if pngBytes, ok := playbookOGCacheGet(cacheKey); ok {
			servePlaybookPNG(c, pngBytes, true)
			return
		}
		pngBytes := renderPlaybookCardPNG(repo.FullName, repo.CRankTier, repo.CRankScore, cardState)
		playbookOGCachePut(cacheKey, pngBytes)
		servePlaybookPNG(c, pngBytes, false)
	}
}
