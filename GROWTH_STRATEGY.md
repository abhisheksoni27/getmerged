# Opendoor — Growth, Metrics & Engagement Strategy

> **Goal**: Make Opendoor the canonical, trusted destination for open-source contributors and OSS enthusiasts worldwide.

---

## 1. Current State Audit

### 1.1 Existing Pages (Sitemap)

| Route | Type | Purpose |
|---|---|---|
| `/` | SSR + Client | Home — hero, macro stats, filter grid, repo cards, leaderboard |
| `/repo/[owner]/[name]` | SSR + Client | Repo detail — C-Rank breakdown, AI vibe check, watchlist |
| `/rankings/[lang]` | SSR | Language-specific ranked list |
| `/status` | Static | System health / pipeline status |
| `/privacy` | Static | Privacy policy |
| `/terms` | Static | Terms of service |

### 1.2 Current C-Rank™ Metrics (9 weighted signals)

| Metric | Weight | What it measures |
|---|---|---|
| `external_pr_merge_rate` | 27.5% | % of external PRs merged (core signal) |
| `time_to_first_response_hours` | 15% | Median hours to first human comment |
| `last_activity_days` | 15% | Days since last merged external PR |
| `first_timer_success_rate` | 10% | % of first-timers who got merged |
| `time_to_merge_hours` | 10% | Median hours from open → merge |
| `repeat_contributor_rate` | 10% | % of contributors who come back |
| `review_rounds` | 5% | Median comments per merged PR (lower = better) |
| `distinct_maintainer_count` | 5% | # of distinct people reviewing PRs |
| `maintainer_responsiveness` | 2.5% | Mirrors response time |

**Staleness gate**: any repo with no merged external PR in 180 days → capped at D.

### 1.3 Current Filters

- Language (14 languages)
- Star bucket (500–1k to 50k+)
- Vibe tier (S / A / B / C)
- Merge rate threshold (>25% / >50% / >75%)
- First-timer success rate bucket
- Trending toggle (daily)

### 1.4 Current Macro Stats Displayed

- Total repos scored
- S-class count
- Languages covered
- Avg first review time

---

## 2. New Metrics to Add to C-Rank™

These extend the scoring model with signals that matter deeply to contributors.

### 2.1 Issue-to-PR Conversion Rate
> How often do "good first issue" / "help wanted" labels result in a merged PR?

- **Signal**: `(merged PRs linked to issues) / (total labelled issues)`
- **Why**: Repos that close labelled issues via real contributor PRs are demonstrably contributor-friendly.
- **Weight suggestion**: +5% (absorbed from `maintainer_responsiveness` which is redundant with response time).

### 2.2 PR Comment Sentiment Score
> Are maintainer comments constructive or toxic?

- **Signal**: Run lightweight sentiment classification (positive/neutral/negative) on maintainer-authored comments using the existing AI pipeline.
- **Display**: "Maintainer Tone: Constructive / Neutral / Harsh" badge on repo detail.
- **Why**: The biggest unspoken fear for first-timers is hostile review culture. Making this visible is a massive trust differentiator.

### 2.3 Time to First Triage (Issue Triage Speed)
> How fast does the first maintainer label/comment an issue?

- **Signal**: `median(first_label_or_comment_at - issue_created_at)` in hours.
- **Why**: Contributors open issues before PRs. Fast triage = active repo.

### 2.4 Contributor Graduation Rate
> Do one-time contributors become repeat contributors?

- **Signal**: `(contributors with 2+ PRs) / (total contributors)` — already partially tracked as `repeat_contributor_rate`, but framed as "graduation" for UI storytelling.
- **New twist**: Track cohort graduation over 30 / 90 / 180 days to show trend direction (improving / declining).

### 2.5 Docs & Onboarding Quality Score
> Does the repo have CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue templates?

- **Signal**: Boolean flags per file, combined into a 0–100 "onboarding score".
- **Why**: Repos with good docs get better contributions. Checkable via GitHub Contents API (no extra rate-limit cost).

### 2.6 PR Rejection Reason Classification
> Why do PRs get closed without merge?

- **Signal**: Classify closed (not merged) external PRs into: `abandoned`, `maintainer_closed`, `superseded`, `duplicate`.
- **Why**: "Maintainer-closed" is very different from "contributor abandoned". Surfacing this makes the merge rate metric far more nuanced.

### 2.7 Weekly Activity Score (Trending Velocity)
> Is the repo getting *more* contributor-friendly over time, or stagnating?

- **Signal**: 4-week rolling comparison of `merge_rate` and `response_time`. Compute week-over-week delta.
- **Display**: ↑↓ trend arrows on repo cards and detail pages.
- **Why**: A B-tier repo trending toward A is more valuable than a stagnant A-tier.

---

## 3. New Pages for SEO & Discovery

These are high-intent, long-tail SEO pages with durable organic value.

### 3.1 `/contribute` — Contributor Start Page
> "Your first open-source contribution, guaranteed."

- Wizard: Pick language → experience level (beginner / intermediate / advanced) → available time → get 5 curated repos.
- SSR-rendered with language+level combos for SEO: "best Python repos for beginners 2026".
- **Target keyword cluster**: "best repos to contribute to", "good first issue [language]".

### 3.2 `/leaderboard` — Global All-Language Leaderboard
> Full ranked table of all repos, sortable by any metric.

- Columns: Rank, Repo, Tier, Merge Rate, Response Time, Stars, First-Timer %, Trend.
- Shareable deep links: `/leaderboard?sort=merge_rate&lang=rust`.
- **Target keyword**: "best open source repos to contribute to", "top GitHub repos for contributors".

### 3.3 `/compare/[repo-a]/[repo-b]` — Side-by-Side Repo Comparison
> "Should I contribute to vercel/next.js or facebook/react?"

- All C-Rank metrics compared visually via radar chart + winner callout per metric.
- Shareable URL. Virality vector: Twitter, Discord, Reddit.
- **SEO**: long-tail brand+brand comparison queries.

### 3.4 `/digest` — Weekly OSS Contributor Digest
> "This week in open-source: repos that opened up, repos that went cold."

- Static-generated every Monday: 5 biggest tier changes (up or down), trending new repos, community stats.
- Email subscription (Resend / Mailgun).
- **SEO**: Fresh weekly content Google crawls. Backlink magnet.

### 3.5 `/topics/[topic]` — Topic / Domain Pages
> `/topics/ai-tools`, `/topics/cli-tools`, `/topics/databases`, `/topics/devtools`

- Group repos by GitHub topics/tags, not just language.
- "Best AI tool repos to contribute to in 2026" — massive SEO surface area.
- Backend: index GitHub `repositoryTopics` from GraphQL response (already in the API schema).

### 3.6 `/hall-of-fame` — S-Tier Hall of Fame
> "The repositories that have earned the highest trust from the open-source community."

- Static showcase of all S-tier repos. Monthly "Hall of Famer" spotlight rotation.
- **Badge embeds**: `[![Opendoor S-Tier](https://opendoor.abhishekco.de/badge/vercel/next.js.svg)](...)` — repo maintainers embed in README → backlinks.

### 3.7 `/maintainers` — Maintainer Dashboard (Auth Gate)
> "You maintain an OSS repo. Here's how contributors see you."

- Login with GitHub → see your repos' C-Rank scores, response time trends, contributor sentiment.
- Actionable nudges: "You haven't responded to 3 open PRs in >14 days."
- Monetisation path: Pro tier for detailed analytics + alerts.

### 3.8 `/org/[org]` — Organisation Page
> `/org/vercel`, `/org/facebook`, `/org/hashicorp`

- All repos from an org, aggregated C-Rank, top contributors, total PRs processed.
- "Is this company's OSS program welcoming?" — B2B recruiting angle.
- **SEO**: `"[org] open source contribution"` high-intent queries.

### 3.9 `/blog` — Technical Blog
> Content marketing to own the "how to contribute to open source" keyword cluster.

Recommended seed posts:
- "We scored 5,000 GitHub repos. Here's what separates S-tier from D-tier."
- "The hidden metric killing your open-source contributions."
- "How to pick your first open-source project (data-driven)."

MDX posts with `schema.org/Article` JSON-LD markup.

### 3.10 `/api/public` — Public API Docs Page
> Expose C-Rank scores as a public API (rate-limited, free tier).

- Surface existing Swagger UI at a user-facing URL.
- Enables 3rd-party integrations: VS Code extensions, GitHub Actions, CLI tools.
- **Moat**: Becomes infrastructure for the OSS ecosystem.

---

## 4. Engagement Features

### 4.1 Opendoor Badge (README Embeds)
> Dynamic SVG badge for repo READMEs showing live C-Rank tier.

```
GET /badge/[owner]/[repo].svg  →  SVG image (Shields.io style)
```

- Organic distribution: every README embed is a backlink + discovery vector.
- Cached at CDN. Pulls live tier from API.

### 4.2 Contributor Profile Page (`/u/[github-username]`)
> "Your open-source contribution fingerprint."

- Show: repos contributed to, favourite languages, avg C-Rank of your repos, first-timer → repeat journey.
- Shareable: "I contribute to repos that are S-tier on Opendoor."

### 4.3 "PR Readiness Checklist" Upgrade
> Repo-specific AI checklist for submitting a PR that gets merged.

- `AIInsights.pr_guidelines[]` already exists. Surface more prominently.
- Add: "Copy to clipboard" button, downloadable `.md` checklist, link to CONTRIBUTING.md.

### 4.4 Tier Change Notifications (Push + Email)
> "kubernetes/kubernetes just moved from B → A tier."

- Extend existing watchlist with Web Push API (service worker).
- Weekly email digest of watchlist repos' tier changes.
- Retention flywheel: users return to check tier movements.

### 4.5 "Open Doors" Feed (Activity Stream)
> Real-time feed of repos that just became more welcoming.

- Show last 24h tier upgrades (D→C, C→B, B→A, A→S).
- "Repos that just opened their doors" — discovery + urgency framing.
- Twitter/X auto-post bot: tweet when a notable repo hits S-tier.

### 4.6 Community Vibe Reports
> Subjective data layer on top of objective C-Rank.

- Logged-in users submit one experience report per repo: 🟢 Great / 🟡 Mixed / 🔴 Difficult.
- Show community vibe alongside C-Rank: "Community says: mostly positive."
- Guards: 1 vote per user per repo, GitHub auth required, abuse flagging.

### 4.7 "Good First Issues" Widget (Per Repo)
> Pull live `good-first-issue` labelled open issues from GitHub API.

- Show top 5 on repo detail: title, age, comment count, deeplink to GitHub.
- Closes the loop: user finds repo → S-tier confirmed → specific issue to start with. Zero friction.

### 4.8 Natural Language Search
> "Find me a welcoming Rust CLI tool with under 5k stars"

- Parse intent with LLM → translate to existing `/api/v1/repos` filter params.
- Single search bar replaces multi-filter UI for casual users.

### 4.9 Score History Graph (Per Repo)
> How has a repo's C-Rank changed over 12 months?

- Backend already stores periodic snapshots. Surface as a line chart on repo detail page.
- "Consistently improving for 6 months" = highest trust signal.

### 4.10 Discord / Slack Bot
> `/opendoor vercel/next.js` → returns C-Rank card in Discord.

- Free OAuth app. Target: developer Discord servers, OSS Slack workspaces.
- Distribution without ad spend.

---

## 5. SEO Technical Improvements

| Item | Current State | Action |
|---|---|---|
| `sitemap.xml` | Nginx binary | Add dynamic Next.js `sitemap.ts` covering `/repo`, `/topics`, `/org` |
| Structured data | None | Add `schema.org/SoftwareApplication`, `Dataset`, `Article` JSON-LD |
| OpenGraph images | Static | Dynamic OG images via Next.js `ImageResponse` per repo/language page |
| Canonical URLs | Need audit | Ensure filter-variant pages have canonical pointing to clean URL |
| Internal linking | Weak | Rankings → Repo → Compare → Topics → Blog cross-linking |
| Core Web Vitals | SSR + Valkey cache | Already strong — maintain for new pages |

---

## 6. Monetisation Paths (Non-Intrusive)

| Tier | Features | Price Signal |
|---|---|---|
| Free | Everything current + all new public pages | $0 |
| Pro (individual) | Score history graph, email digest, PR readiness PDF export | ~$5/mo |
| Pro (maintainer) | Maintainer dashboard, response time alerts, contributor funnel analytics | ~$19/mo |
| API (team) | Higher rate limits, webhook on tier change | ~$49/mo |

---

## 7. Priority Execution Order

```
Phase 1 — Quick Wins (2 weeks)
├── Badge SVG endpoint (/badge/[owner]/[repo].svg)
├── Score history graph on repo detail page
├── Good First Issues widget on repo detail
├── /leaderboard full sortable page
└── Dynamic OG images via ImageResponse

Phase 2 — SEO Content (4 weeks)
├── /contribute contributor wizard
├── /topics/[topic] pages (index GitHub topics)
├── /hall-of-fame S-tier showcase
├── /compare/[repo-a]/[repo-b]
└── schema.org JSON-LD on all pages

Phase 3 — Engagement Loop (6 weeks)
├── Tier change push notifications (Web Push)
├── Community vibe reports
├── /digest weekly email page + subscription
├── Natural language search
└── /org/[org] organisation pages

Phase 4 — Platform (8 weeks)
├── /u/[username] contributor profile
├── /maintainers dashboard (auth gated)
├── /api/public docs page
├── Discord/Slack bot
└── Pro subscription tier
```

---

## 8. North Star Metrics

| Metric | Target (6 months) |
|---|---|
| Organic search sessions | 10,000 / month |
| README badge embeds | 500 repos |
| Registered users (watchlist) | 2,000 |
| Weekly digest subscribers | 1,000 |
| Repos scored | 10,000 |
| D30 retention | >25% |
