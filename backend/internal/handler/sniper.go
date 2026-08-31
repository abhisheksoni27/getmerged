package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// SniperHandler manages Issue Sniper subscriptions and instant alert dispatching
type SniperHandler struct {
	db *sqlx.DB
}

// NewSniperHandler creates a new SniperHandler
func NewSniperHandler(db *sqlx.DB) *SniperHandler {
	return &SniperHandler{db: db}
}

// SniperSubscribeRequest represents payload for subscribing to real-time issue snipes
type SniperSubscribeRequest struct {
	Email        string   `json:"email"`
	Languages    []string `json:"languages"`
	Topics       []string `json:"topics"`
	RepoFullName string   `json:"repo_full_name"`
	Frequency    string   `json:"frequency"` // "instant" or "weekly"
	Channel      string   `json:"channel"`   // "email", "discord", "webhook"
	WebhookURL   string   `json:"webhook_url"`
}

// SubscribeSniper handles POST /api/v1/alerts/subscribe-sniper
func (h *SniperHandler) SubscribeSniper(c *gin.Context) {
	var req SniperSubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.WebhookURL = strings.TrimSpace(req.WebhookURL)
	req.RepoFullName = strings.TrimSpace(req.RepoFullName)

	if req.Email == "" && req.WebhookURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email or Webhook URL is required for alert dispatch"})
		return
	}

	if req.Frequency == "" {
		req.Frequency = "instant"
	}
	if req.Channel == "" {
		if req.WebhookURL != "" {
			req.Channel = "webhook"
		} else {
			req.Channel = "email"
		}
	}

	if req.WebhookURL != "" {
		if err := notification.ValidateWebhookURL(req.WebhookURL); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	userID, _ := getUserIDFromCtx(c)
	var userIDVal any = nil
	if userID > 0 {
		userIDVal = userID
	}

	langsJSON, _ := json.Marshal(req.Languages)
	topicsJSON, _ := json.Marshal(req.Topics)

	if h.db != nil {
		insertQuery := `
			INSERT INTO user_sniper_subscriptions 
				(user_id, email, languages_json, topics_json, repo_full_name, frequency, channel, webhook_url, is_active, created_at, updated_at)
			VALUES 
				(?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`
		_, err := h.db.Exec(insertQuery, userIDVal, req.Email, string(langsJSON), string(topicsJSON), req.RepoFullName, req.Frequency, req.Channel, req.WebhookURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save sniper subscription", "details": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "subscribed",
		"message":   "Issue Sniper activated! You will receive alerts when fresh beginner issues match your criteria.",
		"frequency": req.Frequency,
		"channel":   req.Channel,
	})
}

// TestWebhookRequest represents payload for dispatching an immediate live test alert
type TestWebhookRequest struct {
	WebhookURL string `json:"webhook_url"`
	Channel    string `json:"channel"` // "discord" or "slack" / generic
}

// TestSniperWebhook handles POST /api/v1/alerts/test-webhook
func (h *SniperHandler) TestSniperWebhook(c *gin.Context) {
	var req TestWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}
	req.WebhookURL = strings.TrimSpace(req.WebhookURL)
	if req.WebhookURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webhook URL is required"})
		return
	}
	if err := notification.ValidateWebhookURL(req.WebhookURL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	testMsg := "🎯 **[GetMerged Sniper Test Alert]**\nFresh Good First Issue indexed in your stack: `vercel/next.js` - *Fix edge routing regex cache hit #71249*\nMaintainer Turnaround: **~4h** (Tier S Repo)\nLink: https://getmerged.abhishekco.de/good-first-issue"

	var payload any
	if strings.Contains(req.WebhookURL, "discord.com") || req.Channel == "discord" {
		p, err := notification.BuildDiscordPayload(testMsg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to construct Discord payload"})
			return
		}
		payload = p
	} else {
		payload = notification.BuildSlackPayload(testMsg)
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequestWithContext(c.Request.Context(), "POST", req.WebhookURL, strings.NewReader(string(body)))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create HTTP request"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to reach webhook destination: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("Webhook endpoint responded with status %d", resp.StatusCode)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "delivered", "message": "Test alert dispatched successfully!"})
}

// GetUserSnipers handles GET /api/v1/alerts/my-snipers
func (h *SniperHandler) GetUserSnipers(c *gin.Context) {
	userID, exists := getUserIDFromCtx(c)
	if !exists || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"subscriptions": []any{}})
		return
	}

	var rows []struct {
		ID           int64  `db:"id" json:"id"`
		Email        string `db:"email" json:"email"`
		LangsJSON    string `db:"languages_json" json:"-"`
		TopicsJSON   string `db:"topics_json" json:"-"`
		RepoFullName string `db:"repo_full_name" json:"repo_full_name"`
		Frequency    string `db:"frequency" json:"frequency"`
		Channel      string `db:"channel" json:"channel"`
		WebhookURL   string `db:"webhook_url" json:"webhook_url"`
		IsActive     bool   `db:"is_active" json:"is_active"`
		CreatedAt    string `db:"created_at" json:"created_at"`
		Languages    []string `json:"languages"`
		Topics       []string `json:"topics"`
	}

	query := `
		SELECT id, email, languages_json, topics_json, repo_full_name, frequency, channel, webhook_url, is_active, created_at
		FROM user_sniper_subscriptions
		WHERE user_id = ? AND is_active = TRUE
		ORDER BY created_at DESC
	`
	if err := h.db.Select(&rows, query, userID); err != nil {
		c.JSON(http.StatusOK, gin.H{"subscriptions": []any{}})
		return
	}

	for i := range rows {
		_ = json.Unmarshal([]byte(rows[i].LangsJSON), &rows[i].Languages)
		_ = json.Unmarshal([]byte(rows[i].TopicsJSON), &rows[i].Topics)
	}

	c.JSON(http.StatusOK, gin.H{"subscriptions": rows})
}
