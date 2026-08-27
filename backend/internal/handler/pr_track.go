package handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// parseGitHubPRURL extracts owner/repo/number from a github.com PR URL.
// Accepts https://github.com/owner/repo/pull/<n> (with optional trailing slash/query).
func parseGitHubPRURL(raw string) (owner, repo string, number int, ok bool) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return
	}
	if u.Scheme != "https" && u.Scheme != "http" {
		return
	}
	if !strings.EqualFold(u.Host, "github.com") {
		return
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) < 4 || parts[2] != "pull" {
		return
	}
	owner, repo = parts[0], parts[1]
	if owner == "" || repo == "" {
		return
	}
	n, e := strconv.Atoi(parts[3])
	if e != nil {
		return
	}
	return owner, repo, n, true
}

func cardShareURL(cardID string) string {
	if cardID == "" {
		return ""
	}
	return "/c/" + cardID
}

func cardOGURL(cardID string) string {
	if cardID == "" {
		return ""
	}
	return "/api/v1/cards/" + cardID + "/og.png"
}

// TrackPRHandler handles POST /api/v1/user/prs/track (AC1-AC3, AC8).
// Body: {"pr_url": "https://github.com/owner/repo/pull/123"}.
func TrackPRHandler(svc *prtracker.Service, entRepo repository.EntitlementRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		var req struct {
			PRURL string `json:"pr_url"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.PRURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "pr_url is required"})
			return
		}
		owner, repo, number, ok := parseGitHubPRURL(req.PRURL)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid PR URL. Use https://github.com/owner/repo/pull/<number>",
			})
			return
		}

		// AC1: a valid GitHub token must exist server-side, else block with CTA.
		token, terr := svc.Tokens.GetValidGithubToken(c.Request.Context(), userID)
		if terr != nil || token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":           "Connect your GitHub account to track a PR.",
				"action":          "re-authenticate via /api/v1/auth/github",
				"needs_github_auth": true,
			})
			return
		}

		// AC2: fetch and validate the PR exists, is open or merged, not closed-unmerged.
		detail, res, derr := svc.GitHub.FetchPRDetail(c.Request.Context(), userID, token, owner, repo, number)
		if res != nil && res.Unauthorized {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":            "GitHub authorization expired. Reconnect to continue.",
				"action":           "re-authenticate via /api/v1/auth/github",
				"needs_github_auth": true,
			})
			return
		}
		if derr != nil || detail == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Could not load this PR. It may be private, deleted, or the URL is wrong.",
			})
			return
		}
		isMerged := detail.Merged || (detail.State == "closed" && detail.MergedAt != nil)
		isOpen := detail.State == "open"
		if !isOpen && !isMerged {
			c.JSON(http.StatusConflict, gin.H{
				"error": "This PR is closed without being merged. Only open or merged PRs can be tracked.",
			})
			return
		}

		// AC8: free tier tracks 1 active PR; paid tiers are unlimited.
		unlimited := false
		if entRepo != nil {
			if ent, eerr := entRepo.GetEntitlement(c.Request.Context(), userID); eerr == nil && ent != nil {
				unlimited = ent.IsPro
			}
		}
		prID := fmt.Sprintf("%s/%s#%d", owner, repo, number)
		err := svc.Store.TrackPR(c.Request.Context(), userID, owner, repo, number, unlimited)
		if errors.Is(err, prtracker.ErrTrackLimitReached) {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":            "Free plan tracks 1 active PR. Upgrade for unlimited tracked PRs.",
				"upgrade_required": true,
			})
			return
		}
		if err != nil {
			slog.Error("pr track: persist failed", "err", err, "user_id", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to track PR."})
			return
		}

		// Seed an immediate snapshot so the dashboard reflects it at once.
		now := time.Now().UTC()
		state := prtracker.StateMerged
		if !isMerged {
			state = prtracker.StateOpen
		}
		title := detail.Title
		if title == "" {
			title = detail.HtmlURLStr
		}
		_ = svc.Store.UpsertSnapshot(c.Request.Context(), prtracker.PRSnapshot{
			PRID:            prID,
			UserID:          userID,
			RepositoryID:    owner + "/" + repo,
			PRNumber:        number,
			Title:           title,
			HTMLURL:         detail.HtmlURLStr,
			State:           state,
			GithubUpdatedAt: &now,
			MergedAt:        detail.MergedAt,
			FetchedAt:       now,
			SnapshotAt:      now,
		})

		// AC6: if already merged on track, generate the proof card immediately.
		cardID := ""
		if isMerged && svc.Sink != nil {
			if cid, aerr := svc.Sink.OnMerged(c.Request.Context(), userID, owner, repo, number, prID, title, detail.HtmlURLStr, derefTimePtr(detail.MergedAt)); aerr == nil && cid != "" {
				cardID = cid
				_ = svc.Store.InsertMergeArtifact(c.Request.Context(), prID, userID, owner+"/"+repo, number, cid, detail.MergedAt)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"pr_id":         prID,
			"state":         state,
			"title":         title,
			"html_url":      detail.HtmlURLStr,
			"tracked":       true,
			"card_id":       cardID,
			"share_url":     cardShareURL(cardID),
			"og_image_url":  cardOGURL(cardID),
		})
	}
}

// derefTimePtr returns the value of a *time.Time or the zero time when nil.
func derefTimePtr(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return *t
}

// PRStatusHandler handles GET /api/v1/user/pr-status (AC5). The server owns the
// polling loop; the client only reads this cached state (websocket-ready).
func PRStatusHandler(svc *prtracker.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		rows, err := svc.Store.ListTrackedPRs(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load PR status"})
			return
		}
		items := make([]gin.H, 0, len(rows))
		for _, r := range rows {
			items = append(items, gin.H{
				"pr_id":         r.PRID,
				"owner":         r.Owner,
				"repo":          r.Repo,
				"pr_number":     r.Number,
				"state":         r.LatestState,
				"title":         r.Title,
				"html_url":      r.HTMLURL,
				"fetched_at":    r.FetchedAt,
				"has_artifact":  r.HasArtifact,
				"card_id":       r.CardID,
				"share_url":     cardShareURL(r.CardID),
				"og_image_url":  cardOGURL(r.CardID),
			})
		}
		c.JSON(http.StatusOK, gin.H{"prs": items, "server_time": time.Now().UTC()})
	}
}

// GetHallOfFameHandler handles GET /api/v1/hall-of-fame (AC6 proof cards feed).
func GetHallOfFameHandler(prStore *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := prStore.ListMergeArtifacts(c.Request.Context(), 50)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load hall of fame"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"entries": rows})
	}
}

// GetUserMergesHandler handles GET /api/v1/u/:username/merges (AC6 profile entry).
func GetUserMergesHandler(userRepo repository.UserRepository, prStore *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		if username == "" || !usernamePattern.MatchString(username) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		user, err := userRepo.FindBySlug(c.Request.Context(), strings.ToLower(strings.TrimSpace(username)))
		if err != nil || user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		rows, err := prStore.MergeArtifactsForUser(c.Request.Context(), user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load merges"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"username": username, "merges": rows})
	}
}

// mergeCardSink implements prtracker.MergeArtifactSink, reusing the ShareCard +
// OG pipeline to emit a verifiable "Merged via OpenDoor" proof card (AC6).
type mergeCardSink struct {
	cardRepo  repository.ShareCardRepository
	jwtSecret string
}

// NewMergeCardSink builds the sink and returns it for assignment to prtracker.Service.Sink.
func NewMergeCardSink(cardRepo repository.ShareCardRepository, jwtSecret string) prtracker.MergeArtifactSink {
	return &mergeCardSink{cardRepo: cardRepo, jwtSecret: jwtSecret}
}

func (m *mergeCardSink) OnMerged(ctx context.Context, userID int64, owner, repo string, number int, prID, title, htmlURL string, mergedAt time.Time) (string, error) {
	id, err := generateCardID()
	if err != nil {
		return "", err
	}
	expiresAt := time.Now().UTC().Add(365 * 24 * time.Hour) // permanent proof artifact
	card := &repository.ShareCard{
		ID:           id,
		UserID:       userID,
		RepoFullName: owner + "/" + repo,
		PRTitle:      strPtr(truncateRunes(title, 200)),
		Summary:      strPtr("Merged via OpenDoor 🎉"),
		OverallScore: 100,
		ReadyToMerge: true,
		RefToken:     SignReferralToken(m.jwtSecret, userID, expiresAt),
		ConsentGiven: true,
		CreatedAt:    time.Now().UTC(),
		ExpiresAt:    expiresAt,
	}
	if err := m.cardRepo.Create(ctx, card, false); err != nil {
		return "", err
	}
	return id, nil
}
