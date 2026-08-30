package handler

import (
	"bytes"
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

// packHostedCheckoutURL is the static hosted DodoPayments product page used
// as a safe fallback when the checkout-session API is unavailable or the API
// key is not configured - the buy flow must never dead-end (AC1/AC5).
const packHostedCheckoutURL = "https://checkout.dodopayments.com/buy/pdt_opendoor_pack10"

const dodoCheckoutsAPIURL = "https://live.dodopayments.com/checkouts"

// newPackOrderID returns a high-entropy order id ("pack_<32hex>") that is
// stored with the purchaser's user_id at checkout creation (AC4).
func newPackOrderID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "pack_" + hex.EncodeToString(buf), nil
}

// CreatePackCheckoutHandler handles POST /api/v1/credits/pack-checkout (AC1):
// creates a $5/10-eval pack checkout session carrying user_id + order_id
// metadata, persists the order owned by the authenticated user, and returns
// the hosted checkout URL. Falls back to the static hosted product page when
// the session API cannot be used, keeping the purchase path alive.
func CreatePackCheckoutHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		orderID, err := newPackOrderID()
		if err != nil {
			slog.Error("pack checkout: order id generation failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		checkoutURL, dodoCheckoutID := createDodoPackCheckout(c.Request.Context(), cfg, userID, orderID)
		if checkoutURL == "" {
			checkoutURL = packHostedCheckoutURL
		}

		order := &repository.CreditPackOrder{
			OrderID:        orderID,
			UserID:         userID,
			DodoCheckoutID: dodoCheckoutID,
			Status:         "pending",
		}
		if err := entRepo.CreateCreditPackOrder(c.Request.Context(), order); err != nil {
			slog.Error("pack checkout: failed to persist order", "user_id", userID, "order_id", orderID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"order_id":     orderID,
			"checkout_url": checkoutURL,
		})
	}
}

// createDodoPackCheckout opens a DodoPayments checkout session for the pack.
// Returns ("", "") whenever the session API is unavailable (no key, network
// or API error, unusable response) so the caller can fall back safely.
func createDodoPackCheckout(ctx context.Context, cfg *config.Config, userID int64, orderID string) (string, string) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" {
		return "", ""
	}

	body, err := json.Marshal(map[string]any{
		"product_cart": []map[string]any{
			{"product_id": creditPackDodoProductID, "quantity": 1},
		},
		"metadata": map[string]string{
			"user_id":  fmt.Sprintf("%d", userID),
			"order_id": orderID,
		},
	})
	if err != nil {
		return "", ""
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, dodoCheckoutsAPIURL, bytes.NewReader(body))
	if err != nil {
		return "", ""
	}
	req.Header.Set("Authorization", "Bearer "+cfg.DodopaymentsAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("pack checkout session request failed; using hosted fallback", "err", err)
		return "", ""
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("pack checkout session returned non-2xx; using hosted fallback", "status", resp.StatusCode)
		return "", ""
	}

	var parsed struct {
		ID          string `json:"id"`
		CheckoutID  string `json:"checkout_id"`
		CheckoutURL string `json:"checkout_url"`
		PaymentLink string `json:"payment_link"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		slog.Warn("pack checkout session returned invalid json; using hosted fallback", "err", err)
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

// PackStatusHandler handles GET /api/v1/credits/pack-status?orderId= (AC4).
// The orderId must belong to the authenticated user (404 otherwise); the
// endpoint is rate-limited 10/min/user. Statuses: paid | pending | failed.
// While pending it opportunistically reconciles against the DodoPayments
// checkout session, granting through the same dedup-safe ledger path as the
// webhook (AC2) so the UI fallback poll converges without waiting for it.
func PackStatusHandler(cfg *config.Config, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		orderID := strings.TrimSpace(c.Query("orderId"))
		if orderID == "" || len(orderID) > 64 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing or invalid orderId"})
			return
		}

		order, err := entRepo.GetCreditPackOrder(c.Request.Context(), orderID)
		if err != nil || order == nil || order.UserID != userID {
			// Not found OR not the purchaser: same answer, no existence leak.
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}

		switch order.Status {
		case "granted":
			c.JSON(http.StatusOK, gin.H{"status": "paid", "credits": repository.CreditPackCredits})
			return
		case "canceled", "failed":
			c.JSON(http.StatusOK, gin.H{"status": "failed"})
			return
		}

		status, creditsGranted := reconcilePackOrder(c.Request.Context(), cfg, entRepo, userID, order)
		if creditsGranted {
			c.JSON(http.StatusOK, gin.H{"status": "paid", "credits": repository.CreditPackCredits})
			return
		}
		if status == "failed" {
			c.JSON(http.StatusOK, gin.H{"status": "failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
	}
}

// reconcilePackOrder performs a best-effort live check of the DodoPayments
// checkout session for a pending order. Grants idempotently on success and
// marks terminal failure states; returns the effective status and whether
// credits were granted during this call.
func reconcilePackOrder(ctx context.Context, cfg *config.Config, entRepo repository.EntitlementRepository, userID int64, order *repository.CreditPackOrder) (string, bool) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" || order.DodoCheckoutID == "" {
		return "pending", false
	}

	paymentID, state := fetchDodoCheckoutState(ctx, cfg.DodopaymentsAPIKey, order.DodoCheckoutID)
	switch state {
	case "paid":
		purchaseID := paymentID
		if purchaseID == "" {
			purchaseID = order.OrderID
		}
		if err := entRepo.GrantCreditPack(ctx, userID, purchaseID, repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
			slog.Error("pack-status: fallback grant failed", "order_id", order.OrderID, "err", err)
			return "pending", false
		}
		_ = entRepo.MarkCreditPackOrder(ctx, order.OrderID, "granted")
		return "granted", true
	case "failed":
		_ = entRepo.MarkCreditPackOrder(ctx, order.OrderID, "failed")
		return "failed", false
	default:
		return "pending", false
	}
}

// fetchDodoCheckoutState queries one checkout session and reports
// ("payment_id", state) where state is paid | failed | pending. Any transport
// or parse problem degrades to "pending" - never an error surface.
func fetchDodoCheckoutState(ctx context.Context, apiKey, checkoutID string) (string, string) {
	url := fmt.Sprintf("%s/%s", dodoCheckoutsAPIURL, checkoutID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "pending"
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("pack-status: checkout poll failed", "checkout_id", checkoutID, "err", err)
		return "", "pending"
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", "pending"
	}

	var parsed struct {
		Status        string `json:"status"`
		PaymentID     string `json:"payment_id"`
		Payment       struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", "pending"
	}

	status := strings.ToLower(strings.TrimSpace(parsed.Status))
	if status == "" {
		status = strings.ToLower(strings.TrimSpace(parsed.Payment.Status))
	}
	switch status {
	case "succeeded", "completed", "paid", "settled":
		paymentID := parsed.PaymentID
		if paymentID == "" {
			paymentID = parsed.Payment.ID
		}
		return paymentID, "paid"
	case "failed", "cancelled", "canceled", "expired":
		return "", "failed"
	default:
		return "", "pending"
	}
}
