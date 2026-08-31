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
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// boostHostedCheckoutURL is the static hosted DodoPayments product page used
// as a safe fallback when the checkout-session API is unavailable (AC4) - the
// buy flow must never dead-end.
const boostHostedCheckoutURL = "https://checkout.dodopayments.com/buy/pdt_0Nmb34tc5ywffZ9vzfQ07"

// boostDodoProductID is the DodoPayments product ID for the one-time
// 7-day paid bounty listing boost ($4.50).
const boostDodoProductID = "pdt_0Nmb34tc5ywffZ9vzfQ07"

// newBoostOrderID returns a high-entropy order id ("boost_<32hex>").
func newBoostOrderID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "boost_" + hex.EncodeToString(buf), nil
}

// CreateBountyBoostCheckoutHandler handles POST /api/v1/gfi/bounty-boost-checkout
// (AC4): creates a one-time DodoPayments checkout for a 7-day listing boost,
// persisting the order with purchaser + issue attribution in metadata so the
// webhook can grant idempotently keyed by payment_id.
func CreateBountyBoostCheckoutHandler(cfg *config.Config, boostRepo repository.GFIBoostRepository) gin.HandlerFunc {
	type boostCheckoutRequest struct {
		RepoID      string `json:"repo_id"`
		IssueNumber int    `json:"issue_number"`
	}
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req boostCheckoutRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		req.RepoID = strings.TrimSpace(req.RepoID)
		if req.RepoID == "" || len(req.RepoID) > 255 || req.IssueNumber <= 0 || req.IssueNumber > 1_000_000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "repo_id and issue_number are required"})
			return
		}

		orderID, err := newBoostOrderID()
		if err != nil {
			slog.Error("boost checkout: order id generation failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		checkoutURL, dodoCheckoutID := createDodoBoostCheckout(c.Request.Context(), cfg, userID, orderID, req.RepoID, req.IssueNumber)
		if checkoutURL == "" {
			checkoutURL = boostHostedCheckoutURL
		}

		order := &repository.GFIBoostOrder{
			OrderID:        orderID,
			UserID:         userID,
			RepositoryID:   req.RepoID,
			IssueNumber:    req.IssueNumber,
			DodoCheckoutID: dodoCheckoutID,
			Status:         "pending",
		}
		if err := boostRepo.CreateBoostOrder(c.Request.Context(), order); err != nil {
			slog.Error("boost checkout: failed to persist order", "user_id", userID, "order_id", orderID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"order_id":     orderID,
			"checkout_url": checkoutURL,
		})
	}
}

// createDodoBoostCheckout opens a DodoPayments checkout session for the
// boost. Returns ("", "") whenever the session API is unavailable so the
// caller can fall back safely.
func createDodoBoostCheckout(ctx context.Context, cfg *config.Config, userID int64, orderID, repoID string, issueNumber int) (string, string) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" {
		return "", ""
	}

	body, err := json.Marshal(map[string]any{
		"product_cart": []map[string]any{
			{"product_id": boostDodoProductID, "quantity": 1},
		},
		"metadata": map[string]string{
			"user_id":      fmt.Sprintf("%d", userID),
			"order_id":     orderID,
			"repo_id":      repoID,
			"issue_number": strconv.Itoa(issueNumber),
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
		slog.Warn("boost checkout session request failed; using hosted fallback", "err", err)
		return "", ""
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("boost checkout session returned non-2xx; using hosted fallback", "status", resp.StatusCode)
		return "", ""
	}

	var parsed struct {
		ID          string `json:"id"`
		CheckoutID  string `json:"checkout_id"`
		CheckoutURL string `json:"checkout_url"`
		PaymentLink string `json:"payment_link"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		slog.Warn("boost checkout session returned invalid json; using hosted fallback", "err", err)
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

// BountyBoostStatusHandler handles GET /api/v1/gfi/bounty-boost-status?orderId=
// (AC4). Ownership is enforced (404 otherwise); while pending it reconciles
// against the DodoPayments checkout session through the same dedup-safe
// ActivateBoost path as the webhook (payment_id-keyed, AC6).
func BountyBoostStatusHandler(cfg *config.Config, boostRepo repository.GFIBoostRepository) gin.HandlerFunc {
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

		order, err := boostRepo.GetBoostOrder(c.Request.Context(), orderID)
		if err != nil || order == nil || order.UserID != userID {
			// Not found OR not the purchaser: same answer, no existence leak.
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}

		switch order.Status {
		case "granted":
			c.JSON(http.StatusOK, gin.H{"status": "active", "window_days": int(repository.BoostWindowDays.Hours() / 24)})
			return
		case "canceled", "cancelled", "failed":
			c.JSON(http.StatusOK, gin.H{"status": "failed"})
			return
		}

		status := reconcileBountyBoost(c.Request.Context(), cfg, boostRepo, userID, order)
		switch status {
		case "granted":
			c.JSON(http.StatusOK, gin.H{"status": "active", "window_days": int(repository.BoostWindowDays.Hours() / 24)})
		case "failed":
			c.JSON(http.StatusOK, gin.H{"status": "failed"})
		default:
			c.JSON(http.StatusOK, gin.H{"status": "pending"})
		}
	}
}

// reconcileBountyBoost performs a best-effort live check of the DodoPayments
// checkout session for a pending boost order, granting through the
// payment_id-keyed idempotent path (AC6).
func reconcileBountyBoost(ctx context.Context, cfg *config.Config, boostRepo repository.GFIBoostRepository, userID int64, order *repository.GFIBoostOrder) string {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" || order.DodoCheckoutID == "" {
		return "pending"
	}

	paymentID, state := fetchDodoCheckoutState(ctx, cfg.DodopaymentsAPIKey, order.DodoCheckoutID)
	switch state {
	case "paid":
		payID := paymentID
		if payID == "" {
			payID = order.OrderID
		}
		if err := boostRepo.ActivateBoost(ctx, payID, userID, order.RepositoryID, order.IssueNumber, 0, time.Now().UTC()); err != nil {
			slog.Error("boost-status: fallback activation failed", "order_id", order.OrderID, "err", err)
			return "pending"
		}
		_ = boostRepo.MarkBoostOrder(ctx, order.OrderID, "granted")
		return "granted"
	case "failed":
		_ = boostRepo.MarkBoostOrder(ctx, order.OrderID, "failed")
		return "failed"
	default:
		return "pending"
	}
}
