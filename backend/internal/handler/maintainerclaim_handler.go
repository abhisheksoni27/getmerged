package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/maintainerclaim"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// MaintainerClaimHandler handles POST /api/v1/maintainer-claims (AC1, AC2, AC6).
// Rate-limited 5/min/IP + 20/day/user before this handler.
func MaintainerClaimHandler(svc *maintainerclaim.Service, repo maintainerclaim.Repository) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := c.Get("user_claims")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		uid := user.(*auth.Claims).UserID

		day := time.Now().UTC().Format("2006-01-02")
		n, err := repo.DailyAttempts(c.Request.Context(), uid, day)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if n >= 20 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "daily claim limit reached", "retry_after_sec": 86400})
			return
		}

		var body struct {
			Owner      string `json:"owner"`
			Name       string `json:"name"`
			Onboarding string `json:"onboarding"`
			SLAHours   int    `json:"sla_hours"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
			return
		}
		body.Owner = strings.TrimSpace(body.Owner)
		body.Name = strings.TrimSpace(body.Name)
		if body.Owner == "" || body.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name required"})
			return
		}
		if len(body.Onboarding) > 500 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "onboarding exceeds 500 characters"})
			return
		}

		claim, err := svc.Claim(c.Request.Context(), uid, body.Owner, body.Name, body.Onboarding, body.SLAHours)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		_ = repo.IncrementDailyAttempt(c.Request.Context(), uid, day)
		c.JSON(http.StatusOK, claim)
	}
}

// MaintainerSetOnboardingHandler handles PATCH /api/v1/maintainer-claims/repo/:owner/:name/onboarding (AC2).
func MaintainerSetOnboardingHandler(svc *maintainerclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := c.Get("user_claims")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		uid := user.(*auth.Claims).UserID
		owner := strings.TrimSpace(c.Param("owner"))
		name := strings.TrimSpace(c.Param("name"))
		var body struct {
			Onboarding string `json:"onboarding"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
			return
		}
		claim, err := svc.SetOnboarding(c.Request.Context(), uid, owner, name, body.Onboarding)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, claim)
	}
}

// MaintainerGetClaimHandler handles GET /api/v1/maintainer-claims/repo/:owner/:name (public badge + onboarding view).
func MaintainerGetClaimHandler(svc *maintainerclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := strings.TrimSpace(c.Param("owner"))
		name := strings.TrimSpace(c.Param("name"))
		claim, err := svc.GetClaim(c.Request.Context(), owner, name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if claim == nil || claim.Revoked {
			c.JSON(http.StatusOK, gin.H{"claimed": false, "badge": false})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"claimed":             true,
			"verified":            claim.Verified,
			"badge":               claim.Verified && claim.SLAMet,
			"sla_hours":           claim.SLAHours,
			"sla_met":             claim.SLAMet,
			"onboarding_guidance": claim.OnboardingGuidance,
		})
	}
}

// MaintainerListMyClaimsHandler handles GET /api/v1/maintainer-claims/me.
func MaintainerListMyClaimsHandler(svc *maintainerclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := c.Get("user_claims")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		uid := user.(*auth.Claims).UserID
		claims, err := svc.ListUserClaims(c.Request.Context(), uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"claims": claims})
	}
}

// MaintainerOAuthStartHandler handles GET /api/v1/maintainer-claims/oauth/github (AC1).
// Initiates GitHub OAuth requesting read-only read:org + repo scope.
func MaintainerOAuthStartHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		state, _ := randHex(16)
		c.SetCookie("mc_oauth_state", state, 600, "/", "", true, true)
		redirectURI := scheme(c) + "://" + c.Request.Host + "/api/v1/maintainer-claims/oauth/github/callback"
		scope := url.QueryEscape("read:org repo")
		authURL := "https://github.com/login/oauth/authorize?client_id=" + cfg.GithubClientID +
			"&redirect_uri=" + url.QueryEscape(redirectURI) + "&scope=" + scope + "&state=" + state
		c.Redirect(http.StatusTemporaryRedirect, authURL)
	}
}

// MaintainerOAuthCallbackHandler handles the GitHub OAuth callback (AC1).
// Exchanges the code, stores the token encrypted-at-rest, then redirects to the dashboard.
func MaintainerOAuthCallbackHandler(svc *maintainerclaim.Service, cfg *config.Config, oauthRepo repository.OAuthTokenRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		state := c.Query("state")
		stored, err := c.Cookie("mc_oauth_state")
		if err != nil || stored == "" || stored != state {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
			return
		}
		code := c.Query("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
			return
		}
		// Identify the logged-in maintainer from the session cookie.
		tokenCookie, cerr := c.Cookie("opendoor_token")
		if cerr != nil || tokenCookie == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "login required"})
			return
		}
		claims, perr := auth.ParseToken(tokenCookie, cfg.JWTSecret)
		if perr != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}

		redirectURI := scheme(c) + "://" + c.Request.Host + "/api/v1/maintainer-claims/oauth/github/callback"
		body, _ := json.Marshal(map[string]string{
			"client_id":     cfg.GithubClientID,
			"client_secret": cfg.GithubClientSecret,
			"code":          code,
			"redirect_uri":  redirectURI,
		})
		req, _ := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		resp, rerr := (&http.Client{Timeout: 15 * time.Second}).Do(req)
		if rerr != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "token exchange failed"})
			return
		}
		defer resp.Body.Close()
		var tok struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			ExpiresIn    int    `json:"expires_in"`
			Error        string `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil || tok.AccessToken == "" {
			c.JSON(http.StatusBadGateway, gin.H{"error": "token exchange failed: " + tok.Error})
			return
		}
		if err := svc.StoreMaintainerToken(c.Request.Context(), claims.UserID, tok.AccessToken, tok.RefreshToken, tok.ExpiresIn); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store token"})
			return
		}
		c.Redirect(http.StatusTemporaryRedirect, "/dashboard")
	}
}

// MaintainerInterestHandler handles POST /api/v1/maintainer-claims/repo/:owner/:name/interest (AC7).
func MaintainerInterestHandler(svc *maintainerclaim.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := strings.TrimSpace(c.Param("owner"))
		name := strings.TrimSpace(c.Param("name"))
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name required"})
			return
		}
		eventType := c.DefaultQuery("type", "view")
		ip := c.ClientIP()
		if err := svc.RecordInterest(c.Request.Context(), owner+"/"+name, eventType, ip); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

// MaintainerSLABadgeHandler handles GET /api/v1/maintainer-sla-badge/:owner/:name (public SVG, AC1-AC9).
func MaintainerSLABadgeHandler(svc *maintainerclaim.Service, baseURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := strings.TrimSpace(c.Param("owner"))
		name := strings.TrimSpace(c.Param("name"))
		claim, err := svc.GetClaim(c.Request.Context(), owner, name)
		if err != nil || claim == nil || claim.Revoked || !claim.Verified {
			c.Data(http.StatusOK, "image/svg+xml", unclaimedBadge())
			return
		}
		if claim.SLAMet {
			c.Data(http.StatusOK, "image/svg+xml", fastTrackBadge(claim.SLAHours))
		} else {
			c.Data(http.StatusOK, "image/svg+xml", claimedBadge())
		}
	}
}

func unclaimedBadge() []byte {
	return []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><rect width="200" height="20" rx="3" fill="#555"/><text x="10" y="14" fill="#fff" font-family="sans-serif" font-size="11">OpenDoor: Unclaimed</text></svg>`)
}

func claimedBadge() []byte {
	return []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><rect width="200" height="20" rx="3" fill="#9f9f9f"/><text x="10" y="14" fill="#fff" font-family="sans-serif" font-size="11">OpenDoor: Claimed</text></svg>`)
}

func fastTrackBadge(slaHours int) []byte {
	label := fmt.Sprintf("Fast-Track &lt;%dh", slaHours)
	return []byte(fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><rect width="200" height="20" rx="3" fill="#2ea043"/><text x="10" y="14" fill="#fff" font-family="sans-serif" font-size="11">OpenDoor: %s</text></svg>`, label))
}

func scheme(c *gin.Context) string {
	if c.Request.TLS != nil || strings.HasPrefix(c.Request.Header.Get("X-Forwarded-Proto"), "https") {
		return "https"
	}
	return "http"
}

func randHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
