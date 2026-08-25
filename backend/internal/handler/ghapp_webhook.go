package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/ghapp"
	"github.com/gin-gonic/gin"
)

// GithubAppWebhookHandler receives and dispatches GitHub App webhook events (AC1, AC2, AC3, AC5).
func GithubAppWebhookHandler(svc *ghapp.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if svc == nil || !svc.Enabled() {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "github app not configured"})
			return
		}

		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read payload"})
			return
		}

		// Verify HMAC SHA256 signature if secret configured
		secret := svc.WebhookSecret()
		if secret != "" {
			sigHeader := c.GetHeader("X-Hub-Signature-256")
			if !validateGithubAppSignature(bodyBytes, sigHeader, secret) {
				slog.Warn("github app webhook invalid signature", "sig", sigHeader)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid webhook signature"})
				return
			}
		}

		event := c.GetHeader("X-GitHub-Event")
		if event == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing X-GitHub-Event header"})
			return
		}

		// Dispatch event via ghapp.Service
		svc.HandleEvent(c.Request.Context(), event, bodyBytes)

		c.JSON(http.StatusOK, gin.H{"status": "received", "event": event})
	}
}

func validateGithubAppSignature(payload []byte, headerSig string, secret string) bool {
	if headerSig == "" || secret == "" {
		return false
	}
	expectedPrefix := "sha256="
	if !strings.HasPrefix(headerSig, expectedPrefix) {
		return false
	}
	receivedMAC, err := hex.DecodeString(strings.TrimPrefix(headerSig, expectedPrefix))
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)

	return hmac.Equal(receivedMAC, expectedMAC)
}
