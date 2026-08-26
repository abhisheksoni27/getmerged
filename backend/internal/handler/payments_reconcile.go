package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/repository"
)

// PackPurchaseReconciler closes the missed-webhook failure mode (AC4): an
// hourly poll of DodoPayments for succeeded one-time pack payments whose
// credits were not granted by the webhook. Grants go through the same
// credit_packs ledger, so the unique purchase_id constraint makes replays
// between the webhook and this poll no-ops. Purchases that stay ungrantable
// (e.g. no user attribution in metadata) must be refunded manually within
// 24h via the DodoPayments dashboard - see backend/docs/credit-packs.md.
type PackPurchaseReconciler struct {
	cfg     *config.Config
	entRepo repository.EntitlementRepository
	client  *http.Client
}

func NewPackPurchaseReconciler(cfg *config.Config, entRepo repository.EntitlementRepository) *PackPurchaseReconciler {
	return &PackPurchaseReconciler{
		cfg:     cfg,
		entRepo: entRepo,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// Start runs one immediate reconcile pass and then re-polls hourly until ctx
// is cancelled. Safe to call when DODOPAYMENTS_API_KEY is unset: it no-ops.
func (r *PackPurchaseReconciler) Start(ctx context.Context) {
	if r.cfg.DodopaymentsAPIKey == "" {
		return
	}
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		r.reconcileOnce(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				r.reconcileOnce(ctx)
			}
		}
	}()
}

type dodoProductCartItem struct {
	ProductID string `json:"product_id"`
}

type dodoPaymentRecord struct {
	PaymentID string `json:"payment_id"`
	Status    string `json:"status"`
	Metadata  struct {
		UserID  string `json:"user_id"`
		OrderID string `json:"order_id"`
	} `json:"metadata"`
	ProductCart []dodoProductCartItem `json:"product_cart"`
}

func (r *PackPurchaseReconciler) reconcileOnce(ctx context.Context) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.dodopayments.com/v1/payments?status=succeeded&limit=100", nil)
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Bearer "+r.cfg.DodopaymentsAPIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		slog.Warn("pack purchase reconcile poll failed", "err", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		slog.Warn("pack purchase reconcile poll returned non-200", "status", resp.StatusCode)
		return
	}

	var payload struct {
		Data []dodoPaymentRecord `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		slog.Warn("pack purchase reconcile poll returned invalid json", "err", err)
		return
	}

	granted := 0
	for _, p := range payload.Data {
		if p.Status != "succeeded" || !isCreditPackProductCart(p.ProductCart) {
			continue
		}
		userID := parsePositiveInt64(p.Metadata.UserID)
		if userID <= 0 {
			slog.Warn("reconciled pack payment lacks user attribution; refund within 24h",
				"payment_id", p.PaymentID)
			continue
		}
		if err := r.entRepo.GrantCreditPack(ctx, userID, p.PaymentID, repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
			slog.Error("failed to grant reconciled credit pack", "payment_id", p.PaymentID, "err", err)
			continue
		}
		if p.Metadata.OrderID != "" {
			_ = r.entRepo.MarkCreditPackOrder(ctx, p.Metadata.OrderID, "granted")
		}
		granted++
	}
	if granted > 0 {
		slog.Info(fmt.Sprintf("pack purchase reconcile granted %d packs", granted))
	}
}

func isCreditPackProductCart(cart []dodoProductCartItem) bool {
	for _, item := range cart {
		if item.ProductID == creditPackDodoProductID {
			return true
		}
	}
	return false
}

// parsePositiveInt64 parses a user id from payment metadata, returning 0 for
// absent/invalid values.
func parsePositiveInt64(s string) int64 {
	n, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
	if err != nil || n <= 0 {
		return 0
	}
	return n
}
