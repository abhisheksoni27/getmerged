package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type DodopaymentsWebhookPayload struct {
	EventID   string `json:"event_id"`
	EventType string `json:"event_type"` // "subscription.created", "subscription.active", "subscription.renewed", "subscription.cancelled", "payment.failed"
	CreatedAt string `json:"created_at"`
	Data      struct {
		SubscriptionID string `json:"subscription_id"`
		Customer       struct {
			Metadata struct {
				UserID string `json:"user_id"`
			} `json:"metadata"`
			Email string `json:"email"`
		} `json:"customer"`
		BillingCycle string `json:"billing_cycle"` // "monthly" | "yearly"
		ExpiresAt    string `json:"expires_at"`
	} `json:"data"`
}

// DodopaymentsWebhookHandler handles POST /api/v1/payments/webhook/dodopayments (Story 5.2)
func DodopaymentsWebhookHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read webhook payload"})
			return
		}

		// 1. Validate Webhook Signature
		sigHeader := c.GetHeader("X-Dodopayments-Signature")
		if cfg.DodopaymentsWebhookSecret != "" {
			if !validateDodopaymentsSignature(bodyBytes, sigHeader, cfg.DodopaymentsWebhookSecret) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid webhook signature"})
				return
			}
		}

		// 2. Parse Event Payload
		var payload DodopaymentsWebhookPayload
		if err := json.Unmarshal(bodyBytes, &payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json payload"})
			return
		}

		if payload.EventID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing event_id"})
			return
		}

		// 3. Idempotency Check: record event
		isNew, err := entRepo.RecordWebhookEvent(c.Request.Context(), payload.EventID, payload.EventType, string(bodyBytes))
		if err != nil || !isNew {
			// Already processed or duplicate -> return 200 OK immediately
			c.JSON(http.StatusOK, gin.H{"status": "already_processed"})
			return
		}

		userIDStr := payload.Data.Customer.Metadata.UserID
		userID, err := strconv.ParseInt(userIDStr, 10, 64)
		if err != nil || userID <= 0 {
			slog.Warn("webhook missing valid user_id in customer metadata", "user_id", userIDStr)
			c.JSON(http.StatusOK, gin.H{"status": "ignored_no_user_id"})
			return
		}

		eventTime := time.Now().UTC()
		if t, err := time.Parse(time.RFC3339, payload.CreatedAt); err == nil {
			eventTime = t
		}

		var expiresAt *time.Time
		if t, err := time.Parse(time.RFC3339, payload.Data.ExpiresAt); err == nil {
			expiresAt = &t
		} else {
			exp := eventTime.Add(32 * 24 * time.Hour)
			if payload.Data.BillingCycle == "yearly" {
				exp = eventTime.Add(366 * 24 * time.Hour)
			}
			expiresAt = &exp
		}

		// 4. State Transitions
		switch payload.EventType {
		case "subscription.created", "subscription.active", "subscription.renewed", "payment.succeeded":
			_ = entRepo.UpdateSubscription(c.Request.Context(), userID, true, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
		case "subscription.cancelled", "subscription.expired", "payment.failed":
			_ = entRepo.UpdateSubscription(c.Request.Context(), userID, false, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
		default:
			slog.Info("unhandled webhook event type", "type", payload.EventType)
		}

		c.JSON(http.StatusOK, gin.H{"status": "processed", "event_id": payload.EventID})
	}
}

func validateDodopaymentsSignature(body []byte, signature, secret string) bool {
	if signature == "" || secret == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}
