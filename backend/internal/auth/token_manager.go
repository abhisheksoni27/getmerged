package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"golang.org/x/sync/singleflight"
)

type TokenManager interface {
	GetValidGithubToken(ctx context.Context, userID int64) (string, error)
	SaveGithubToken(ctx context.Context, userID int64, accessToken, refreshToken string, expiresInSeconds int) error
}

type tokenManager struct {
	repo         repository.OAuthTokenRepository
	cfg          *config.Config
	httpClient   *http.Client
	oauthBaseURL string
	sf           singleflight.Group
}

func NewTokenManager(repo repository.OAuthTokenRepository, cfg *config.Config, httpClient *http.Client) TokenManager {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &tokenManager{
		repo:         repo,
		cfg:          cfg,
		httpClient:   httpClient,
		oauthBaseURL: "https://github.com",
	}
}

func NewTokenManagerWithBaseURL(repo repository.OAuthTokenRepository, cfg *config.Config, httpClient *http.Client, baseURL string) TokenManager {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &tokenManager{
		repo:         repo,
		cfg:          cfg,
		httpClient:   httpClient,
		oauthBaseURL: baseURL,
	}
}

func (tm *tokenManager) SaveGithubToken(ctx context.Context, userID int64, accessToken, refreshToken string, expiresInSeconds int) error {
	var expiresAt *time.Time
	if expiresInSeconds > 0 {
		exp := time.Now().Add(time.Duration(expiresInSeconds) * time.Second)
		expiresAt = &exp
	}
	return tm.repo.UpsertToken(ctx, userID, "github", accessToken, refreshToken, expiresAt)
}

func (tm *tokenManager) GetValidGithubToken(ctx context.Context, userID int64) (string, error) {
	access, _, expiresAt, err := tm.repo.GetToken(ctx, userID, "github")
	if err != nil {
		return "", fmt.Errorf("failed to load token: %w", err)
	}
	if access == "" {
		return "", errors.New("no github token found for user")
	}

	// If token has no expiry or has > 5 min validity left, return directly
	if expiresAt == nil || time.Until(*expiresAt) > 5*time.Minute {
		return access, nil
	}

	// If expired or expiring soon, deduplicate refresh via singleflight
	flightKey := fmt.Sprintf("%d:github", userID)
	val, err, _ := tm.sf.Do(flightKey, func() (interface{}, error) {
		// Re-check token under lock/flight
		a, r, exp, err := tm.repo.GetToken(ctx, userID, "github")
		if err != nil {
			return "", err
		}
		if exp != nil && time.Until(*exp) > 5*time.Minute {
			return a, nil
		}
		if r == "" {
			// No refresh token available, return current access token
			return a, nil
		}

		// Perform refresh request to GitHub
		newAccess, newRefresh, expiresIn, err := tm.refreshGithubToken(ctx, r)
		if err != nil {
			return a, nil // Fallback to current token if refresh fails transiently
		}

		if err := tm.SaveGithubToken(ctx, userID, newAccess, newRefresh, expiresIn); err != nil {
			return newAccess, nil
		}

		return newAccess, nil
	})

	if err != nil {
		return "", err
	}
	return val.(string), nil
}

func (tm *tokenManager) refreshGithubToken(ctx context.Context, refreshToken string) (accessToken, newRefreshToken string, expiresIn int, err error) {
	reqBody, _ := json.Marshal(map[string]string{
		"client_id":     tm.cfg.GithubClientID,
		"client_secret": tm.cfg.GithubClientSecret,
		"grant_type":    "refresh_token",
		"refresh_token": refreshToken,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", tm.oauthBaseURL+"/login/oauth/access_token", bytes.NewReader(reqBody))
	if err != nil {
		return "", "", 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := tm.httpClient.Do(req)
	if err != nil {
		return "", "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", 0, fmt.Errorf("github refresh returned status %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken      string `json:"access_token"`
		RefreshToken     string `json:"refresh_token"`
		ExpiresIn        int    `json:"expires_in"`
		RefreshTokenExp  int    `json:"refresh_token_expires_in"`
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", "", 0, err
	}

	if res.Error != "" {
		return "", "", 0, fmt.Errorf("github oauth error: %s (%s)", res.Error, res.ErrorDescription)
	}

	return res.AccessToken, res.RefreshToken, res.ExpiresIn, nil
}
