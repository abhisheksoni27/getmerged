package ghapp

import (
	"bytes"
	"context"
	"crypto/rsa"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	apiBase        = "https://api.github.com"
	rateLimitCap   = 15 * time.Minute
	tokenCacheSkew = 60 * time.Second
)

// cachedInstallToken is a memoized GitHub App installation access token.
type cachedInstallToken struct {
	token     string
	expiresAt time.Time
}

type ghHTTPClient struct {
	hc *http.Client
}

// do performs one GitHub REST call. AC4: when X-RateLimit-Remaining hits 0 it
// parks until X-RateLimit-Reset (capped) before returning, so the serial
// per-installation worker never hammers a depleted quota.
func (g *ghHTTPClient) do(ctx context.Context, method, rawURL, bearer string, body []byte) (int, []byte, http.Header, error) {
	var rdr io.Reader
	if body != nil {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, rawURL, rdr)
	if err != nil {
		return 0, nil, nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "GetMerged-GitHub-App/1.0")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := g.hc.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer resp.Body.Close()

	respBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	hdr := resp.Header
	if readErr != nil {
		return resp.StatusCode, nil, hdr, readErr
	}

	if resp.Header.Get("X-RateLimit-Remaining") == "0" {
		wait := rateLimitWait(resp.Header.Get("X-RateLimit-Reset"))
		if wait > 0 {
			select {
			case <-time.After(wait):
			case <-ctx.Done():
			}
		}
	}

	return resp.StatusCode, respBody, hdr, nil
}

func rateLimitWait(resetUnix string) time.Duration {
	reset, err := strconv.ParseInt(resetUnix, 10, 64)
	if err != nil || reset == 0 {
		return 0
	}
	wait := time.Until(time.Unix(reset, 0)) + time.Second
	if wait > rateLimitCap {
		wait = rateLimitCap
	}
	return wait
}

// appJWT mints a short-lived RS256 JWT signed with the GitHub App private key.
func (s *Service) appJWT() (string, error) {
	s.mu.Lock()
	key := s.appKey
	s.mu.Unlock()
	if key == nil {
		return "", fmt.Errorf("github app private key not configured")
	}
	now := time.Now()
	claims := jwt.MapClaims{
		"iat": now.Add(-30 * time.Second).Unix(),
		"exp": now.Add(9 * time.Minute).Unix(),
		"iss": s.cfg.GithubAppID,
	}
	return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(key)
}

// installationToken returns a cached installation access token, minting one
// via POST /app/installations/{id}/access_tokens when missing or expired.
func (s *Service) installationToken(ctx context.Context, installationID int64) (string, error) {
	s.mu.Lock()
	if tok, ok := s.tokens[installationID]; ok && time.Now().Before(tok.expiresAt) {
		t := tok.token
		s.mu.Unlock()
		return t, nil
	}
	s.mu.Unlock()

	jwtTok, err := s.appJWT()
	if err != nil {
		return "", err
	}
	status, body, _, err := s.http.do(ctx, http.MethodPost,
		fmt.Sprintf("%s/app/installations/%d/access_tokens", apiBase, installationID), jwtTok, nil)
	if err != nil {
		return "", err
	}
	if status < 200 || status >= 300 {
		return "", fmt.Errorf("installation token mint failed (status %d)", status)
	}
	var out struct {
		Token     string `json:"token"`
		ExpiresAt string `json:"expires_at"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.Token == "" {
		return "", fmt.Errorf("installation token decode failed: %w", err)
	}
	expires := time.Now().Add(55 * time.Minute)
	if t, perr := httpTimeParse(out.ExpiresAt); perr == nil {
		expires = t
	}

	s.mu.Lock()
	s.tokens[installationID] = cachedInstallToken{token: out.Token, expiresAt: expires.Add(-tokenCacheSkew)}
	s.mu.Unlock()
	return out.Token, nil
}

// loadAppPrivateKey resolves the configured key (inline PEM or file path).
func loadAppPrivateKey(configured string) *rsa.PrivateKey {
	if strings.TrimSpace(configured) == "" {
		return nil
	}
	pemBytes := []byte(configured)
	if _, statErr := os.Stat(configured); statErr == nil {
		data, rerr := os.ReadFile(configured)
		if rerr != nil {
			return nil
		}
		pemBytes = data
	}
	key, perr := jwt.ParseRSAPrivateKeyFromPEM(pemBytes)
	if perr != nil {
		return nil
	}
	return key
}

func httpTimeParse(v string) (time.Time, error) {
	return time.Parse(time.RFC3339, v)
}
