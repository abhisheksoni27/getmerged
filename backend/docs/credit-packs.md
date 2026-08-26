# Pay-as-you-go Preflight Credit Packs

One-time purchase: **$5 for 10 preflight evaluations** (DodoPayments product
`pdt_opendoor_pack10`), sold from the quota-exceeded upgrade modal in
`/preflight`. Credits land in the existing `user_entitlements.bonus_evals`
ledger — the same balance referral bonuses use.

## Purchase & grant flow

1. Modal "Buy 10-pack ($5)" redirects to the hosted DodoPayments checkout.
2. On success DodoPayments delivers `payment.succeeded` to
   `POST /api/v1/payments/webhook/dodopayments`. The handler branches on event
   type + SKU: one-time pack payments grant credits; subscription events keep
   the existing entitlement flow untouched.
3. Grants are atomic and idempotent: a single transaction upserts the
   `credit_packs` ledger row keyed by the unique DodoPayments payment ID, then
   increments `bonus_evals`. Replayed webhooks are no-ops (unique constraint on
   `purchase_id`); concurrent duplicate grants are impossible at the DB level.

## Missed-webhook failure mode (accepted)

If the webhook is missed, the user sees a "payment processing" state after
checkout (`pack-processing` banner) while the hourly
`PackPurchaseReconciler` polls DodoPayments for succeeded-but-ungranted pack
purchases (`DODOPAYMENTS_API_KEY` required). The reconciler grants through the
same dedup-safe ledger path. If a purchase remains ungrantable for 24 hours
(typically missing user attribution in payment metadata), support refunds it
manually via the DodoPayments dashboard.

## Consumption rules

- Pack credits stack with referral bonuses (sanity cap: 10 packs per user),
  never expire, and are consumed only after the 3 monthly free evaluations.
- Active subscribers keep unlimited quota; they may buy packs but consume
  monthly quota first if their subscription lapses.
