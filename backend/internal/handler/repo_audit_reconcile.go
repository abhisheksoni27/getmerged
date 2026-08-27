package handler

import (
	"context"
	"log/slog"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/repository"
)

// RepoAuditReconciler closes the missed-webhook failure mode for one-time
// $19 deep-audit purchases (AC6): every 5 minutes it polls DodoPayments for
// pending checkout sessions and reactivates them to 'paid' idempotently when
// the session succeeded. Because MarkPaid is keyed (user_id, repo_key) and
// only sets paid_at once, replays from the webhook and this poll are no-ops.
type RepoAuditReconciler struct {
	cfg       *config.Config
	auditRepo repository.AuditPurchaseRepository
}

func NewRepoAuditReconciler(cfg *config.Config, auditRepo repository.AuditPurchaseRepository) *RepoAuditReconciler {
	return &RepoAuditReconciler{cfg: cfg, auditRepo: auditRepo}
}

// Start runs one immediate reconcile pass and then re-polls every 5 minutes
// until ctx is cancelled. Safe to call when DODOPAYMENTS_API_KEY is unset: it
// no-ops (there is nothing to reconcile without the API).
func (r *RepoAuditReconciler) Start(ctx context.Context) {
	if r.cfg.DodopaymentsAPIKey == "" {
		return
	}
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
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

func (r *RepoAuditReconciler) reconcileOnce(ctx context.Context) {
	pending, err := r.auditRepo.ListPendingForReconcile(ctx, 100)
	if err != nil {
		slog.Warn("audit reconcile: list failed", "err", err)
		return
	}
	if len(pending) == 0 {
		return
	}

	activated := 0
	for _, p := range pending {
		paymentID, state := fetchDodoCheckoutState(ctx, r.cfg.DodopaymentsAPIKey, p.DodoCheckoutID)
		if state != "paid" {
			// failed/expired stay pending so the CTA remains (AC8); pending
			// stays pending and will be re-checked next cycle.
			continue
		}
		if err := r.auditRepo.MarkPaid(ctx, p.UserID, p.RepoKey, p.SessionID, paymentID); err != nil {
			slog.Error("audit reconcile: mark paid failed", "repo_key", p.RepoKey, "err", err)
			continue
		}
		activated++
	}
	if activated > 0 {
		slog.Info("audit reconcile activated purchases", "count", activated)
	}
}
