# GetMerged Monetisation Activation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Wire the existing (dormant) payment stack into a live paywall, ship 3 flagship Pro features, then layer 12 more gated experiments to reach a credible 3% conversion rate.

**Architecture:** Entitlements already live in MySQL (`user_entitlements`) with `RequireProOrQuota` middleware, dodopayments webhook, and `/pricing`. Phase 1 connects the last mile (routes → middleware → frontend upgrade UX). Phases 2–4 add Pro-only endpoints behind the same middleware + blurred-preview components. All gating is personalisation-layer only; C-Rank data and SEO pages stay open.

**Tech Stack:** Go/gin (native SQL via sqlx), Next.js App Router + Tailwind + shadcn/ui (neo-brutalist per design.md — bottom-line borders), PostHog for funnel events, dodopayments webhooks.

---

## Ground rules for every task

- Work on `main`, commit after every task.
- Golden paths (payment flow, quota deduction, gated endpoint serving) get TDD. UI-only gets lint (`npm run lint`) as the gate.
- Never run `npm run build`; use `npm run lint`.
- BE deploys: `scripts/manage.sh restart` after backend changes; FE rebuild after frontend changes.
- Every `<a>`/`<Link>` gets a descriptive `title`.
- PostHog event naming: `paywall_viewed`, `upgrade_clicked`, `checkout_started`, `quota_exceeded`, `pro_feature_used`.

---

## PHASE 1 — Activate the paywall (last mile)

### Task 1: Gate PR-Likelihood / match evaluation route

**Objective:** First real 402 in production — wire `RequireProOrQuota` onto the personalised match endpoint.

**Files:**
- Modify: `backend/cmd/server/main.go:160-170` (userApi group)

**Step 1: Write failing test**

Create `backend/internal/middleware/quota_route_test.go`: assert that a request from an anonymous context to a route wrapped in `RequireProOrQuota` returns 401, and a free user over quota gets `402` with `upgrade_url` field. (Middleware tests exist in `quota.go`'s neighbours — follow their pattern with a fake `EntitlementRepository`.)

**Step 2:** Run `go test ./internal/middleware/ -run TestRequireProOrQuota -v` → expect FAIL (test file new; confirm baseline passes first).

**Step 3: Implementation** — in `main.go`, inside the `userApi` group:

```go
eval := userApi.Group("")
eval.Use(middleware.RequireProOrQuota(entRepo))
{
    eval.POST("/match/evaluate", handler.EvaluateMatchHandler(repoStore))
}
```

If `EvaluateMatchHandler` doesn't exist yet, gate the AI insights re-eval path instead (`POST /repos/:id/insights/refresh`) — pick whichever handler exists; do not invent one. Verify by reading `main.go` routes first.

**Step 4:** `go test ./...` → PASS. Commit: `feat(paywall): enforce free quota on match evaluation`

### Task 2: Frontend 402 interceptor + UpgradeModal

**Objective:** Any API response with status 402 opens an upgrade modal instead of failing silently.

**Files:**
- Create: `frontend/src/components/UpgradeModal.tsx`
- Create: `frontend/src/lib/api.ts` (if no shared fetch wrapper exists — check before creating)
- Modify: callers of gated endpoints to use the wrapper

**Step 1:** Build `UpgradeModal.tsx` — shadcn Dialog, neo-brutalist border-b styling, copy: "You've used your 3 free evaluations this month", CTA button → `/pricing` (`<Link title="See GetMerged Pro pricing">`). Fire PostHog `paywall_viewed` on open, `upgrade_clicked` on CTA.

**Step 2:** Shared fetch helper:

```ts
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (res.status === 402) {
    window.dispatchEvent(new CustomEvent("getmerged:paywall"));
    throw new Error("upgrade_required");
  }
  return res;
}
```

Global listener mounts `UpgradeModal` once (in `layout.tsx` or a client provider).

**Step 3:** `npm run lint` → PASS. Commit: `feat(paywall): global 402 handling + upgrade modal`

### Task 3: /pricing → real dodopayments checkout

**Objective:** "Upgrade to Pro Now" button creates a checkout session instead of being decorative.

**Files:**
- Create: `backend/internal/handler/checkout.go`
- Test: `backend/internal/handler/checkout_test.go`
- Modify: `backend/cmd/server/main.go` (route), `frontend/src/app/pricing/page.tsx:156`

**Step 1:** Failing test: POST `/api/v1/payments/checkout` with auth returns `{checkout_url}`; unauthenticated returns 401.

**Step 2:** Handler calls dodopayments create-checkout-session API (`DODO_API_KEY` from env — config driven, add `DodopaymentsAPIKey string` to `internal/config/config.go` reading `DODO_PAYMENTS_API_KEY`). Pass `metadata.user_id`, success redirect back to `/pricing?welcome=1`. No defaults, no fallbacks (rule 8): missing key = 500 at startup config load.

**Step 3:** Wire route under `userApi`. FE button hits it, redirects to `checkout_url`. On `?welcome=1`, show confetti + "Welcome to Pro" and fire PostHog `checkout_started`.

**Step 4:** `go test ./internal/handler/ -run Checkout -v` PASS; `npm run lint` PASS. Commit: `feat(payments): live dodopayments checkout session creation`

### Task 4: Funnel instrumentation

**Objective:** Measure everything so conversion is a number, not a vibe.

**Files:**
- Modify: `frontend/src/app/posthog-init.tsx` (or wherever `posthog.capture` helpers live)
- Events: `signup_completed`, `digest_opened`, `paywall_viewed` (with feature prop), `upgrade_clicked`, `checkout_started`, `subscription_activated` (from webhook handler — add capture server-side or via success page).

Commit: `feat(analytics): monetisation funnel events`

### Task 5: Deploy + verify (rule 18C floor)

Restart BE (`scripts/manage.sh restart`), rebuild FE. Fetch one repo page post-deploy to verify render. Manually test: hit gated endpoint 4× with a test account → 4th returns 402 → modal shows → checkout URL generates. Commit any fixes.

---

## PHASE 2 — Three flagship Pro features

### Task 6: Weekly digest becomes the habit trigger (gate preview)

**Objective:** Free users see digest with items 4–5 blurred ("Unlock full digest — Pro").

**Files:**
- Modify: `backend/internal/handler/` weekly digest GET route (find existing digest fetch handler; internal trigger exists at `main.go:188`)
- Modify: digest UI component (locate via `search_files("digest", target="content")` in frontend)

Implementation: API returns all 5 items but sets `"locked": true` on items 4–5 for non-Pro (read entitlement via `GetEntitlement`). FE renders blur + lock overlay linking to `/pricing` with `title="Unlock the full weekly digest"`. PostHog `paywall_viewed {feature: "digest"}`.

TDD on the entitlement branch in handler. Commit: `feat(pro): gate full weekly digest`

### Task 7: Contributor DNA skill card

**Objective:** Public `/u/[username]` profile with a Pro-gated full report (free = top-line card).

**Files:**
- Create: `backend/internal/handler/profile.go`, `backend/internal/repository/contributor_profiles.go`
- DB migration: add `contributor_profiles` table (`user_id PK, profile_json JSON/MEDIUMTEXT, refreshed_at`) — additive column/table only.
- Create: `frontend/src/app/u/[username]/page.tsx`

Data pull per doc §3.3: user's own GitHub token, ≤2 search queries, deterministic heuristics (languages, skill level, PR size pref, merged count). Free view: languages + merged count. Pro view: full breakdown + history. SSR the page (SEO). Token storage must reuse encrypted `oauth_tokens` infra that already exists (`NewOAuthTokenRepository`).

TDD on attribute computation (pure function — easy red/green). Commit: `feat(dna): contributor profile build + public page`

### Task 8: Tier-change & maintainer-activity alerts

**Objective:** Watchlist repos alert on rank change / maintainer silence >21 days — Pro only.

**Files:**
- Create: `backend/internal/handler/alerts.go`, cron job alongside `pipeline.StartAIInsightsCron` pattern
- Modify: watchlist handler to expose `GET /user/alerts` (Pro-gated via `GetEntitlement`, not quota middleware)
- Migration: `user_alerts` table (additive)

Free users see alerts list but rows 2+ are locked-blur (same pattern as Task 6). Email delivery piggybacks Resend if configured; otherwise in-app only (no new vendor this phase). Commit: `feat(pro): watchlist tier-change and maintainer-silence alerts`

---

## PHASE 3 — Remaining 12 paywall experiments (one PR each, ship weekly)

Each: gated endpoint or blurred UI + PostHog `paywall_viewed {feature}`. Order by expected lift:

| # | Experiment | Gate style |
|---|---|---|
| 9 | PR-Likelihood score badge on GFI cards | blur (uses Task 1 eval) |
| 10 | Optimal submission window heatmap | component exists (`OptimalReviewWindow.tsx`) — Pro unlock full week view |
| 11 | Fit Radar (PR-size/filetype breakdown) | blur below fold |
| 12 | Review-round predictor ("expect ~2 rounds") | one-shot quota |
| 13 | Unlimited /compare + saved comparisons | count cap free=2 saved |
| 14 | Watchlist cap 10 free / unlimited Pro | hard cap + upsell toast at limit |
| 15 | Bulk export CSV of filtered rankings | 402 endpoint |
| 16 | Personal API key (1k req/day) | separate key table, Pro flag check |
| 17 | Achievement cards: free w/ watermark, Pro clean PNG | watermark toggle |
| 18 | Profile embed widget, Pro removes badge | iframe + entitlement check |
| 19 | Rival tracker (weekly contributor inflow email) | alerts infra reuse |
| 20 | Streak/history graphs on own profile | DNA data reuse |

Kill rule: any experiment with <50 `paywall_viewed`/mo after 4 weeks gets removed, not iterated.

---

## PHASE 4 — B2B seeds (only after Phase 2 retention data)

- **Task 21:** Recruiter waitlist landing section on `/pricing` (B2B tier teaser, collect emails). Zero backend.
- **Task 22:** `/api/v1/public/data-export` prototype behind manual API keys for 2-3 design-partner DevRel teams (OpenQ-model validation).
- **Task 23:** LLM-visibility report pilot ("how does your repo show in AI answers") — one-off generated reports for 5 friendly maintainers, price-discovery conversations.

---

## Verification checklist (whole plan done when)

- [ ] Test account: 3 evals work, 4th returns 402, modal renders, checkout completes in dodopayments sandbox, webhook flips `is_pro`, gates lift immediately.
- [ ] Repo pages + sitemap unaffected (fetch post-deploy).
- [ ] PostHog funnel: signup → activation → paywall_viewed → checkout_started visible within 24h of traffic.
- [ ] `go test ./...` and `npm run lint` green.
