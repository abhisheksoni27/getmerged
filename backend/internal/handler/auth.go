package handler

import (
	"bytes"
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
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// GitHubOAuthRedirect handles GET /api/v1/auth/github
func GitHubOAuthRedirect(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		scheme := "https"
		if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
			scheme = "http"
		}
		redirectURI := scheme + "://" + c.Request.Host + "/api/v1/auth/github/callback"
		redirectURL := "https://github.com/login/oauth/authorize?client_id=" + cfg.GithubClientID + "&redirect_uri=" + url.QueryEscape(redirectURI) + "&scope=user:email"
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// GitHubOAuthCallback handles GET /api/v1/auth/github/callback
func GitHubOAuthCallback(cfg *config.Config, userRepo repository.UserRepository, tokenMgr auth.TokenManager) gin.HandlerFunc {
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

		// Issue Custom Signed Opendoor JWT Token
		signedToken, err := auth.GenerateToken(userID, ghUser.Login, cfg.JWTSecret)
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

		// if this is localhost, then Frontend is runnning on a different port, so redirect to the frontend URL
		if strings.Contains(c.Request.Host, "localhost") {
			c.Redirect(http.StatusTemporaryRedirect, "http://localhost:3000")
			return
		}

		// Redirect user back to the web UI
		c.Redirect(http.StatusTemporaryRedirect, "/")
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

		c.JSON(http.StatusOK, gin.H{"user": gin.H{
			"slug":       user.Slug,
			"username":   user.Username,
			"avatar_url": user.AvatarURL,
		}})
	}
}
