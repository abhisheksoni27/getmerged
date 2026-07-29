# Opendoor — Actionable Roadmap

> Derived from `GROWTH_STRATEGY.md`. That doc is the **why and what**. This is the **when and how**.
>
> Items are grouped by type, not by time. Pick your sprint from each bucket.
> Effort estimates assume a single full-stack engineer who knows the codebase.

---

## How to read this

| Symbol | Meaning |
|---|---|
| `[BE]` | Backend only (Go / gin / pipeline) |
| `[FE]` | Frontend only (Next.js / React) |
| `[BE+FE]` | Full-stack change |
| `[AI]` | Requires LLM inference call |
| `[INFRA]` | Infrastructure / config change |
| ✅ | No dependencies, can start today |
| 🔒 | Blocked on another item (noted inline) |
| 💰 | Direct revenue impact |
| 🌱 | Flywheel / compounding growth |
| 🔬 | Experiment — measure before committing more |

---

## Bucket 1 — Quick Wins (< 1 day each, do these first)

These are already-understood changes with near-zero risk. Ship them in a single sprint.

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| Q1 | `comments(first: 100)` → `comments(first: 10)` in `RepoPRsQuery` | `[BE]` ✅ | 30 min | 🔥 9× crawl throughput | Biggest infra win in the whole doc. One line change in `queries.go`. |
| Q2 | `generateMetadata` on `/repo/[owner]/[name]` page | `[FE]` ✅ | 2 hrs | SEO | Data-driven title + description from repo C-Rank. Already SSR. |
| Q3 | `generateMetadata` on `/rankings/[lang]` | `[FE]` ✅ | 1 hr | SEO | Same pattern as Q2. |
| Q4 | Audit + add `canonical` tags on filter variant URLs | `[FE]` ✅ | 2 hrs | SEO | Prevents duplicate content penalty on `?lang=Go&tier=S` variants. |
| Q5 | `robots.ts` audit — ensure all new future routes are crawlable | `[FE]` ✅ | 30 min | SEO | Currently may block routes added since initial setup. |
| Q6 | Review Coverage metric (derive from existing `comments.totalCount`) | `[BE]` ✅ | 2 hrs | Data | Zero new API calls. Pure computation on data already in DB. |
| Q7 | Bot Activity Ratio (derive from existing `CommentAuthors` + `isBot()`) | `[BE]` ✅ | 2 hrs | Data | `isBot()` already in `client.go`. Just expose the ratio. |
| Q8 | Bus Factor (derive from existing `CommentAuthors` per PR) | `[BE]` ✅ | 2 hrs | Data | Already tracking distinct maintainers. Expose as `bus_factor` int. |
| Q9 | Page 1 limit for anonymous users (gate page 2+ behind login) | `[FE]` ✅ | 2 hrs | 💰 | Biggest login conversion driver. Show "Sign in to see more" on page 2. |
| Q10 | Lock trending toggle behind login | `[FE]` ✅ | 1 hr | 💰 | Second biggest login trigger. Simple auth check before fetch. |

---

## Bucket 2 — SEO Surface (2–5 days each)

Ship these in one focused SEO sprint. Together they 10× the crawlable surface area.

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| S1 | Replace `generate-sitemap` binary with Next.js `sitemap.ts` | `[FE]` ✅ | 1 day | SEO | Dynamic, always current. For >10k repos: shard into `sitemap/[id]`. |
| S2 | Dynamic OG images via `ImageResponse` for `/repo/[owner]/[name]` | `[FE]` ✅ | 1 day | 🌱 Social sharing | Every repo share on Twitter/Discord gets a unique data-accurate card. |
| S3 | Dynamic OG images for `/rankings/[lang]` and `/topics/[topic]` | `[FE]` ✅ | 0.5 day | 🌱 | Extend S2. Same `ImageResponse` route, different data shape. |
| S4 | `schema.org/SoftwareSourceCode` JSON-LD on repo detail pages | `[FE]` ✅ | 1 day | SEO | Rich snippets in Google. Inject as `<script type="application/ld+json">`. |
| S5 | `schema.org/Dataset` JSON-LD on language ranking pages | `[FE]` ✅ | 0.5 day | SEO | Dataset rich result. Drives "data" keyword cluster. |
| S6 | `/leaderboard` — full sortable all-language table | `[FE]` ✅ | 2 days | SEO + UX | Uses existing `/api/v1/repos` with sort params. No new backend. |
| S7 | `/hall-of-fame` — static S-tier showcase | `[FE]` ✅ | 1 day | 🌱 Backlinks | Repo maintainers will embed the badge. Seed backlink distribution. |
| S8 | Internal linking rule engine in Server Components | `[FE]` ✅ | 1 day | SEO | Repo detail → same-language ranking → topics → contribute page. |
| S9 | `lastModified` HTTP header on repo/ranking pages matching `snapshot_date` | `[FE+BE]` ✅ | 0.5 day | SEO | Signals freshness to Google. Use existing `updated_at` from DB. |

---

## Bucket 3 — New Metrics (1–3 days each)

Extend the C-Rank model. Each one is an independent backend task with a DB migration.

| # | Item | Type | Effort | Dependency | Notes |
|---|---|---|---|---|---|
| M1 | Issue Triage Speed (`median hours to first maintainer response on issues`) | `[BE]` ✅ | 2 days | New `issues` GraphQL query. One new query per repo, ~2 GraphQL points. |
| M2 | Issue Close Rate (`% of issues eventually closed`) | `[BE]` ✅ | 0.5 day | 🔒 M1 | Free — derive from same issues query. Add close count to result. |
| M3 | Docs & Onboarding Quality Score (CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue templates) | `[BE]` ✅ | 1 day | 3 REST API calls per repo. Already have REST client. Boolean → 0–100 score. |
| M4 | Release Cadence (median days between GitHub releases) | `[BE]` ✅ | 1 day | New `releases(first: 50)` GraphQL query. ~1 point per repo. |
| M5 | PR Rejection Reason Classification (`abandoned`, `maintainer_closed`, `superseded`) | `[BE+AI]` ✅ | 2 days | Classify existing closed-not-merged PRs. Use `ai_client.go`, cached per PR. |
| M6 | Trending Velocity (week-over-week delta on merge rate + response time) | `[BE]` ✅ | 2 days | Requires `daily_snapshots` table to have 2+ weeks of data. Already storing. |
| M7 | Weekly Activity Score (surfaced as ↑↓ arrows on repo cards) | `[FE]` | 1 day | 🔒 M6 | Frontend only — consume `trend_direction` field from API. |
| M8 | Issue-to-PR Conversion Rate | `[BE]` | 2 days | 🔒 M1 | Extend issues query with label filter. More complex join. |

**Note**: Q1 (comments fix) should ship before any new metric work — it gives you budget to run the new queries without net cost increase.

---

## Bucket 4 — New Pages (1–5 days each)

Each page is independently deployable. No inter-dependencies except where noted.

| # | Page | Type | Effort | SEO Target | Notes |
|---|---|---|---|---|---|
| P1 | `/good-first-issue/[lang]` | `[BE+FE]` ✅ | 2 days | "good first issue [language]" | Backend: new query filtering open issues by label + language. Frontend: ISR, refresh every 6h. |
| P2 | `/topics/[topic]` | `[BE+FE]` ✅ | 3 days | "[topic] open source projects" | Backend: index `repositoryTopics` from GraphQL (add field to seed). Frontend: SSR topic page. |
| P3 | `/compare/[repo-a]/[repo-b]` | `[FE]` ✅ | 3 days | "[repo] vs [repo] beginner friendly" | Frontend only. Fetch both repos from existing API. Radar chart + metric diff table. |
| P4 | `/contribute` wizard | `[FE]` ✅ | 3 days | "best [language] repos for beginners" | SSR wizard: pick language + experience → filtered API call → 5 curated repos. |
| P5 | `/org/[org]` | `[BE+FE]` | 3 days | "[org] open source contribution" | Backend: group repos by owner. Frontend: org aggregate C-Rank card. |
| P6 | `/similar/[owner]/[name]` | `[BE+FE]` | 2 days | "projects like [repo]" | Backend: find repos with matching language + highest topic overlap. No ML. |
| P7 | `/digest` | `[BE+FE]` | 3 days | Weekly fresh content | Backend: weekly job emitting top tier-changes JSON. Frontend: ISR page + subscribe form. |
| P8 | `/maintainers` dashboard | `[BE+FE]` 🔒 | 5 days | 🔒 Auth gate + GitHub App | Show repo owners their C-Rank over time + actionable nudges. Auth required. |
| P9 | `/blog` seed posts | `[FE]` ✅ | 2 days | "how to contribute to open source" | 3 MDX posts + Article schema. The pipeline auto-blog (§11.7) feeds this later. |
| P10 | `/reports/2026` — State of OSS | `[BE+FE]` 🔬 | 3 days | "state of open source 2026" | One-time: generate from current DB stats. Measure if it gets backlinks before doing another. |
| P11 | `/api/public` — Swagger UI page | `[FE]` ✅ | 1 day | Developer API SEO | Surface existing Swagger JSON at a user-facing route. Already generated. |

---

## Bucket 5 — Monetisation Core (1–2 weeks each, sequential)

These are the revenue-generating features. Build in this order — each one unlocks the next.

| # | Item | Type | Effort | Dependency | Notes |
|---|---|---|---|---|---|
| MON1 | **Payment integration** (Stripe Checkout + webhook) | `[BE]` | 3 days | — | `POST /api/v1/user/subscribe` → Stripe. Store `is_pro` on user row. Required before anything else in this bucket. |
| MON2 | **Pro gate middleware** on protected endpoints | `[BE]` | 1 day | 🔒 MON1 | `isPro` check in gin middleware. Return `402` with upgrade URL for non-pro users. |
| MON3 | **Contributor DNA profile** — build on login | `[BE+AI]` | 4 days | 🔒 MON1 | Query user's public GitHub PRs/repos via their OAuth token. AI inference → `contributor_profiles` table. Refresh weekly via cron. |
| MON4 | **Weekly personalised digest** — email generation | `[BE+AI]` | 4 days | 🔒 MON3 | Cron: every Sunday night, for each Pro user, run recommendation query → format email → send via Resend/Mailgun. |
| MON5 | **Digest in-app card** (blurred preview for free users) | `[FE]` | 1 day | 🔒 MON3 | Show a blurred/locked card on home page for free users: "5 repos matched to your Go skills — unlock with Pro". |
| MON6 | **PR Likelihood Score** on repo detail | `[BE+FE]` | 3 days | 🔒 MON3 | Backend: formula-based score from user profile + repo metrics. Frontend: show on repo detail page for Pro users, teaser for free. |
| MON7 | **First-Merge Guarantee track** — newbie onboarding UI | `[FE]` | 3 days | 🔒 MON3 | Frontend: dedicated flow for `is_newbie: true` users. 5 curated repos + checklist. |
| MON8 | **First merge detection + celebration** | `[BE+FE]` | 2 days | 🔒 MON7 | Backend: poll/webhook for PR merge on watched newbie repos. Frontend: confetti + shareable card component. |

**Ship order**: MON1 → MON2 → MON3 → (MON4 + MON6 in parallel) → MON5 → MON7 → MON8

---

## Bucket 6 — Engagement Flywheels (independent, ship anytime)

These drive retention and organic growth. No hard dependencies between them.

| # | Item | Type | Effort | Flywheel | Notes |
|---|---|---|---|---|---|
| F1 | **Badge SVG endpoint** `/badge/[owner]/[repo].svg` | `[BE]` ✅ | 1 day | 🌱 README embeds = backlinks | Shields.io style. Cached at CDN. Pulls live tier from DB. Every embed is a backlink + discovery vector. |
| F2 | **Score history chart** on repo detail | `[BE+FE]` ✅ | 2 days | Retention | Backend: query `daily_snapshots` for 12-month window. Frontend: line chart (use `recharts` or `chart.js`). |
| F3 | **Good First Issues widget** on repo detail | `[BE+FE]` ✅ | 2 days | 🌱 Discovery→action | Backend: new GitHub query for `good-first-issue` labelled open issues. Frontend: card on repo detail. Closes the discovery loop. |
| F4 | **Tier-change push notifications** (Web Push) | `[BE+FE]` | 3 days | Retention | Backend: detect tier changes in daily snapshot cron. Frontend: service worker + Push API subscription. |
| F5 | **Tier-change email notifications** for watchlist repos | `[BE]` | 1 day | Retention | Simpler than F4. Send email when watched repo changes tier. Use same email infra as digest. |
| F6 | **"Open Doors" activity feed** (24h tier upgrades) | `[FE]` ✅ | 1 day | Discovery | Frontend: API call to `daily_snapshots` for repos where tier improved in last 24h. Real-time feel, zero new backend. |
| F7 | **Shareable "first merge" confetti card** | `[FE]` | 1 day | 🌱 Viral acquisition | Frontend: full-screen celebration modal + copy-to-clipboard shareable text. Triggered by MON8. |
| F8 | **`/u/[github-username]` contributor profile** | `[BE+FE]` | 4 days | 🌱 Identity | Public page showing contribution history, language skills, repos contributed to. Shareable. "I contribute to S-tier repos" social proof. |
| F9 | **Community vibe reports** (emoji reactions per repo) | `[BE+FE]` 🔬 | 3 days | Engagement | Backend: `vibe_reports` table, 1 per user per repo. Frontend: emoji picker on repo detail. **Run as experiment** — measure if it drives return visits. |
| F10 | **Discord / Slack bot** | `[BE]` 🔬 | 4 days | Distribution | `/opendoor [repo]` → C-Rank card. Target: dev Discord servers. **Experiment** — measure install rate before investing more. |

---

## Bucket 7 — Infrastructure (do these to unblock scale)

| # | Item | Type | Effort | Dependency | Unlocks |
|---|---|---|---|---|---|
| I1 | **`comments(first:10)` fix** in `RepoPRsQuery` | `[BE]` ✅ | 30 min | — | 9× crawl throughput. Do this today. (Also listed as Q1 in Quick Wins.) |
| I2 | **Tiered crawl frequency** by tier (S=webhook, A=12h, B=24h, C=48h, D=7d) | `[BE]` | 2 days | — | ~60% API budget reduction. Frees capacity for new metric queries. |
| I3 | **GitHub App registration** (read-only scopes) | `[INFRA]` | 1 day | — | Prerequisite for I4 and the entire App installation flywheel. |
| I4 | **Installation token auth in `github/client.go`** | `[BE]` | 3 days | 🔒 I3 | Token rotation via Valkey. Partitioned crawl queue by installation. |
| I5 | **Webhook receiver** for `pull_request` and `issues` events | `[BE]` | 2 days | 🔒 I3 | S/A tier repos push events → trigger immediate rescore. Zero polling cost. |
| I6 | **"Install Opendoor App on your org" prompt at login** | `[FE]` | 1 day | 🔒 I3 | The user-growth flywheel for rate limits. Each install = +5k req/hour. |
| I7 | **GH Archive backfill** for historical snapshot data | `[BE]` 🔬 | 3 days | — | Use public BigQuery dataset to backfill 180-day PR windows. Zero API cost. Run as one-off experiment. |
| I8 | **Automated pipeline blog JSON export** (monthly) | `[BE]` | 1 day | — | Emits structured data for automated blog posts. Feeds P9 `/blog` with data-driven content. |

---

## Bucket 8 — Experiments (run for 2 weeks, measure before committing)

These have uncertain ROI. Ship minimal version, measure, then decide.

| # | Experiment | Hypothesis | Metric to measure | Min viable version |
|---|---|---|---|---|
| E1 | **Natural language search** ("find me a welcoming Rust CLI tool") | Reduces filter confusion for casual users, increases conversion to watchlist | Search-to-click-through rate vs. filter UI | LLM interprets query → translate to existing API params. No new backend. |
| E2 | **Community vibe reports** (emoji reactions) | Subjective data layer increases trust and return visits | D7 return rate for users who left a report vs. those who didn't | Simple `POST /api/v1/repos/:id/vibe` + emoji display on repo card. |
| E3 | **`/reports/2026` annual report** | Data-driven annual reports attract backlinks from tech media | Inbound links 30 days after publish | Static page generated from current DB aggregate. 3 days to build. |
| E4 | **PR Comment Sentiment Score** (maintainer tone badge) | Surfacing "Constructive / Neutral / Harsh" tone increases trust in the rating | CTR on repo detail pages with sentiment badge vs. without | AI classifies existing comment text. Badge on repo detail. A/B test badge vs. no badge. |
| E5 | **Discord bot** | Bot installs in dev servers drive new user signups | Signups attributable to bot referral in first 30 days | Slash command `/opendoor [repo]` → embed card. OAuth app install link in response. |

---

## Suggested Sprint Order (for one engineer)

```
Week 1 — Foundation
  Q1  comments(first:10) fix       [30 min, do Monday morning]
  Q2  generateMetadata on /repo    [2 hrs]
  Q3  generateMetadata on /rankings[1 hr]
  Q4  canonical tag audit          [2 hrs]
  Q6  Review Coverage metric       [2 hrs]
  Q7  Bot Activity Ratio           [2 hrs]
  Q8  Bus Factor                   [2 hrs]
  Q9  Page 1 anon gate             [2 hrs]
  Q10 Trending gate                [1 hr]
  S1  Dynamic sitemap.ts           [1 day]

Week 2 — SEO Surface
  S2  OG images /repo              [1 day]
  S6  /leaderboard                 [2 days]
  S7  /hall-of-fame                [1 day]
  S4  JSON-LD on repo pages        [1 day]

Week 3 — Flywheels
  F1  Badge SVG endpoint           [1 day]
  F2  Score history chart          [2 days]
  F3  Good First Issues widget     [2 days]

Week 4 — Monetisation Setup
  MON1 Stripe integration          [3 days]
  MON2 Pro gate middleware         [1 day]
  MON3 Contributor DNA profile     [4 days, bleeds into week 5]

Week 5-6 — Monetisation Delivery
  MON3 (finish)
  MON4 Weekly digest email         [4 days]
  MON6 PR Likelihood Score         [3 days]
  MON5 Blurred digest card         [1 day]

Week 7 — Newbie Track
  MON7 First-Merge Guarantee UI    [3 days]
  MON8 First merge detection       [2 days]
  F7  Shareable merge card         [1 day]

Week 8 — New Pages
  P1  /good-first-issue/[lang]     [2 days]
  P4  /contribute wizard           [3 days]

Week 9 — Infrastructure
  I2  Tiered crawl frequency       [2 days]
  I3  GitHub App registration      [1 day]
  I5  Webhook receiver             [2 days]

Week 10 — Experiments (pick 2, run for 2 weeks)
  E1  Natural language search      [3 days]
  E3  /reports/2026 annual report  [3 days]

Week 11-12 — Measure + Iterate
  Review experiment results
  Ship P2 /topics or P3 /compare based on SEO data
  M1  Issue triage speed metric    [2 days]
  M3  Docs quality score           [1 day]
```

---

## Dependency Graph

```
Q1 (comments fix)
  └─> unblocks M1, M4, I2 (all need budget headroom)

I3 (GitHub App)
  ├─> I4 (installation token auth)
  ├─> I5 (webhook receiver)
  └─> I6 (install prompt at login)

MON1 (Stripe)
  └─> MON2 (Pro gate)
        └─> MON3 (Contributor DNA)
              ├─> MON4 (weekly digest)
              ├─> MON5 (blurred card)
              ├─> MON6 (PR likelihood)
              └─> MON7 (first-merge track)
                    └─> MON8 (merge detection)
                          └─> F7 (shareable card)

F3 (good first issues widget)
  └─> feeds P1 (/good-first-issue/[lang] page)

S2 (OG images)
  └─> extend to S3 (rankings + topics OG)

M1 (issue triage query)
  └─> unlocks M2 (issue close rate — same query)
      └─> unlocks M8 (issue-to-PR conversion)
```

---

## Items Parked / Not Prioritised

These are valid ideas but either too early, too expensive, or need more data before commitment:

| Item | Reason parked |
|---|---|
| Fork-to-PR ratio | Requires paginating all forks. Too expensive relative to signal quality. |
| `/org/[org]` page | Needs topics indexing (P2) first to be meaningful. Revisit in Q2. |
| `/similar/[owner]/[name]` | Needs topics data. Depends on P2. Revisit after P2 ships. |
| PR sentiment in C-Rank weighting | Score accuracy unclear. Run E4 first to validate. |
| `/reports/[year]` recurring | Only worth doing if E3 (first one) gets backlinks. |
| Regional pages | No geo data. Indefinitely parked. |
| README quality score | Overlaps with M3 (docs quality). Dropped. |
| Monetising maintainer dashboard | Needs >500 maintainer users first. Revisit at 5k total users. |
