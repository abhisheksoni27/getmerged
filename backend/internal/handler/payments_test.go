package handler_test

import (
	"bytes"
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

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/payments/webhook/dodopayments", handler.DodopaymentsWebhookHandler(cfg, entRepo))

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
}
