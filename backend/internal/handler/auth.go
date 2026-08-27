package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// GitHubOAuthRedirect handles GET /api/v1/auth/github
func GitHubOAuthRedirect(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Persist referral attribution for 30 days (AC1).
		if ref := c.Query("ref"); ref != "" && len(ref) <= 64 {
			isSecure := cfg.GinMode == "release"
			http.SetCookie(c.Writer, &http.Cookie{
				Name:     "opendoor_ref",
				Value:    ref,
				Path:     "/",
				MaxAge:   30 * 24 * 3600,
				HttpOnly: false,
				Secure:   isSecure,
				SameSite: http.SameSiteLaxMode,
			})
		}
		// Quiz pre-seed (AC4): remember the visitor's chosen languages in a
		// short-lived cookie so the callback can write the language snapshot
		// synchronously BEFORE redirecting to /dashboard (AC5).
		if quizLangs := NormalizeQuizLanguages(c.Query("quiz_langs"), maxLangSnapshot); len(quizLangs) > 0 {
			isSecure := cfg.GinMode == "release"
			http.SetCookie(c.Writer, &http.Cookie{
				Name:     "opendoor_quiz_langs",
				Value:    strings.Join(quizLangs, ","),
				Path:     "/",
				MaxAge:   600,
				HttpOnly: true,
				Secure:   isSecure,
				SameSite: http.SameSiteLaxMode,
			})
		}
		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		redirectURI := scheme + "://" + c.Request.Host + "/api/v1/auth/github/callback"
		// AC1: request issues:write so signed-in users can post a templated
		// claim comment directly on a Good First Issue.
		redirectURL := "https://github.com/login/oauth/authorize?client_id=" + cfg.GithubClientID + "&redirect_uri=" + url.QueryEscape(redirectURI) + "&scope=" + url.QueryEscape("user:email issues:write")
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// GitHubOAuthCallback handles GET /api/v1/auth/github/callback
func GitHubOAuthCallback(cfg *config.Config, userRepo repository.UserRepository, tokenMgr auth.TokenManager, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		code := c.Query("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code parameter"})
			return
		}

		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		redirectURI := scheme + "://" + c.Request.Host + "/api/v1/auth/github/callback"

		// Exchange code for access token
		tokenReqBody, _ := json.Marshal(map[string]string{
			"client_id":     cfg.GithubClientID,
			"client_secret": cfg.GithubClientSecret,
			"code":          code,
			"redirect_uri":  redirectURI,
		})

		req, err := http.NewRequestWithContext(c.Request.Context(), "POST", "https://github.com/login/oauth/access_token", bytes.NewReader(tokenReqBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build token request"})
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")

		resp, err := httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to exchange code with GitHub"})
			return
		}
		defer resp.Body.Close()

		var tokenResp struct {
			AccessToken     string `json:"access_token"`
			RefreshToken    string `json:"refresh_token"`
			ExpiresIn       int    `json:"expires_in"`
			RefreshTokenExp int    `json:"refresh_token_expires_in"`
			Error           string `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil || tokenResp.AccessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid OAuth authorization code"})
			return
		}

		// Fetch user profile from GitHub
		userReq, _ := http.NewRequestWithContext(c.Request.Context(), "GET", "https://api.github.com/user", nil)
		userReq.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)
		userReq.Header.Set("User-Agent", "opendoor-app")

		userResp, err := httpClient.Do(userReq)
		if err != nil || userResp.StatusCode != http.StatusOK {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch GitHub profile"})
			return
		}
		defer userResp.Body.Close()

		var ghUser struct {
			ID        int64  `json:"id"`
			Login     string `json:"login"`
			Email     string `json:"email"`
			AvatarURL string `json:"avatar_url"`
		}
		bodyBytes, _ := io.ReadAll(userResp.Body)
		_ = json.Unmarshal(bodyBytes, &ghUser)

		// Detect brand-new signup before upsert so referral credit lands
		// exactly once at first successful GitHub OAuth (AC2).
		isNewUser := true
		if existing, err := userRepo.FindByGithubID(c.Request.Context(), ghUser.ID); err == nil && existing != nil {
			isNewUser = false
		}

		userID, err := userRepo.UpsertUser(c.Request.Context(), ghUser.ID, ghUser.Login, ghUser.Email, ghUser.AvatarURL)
		if err != nil {
			slog.Error("failed to save user", "github_id", ghUser.ID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save user", "details": err.Error()})
			return
		}

		// Save encrypted tokens via TokenManager (Story 2.1)
		if tokenMgr != nil {
			if err := tokenMgr.SaveGithubToken(c.Request.Context(), userID, tokenResp.AccessToken, tokenResp.RefreshToken, tokenResp.ExpiresIn); err != nil {
				slog.Error("failed to persist encrypted oauth tokens", "user_id", userID, "err", err)
			}
		}

		// Refresh the personalized 'For You' language snapshot on every
		// successful login (AC1, AC3). Bounded timeouts so login is never
		// blocked; on failure keep the existing snapshot and surface a
		// non-blocking banner via a transient cookie (AC4).
		// Quiz flow: the quiz-chosen languages OVERWRITE the snapshot and the
		// write completes synchronously BEFORE the redirect to /dashboard
		// (AC4/AC5) — no GitHub re-sync that would overwrite quiz prefs.
		quizSeeded := SeedQuizSnapshotFromRequest(c, userRepo, userID)
		if !quizSeeded {
			if err := SyncGithubLanguages(c.Request.Context(), tokenResp.AccessToken, userID, userRepo); err != nil {
				slog.Warn("github language sync failed during login", "user_id", userID, "err", err)
				syncSecure := cfg.GinMode == "release"
				http.SetCookie(c.Writer, &http.Cookie{
					Name:     "opendoor_sync_failed",
					Value:    "1",
					Path:     "/",
					MaxAge:   600,
					HttpOnly: false,
					Secure:   syncSecure,
					SameSite: http.SameSiteLaxMode,
				})
			}
		}

		// Auto-import top public repo languages as skills. Best-effort with its
		// own 2s per-request timeout; runs async so sign-in is never blocked.
		go ImportGithubSkills(context.Background(), tokenResp.AccessToken, userID, userRepo)

		// One-time referral credit for first GitHub OAuth signup via referral link.
		if isNewUser && entRepo != nil {
			if refCode, err := c.Cookie("opendoor_ref"); err == nil && refCode != "" {
				if referrerID, ok, err := ResolveReferralAttribution(c.Request.Context(), entRepo, cfg.JWTSecret, refCode); err == nil && ok {
					if err := entRepo.ApplySignupReferral(c.Request.Context(), referrerID, userID); err != nil {
						slog.Warn("failed to apply signup referral", "referrer_id", referrerID, "new_user_id", userID, "err", err)
					}
				}
			}
			// Attribution consumed; drop the cookie.
			isSecure := cfg.GinMode == "release"
			http.SetCookie(c.Writer, &http.Cookie{
				Name:     "opendoor_ref",
				Value:    "",
				Path:     "/",
				MaxAge:   -1,
				Secure:   isSecure,
				SameSite: http.SameSiteLaxMode,
			})
		}

		// Issue Custom Signed Opendoor JWT Token using the stored username so it
		// stays stable across re-logins even if the GitHub login changed.
		stored, err := userRepo.FindByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
			return
		}
		signedToken, err := auth.GenerateToken(userID, stored.Username, cfg.JWTSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate authentication token"})
			return
		}

		// Set authentication cookie
		isSecure := cfg.GinMode == "release"
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "opendoor_token",
			Value:    signedToken,
			Path:     "/",
			MaxAge:   7 * 24 * 3600,
			HttpOnly: false,
			Secure:   isSecure,
			SameSite: http.SameSiteLaxMode,
		})

		slog.Info("jwt cookie has been set", "token", signedToken)

		// Quiz flow lands on /dashboard so ForYou is populated from the
		// freshly committed snapshot (AC5); regular logins go home.
		redirectTarget := "/"
		if quizSeeded {
			redirectTarget = "/dashboard"
		}

		// if this is localhost, then Frontend is runnning on a different port, so redirect to the frontend URL
		if strings.Contains(c.Request.Host, "localhost") {
			c.Redirect(http.StatusTemporaryRedirect, "http://localhost:3000"+redirectTarget)
			return
		}

		// Redirect user back to the web UI
		c.Redirect(http.StatusTemporaryRedirect, redirectTarget)
	}
}

// GoogleOAuthRedirect handles GET /api/v1/auth/google
func GoogleOAuthRedirect(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.GoogleClientID == "" {
			c.JSON(http.StatusNotImplemented, gin.H{"error": "Google OAuth is not configured on this server"})
			return
		}
		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		redirectURI := scheme + "://" + c.Request.Host + "/api/v1/auth/google/callback"
		redirectURL := "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + url.QueryEscape(cfg.GoogleClientID) +
			"&redirect_uri=" + url.QueryEscape(redirectURI) +
			"&response_type=code&scope=" + url.QueryEscape("openid email profile") +
			"&access_type=online"
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}
}

// GoogleOAuthCallback handles GET /api/v1/auth/google/callback
func GoogleOAuthCallback(cfg *config.Config, userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
			c.JSON(http.StatusNotImplemented, gin.H{"error": "Google OAuth is not configured on this server"})
			return
		}
		code := c.Query("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code parameter"})
			return
		}

		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		redirectURI := scheme + "://" + c.Request.Host + "/api/v1/auth/google/callback"

		// Exchange authorization code for Google access token
		tokenValues := url.Values{
			"code":          {code},
			"client_id":     {cfg.GoogleClientID},
			"client_secret": {cfg.GoogleClientSecret},
			"redirect_uri":  {redirectURI},
			"grant_type":    {"authorization_code"},
		}

		req, err := http.NewRequestWithContext(c.Request.Context(), "POST", "https://oauth2.googleapis.com/token", strings.NewReader(tokenValues.Encode()))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build token request"})
			return
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to exchange code with Google"})
			return
		}
		defer resp.Body.Close()

		var tokenResp struct {
			AccessToken string `json:"access_token"`
			Error       string `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil || tokenResp.AccessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid Google authorization code"})
			return
		}

		// Fetch user profile from Google UserInfo endpoint
		userReq, _ := http.NewRequestWithContext(c.Request.Context(), "GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
		userReq.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

		userResp, err := httpClient.Do(userReq)
		if err != nil || userResp.StatusCode != http.StatusOK {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch Google user profile"})
			return
		}
		defer userResp.Body.Close()

		var gUser struct {
			ID      string `json:"id"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}
		bodyBytes, _ := io.ReadAll(userResp.Body)
		_ = json.Unmarshal(bodyBytes, &gUser)

		username := gUser.Name
		if username == "" {
			username = strings.Split(gUser.Email, "@")[0]
		}

		userID, err := userRepo.UpsertGoogleUser(c.Request.Context(), gUser.ID, username, gUser.Email, gUser.Picture)
		if err != nil {
			slog.Error("failed to save google user", "google_id", gUser.ID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save user", "details": err.Error()})
			return
		}

		// Issue Custom Signed Opendoor JWT Token
		signedToken, err := auth.GenerateToken(userID, username, cfg.JWTSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate authentication token"})
			return
		}

		// Set authentication cookie
		isSecure := cfg.GinMode == "release"
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "opendoor_token",
			Value:    signedToken,
			Path:     "/",
			MaxAge:   7 * 24 * 3600,
			HttpOnly: false,
			Secure:   isSecure,
			SameSite: http.SameSiteLaxMode,
		})

		if strings.Contains(c.Request.Host, "localhost") {
			c.Redirect(http.StatusTemporaryRedirect, "http://localhost:3000")
			return
		}

		c.Redirect(http.StatusTemporaryRedirect, "/")
	}
}

// GetCurrentUser handles GET /api/v1/auth/me
func GetCurrentUser(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		userID := userIDVal.(int64)
		user, err := userRepo.FindByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		authProvider := "google"
		if user.GithubID != nil {
			authProvider = "github"
		}

		avatarURL := user.AvatarURL
		if avatarURL != nil && *avatarURL != "" {
			formatted := *avatarURL
			if strings.Contains(formatted, "githubusercontent.com") && !strings.Contains(formatted, "s=") {
				if strings.Contains(formatted, "?") {
					formatted += "&s=64"
				} else {
					formatted += "?s=64"
				}
			}
			avatarURL = &formatted
		}

		c.JSON(http.StatusOK, gin.H{"user": gin.H{
			"slug":              user.Slug,
			"username":          user.Username,
			"avatar_url":        avatarURL,
			"profiling_consent": user.ProfilingConsent,
			"is_public":         user.IsPublic,
			"skills":            user.Skills,
			"auth_provider":     authProvider,
			"has_github":        user.GithubID != nil,
		}})
	}
}

type UpdateConsentBody struct {
	ProfilingConsent bool `json:"profiling_consent"`
}

// UpdateConsent handles PATCH /api/v1/user/consent
func UpdateConsent(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var body UpdateConsentBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		userID := userIDVal.(int64)
		if err := userRepo.UpdateProfilingConsent(c.Request.Context(), userID, body.ProfilingConsent); err != nil {
			slog.Error("failed to update profiling consent", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update consent"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":            "ok",
			"profiling_consent": body.ProfilingConsent,
		})
	}
}

type DeleteDataBody struct {
	Confirm                  bool   `json:"confirm"`
	DeleteConfirmationPhrase string `json:"delete_confirmation_phrase"`
}

// DeleteUserData handles DELETE /api/v1/me/data (GDPR Right to Erasure)
func DeleteUserData(cfg *config.Config, userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var body DeleteDataBody
		if err := c.ShouldBindJSON(&body); err != nil || !body.Confirm || body.DeleteConfirmationPhrase != "DELETE MY ACCOUNT" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "must confirm with phrase 'DELETE MY ACCOUNT'"})
			return
		}

		userID := userIDVal.(int64)
		if err := userRepo.SoftDeleteUser(c.Request.Context(), userID); err != nil {
			slog.Error("failed to soft delete user", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user data"})
			return
		}

		// Clear auth cookie
		isSecure := cfg.GinMode == "release"
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "opendoor_token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: false,
			Secure:   isSecure,
			SameSite: http.SameSiteLaxMode,
		})

		c.JSON(http.StatusOK, gin.H{
			"status":  "deleted",
			"message": "All user data scheduled for complete purge",
		})
	}
}

// GetContributorDNA handles GET /api/v1/user/dna
func GetContributorDNA(profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		userID := userIDVal.(int64)
		prof, err := profileRepo.GetByUserID(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to get contributor profile", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch profile"})
			return
		}

		if prof == nil {
			c.JSON(http.StatusOK, gin.H{
				"status": "unprofiled",
				"dna":    nil,
			})
			return
		}

		var parsedDNA interface{}
		if prof.DNAJSON != nil && *prof.DNAJSON != "" {
			_ = json.Unmarshal([]byte(*prof.DNAJSON), &parsedDNA)
		}

		c.JSON(http.StatusOK, gin.H{
			"status":            prof.ProfilingStatus,
			"dna":               parsedDNA,
			"total_merged_prs":  prof.TotalMergedPRs,
			"last_error":        prof.LastError,
			"analyzed_at":       prof.AnalyzedAt,
		})
	}
}

// RefreshContributorDNA handles POST /api/v1/user/dna/refresh
func RefreshContributorDNA(profileRepo repository.ContributorProfileRepository, worker pipeline.ContributorDNAWorker) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		userID := userIDVal.(int64)
		allowed, err := profileRepo.RequestRefresh(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to request dna refresh", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to request refresh"})
			return
		}

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Profile analysis can only be requested once every 24 hours",
			})
			return
		}

		// Asynchronously trigger background profiling worker
		if worker != nil {
			go func(uid int64) {
				ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer cancel()
				if err := worker.AnalyzeUser(ctx, uid); err != nil {
					slog.Warn("async dna worker run failed", "user_id", uid, "err", err)
				}
			}(userID)
		}

		c.JSON(http.StatusAccepted, gin.H{
			"status":  "pending",
			"message": "Contributor DNA analysis queued",
		})
	}
}

// GetUserMatchesHandler handles GET /api/v1/user/matches (Story 8.1)
func GetUserMatchesHandler(profileRepo repository.ContributorProfileRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		userID := userIDVal.(int64)

		c.Header("Cache-Control", "private, no-cache, no-store, must-revalidate")

		var userLangs []string
		if profile, err := profileRepo.GetByUserID(c.Request.Context(), userID); err == nil && profile != nil && profile.DNAJSON != nil {
			var dna pipeline.ContributorDNAResult
			if err := json.Unmarshal([]byte(*profile.DNAJSON), &dna); err == nil {
				userLangs = dna.PrimaryLanguages
			}
		}

		topRepos, _, err := repoStore.List(c.Request.Context(), repository.RepoFilter{
			Tier:     "S",
			MinStars: 50,
			Limit:    5,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch matches"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"user_id":           userID,
			"primary_languages": userLangs,
			"matched_repos":     topRepos,
		})
	}
}
