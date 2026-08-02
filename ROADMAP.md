# Opendoor — Actionable Roadmap

> Weeks 1–3 are **done**. Everything below is from Week 4 onward.
> Principle: launch fast, ship in pieces, baby steps compound.

---

## Legend

| Symbol | Meaning |
|---|---|
| `[BE]` | Backend (Go / gin) |
| `[FE]` | Frontend (Next.js / Tailwind) |
| `[BE+FE]` | Full-stack |
| `[AI]` | Local inference (Python / HuggingFace) |
| `[INFRA]` | Infrastructure / config |
| ✅ | No dependencies, start today |
| 🔒 | Blocked (noted inline) |
| 💰 | Direct revenue |
| 🌱 | Flywheel / compounding |
| 🔬 | Experiment — measure before investing more |

---

## Weeks 1–3 — DONE ✅

- Q1–Q10 quick wins (comments fix, anon gates, metadata)
- S1–S4 SEO surface (sitemap, OG images, JSON-LD, leaderboard, hall-of-fame)
- F1–F3 flywheels (badge SVG, score history chart, good first issues widget)

---

## Week 4 — Monetisation Foundation

Ship revenue before anything else. RevenueCat handles all subscription state; the backend just trusts its webhook.

### MON1 — RevenueCat Integration `[BE+FE]` · 3 days · 💰

RevenueCat works cross-platform (web via REST API) and is India-friendly (supports Razorpay, UPI via payment gateway layer or direct IAP on mobile).

**Backend (Go)**
```
POST /api/v1/webhooks/revenuecat   ← RevenueCat sends SUBSCRIBER_ALIAS events
```
- Parse `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION` event types.
- Set `is_pro = true/false` on the `users` table from webhook payload.
- Store `rc_customer_id`, `subscription_expires_at` on user row.
- No payment logic in our code. RevenueCat owns the state machine.

**Frontend (Next.js)**
- Integrate `@revenuecat/purchases-js` SDK (RevenueCat Web SDK).
- `/pricing` page: two tiers (Free / Pro), "Subscribe" button triggers RC checkout.
- RC handles payment page, receipts, renewals — we just read entitlements.

**Why not Stripe**: Stripe requires Indian entity registration + RBI compliance for recurring billing. RevenueCat abstracts this entirely.

---

### MON2 — Pro Gate Middleware `[BE]` · 1 day · 🔒 MON1

Gin middleware: read `is_pro` + `subscription_expires_at` from DB (cached in Valkey).
Return `402` with `{ "upgrade_url": "/pricing" }` for non-pro requests to gated endpoints.

---

### MON3 — Contributor DNA Profile `[BE+AI]` · 4 days · 🔒 MON2

Query user's public GitHub PRs + repos via their OAuth token.
Run local classifier (see **AI Sidecar** section below) to extract:
- Primary languages
- Contribution style (docs vs. code vs. reviews)
- Comfort zone (issue size, project maturity)

Store in `contributor_profiles` table. Refresh weekly via cron.
This is the data layer that powers MON4, MON5, MON6, MON7.

---

## Week 5 — Monetisation Delivery

### MON4 — Weekly Personalised Digest Email `[BE+AI]` · 3 days · 🔒 MON3

Sunday night cron: for each Pro user → run recommendation query against `contributor_profiles` → format email → send via Resend.

### MON5 — Blurred Digest Card `[FE]` · 1 day · 🔒 MON3

Home page: blurred locked card for free users. Copy: *"5 repos matched to your Go profile — unlock with Pro"*.

### MON6 — PR Likelihood Score `[BE+FE]` · 3 days · 🔒 MON3

Formula-based score: user profile vector × repo metrics. Show on repo detail for Pro users; teaser (range only) for free.

---

## Week 6 — Contributor Badges (Viral + Identity)

High-leverage flywheel: every badge embedded in a README = a backlink + discovery.

### BADGE1 — OSS Contributor Rank Badge `[BE+FE]` · 2 days · 🌱

A public, shareable badge scoring a GitHub user's OSS contribution *quality* — not quantity.

**Score inputs** (derived from public data, no OAuth needed to view):
- % of PRs merged across all contributed repos
- Median C-Rank of repos they contributed to (S-tier repos = higher score)
- Response quality: did maintainers acknowledge their PRs quickly?
- Diversity: languages, orgs, repo sizes

**Grades**: `OSS Contributor: S / A / B / C / D` (mirrors C-Rank vocabulary)

**Endpoints**:
```
GET /badge/contributor/[github-username].svg   ← shields.io-style, CDN-cached 24h
GET /u/[github-username]                       ← full public profile page
```

**Embed in README**:
```markdown
![OSS Contributor Rank](https://opendoor.dev/badge/contributor/yourusername.svg)
```

Every contributor pastes this in their README → organic distribution + backlinks.

---

### BADGE2 — Contributor Profile Page `/u/[github-username]` `[BE+FE]` · 2 days · 🔒 BADGE1

Public page, no login required to view anyone's profile.

Shows:
- Contributor grade + sub-scores
- Languages they excel in
- Top repos they've contributed to (with C-Rank)
- "Share your profile" button → copy embed code
- **"Add to your README"** CTA with one-click copy

Social proof layer: *"I contribute to S-tier repos"* is a flex people will share.

---

### BADGE3 — Contributor Grade on Dashboard `[FE]` · 0.5 day · 🔒 BADGE1

Surface contributor's own grade on their logged-in dashboard. Gamification hook.

---

## Week 7 — Compare & Discovery Pages

High SEO value. Zero new backend required for most.

### P3 — `/compare/[repo-a]/[repo-b]` `[FE]` · 2 days · ✅

Frontend only. Fetch both repos from existing API.

- Radar chart: merge rate, response time, bus factor, release cadence, docs score
- Metric diff table: green/red delta for each C-Rank input
- SEO title: *"[repo-a] vs [repo-b] — beginner friendliness comparison"*
- Shareable URL + copy link button
- Compare CTA on repo detail pages: *"Compare with another repo →"*

---

### P1 — `/good-first-issue/[lang]` `[BE+FE]` · 2 days · ✅

Backend: new query filtering open issues by `good-first-issue` label + language.
Frontend: ISR, refresh every 6h. Targets *"good first issue [language]"* keyword cluster.

---

### P4 — `/contribute` wizard `[FE]` · 2 days · ✅

SSR wizard: pick language + experience level → filtered API call → 5 curated repos.
No new backend. Targets *"best [language] repos for beginners"*.

---

### P9 — `/blog` seed posts `[FE]` · 2 days · ✅

3 MDX posts + Article schema:
- *"How to get your first open source PR merged"*
- *"Best repos for first-time contributors in 2026"*
- *"What is a good merge rate for open source projects?"*

---

## Week 8 — Newbie Track + Retention

### MON7 — First-Merge Guarantee UI `[FE]` · 2 days · 🔒 MON3

Dedicated flow for `is_newbie: true` users. 5 curated repos + contribution checklist.

### MON8 — First Merge Detection + Celebration `[BE+FE]` · 2 days · 🔒 MON7

Backend: poll GitHub for PR merge status on repos the newbie is watching.
Frontend: confetti modal + shareable card. Copy: *"I got my first open source PR merged!"*

### F7 — Shareable First-Merge Card `[FE]` · 1 day · 🔒 MON8

Full-screen celebration + copy-to-clipboard. Virality hook.

---

## Week 9 — AI Sidecar (Local Classifier)

Python microservice running alongside Go backend. No external LLM costs. No OpenAI latency dependency.

### AI1 — Python Classifier Sidecar `[AI+INFRA]` · 3 days · ✅

**Stack**: FastAPI + HuggingFace `transformers` + `sentence-transformers`

**Models** (all CPU-only, run on a $10/mo VPS):

| Model | Task | HF identifier |
|---|---|---|
| `all-MiniLM-L6-v2` | Semantic similarity (find similar repos by description) | `sentence-transformers/all-MiniLM-L6-v2` |
| `distilbert-sst-2` | Sentiment (maintainer tone: positive/negative) | `distilbert-base-uncased-finetuned-sst-2-english` |
| `twitter-roberta-emotion` | Emotion classification (welcoming / harsh / neutral) | `cardiffnlp/twitter-roberta-base-emotion` |

**Internal endpoints** (Go calls these over localhost):
```
POST /classify/sentiment   { "text": "..." }  → { "label": "POSITIVE", "score": 0.94 }
POST /classify/emotion     { "text": "..." }  → { "label": "joy", "score": 0.87 }
POST /embed                { "text": "..." }  → { "vector": [...384 floats...] }
```

Deployed as Docker sidecar. No network exposure.

---

### AI2 — PR Comment Sentiment Score `[BE+AI]` · 2 days · 🔒 AI1

Classify existing PR comment text from `CommentAuthors` data.
Produce `maintainer_tone`: `welcoming / neutral / harsh`.
Show as badge on repo detail pages. A/B test CTR impact.
Replaces the external LLM call in `ai_client.go` for sentiment tasks.

---

### AI3 — Semantic Similar Repos `/similar/[owner]/[name]` `[BE+AI]` · 2 days · 🔒 AI1

Use `embed` endpoint to get repo description vectors.
Store in `repo_embeddings` table (JSON column).
Cosine similarity at query time → top 5 matches.
No pgvector needed for <50k repos — in-process sort is fine.

---

### AI4 — Contributor DNA Enrichment `[BE+AI]` · 1 day · 🔒 AI1, MON3

Run PR titles + descriptions through emotion classifier.
Classify contributor style: *"Does this person write clear, welcoming PRs?"*
Feed into BADGE1 contributor grade scoring.

---

## Week 10 — Infrastructure (Scale Unblocking)

### I2 — Tiered Crawl Frequency `[BE]` · 2 days · ✅

S-tier: 12h, A: 24h, B: 48h, C/D: 7 days.
~60% API budget reduction. Frees capacity for new metric queries.

### I7 — GH Archive Backfill `[BE]` 🔬 · 2 days · ✅

Use public BigQuery GH Archive data to backfill 180-day PR windows.
Zero GitHub API cost. Run as one-off. Validates historical scoring.

### I8 — Automated Blog JSON Export `[BE]` · 1 day · ✅

Monthly cron emitting structured data for automated blog posts. Feeds `/blog`.

---

## Week 11 — New Metrics

### M1 — Issue Triage Speed `[BE]` · 2 days · ✅

`median hours to first maintainer response on issues`. New `issues` GraphQL query. ~2 points/repo.

### M2 — Issue Close Rate `[BE]` · 0.5 day · 🔒 M1

Derive from same M1 query. Add close count. Free.

### M3 — Docs & Onboarding Quality Score `[BE]` · 1 day · ✅

Check `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates. 3 REST calls/repo. Boolean → 0–100.

### M4 — Release Cadence `[BE]` · 1 day · ✅

Median days between releases. New `releases(first:50)` GraphQL query.

### M5 — PR Rejection Reason Classification `[BE+AI]` · 1 day · 🔒 AI1

Classify closed-not-merged PRs: `abandoned`, `maintainer_closed`, `superseded`.
Use local classifier. Cached per PR.

---

## Week 12 — Experiments (run 2 weeks, measure)

| # | Experiment | Hypothesis | Measure |
|---|---|---|---|
| E1 | **Natural language search** ("find a welcoming Rust CLI tool") | Reduces filter confusion, increases watchlist conversion | Search-to-click rate vs. filter UI |
| E2 | **Community vibe reports** (emoji reactions per repo) | Subjective layer increases trust + return visits | D7 return rate: reporters vs. non-reporters |
| E3 | `/reports/2026` annual OSS state | Data reports attract backlinks from tech media | Inbound links 30 days post-publish |

---

## Sprint Order Summary (Week 4 onward)

```
Week 4  — Monetisation Foundation
  MON1  RevenueCat integration          [3 days]
  MON2  Pro gate middleware             [1 day]
  MON3  Contributor DNA profile         [4 days, bleeds into week 5]

Week 5  — Monetisation Delivery
  MON3  (finish)
  MON4  Weekly digest email             [3 days]
  MON5  Blurred digest card             [1 day]
  MON6  PR Likelihood Score             [3 days]

Week 6  — Contributor Badges
  BADGE1  Contributor rank badge SVG    [2 days]
  BADGE2  /u/[username] profile page    [2 days]
  BADGE3  Grade on dashboard            [0.5 day]

Week 7  — Compare & Discovery Pages
  P3    /compare/[a]/[b]               [2 days]
  P1    /good-first-issue/[lang]       [2 days]
  P4    /contribute wizard             [2 days]
  P9    /blog seed posts               [2 days]

Week 8  — Newbie Track
  MON7  First-Merge Guarantee UI       [2 days]
  MON8  First merge detection          [2 days]
  F7    Shareable merge card           [1 day]

Week 9  — AI Sidecar
  AI1   Python classifier sidecar      [3 days]
  AI2   PR comment sentiment score     [2 days]
  AI3   Semantic similar repos         [2 days]
  AI4   Contributor DNA enrichment     [1 day]

Week 10 — Infrastructure
  I2    Tiered crawl frequency         [2 days]
  I7    GH Archive backfill            [2 days]
  I8    Blog JSON export               [1 day]

Week 11 — New Metrics
  M1    Issue triage speed             [2 days]
  M2    Issue close rate               [0.5 day]
  M3    Docs quality score             [1 day]
  M4    Release cadence                [1 day]
  M5    PR rejection classifier        [1 day]

Week 12 — Experiments (pick 2, run 2 weeks)
  E1    Natural language search        [3 days]
  E3    /reports/2026 annual report    [3 days]
```

---

## Dependency Graph

```
MON1 (RevenueCat)
  └─> MON2 (Pro gate)
        └─> MON3 (Contributor DNA)
              ├─> MON4 (weekly digest)
              ├─> MON5 (blurred card)
              ├─> MON6 (PR likelihood)
              └─> MON7 (first-merge track)
                    └─> MON8 (merge detection)
                          └─> F7 (shareable card)

BADGE1 (contributor rank badge)
  ├─> BADGE2 (/u/profile page)
  ├─> BADGE3 (grade on dashboard)
  └─> AI4 (enriched by local classifier)

AI1 (Python sidecar)
  ├─> AI2 (PR sentiment)
  ├─> AI3 (similar repos)
  ├─> AI4 (contributor DNA enrichment)
  └─> M5 (PR rejection classifier)

F3 (good first issues widget) [done week 3]
  └─> feeds P1 (/good-first-issue/[lang])

M1 (issue triage)
  └─> M2 (issue close rate — same query)
```

---

## Parked / Not Doing

| Item | Reason |
|---|---|
| GitHub App registration | Removed. Complexity not justified at current scale. Revisit at 10k+ repos if webhook push is needed. |
| Stripe | India-unfriendly for recurring billing. Replaced by RevenueCat. |
| External LLM for sentiment | Replaced by local HuggingFace sidecar. Cheaper, faster, offline. |
| Installation token auth | Removed with GitHub App. |
| Webhook receiver (GitHub App) | Removed with GitHub App. |
| Fork-to-PR ratio | Too expensive to paginate all forks vs. signal quality gained. |
| `/org/[org]` page | Needs topics indexing (P2) first. Revisit after P2. |
| PR sentiment in C-Rank weighting | Accuracy unclear. Run AI2 experiment first. |
| `/reports/[year]` recurring | Only if E3 gets backlinks. |
| Regional pages | No geo data. Parked indefinitely. |
| Monetising maintainer dashboard | Needs >500 maintainer users. Revisit at 5k total users. |
