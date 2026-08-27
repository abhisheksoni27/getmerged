package handler_test

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func computeSignature(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func TestDodopaymentsWebhookHandler(t *testing.T) {
	database, err := sqlx.Open("sqlite", "file:paytest?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	cfg := &config.Config{
		DodopaymentsWebhookSecret: "test_secret_123",
	}

	entRepo := repository.NewEntitlementRepository(database)
	recruiterRepo := repository.NewRecruiterRepository(database)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/payments/webhook/dodopayments", handler.DodopaymentsWebhookHandler(cfg, entRepo, database, recruiterRepo))

	t.Run("valid subscription.created upgrades user to pro", func(t *testing.T) {
		payload := handler.DodopaymentsWebhookPayload{
			EventID:   "evt_101",
			EventType: "subscription.created",
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		}
		payload.Data.SubscriptionID = "sub_999"
		payload.Data.BillingCycle = "monthly"
		payload.Data.Customer.Metadata.UserID = "42"

		bodyBytes, _ := json.Marshal(payload)
		sig := computeSignature(bodyBytes, cfg.DodopaymentsWebhookSecret)

		req := httptest.NewRequest("POST", "/api/v1/payments/webhook/dodopayments", bytes.NewReader(bodyBytes))
		req.Header.Set("X-Dodopayments-Signature", sig)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", w.Code)
		}

		ent, err := entRepo.GetEntitlement(req.Context(), 42)
		if err != nil || !ent.IsPro {
			t.Fatalf("expected user 42 to be pro, got %v, err: %v", ent, err)
		}
	})

	t.Run("duplicate event returns 200 without reprocessing", func(t *testing.T) {
		payload := handler.DodopaymentsWebhookPayload{
			EventID:   "evt_101",
			EventType: "subscription.created",
		}
		payload.Data.SubscriptionID = "sub_999"
		payload.Data.Customer.Metadata.UserID = "42"

		bodyBytes, _ := json.Marshal(payload)
		sig := computeSignature(bodyBytes, cfg.DodopaymentsWebhookSecret)

		req := httptest.NewRequest("POST", "/api/v1/payments/webhook/dodopayments", bytes.NewReader(bodyBytes))
		req.Header.Set("X-Dodopayments-Signature", sig)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", w.Code)
		}
	})

	t.Run("forged signature is rejected with 401", func(t *testing.T) {
		payload := handler.DodopaymentsWebhookPayload{
			EventID:   "evt_forged",
			EventType: "subscription.created",
		}
		bodyBytes, _ := json.Marshal(payload)

		req := httptest.NewRequest("POST", "/api/v1/payments/webhook/dodopayments", bytes.NewReader(bodyBytes))
		req.Header.Set("X-Dodopayments-Signature", "invalid_forged_sig")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 Unauthorized, got %d", w.Code)
		}
	})

	t.Run("one-time pack payment grants credits once and never flips pro", func(t *testing.T) {
		sendPackWebhook := func(eventID string) {
			payload := handler.DodopaymentsWebhookPayload{
				EventID:   eventID,
				EventType: "payment.succeeded",
				CreatedAt: time.Now().UTC().Format(time.RFC3339),
			}
			payload.Data.PaymentID = "pay_777"
			payload.Data.ProductCart = []struct {
				ProductID string `json:"product_id"`
				Quantity  int    `json:"quantity"`
			}{{ProductID: "pdt_opendoor_pack10", Quantity: 1}}
			payload.Data.Customer.Metadata.UserID = "43"

			bodyBytes, _ := json.Marshal(payload)
			sig := computeSignature(bodyBytes, cfg.DodopaymentsWebhookSecret)
			req := httptest.NewRequest("POST", "/api/v1/payments/webhook/dodopayments", bytes.NewReader(bodyBytes))
			req.Header.Set("X-Dodopayments-Signature", sig)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Fatalf("expected 200 OK for %s, got %d", eventID, w.Code)
			}
		}

		// Two distinct events replaying the SAME purchase must be a no-op the
		// second time (ledger unique constraint on purchase_id).
		sendPackWebhook("evt_pack_a")
		sendPackWebhook("evt_pack_b")

		ent, err := entRepo.GetEntitlement(reqCtx(), 43)
		if err != nil {
			t.Fatalf("failed to load entitlement: %v", err)
		}
		if ent.IsPro {
			t.Fatalf("one-time pack payment must not activate subscription")
		}
		if ent.BonusEvals != 10 {
			t.Fatalf("expected exactly 10 bonus evals after replayed webhook, got %d", ent.BonusEvals)
		}

		// Non-pack payment.succeeded keeps legacy subscription behavior.
		payload := handler.DodopaymentsWebhookPayload{
			EventID:   "evt_sub_pay",
			EventType: "payment.succeeded",
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		}
		payload.Data.SubscriptionID = "sub_888"
		payload.Data.Customer.Metadata.UserID = "44"
		bodyBytes, _ := json.Marshal(payload)
		sig := computeSignature(bodyBytes, cfg.DodopaymentsWebhookSecret)
		req2 := httptest.NewRequest("POST", "/api/v1/payments/webhook/dodopayments", bytes.NewReader(bodyBytes))
		req2.Header.Set("X-Dodopayments-Signature", sig)
		w2 := httptest.NewRecorder()
		r.ServeHTTP(w2, req2)
		if w2.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", w2.Code)
		}
		entSub, err := entRepo.GetEntitlement(req2.Context(), 44)
		if err != nil || !entSub.IsPro {
			t.Fatalf("expected non-pack payment.succeeded to keep subscription flow, got %v err %v", entSub, err)
		}
	})
}

func reqCtx() context.Context { return context.Background() }
