package handler

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// Repo Boost paid featured placement (AC1-AC8). Uses Stripe PaymentIntents
// with server-generated idempotency keys; activation occurs only on the
// verified payment_intent.succeeded webhook.

const repoBoostMaxIssueCount = 20

// stripeWebhookEvent is the minimal subset of a Stripe webhook event we consume
// (AC2/AC3/AC6). Only payment_intent.succeeded activates a boost.
type stripeWebhookEvent struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Data  struct {
		Object struct {
			ID              string `json:"id"`
			PaymentIntent   string `json:"payment_intent"`
			Metadata        struct {
				OrderID string `json:"order_id"`
			} `json:"metadata"`
		} `json:"object"`
	} `json:"data"`
}

// newRepoBoostOrderID returns a high-entropy order id ("rb_<32hex>").
func newRepoBoostOrderID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "rb_" + hex.EncodeToString(buf), nil
}

// newStripeIdempotencyKey returns a server-generated idempotency key
// (AC1): every checkout gets a fresh, unique key so a client retry cannot
// create a duplicate PaymentIntent nor double-charge.
func newStripeIdempotencyKey() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "rb_idek_" + hex.EncodeToString(buf), nil
}

// CreateRepoBoostCheckoutHandler handles POST /api/v1/repos/:id/boost-checkout
// (AC1/AC5/AC8). It enforces the max-active + daily-spend guard inside a
// locked DB transaction, then creates a Stripe PaymentIntent server-side with a
// server-generated idempotency key. The boost stays 'pending' until the webhook
// confirms payment (AC1).
func CreateRepoBoostCheckoutHandler(cfg *config.Config, boostRepo repository.RepoBoostRepository) gin.HandlerFunc {
	type checkoutRequest struct {
		IssueNumbers []int `json:"issue_numbers"`
	}
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		repoID := strings.TrimSpace(c.Param("id"))
		if unescaped, err := url.QueryUnescape(repoID); err == nil {
			repoID = unescaped
		}
		if repoID == "" || len(repoID) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repository id"})
			return
		}

		var req checkoutRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		if len(req.IssueNumbers) == 0 || len(req.IssueNumbers) > repoBoostMaxIssueCount {
			c.JSON(http.StatusBadRequest, gin.H{"error": "issue_numbers must contain 1-20 issues"})
			return
		}
		seen := make(map[int]bool, len(req.IssueNumbers))
		clean := make([]int, 0, len(req.IssueNumbers))
		for _, n := range req.IssueNumbers {
			if n <= 0 || n > 10_000_000 || seen[n] {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid issue number"})
				return
			}
			seen[n] = true
			clean = append(clean, n)
		}

		// Server-authoritative price/currency; never trust client-supplied amounts.
		amountCents := cfg.RepoBoostPriceCents
		currency := "usd"

		orderID, err := newRepoBoostOrderID()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		now := time.Now().UTC()
		dayStart := now.Truncate(24 * time.Hour) // AC8: UTC midnight, inclusive
		dayEnd := dayStart.Add(24 * time.Hour)   // exclusive end

		order := &repository.RepoBoostOrder{
			OrderID:      orderID,
			UserID:       userID,
			RepositoryID: repoID,
			IssueNumbers: joinInts(clean),
			AmountCents:  amountCents,
			Currency:     currency,
			Status:       "pending",
		}

		tx, err := boostRepo.DB().BeginTxx(c.Request.Context(), nil)
		if err != nil {
			slog.Error("repo boost checkout: begin tx failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}
		allowed, err := boostRepo.CheckoutGuard(c.Request.Context(), tx, order, clean, now, dayStart, dayEnd, cfg.RepoBoostMaxActive, cfg.RepoBoostDailySpendCap)
		if err != nil {
			_ = tx.Rollback()
			slog.Error("repo boost checkout: guard failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}
		if !allowed {
			_ = tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "limit reached: max active boosts or daily spend cap exceeded"})
			return
		}
		if err := tx.Commit(); err != nil {
			_ = tx.Rollback()
			slog.Error("repo boost checkout: commit failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		// Create the Stripe PaymentIntent server-side (AC1). Failures here do
		// not mutate the pending order; the client can retry the checkout.
		paymentIntentID, clientSecret, idekErr := createStripePaymentIntent(c.Request.Context(), cfg, order, userID, repoID, clean)
		if idekErr != nil {
			slog.Warn("repo boost checkout: stripe call failed; order stays pending", "order_id", orderID, "err", idekErr)
		} else {
			upd := `UPDATE repo_boost_orders SET payment_intent_id = ?, stripe_client_secret = ? WHERE order_id = ?`
			if _, e := boostRepo.DB().ExecContext(c.Request.Context(), upd, paymentIntentID, clientSecret, orderID); e != nil {
				slog.Warn("repo boost checkout: failed to persist payment intent", "order_id", orderID, "err", e)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"order_id":            orderID,
			"payment_intent_id":   paymentIntentID,
			"client_secret":       clientSecret,
			"amount_cents":        amountCents,
			"currency":            currency,
			"status":              "pending",
		})
	}
}

// createStripePaymentIntent opens a Stripe PaymentIntent for the boost. Returns
// ("", "", nil) with a mock id when no secret is configured (dev/test) so the
// flow stays exercisable without network access.
func createStripePaymentIntent(ctx context.Context, cfg *config.Config, order *repository.RepoBoostOrder, userID int64, repoID string, issueNumbers []int) (string, string, error) {
	if cfg.StripeSecretKey == "" {
		buf := make([]byte, 16)
		if _, err := rand.Read(buf); err != nil {
			return "", "", err
		}
		mock := "pi_mock_" + hex.EncodeToString(buf)
		return mock, mock + "_secret", nil
	}

	idek, err := newStripeIdempotencyKey()
	if err != nil {
		return "", "", err
	}

	form := url.Values{}
	form.Set("amount", strconv.FormatInt(order.AmountCents, 10))
	form.Set("currency", order.Currency)
	form.Set("metadata[order_id]", order.OrderID)
	form.Set("metadata[user_id]", strconv.FormatInt(userID, 10))
	form.Set("metadata[repo_id]", repoID)
	form.Set("metadata[issues]", joinInts(issueNumbers))
	form.Set("description", "OpenDoor Repo Boost: featured good-first-issues placement")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.StripeBaseURL+"/v1/payment_intents", strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.StripeSecretKey)
	req.Header.Set("Idempotency-Key", idek)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", "", errors.New("stripe payment_intent status " + strconv.Itoa(resp.StatusCode))
	}
	var parsed struct {
		ID            string `json:"id"`
		ClientSecret  string `json:"client_secret"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", "", err
	}
	if parsed.ID == "" {
		return "", "", errors.New("stripe payment_intent missing id")
	}
	return parsed.ID, parsed.ClientSecret, nil
}

// StripeRepoBoostWebhookHandler handles POST /api/v1/payments/webhook/stripe
// (AC2/AC3/AC6). Verifies the raw-body signature, dedupes via the 24h event-id
// cache, and activates the boost only on payment_intent.succeeded. Unknown
// event types ack with 200 (no-op) to avoid Stripe retries (AC6).
func StripeRepoBoostWebhookHandler(cfg *config.Config, boostRepo repository.RepoBoostRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read webhook payload"})
			return
		}

		// AC2: verify signature over the RAW body + secret.
		if cfg.StripeWebhookSecret != "" {
			if !verifyStripeSignature(bodyBytes, c.GetHeader("Stripe-Signature"), cfg.StripeWebhookSecret) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook signature"})
				return
			}
		}

		var evt stripeWebhookEvent
		if err := json.Unmarshal(bodyBytes, &evt); err != nil {
			// AC6: malformed payload -> 400 reject.
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json payload"})
			return
		}
		if evt.ID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing event id"})
			return
		}

		// AC2: replay rejection via 24h event-id cache.
		isNew, err := boostRepo.RecordWebhookEvent(c.Request.Context(), evt.ID, time.Now().UTC())
		if err != nil {
			slog.Error("repo boost webhook: event cache failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "event cache failed"})
			return
		}
		if !isNew {
			c.JSON(http.StatusOK, gin.H{"status": "already_processed"})
			return
		}

		switch evt.Type {
		case "payment_intent.succeeded":
			piID := evt.Data.Object.ID
			if piID == "" {
				piID = evt.Data.Object.PaymentIntent
			}
			orderID := evt.Data.Object.Metadata.OrderID
			if piID == "" || orderID == "" {
				// AC6: essential fields missing -> 400.
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing payment intent fields"})
				return
			}
			// AC3: activation only here, idempotent.
			if err := boostRepo.ActivateRepoBoost(c.Request.Context(), piID, orderID, time.Now().UTC(), cfg.RepoBoostWindowDays); err != nil {
				slog.Error("repo boost webhook: activation failed", "pi", piID, "err", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "activation failed"})
				return
			}
		case "charge.refunded", "payment_intent.canceled":
			piID := evt.Data.Object.ID
			if piID != "" {
				_, _ = boostRepo.CancelRepoBoost(c.Request.Context(), piID, time.Now().UTC())
			}
		default:
			// AC6: unknown event types -> 200 ack no-op.
			c.JSON(http.StatusOK, gin.H{"status": "ignored"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "processed", "event_id": evt.ID})
	}
}

// verifyStripeSignature checks the Stripe-Signature header: t=<ts>,v1=<hex HMAC>
// computed over "<ts>.<rawbody>" with the webhook secret.
func verifyStripeSignature(body []byte, header, secret string) bool {
	if header == "" || secret == "" {
		return false
	}
	parts := strings.Split(header, ",")
	var ts, sig string
	for _, p := range parts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			ts = kv[1]
		case "v1":
			sig = kv[1]
		}
	}
	if ts == "" || sig == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts + "." + string(body)))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}

// RepoBoostStatusHandler handles GET /api/v1/repos/:id/boost-status?orderId=
// (AC1): reports the boost's lifecycle state to the purchaser.
func RepoBoostStatusHandler(cfg *config.Config, boostRepo repository.RepoBoostRepository) gin.HandlerFunc {
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
		order, err := boostRepo.GetRepoBoostOrder(c.Request.Context(), orderID)
		if err != nil || order == nil || order.UserID != userID {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		switch order.Status {
		case "granted":
			c.JSON(http.StatusOK, gin.H{"status": "active", "window_days": cfg.RepoBoostWindowDays})
		case "failed":
			c.JSON(http.StatusOK, gin.H{"status": "failed"})
		default:
			c.JSON(http.StatusOK, gin.H{"status": "pending"})
		}
	}
}

// joinInts renders a slice of ints as a comma-separated string for storage.
func joinInts(xs []int) string {
	parts := make([]string, len(xs))
	for i, x := range xs {
		parts[i] = strconv.Itoa(x)
	}
	return strings.Join(parts, ",")
}

// ListUserRepoBoostsHandler handles GET /api/v1/user/repo-boosts (AC1): lists
// the authenticated maintainer's boosts (active first) for the C-Rank console.
func ListUserRepoBoostsHandler(cfg *config.Config, boostRepo repository.RepoBoostRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)
		boosts, err := boostRepo.ListUserBoosts(c.Request.Context(), userID, time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list boosts"})
			return
		}
		if boosts == nil {
			boosts = []repository.RepoBoost{}
		}
		c.JSON(http.StatusOK, gin.H{"boosts": boosts, "count": len(boosts)})
	}
}
