package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

const (
	maintainerSLAHostedCheckoutURL = "https://checkout.dodopayments.com/buy/pdt_maintainer_sla"
)

func newMaintainerSLAOrderID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "sla_" + hex.EncodeToString(buf), nil
}

// CreateMaintainerSLACheckoutHandler handles POST /api/v1/user/maintainer-sla/checkout.
// Creates a DodoPayments checkout session for the Maintainer SLA subscription.
func CreateMaintainerSLACheckoutHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		orderID, err := newMaintainerSLAOrderID()
		if err != nil {
			slog.Error("maintainer sla checkout: order id generation failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		checkoutURL, checkoutID := createDodoMaintainerSLACheckout(c.Request.Context(), cfg, userID, orderID)
		if checkoutURL == "" {
			checkoutURL = maintainerSLAHostedCheckoutURL
		}

		if err := entRepo.UpdateMaintainerSLA(c.Request.Context(), userID, checkoutID, false, nil); err != nil {
			slog.Error("maintainer sla checkout: failed to set pending", "user_id", userID, "err", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"order_id":     orderID,
			"checkout_url": checkoutURL,
		})
	}
}

// createDodoMaintainerSLACheckout opens a DodoPayments checkout session for the
// Maintainer SLA product. Returns ("", "") when the session API is unavailable.
func createDodoMaintainerSLACheckout(ctx context.Context, cfg *config.Config, userID int64, orderID string) (string, string) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" {
		return "", ""
	}

	body, err := json.Marshal(map[string]any{
		"product_cart": []map[string]any{
			{"product_id": cfg.DodopaymentsProductMaintainerSLA, "quantity": 1},
		},
		"metadata": map[string]string{
			"user_id":  fmt.Sprintf("%d", userID),
			"order_id": orderID,
		},
	})
	if err != nil {
		return "", ""
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, dodoCheckoutsAPIURL, strings.NewReader(string(body)))
	if err != nil {
		return "", ""
	}
	req.Header.Set("Authorization", "Bearer "+cfg.DodopaymentsAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("maintainer sla checkout session request failed; using hosted fallback", "err", err)
		return "", ""
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("maintainer sla checkout session returned non-2xx; using hosted fallback", "status", resp.StatusCode)
		return "", ""
	}

	var parsed struct {
		ID          string `json:"id"`
		CheckoutID  string `json:"checkout_id"`
		CheckoutURL string `json:"checkout_url"`
		PaymentLink string `json:"payment_link"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", ""
	}

	sessionID := parsed.ID
	if sessionID == "" {
		sessionID = parsed.CheckoutID
	}
	url := parsed.CheckoutURL
	if url == "" {
		url = parsed.PaymentLink
	}
	if url == "" {
		return "", ""
	}
	return url, sessionID
}

// GetMaintainerSLAStatusHandler handles GET /api/v1/user/maintainer-sla/status.
func GetMaintainerSLAStatusHandler(entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		sub, err := entRepo.GetMaintainerSLA(c.Request.Context(), userID)
		if err != nil || sub == nil {
			c.JSON(http.StatusOK, gin.H{"status": "none"})
			return
		}

		status := sub.Status
		if status == "active" && sub.ExpiresAt != nil && sub.ExpiresAt.Before(time.Now().UTC()) {
			status = "expired"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":       status,
			"expires_at":   sub.ExpiresAt,
			"subscription_id": sub.SubscriptionID,
		})
	}
}
