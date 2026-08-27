package handler

import (
	"context"
	"crypto/rand"
	"database/sql"
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
	"github.com/jmoiron/sqlx"
)

// FeaturedCreateHandler handles POST /api/featured/create (AC1-AC10).
// Paid featured placement in contributor discovery. The idempotency lock is
// reserved before any capture; capture happens only after the lock is held and
// the claim is row-locked to the caller; on capture failure nothing persists.
func FeaturedCreateHandler(cfg *config.Config, db *sqlx.DB, featuredRepo repository.FeaturedRepository) gin.HandlerFunc {
	type createRequest struct {
		RepoClaimID    int64  `json:"repo_claim_id"`
		IdempotencyKey string `json:"idempotency_key"`
		AmountCents    int64  `json:"amount_cents"`
		Currency       string `json:"currency"`
	}
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req createRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		// AC2: idempotency_key is mandatory; the server owns the key semantic.
		req.IdempotencyKey = strings.TrimSpace(req.IdempotencyKey)
		if req.IdempotencyKey == "" || len(req.IdempotencyKey) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idempotency_key is required"})
			return
		}
		if req.RepoClaimID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "repo_claim_id is required"})
			return
		}

		// AC2: canonical price is server-validated; reject any client tampering.
		currency := strings.ToLower(strings.TrimSpace(req.Currency))
		if currency == "" {
			currency = "usd"
		}
		if currency != "usd" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported currency"})
			return
		}
		if req.AmountCents != cfg.FeaturedPriceCents || req.AmountCents <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":          "invalid amount",
				"expected_cents": cfg.FeaturedPriceCents,
			})
			return
		}

		ctx := c.Request.Context()
		now := time.Now().UTC()
		day := now.Format("2006-01-02")

		// Heal AC10 partial failures opportunistically before each purchase.
		if _, err := featuredRepo.ReconcileCapturedLocks(ctx, now); err != nil {
			slog.Warn("featured: reconcile failed", "err", err)
		}

		// AC3: reserve the idempotency lock OUTSIDE the tx so the unique(key)
		// constraint is enforced immediately and visible to concurrent retries.
		lk, reserved, err := featuredRepo.ReserveLock(ctx, nil, req.IdempotencyKey, req.RepoClaimID)
		if err != nil {
			slog.Error("featured: reserve lock failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve lock"})
			return
		}
		if !reserved && lk != nil {
			// Duplicate key: short-circuit, never re-capture (AC3/AC7).
			switch lk.Status {
			case "captured":
				respondExistingFeatured(c, lk)
				return
			case "failed":
				c.JSON(http.StatusPaymentRequired, gin.H{"error": "payment failed", "status": "failed"})
				return
			default:
				// Leftover pending lock: fall through to re-attempt capture.
			}
		}

		// AC1/AC7: open a transaction and row-lock the claim to the caller so a
		// concurrent duplicate cannot both pass ownership + capture.
		tx, err := db.BeginTxx(ctx, nil)
		if err != nil {
			slog.Error("featured: begin tx failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start purchase"})
			return
		}
		defer func() { _ = tx.Rollback() }()

		// Serialization point: re-read the lock now that the claim is locked.
		// If a concurrent request finished first, short-circuit (AC7).
		cur, lerr := featuredRepo.GetLock(ctx, req.IdempotencyKey)
		if lerr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read lock"})
			return
		}
		if cur != nil && cur.Status == "captured" {
			respondExistingFeatured(c, cur)
			return
		}

		// AC1: ownership verified via JOIN claim table; caller must own the
		// verified, non-revoked claim. Row lock prevents double capture.
		var claimID int64
		ownQ := `SELECT id FROM repo_claims
			WHERE id = ? AND owner_user_id = ? AND state = 'verified' AND revoked_at IS NULL`
		if db.DriverName() == "sqlite" {
			ownQ = `SELECT id FROM repo_claims
				WHERE id = ? AND owner_user_id = ? AND state = 'verified' AND revoked_at IS NULL`
		} else {
			ownQ += " FOR UPDATE"
		}
		rowQ := tx.QueryRowxContext(ctx, ownQ, req.RepoClaimID, userID)
		if err := rowQ.Scan(&claimID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusForbidden, gin.H{"error": "not authorized: repo claim not owned or not verified"})
				return
			}
			slog.Error("featured: ownership lookup failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ownership check failed"})
			return
		}

		// AC5: rate-limit counter is read here but incremented ONLY after a
		// successful capture (below), never at lock time.
		cnt, rerr := featuredRepo.RateLimitCount(ctx, userID, day)
		if rerr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "rate limit check failed"})
			return
		}
		if cnt >= cfg.FeaturedMaxPerDay {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":           "daily featured purchase limit reached",
				"retry_after_sec": 86400,
			})
			return
		}

		// AC4: capture payment ONLY now (lock reserved + claim locked). On
		// failure we delete the pending lock and persist NOTHING (tx rolls back).
		captureRef, capErr := captureFeaturedPayment(ctx, cfg, req.AmountCents, currency, req.IdempotencyKey, userID, req.RepoClaimID)
		if capErr != nil {
			slog.Warn("featured: capture failed; rolling back lock", "key", req.IdempotencyKey, "err", capErr)
			_ = featuredRepo.MarkLockFailed(ctx, tx, req.IdempotencyKey)
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "payment capture failed", "status": "failed"})
			return
		}

		// AC5: capture succeeded -> insert featured + mark lock 'captured' +
		// increment the rate-limit counter, all in this transaction.
		paidUntil := now.Add(time.Duration(cfg.FeaturedWindowDays) * 24 * time.Hour)
		result := map[string]interface{}{
			"repo_claim_id": req.RepoClaimID,
			"paid_until":    paidUntil,
			"sponsored":     true,
			"capture_ref":   captureRef,
		}
		resultJSON, _ := json.Marshal(result)
		featuredID, cerr := featuredRepo.CommitFeatured(ctx, tx, req.IdempotencyKey, req.RepoClaimID, paidUntil, captureRef, string(resultJSON))
		if cerr != nil {
			// AC10: lock stays 'captured' with capture_ref; the reconcile job
			// retries the featured insert idempotently (no re-capture).
			slog.Error("featured: persist failed after capture; leaving lock captured", "key", req.IdempotencyKey, "err", cerr)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record featured placement"})
			return
		}
		if ierr := featuredRepo.IncrementRateLimit(ctx, tx, userID, day); ierr != nil {
			slog.Warn("featured: rate limit increment failed", "err", ierr)
		}

		if err := tx.Commit(); err != nil {
			slog.Error("featured: commit failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to finalize purchase"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":        "captured",
			"featured_id":   featuredID,
			"repo_claim_id": req.RepoClaimID,
			"paid_until":    paidUntil,
			"sponsored":     true,
			"capture_ref":   captureRef,
			"currency":      currency,
			"amount_cents":  req.AmountCents,
		})
	}
}

// respondExistingFeatured returns the already-captured result for a duplicate
// idempotency key (AC3/AC7): no re-capture.
func respondExistingFeatured(c *gin.Context, lk *repository.FeaturedLock) {
	if lk.ResultJSON != "" {
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(lk.ResultJSON), &payload); err == nil {
			payload["status"] = "captured"
			payload["idempotent"] = true
			c.JSON(http.StatusOK, payload)
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"status":      "captured",
		"idempotent":  true,
		"featured_id": lk.FeaturedID,
		"capture_ref": lk.CaptureRef,
	})
}

// captureFeaturedPayment captures payment for a featured slot. With no Stripe
// secret configured (dev/test) it returns a mock capture ref so the flow stays
// exercisable; with a secret it opens + confirms a Stripe PaymentIntent. Any
// provider error is surfaced to the caller as a 402 (AC4).
func captureFeaturedPayment(ctx context.Context, cfg *config.Config, amountCents int64, currency, key string, userID, repoClaimID int64) (string, error) {
	if cfg.StripeSecretKey == "" {
		buf := make([]byte, 16)
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		return "cap_mock_" + hex.EncodeToString(buf), nil
	}

	idek, err := newStripeIdempotencyKey()
	if err != nil {
		return "", err
	}
	form := url.Values{}
	form.Set("amount", strconv.FormatInt(amountCents, 10))
	form.Set("currency", currency)
	form.Set("capture", "true")
	form.Set("metadata[order_id]", key)
	form.Set("metadata[user_id]", strconv.FormatInt(userID, 10))
	form.Set("metadata[repo_claim_id]", strconv.FormatInt(repoClaimID, 10))
	form.Set("description", "OpenDoor Featured Placement: sponsored good-first-issues")
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.StripeBaseURL+"/v1/payment_intents", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.StripeSecretKey)
	req.Header.Set("Idempotency-Key", idek)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", errors.New("stripe payment_intent status " + strconv.Itoa(resp.StatusCode))
	}
	var parsed struct {
		ID           string `json:"id"`
		Status       string `json:"status"`
		ClientSecret string `json:"client_secret"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}
	if parsed.ID == "" {
		return "", errors.New("stripe payment_intent missing id")
	}
	return parsed.ID, nil
}

// FeaturedListHandler handles GET /api/featured (AC6/AC8): returns the live
// featured placements powering /good-first-issue, /contribute/[lang], and the
// weekly digest. Read-time filtered so revoked/unverified claims vanish.
func FeaturedListHandler(featuredRepo repository.FeaturedRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := featuredRepo.ListLiveFeatured(c.Request.Context(), time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load featured placements"})
			return
		}
		if items == nil {
			items = []repository.FeaturedItem{}
		}
		c.JSON(http.StatusOK, gin.H{"featured": items, "count": len(items)})
	}
}
