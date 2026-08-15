# Opendoor — Next Steps (single source of truth)

> **One file.** Everything else is archived under `archive/` (old `ROADMAP.md`,
> `GROWTH_STRATEGY.md`, `PRODUCT.md`, `DESIGN.md`, `tasks/`). Useful content has
> been merged into this document. Rewritten **Aug 2026**.

---

## 0. State of the ship (live today)

| Area | Status |
|------|--------|
| C-Rank™ scoring | 27k+ repos, 14 languages, nightly global re-anchor |
| Browse/filter/search | `/`, `/repos`, language + star + tier + merge-rate filters, pagination |
| Repo detail | `/repo/[owner]/[name]`, C-Rank breakdown, AI vibe check, PR guidelines, score history |
| Rankings | `/rankings/[lang]`, `/leaderboard`, `/hall-of-fame` |
| Good-first-issue | `/good-first-issue/[lang]` |
| Public profiles | `/u/[username]` (contributor profile) + badge SVG (`/raw`) |
| Auth | GitHub OAuth + 7-day signed JWT, watchlists |
| SEO | dynamic metadata, JSON-LD, OG images, sharded sitemap, robots |
| Ops | Go/gin + Turso + Valkey, GitHub GraphQL pipeline, PostHog, cron + scripts |
| **Monetization** | ❌ none live (no `/pricing`, no payment webhook) |
| **Blog** | ❌ none (no `/blog`, no MDX support) |

**Verdict:** features are done. The next 10 weeks are monetization + content + B2B.

---

## 1. Positioning & north star

- **"Glassdoor for open-source repositories."** Tagline: *Don't guess which door is open. Opendoor shows you.*
- **The moat is objectivity.** C-Rank™ is reproducible math from public GitHub data. Aggregators (GFI sites, GitHub's own `/contribute`, Copilot Chat) can list issues — they cannot claim an auditable S–D score. **Never gate the data; gate personalisation and time-saving.**
- **Glassdoor crossover = job boards / hiring.** Contributors are talent; merged-PR history is verifiable proof. Recruiters already pay for this signal elsewhere (FoundDev, Gitsight, OpenQ). Our C-Rank + contributor data is the same asset.
- **Platform risk:** GitHub keeps absorbing the surface (Explore, `/contribute`, Copilot). Win on transparent scoring + community + content, not aggregation.

---

## 2. Moats worth building (research-backed)

These are genuine product gaps nobody owns, and each doubles as blog content.

| Moat | Evidence | Build |
|------|----------|-------|
| **GFI quality score** (issue-level C-Rank) | ESEC/FSE 2020: ~50% of GFIs never solved by newcomers. FSE 2024: working a GFI gives **5.57× merge odds** | Score each GFI: description clarity, scope, maintainer response <48h, expert-mentor participation (ICSE 2023: expert involvement → success), `help wanted`/`first-timers-only` labels. Filter/sort `/good-first-issue` by it |
| **Onboarding docs score** | FSE 2023: ~65% of projects lack CONTRIBUTING.md; most that have it cover ≤4 of 6 newcomer barriers | Score CONTRIBUTING.md, CODE_OF_CONDUCT, issue templates, welcome bot presence. Surfaced as a C-Rank input + badge |
| **PR-rejection classification** | "maintainer_closed" ≠ "abandoned" | Classify closed PRs (local classifier): abandoned / maintainer_closed / superseded / duplicate |
| **Bus factor** | fragile repos kill contributors | `distinct_maintainer_count` over 90d; bus factor = 1 → tier cap warning |

---

## 3. Monetization (next 10 weeks)

### 3.1 Payment stack — **dodopayments** (primary), **Paddle** as MoR fallback

- dodopayments: India + global, UPI + cards, no entity/RBI burden, webhooks → entitlements.
- Paddle (Merchant of Record) if/when enterprise VAT/compliance matters.
- **Decision log:** PRODUCT.md previously said RevenueCat; NEXT_STEPS said Stripe+UPI. Both superseded — MoR route chosen (single API, tax handled, global reach).
- Pattern: provider webhook → set `is_pro` + `subscription_expires_at` on `users` (cached in Valkey). Go middleware returns `402 {upgrade_url}` on gated endpoints.

### 3.2 Pro tier ($5/mo) — gate personalisation, never the data

```
Anonymous  → page 1, tier badge, language filter, public metrics
Free (OAuth) → unlimited pages/filters, trending, watchlist ≤10, AI vibe check, GFI widget
Pro $5/mo  → Contributor DNA, weekly personalized digest, PR Likelihood score,
             score-history trends, First-Merge Track, unlimited watchlist + tier-change
             push, unlimited /compare
```

- **Upgrade trigger:** blurred personalised-digest preview + locked PR-likelihood on repo pages.
- **Login triggers:** "See trending" and page-2 pagination (high intent, low friction).
- **Contributor DNA** (built once on OAuth, refreshed weekly, 1 cheap inference/week): languages/skill, contribution style, PR-size pref, `is_newbie`. Cached. Powers digest + PR likelihood.
- **Weekly digest** (Monday, Resend email + in-app): 5 repos + 5 issues matched to profile with PR-likelihood. *The habit trigger.*
- **PR Likelihood score** (formula, no LLM per-request): `merge_rate×.40 + skill_match×.30 + first_timer_success×.20 + recency×.10`; LLM only writes the "Why / Watch out" text, cached per repo+skill.
- **First-Merge Track** (`is_newbie`): 5 curated repos (S/A, first-timer >60%, response <48h, bus factor ≥2) + exact issue + AI PR checklist → on merge detect: confetti + shareable card → acquisition flywheel.

### 3.3 The $5 math

| Users | Conv | MRR |
|---|---|---|
| 1k | 3% | $150 |
| 10k | 3% | $1.5k |
| 50k | 5% | $12.5k |
| 200k | 5% | $50k |

### 3.4 B2B layers (after trust, ~month 3+)

1. **Recruiter access (Portfolio Pass B2B)** — FoundDev model: devs opt-in, recruiters search shipped-code profiles + MatchScore. Highest ARPU. We already hold the data; add opt-in + recruiter UI.
2. **Developer-data API licensing** — OpenQ model: sell repo/contributor intelligence to DevRel/GTM teams. Same dataset, new surface.
3. **Maintainer tier + sponsored doors** — claim repo, contributor-side report, benchmark, sponsored slots. Only once community trust is solid.

---

## 4. Blog & content engine — fully automated (claude-blog)

Use **AgriciDaniel/claude-blog** (claude-blog.md skill suite: 30 commands, 4-agent pipeline, 5-gate delivery contract, 0–100 scoring, dual Google + AI-citation/GEO optimization).

### 4.1 Pipeline (weekly cron + on-demand)

```
cron → scripts/blog-pipeline.sh
  1. curl POST /internal/blog-report (internal key) → data JSON
     { period, top_improvers, biggest_drops, new_s_tier, language_trends,
       top_gfis, welcoming_movers, merge_rate_stats }   ← I8-style export, from DB
  2. claude-blog /blog write "<State of Welcoming OSS — Weekly>"
     (agents research, draft from data JSON, inject charts)
  3. claude-blog /blog analyze → gate ≥ 90, zero P0
  4. write MDX + frontmatter → frontend/src/app/blog/posts/
  5. update blog index + sitemap
  6. commit (hooks auto-deploy) or open PR
```

### 4.2 Content mix (users can come for anything)

- **Weekly data report** (automated, from our own corpus — nobody else has it): S/A/B/C/D movers, languages on the rise, most-welcoming new repos, hot GFIs with quality scores.
- **Evergreen clusters** (from `/blog strategy`): open source onboarding, good-first-issue how-tos, per-language "best repos for first PRs", OSS sustainability, contributor-portfolio building.
- **SEO/GEO:** every post JSON-LD `Article`, cross-linked to repo/rankings pages (internal-link rule engine, §7), optimized for AI-citation platforms.
- **Newsletter** (weekly digest doubles as distribution; GFI roundup option for non-Pro readers → free-list growth).
- **2 posts/week ceiling** — quality over volume; claude-blog's delivery contract enforces it.

### 4.3 Frontend work

- Add MDX: `@next/mdx` + `gray-matter`, or remark-based server renderer. Route `/blog` + `/blog/[slug]` (SSR, ISR 1d), index page, related-repos cross-links.

---

## 5. Growth & virality backlog (from old NEXT_STEPS)

| Item | Notes |
|------|-------|
| DoorPal browser extension | overlay C-Rank + competition radar on github.com; every install = distribution point |
| Weekend Letter | auto 3-min audio+text round-up, forwardable |
| Door-of-the-day + optional share-unlock | daily habit + light share loop |
| Merge Streak trophies | Spotify-Wrapped-style art cards for consecutive merge weeks |
| Repo Roast / Warm Hug cards | AI one-liners, share-by-design |
| First-merge celebration card | already in Pro First-Merge Track; make it viral by default |
| "Find My Door" bounty thread | personalized door suggestions → public votable cards |

---

## 6. Metrics & scoring backlog (candidate C-Rank signals)

From old GROWTH_STRATEGY §2 — add after Pro ships (each is a Pro/PR-likelihood input):

issue→PR conversion · PR-comment sentiment · time-to-first-triage · contributor graduation rate · **onboarding docs score (§2)** · **PR-rejection classification (§2)** · weekly activity trend arrows · **bus factor (§2)** · review coverage · bot-activity ratio · release cadence · **GFI quality (§2)**

---

## 7. SEO & content-system backlog

| Item | Status |
|------|--------|
| Dynamic metadata + JSON-LD + OG images | ✅ shipped |
| Sharded sitemap | ✅ shipped |
| `/compare/[a]/[b]` | build |
| `/topics/[topic]`, `/org/[org]` (needs topics index) | build |
| `/contribute` wizard | build |
| Internal-link rule engine (repo → language ranking → tier neighbors → compare → GFI) | build |
| Freshness signals (lastModified = snapshot date, "updated Xh ago") | build |
| Annual "State of Welcoming OSS" report (`/reports/[year]`) | experiment; backlinks + authority |

---

## 8. Infrastructure & ops backlog

- Tiered crawl frequency (S:12h → D:7d) — frees ~60% API budget.
- GH Archive (BigQuery) 180-day backfill — validates scoring, near-zero API cost.
- **GitHub App + installation tokens** migration (PAT rate-limit ceiling) — needed before recruiter/data API scale.
- Python AI sidecar (local HuggingFace: sentiment, GFI-quality, PR-rejection) — avoids per-call LLM cost.
- `/internal/blog-report` endpoint (feeds blog pipeline, §4.1).

---

## 9. Constraints & decisions (carried from PRODUCT.md)

- **No ORMs** — native SQL. **Config via `.env`**, no hardcoded values, no wrappers.
- **Distributed components connect in middleware**, passed via gin context.
- **No pgvector** at current scale (<50k repos); in-process cosine fine.
- **TDD for backend** (Red → Green → Refactor). Frontend must pass `npm run lint`.
- No fabricated testimonials/social proof. No fake/mock data — real API data or clean empty/loading states.
- Brand: **Opendoor** (one word), **C-Rank™** (™ preserved), tagline fixed.
- Pay stack: dodopayments → Paddle MoR (India-first, global-capable). **Not** RevenueCat, not raw Stripe.

---

## 10. Execution order (next 10 weeks)

| Weeks | Focus | Ship |
|-------|-------|------|
| 1–2 | Monetization core | dodopayments webhook → Pro entitlements + middleware; `/pricing`; Contributor DNA |
| 3–4 | Pro value | weekly digest; PR Likelihood score; First-Merge Track + celebration card; upgrade triggers |
| 5 | Blog foundation | MDX support; `/blog` + `/blog/[slug]`; `/internal/blog-report`; blog-pipeline.sh v1 |
| 6–7 | Content engine live | weekly data-report posts; evergreen cluster A (open source onboarding + GFI how-tos); newsletter |
| 8 | Scoring moats | GFI-quality score; onboarding docs score; PR-rejection classifier; bus factor |
| 9 | B2B v1 | recruiter opt-in + Portfolio Pass; `/compare`; `/contribute` wizard |
| 10 | Scale + measure | tiered crawl; GH Archive backfill; GitHub App migration kickoff; annual report experiment |
