package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"regexp"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/prsim"
	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

// badgeHashRe enforces the AC6 badge-hash format ^[a-f0-9]{16}$.
var badgeHashRe = regexp.MustCompile(`^[a-f0-9]{16}$`)

// repoSlugRe validates a well-formed "owner/name" slug before any network
// call; well-formed-but-unknown slugs 404 downstream instead.
var repoSlugRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$`)

func simError(c *gin.Context, status int, code, msg string) {
	c.JSON(status, gin.H{"error_code": code, "error": msg})
}

// ScorePRSimHandler runs the pre-submission acceptance simulation
// (AC1-AC6). Public like /cards so contributors can use it without an API
// key or account (anonymous tier only); abuse is bounded by a 10 req/hour
// per-IP fixed-window rate limit (AC5).
func ScorePRSimHandler(store *prsim.Store, cache *prsim.RepoCache, vk valkey.Client, ghToken string) gin.HandlerFunc {
	httpClient := &http.Client{Timeout: 15 * time.Second}
	return func(c *gin.Context) {
		var body struct {
			Title       string `json:"title"`
			Repo        string `json:"repo"`
			RepoSlug    string `json:"repo_slug"`
			Description string `json:"description"`
			Diff        string `json:"diff"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			simError(c, http.StatusBadRequest, "invalid_json", "request body must be valid JSON with title, repo_slug and diff")
			return
		}
		if body.RepoSlug == "" {
			body.RepoSlug = body.Repo // backward-compatible field name
		}
		repo := prsim.NormalizeRepo(body.RepoSlug)
		title := body.Title
		switch {
		case title == "" || repo == "":
			simError(c, http.StatusBadRequest, "missing_fields", "title, repo_slug and diff are required")
			return
		case !repoSlugRe.MatchString(repo):
			simError(c, http.StatusBadRequest, "invalid_repo_slug", "repo_slug must be a public GitHub owner/repo pair")
			return
		}
		// AC1: unified-diff shape and the 1MB cap both reject as 400 with
		// an error_code.
		if len(body.Diff) > prsim.MaxDiffBytes {
			simError(c, http.StatusBadRequest, "diff_too_large", fmt.Sprintf("diff exceeds %d MB limit", prsim.MaxDiffBytes/(1024*1024)))
			return
		}
		if err := prsim.ValidateDiff(body.Diff); err != nil {
			simError(c, http.StatusBadRequest, "invalid_diff", err.Error())
			return
		}

		hash := prsim.PayloadHash(repo, title, body.Description, body.Diff)

		// AC8-style dedup: SETNX lock on the payload hash; concurrent
		// duplicates await the first computed result (5s timeout), then
		// fall through.
		if err := prsim.TryDedupLock(c.Request.Context(), vk, hash); err != nil {
			if row, found := prsim.AwaitDuplicate(c.Request.Context(), store, hash); found {
				c.Data(http.StatusOK, "application/json", []byte(row.ResultJSON))
				return
			}
		}

		stats, code, retryAfter := prsim.GetOrFetchRepoStats(c.Request.Context(), httpClient, ghToken, repo, cache)
		switch code {
		case prsim.UpstreamRateLimited:
			// AC3: GitHub 403/429 - score from cache if present (handled
			// inside GetOrFetchRepoStats), else 503 with retry_after.
			if retryAfter <= 0 {
				retryAfter = 60
			}
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error_code":  "upstream_rate_limited",
				"error":       "GitHub rate limit reached and no cached stats for this repository",
				"retry_after": retryAfter,
			})
			return
		case prsim.UpstreamNotFound:
			// AC3/AC4: nonexistent, private or unreachable slug is 404;
			// anonymous tier only serves public repos.
			simError(c, http.StatusNotFound, "repo_not_found", "repository not found or not publicly accessible")
			return
		}

		var turnaround *prsim.Turnaround
		var contribHints []string
		contribPts := stats.ContribPts
		if stats != nil {
			contribHints = stats.ContribHints
			turnaround = stats.Turnaround
		}
		result := prsim.Score(title, body.Diff, body.Description, contribPts, contribHints)
		if turnaround == nil {
			result.Suggestions = append(result.Suggestions, "Could not read review history for this repository; verify the repo name.")
		} else {
			result.Turnaround = turnaround
			if !turnaround.Insufficient && turnaround.MedianHours >= 168 {
				result.Suggestions = append(result.Suggestions, "This repo's median review turnaround exceeds a week - consider a smaller PR or pinging maintainers early.")
			}
		}

		blob, err := json.Marshal(result)
		if err != nil {
			simError(c, http.StatusInternalServerError, "encode_failed", "failed to encode result")
			return
		}
		id, err := store.Save(c.Request.Context(), hash, repo, body.Diff, blob)
		if err != nil {
			// Storage failure must not lose the score for the contributor.
			c.Data(http.StatusOK, "application/json", blob)
			return
		}
		resp := map[string]any{}
		dec := json.NewDecoder(bytes.NewReader(blob))
		if dec.Decode(&resp) != nil {
			resp = gin.H{"score": result.Score}
		}
		resp["submission_id"] = id
		out, _ := json.Marshal(resp)
		c.Data(http.StatusOK, "application/json", out)
	}
}

var simBadgeColors = []struct {
	min   int
	color string
}{
	{80, "#4c1"},
	{60, "#97ca00"},
	{40, "#dfb317"},
	{20, "#fe7d37"},
	{-1, "#e05d44"},
}

func simBadgeColor(score int) string {
	for _, b := range simBadgeColors {
		if score >= b.min {
			return b.color
		}
	}
	return "#9f9f9f"
}

func renderScoreBadge(score int) string {
	label := fmt.Sprintf("acceptance %d%%", score)
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="20" role="img" aria-label="%s">
<rect width="140" height="20" fill="#222831"/>
<rect x="86" width="54" height="20" fill="%s"/>
<text x="8" y="14" fill="#ffffff" font-family="Verdana,Geneva,sans-serif" font-size="11">acceptance</text>
<text x="113" y="14" fill="#ffffff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11" font-weight="bold">%d%%</text>
</svg>`, html.EscapeString(label), simBadgeColor(score), score)
}

const expiredBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20" role="img" aria-label="PR acceptance: expired">
<rect width="120" height="20" fill="#222831"/>
<rect x="66" width="54" height="20" fill="#9f9f9f"/>
<text x="8" y="14" fill="#ffffff" font-family="Verdana,Geneva,sans-serif" font-size="11">acceptance</text>
<text x="93" y="14" fill="#ffffff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11" font-weight="bold">expired</text>
</svg>`

// PRSimBadgeHandler serves the SVG badge server-side from the cached score,
// keyed by the 16-hex-char payload hash only - clients never pass a score
// (AC6). Malformed hashes 404; expired or unknown hashes get a recompute-free
// 404 carrying the plain-SVG 'expired' fallback.
func PRSimBadgeHandler(store *prsim.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		hash := c.Param("hash.svg")
		hash = trimBadgeSuffix(hash)
		if !badgeHashRe.MatchString(hash) {
			c.JSON(http.StatusNotFound, gin.H{"error_code": "invalid_hash", "error": "badge hash must match ^[a-f0-9]{16}$"})
			return
		}
		blob, state, err := store.BadgeResult(c.Request.Context(), hash)
		if err == nil && state == prsim.BadgeLive {
			var res prsim.Result
			if json.Unmarshal(blob, &res) == nil && res.Score > 0 {
				c.Header("Cache-Control", "public, max-age=300")
				c.Data(http.StatusOK, "image/svg+xml", []byte(renderScoreBadge(res.Score)))
				return
			}
		}
		// Expired (or unreadable) hash: plain-SVG 'expired' fallback with a
		// 404 status - never recomputed.
		c.Header("Cache-Control", "public, max-age=60")
		c.Data(http.StatusNotFound, "image/svg+xml", []byte(expiredBadge))
	}
}

func trimBadgeSuffix(h string) string {
	const suffix = ".svg"
	if len(h) > len(suffix) && h[len(h)-len(suffix):] == suffix {
		return h[:len(h)-len(suffix)]
	}
	return h
}
