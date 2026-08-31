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

const proHostedCheckoutURL = "https://checkout.dodopayments.com/buy/pdt_0Nmb34qDKDQU7BIeRzHUZ"

func newProOrderID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "pro_" + hex.EncodeToString(buf), nil
}

// CreateProCheckoutHandler handles POST /api/v1/user/pro/checkout.
// Creates a DodoPayments checkout session for the Pro Contributor subscription.
func CreateProCheckoutHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		billingCycle := c.DefaultQuery("billing_cycle", "monthly")
		if billingCycle != "monthly" && billingCycle != "yearly" {
			billingCycle = "monthly"
		}

		orderID, err := newProOrderID()
		if err != nil {
			slog.Error("pro checkout: order id generation failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		checkoutURL, checkoutID := createDodoProCheckout(c.Request.Context(), cfg, userID, orderID, billingCycle)
		if checkoutURL == "" {
			checkoutURL = proHostedCheckoutURL + "?billing_cycle=" + billingCycle
		}

		c.JSON(http.StatusOK, gin.H{
			"order_id":     orderID,
			"checkout_url": checkoutURL,
			"checkout_id":  checkoutID,
		})
	}
}

// CancelProSubscriptionHandler handles POST /api/v1/user/pro/cancel.
// Schedules subscription cancellation at the next billing date on Dodo Payments.
func CancelProSubscriptionHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		ent, err := entRepo.GetEntitlement(c.Request.Context(), userID)
		if err != nil || ent == nil || !ent.IsPro || ent.SubscriptionID == nil || *ent.SubscriptionID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "no active subscription found"})
			return
		}

		if cfg.DodopaymentsAPIKey != "" {
			reqBody, _ := json.Marshal(map[string]any{
				"cancel_at_next_billing_date": true,
			})
			req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPatch, fmt.Sprintf("https://live.dodopayments.com/subscriptions/%s", *ent.SubscriptionID), strings.NewReader(string(reqBody)))
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+cfg.DodopaymentsAPIKey)
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Accept", "application/json")
				client := &http.Client{Timeout: 10 * time.Second}
				_, _ = client.Do(req)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "cancellation_scheduled",
			"message": "Your subscription will not renew after the current billing period.",
		})
	}
}

// createDodoProCheckout opens a DodoPayments checkout session for Pro.
func createDodoProCheckout(ctx context.Context, cfg *config.Config, userID int64, orderID, billingCycle string) (string, string) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" {
		return "", ""
	}

	productID := cfg.DodopaymentsProductPro
	if billingCycle == "yearly" && cfg.DodopaymentsProductProYearly != "" {
		productID = cfg.DodopaymentsProductProYearly
	}

	body, err := json.Marshal(map[string]any{
		"product_cart": []map[string]any{
			{"product_id": productID, "quantity": 1},
		},
		"return_url": "https://getmerged.abhishekco.de/pricing?checkout=success",
		"metadata": map[string]string{
			"user_id":       fmt.Sprintf("%d", userID),
			"order_id":      orderID,
			"billing_cycle": billingCycle,
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
		slog.Warn("pro checkout session request failed; using hosted fallback", "err", err)
		return "", ""
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("pro checkout session returned non-2xx; using hosted fallback", "status", resp.StatusCode)
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
