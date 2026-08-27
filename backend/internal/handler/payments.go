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
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type DodopaymentsWebhookPayload struct {
	EventID   string `json:"event_id"`
	EventType string `json:"event_type"` // "subscription.created", "subscription.active", "subscription.renewed", "subscription.cancelled", "payment.failed", "payment.succeeded"
	CreatedAt string `json:"created_at"`
	Data struct {
		PaymentID      string `json:"payment_id"`
		SubscriptionID string `json:"subscription_id"`
		Customer       struct {
			Metadata struct {
				UserID string `json:"user_id"`
			} `json:"metadata"`
			Email string `json:"email"`
		} `json:"customer"`
		// Payment-level metadata: set by server-created pack/boost checkout
		// sessions so grants can be attributed and orders marked settled.
		Metadata struct {
			UserID      string `json:"user_id"`
			OrderID     string `json:"order_id"`
			RepoID      string `json:"repo_id"`
			IssueNumber string `json:"issue_number"`
		} `json:"metadata"`
		BillingCycle string `json:"billing_cycle"` // "monthly" | "yearly"
		ExpiresAt    string `json:"expires_at"`
		ProductCart  []struct {
			ProductID string `json:"product_id"`
			Quantity  int    `json:"quantity"`
		} `json:"product_cart"`
	} `json:"data"`
}

// creditPackDodoProductID is the DodoPayments product ID for the one-time
// $5 "10 preflight evaluations" pack sold from the quota-exceeded modal.
const creditPackDodoProductID = "pdt_opendoor_pack10"

// recruiterPassDodoProductID is the DodoPayments product ID for the monthly
// Recruiter Pass (Talent Pass) that unlocks /api/v1/recruiter/search.
const recruiterPassDodoProductID = "pdt_opendoor_recruiter_pass"

// isCreditPackPurchase reports whether a payment.succeeded payload is a
// one-time pack purchase (vs a subscription invoice) by matching SKU in the
// product cart.
func isCreditPackPurchase(p DodopaymentsWebhookPayload) bool {
	for _, item := range p.Data.ProductCart {
		if item.ProductID == creditPackDodoProductID {
			return true
		}
	}
	return false
}

// isRecruiterPassPurchase reports whether a payload is for the Recruiter Pass.
func isRecruiterPassPurchase(p DodopaymentsWebhookPayload) bool {
	for _, item := range p.Data.ProductCart {
		if item.ProductID == recruiterPassDodoProductID {
			return true
		}
	}
	return false
}

// DodopaymentsWebhookHandler handles POST /api/v1/payments/webhook/dodopayments (Story 5.2)
func DodopaymentsWebhookHandler(cfg *config.Config, entRepo repository.EntitlementRepository, database *sqlx.DB, recruiterRepo repository.RecruiterRepository) gin.HandlerFunc {
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
		if userIDStr == "" {
			// Server-created checkout sessions carry attribution at the
			// payment level rather than on the customer object.
			userIDStr = payload.Data.Metadata.UserID
		}
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

		// 4. State Transitions - branch on event type + SKU (AC2): one-time
		// pack payments grant ledger credits; the Recruiter Pass activates the
		// talent-pass entitlement; everything else keeps the existing
		// subscription entitlement flow.
		isRecruiter := isRecruiterPassPurchase(payload)
		switch payload.EventType {
		case "payment.succeeded":
			if isCreditPackPurchase(payload) {
				purchaseID := payload.Data.PaymentID
				if purchaseID == "" {
					purchaseID = payload.EventID
				}
				if err := entRepo.GrantCreditPack(c.Request.Context(), userID, purchaseID, repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
					slog.Error("failed to grant credit pack", "user_id", userID, "purchase_id", purchaseID, "err", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to grant credit pack"})
					return
				}
				// Close out the tracked pack order (AC4/AC5): the UI
				// pack-status poll reads this state.
				if orderID := payload.Data.Metadata.OrderID; orderID != "" {
					_ = entRepo.MarkCreditPackOrder(c.Request.Context(), orderID, "granted")
				}
			} else if isRecruiter {
				// AC2/AC6: Recruiter Pass flips from 'pending' (checkout) to
				// 'active' only here, after the Dodo payment confirms.
				if err := recruiterRepo.ActivateRecruiterPass(c.Request.Context(), userID, payload.Data.SubscriptionID); err != nil {
					slog.Error("failed to activate recruiter pass", "user_id", userID, "err", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate recruiter pass"})
					return
				}
			} else {
				_ = entRepo.UpdateSubscription(c.Request.Context(), userID, true, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
			}
		case "subscription.created", "subscription.active", "subscription.renewed":
			if isRecruiter {
				if err := recruiterRepo.ActivateRecruiterPass(c.Request.Context(), userID, payload.Data.SubscriptionID); err != nil {
					slog.Error("failed to activate recruiter pass", "user_id", userID, "err", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate recruiter pass"})
					return
				}
			} else {
				_ = entRepo.UpdateSubscription(c.Request.Context(), userID, true, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
				// AC5: upgrade to Pro promotes any pending (delayed) notifications
				// to instant delivery via the pending-window sweep.
				if err := notification.OnPlanChanged(database, userID, true, eventTime); err != nil {
					slog.Warn("notification plan sweep on upgrade failed", "user_id", userID, "err", err)
				}
			}
		case "subscription.cancelled", "subscription.expired":
			if isRecruiter {
				if err := recruiterRepo.DeactivateRecruiterPass(c.Request.Context(), userID); err != nil {
					slog.Warn("failed to deactivate recruiter pass", "user_id", userID, "err", err)
				}
			} else {
				_ = entRepo.UpdateSubscription(c.Request.Context(), userID, false, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
				// AC5: downgrade re-applies Free delay within the pending window.
				if err := notification.OnPlanChanged(database, userID, false, eventTime); err != nil {
					slog.Warn("notification plan sweep on downgrade failed", "user_id", userID, "err", err)
				}
			}
		case "payment.failed":
			isPack := isCreditPackPurchase(payload)
			if isRecruiter {
				// AC6: failed Recruiter Pass payment leaves the entitlement
				// pending (or reverts an active one); never touches Pro.
				if err := recruiterRepo.DeactivateRecruiterPass(c.Request.Context(), userID); err != nil {
					slog.Warn("failed to deactivate recruiter pass on payment failure", "user_id", userID, "err", err)
				}
			}
			_ = entRepo.UpdateSubscription(c.Request.Context(), userID, false, payload.Data.SubscriptionID, payload.Data.BillingCycle, expiresAt, eventTime)
			// A failed one-time pack payment must surface as a failure
			// state with no credits (AC5).
			if isPack {
				if orderID := payload.Data.Metadata.OrderID; orderID != "" {
					_ = entRepo.MarkCreditPackOrder(c.Request.Context(), orderID, "failed")
				}
			} else {
				// A failed subscription payment is a downgrade (AC5).
				if err := notification.OnPlanChanged(database, userID, false, eventTime); err != nil {
					slog.Warn("notification plan sweep on downgrade failed", "user_id", userID, "err", err)
				}
			}
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
