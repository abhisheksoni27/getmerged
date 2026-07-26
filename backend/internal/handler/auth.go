package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

// GitHubOAuthRedirect handles GET /api/v1/auth/github
func GitHubOAuthRedirect(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		redirectURL := "https://github.com/login/oauth/authorize?client_id=" + cfg.GithubClientID + "&scope=user:email"
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	}
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// GitHubOAuthCallback handles GET /api/v1/auth/github/callback
func GitHubOAuthCallback(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		code := c.Query("code")
		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code parameter"})
			return
		}

		// Exchange code for access token
		tokenReqBody, _ := json.Marshal(map[string]string{
			"client_id":     cfg.GithubClientID,
			"client_secret": cfg.GithubClientSecret,
			"code":          code,
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
			AccessToken string `json:"access_token"`
			Error       string `json:"error"`
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

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		// Encrypt sensitive PII (email, username, & avatar_url) at rest using AES-256-GCM
		encKey := []byte(cfg.EncryptionKey)
		if len(encKey) > 32 {
			encKey = encKey[:32]
		}

		encEmail, _ := crypto.EncryptAESGCM([]byte(ghUser.Email), encKey)
		encUsername, _ := crypto.EncryptAESGCM([]byte(ghUser.Login), encKey)
		encAvatarURL, _ := crypto.EncryptAESGCM([]byte(ghUser.AvatarURL), encKey)

		// Insert or update user in SQLite / Turso DB with encrypted fields
		var userID int64
		err = db.GetContext(c.Request.Context(), &userID, "SELECT id FROM users WHERE github_id = ?", ghUser.ID)
		if err != nil {
			res, err := db.ExecContext(c.Request.Context(), `
				INSERT INTO users (github_id, username, email, avatar_url, created_at, updated_at)
				VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, ghUser.ID, encUsername, encEmail, encAvatarURL)
			if err != nil {
				slog.Error("failed to save user", "github_id", ghUser.ID, "err", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save user", "details": err.Error()})
				return
			}
			userID, _ = res.LastInsertId()
		} else {
			_, _ = db.ExecContext(c.Request.Context(), `
				UPDATE users SET username = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
			`, encUsername, encEmail, encAvatarURL, userID)
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

		// Redirect user back to the web UI
		c.Redirect(http.StatusTemporaryRedirect, "/")
	}
}

// GetCurrentUser handles GET /api/v1/auth/me
func GetCurrentUser(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		userID := userIDVal.(int64)
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		var user struct {
			ID        int64   `db:"id" json:"id"`
			GithubID  int64   `db:"github_id" json:"github_id"`
			Username  string  `db:"username" json:"username"`
			AvatarURL *string `db:"avatar_url" json:"avatar_url"`
		}

		if err := db.GetContext(c.Request.Context(), &user, "SELECT id, github_id, username, avatar_url FROM users WHERE id = ?", userID); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		// Decrypt sensitive PII fields (username & avatar_url) before sending to client
		encKey := []byte(cfg.EncryptionKey)
		if len(encKey) > 32 {
			encKey = encKey[:32]
		}

		decUsername, err := crypto.DecryptAESGCM(user.Username, encKey)
		if err == nil && decUsername != "" {
			user.Username = decUsername
		}

		if user.AvatarURL != nil && *user.AvatarURL != "" {
			decAvatar, err := crypto.DecryptAESGCM(*user.AvatarURL, encKey)
			if err == nil && decAvatar != "" {
				user.AvatarURL = &decAvatar
			}
		}

		c.JSON(http.StatusOK, gin.H{"user": user})
	}
}

// Unused import suppressor for url package
var _ = url.QueryEscape
