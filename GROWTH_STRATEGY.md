# Opendoor — Growth, Metrics & Engagement Strategy

> **Goal**: Make Opendoor the canonical, trusted destination for open-source contributors and OSS enthusiasts worldwide.

> **Note on sources**: This document synthesises analysis from two independent AI reviews of the codebase.
> Items marked **[+]** were added from the second review after deduplication.
> Items from the second review that were rejected: `/rankings/[lang]/[region]` (requires geo data we don't have), `README quality score` (overlaps with docs quality score 2.5, marginal signal), `issue_to_pr_ratio` as defined is noisy (high ratio could mean "lots of demand" OR "maintainers ignore issues" — directionally ambiguous without normalisation).

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

- **Signal**: Lightweight sentiment classification (positive/neutral/negative) on maintainer-authored comments via the existing AI pipeline.
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

### 2.8 Bus Factor (Active Maintainer Count)
> How many distinct maintainers merged or reviewed PRs in the last 90 days?

- **Signal**: `count(distinct reviewer logins with merge/approve actions in last 90d)`
- **Why**: A repo with 1 active maintainer is fragile — that person going quiet kills the project. Surface as "Bus Factor: 1" warning on repo detail.
- **Scoring impact**: Factor into `distinct_maintainer_count` weight or add as a hard penalty gate (bus factor = 1 → max tier B).

### 2.9 Review Coverage
> What % of external PRs received at least one review comment before merge/close?

- **Signal**: `(PRs with ≥1 non-author comment) / (total external PRs)`
- **Why**: Blind merges (no review) and silent closes (no feedback) are both red flags. Low review coverage = maintainers not engaging.

### 2.10 Bot Activity Ratio
> What fraction of PR comments are from bots vs. humans?

- **Signal**: `(bot-authored comments) / (total PR comments)` — bots already detected via `isBot()` in `scoring/metrics.go`.
- **Why**: >40% bot comments signals a heavy CI/CD gatekeeping culture that intimidates newcomers (flaky CI, automated rejections). Already have the bot detection logic — cheap to expose.

### 2.11 Fork-to-PR Ratio
> Of all repo forks, what fraction resulted in at least one PR back to the parent?

- **Signal**: `(forks with at least 1 PR to parent) / (total forks)`
- **Why**: Novel signal — distinguishes "copy for personal use" forks from "contributing" forks. A repo with 10k forks and 2% fork-to-PR ratio is very different from one with 200 forks and 30%.

### 2.12 Release Cadence
> How regularly does the repo ship releases?

- **Signal**: Median days between GitHub releases over last 12 months.
- **Why**: Active shipping culture correlates with active maintainership. Repos that haven't released in 6 months are often stagnating even if PRs are being merged.

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

### 3.11 `/good-first-issue/[lang]` — Good First Issue Finder
> "Show me beginner-friendly issues in Rust right now."

- Dedicated SSR page per language surfacing open `good-first-issue` labelled issues across all scored repos.
- **Target keyword**: `"good first issue [language]"` — extremely high-intent, near-zero competition on non-GitHub domains.
- Refresh via cron every 6 hours. Deeplinks directly to GitHub issue.
- **Why this is different from the `/contribute` wizard**: That page curates repos. This page curates *specific open issues* — much lower friction, one click to start.

### 3.12 `/similar/[owner]/[name]` — Similar Repos
> "Projects like vercel/next.js that are more welcoming."

- Given a repo, find the 5 most similar repos (same language + topic overlap) sorted by C-Rank.
- Similarity engine: cosine similarity on GitHub topic vectors (cheap, no ML needed).
- **SEO**: "projects like [repo]" is a real search pattern. Also surfaces naturally when a repo has a D-tier and we suggest alternatives.

### 3.13 `/reports/[year]/[topic]` — State of OSS Annual Report
> "State of Open Source Contribution 2026"

- Annual static page: aggregate stats, tier distribution shifts YoY, most-improved repos, community milestones.
- **Why**: Durable backlink magnet — tech media, newsletters, and universities link to annual reports. HackerNews-friendly format.
- Seed topics: `state-of-open-source-2026`, `most-welcoming-languages-2026`, `beginner-friendly-oss-2026`.

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

---

## 9. Crawling Cost Analysis — New Metrics Impact

> Based on exact reading of `github/queries.go` and `github/client.go`.

### 9.1 Current Cost Per Repo Snapshot

GitHub GraphQL pricing formula: `ceil(sum of all first: N values across connections / 100)`, minimum 1 point.

**Current `RepoPRsQuery`** (100 PRs × 100 comments each):
```
pullRequests(first: 100)  → 100 nodes
  comments(first: 100)   → 100 × 100 = 10,000 nested nodes
Total connection nodes:   10,100
Cost per page:            ceil(10,100 / 100) = 102 points
```

**Current `RepoStalenessQuery`** (10 PRs, no nesting):
```
pullRequests(last: 10)    → 10 nodes
Cost:                     ceil(10 / 100) = 1 point
```

A typical active repo with 180-day window = ~1–3 PR pages:
- **Best case** (1 page): 102 + 1 = **103 points/repo**
- **Avg case** (2 pages): 204 + 1 = **205 points/repo**
- **Worst case** (3 pages): 306 + 1 = **307 points/repo**

With 5,000 points/hour budget:
- Best case throughput: **~48 repos/hour**
- Avg case throughput: **~24 repos/hour**

> Note: The current `comments(first: 100)` per PR is very expensive. If the median PR has 3 comments, you're paying for 97 ghost nodes per PR. **Dropping to `comments(first: 10)` cuts the query cost by 90% with no real data loss for most repos** — this is the single biggest quick win available.

### 9.2 New Metrics — Additional Cost

| Metric | New Query Needed | Node Cost | Points Added |
|---|---|---|---|
| Issue Triage Speed + Close Rate | `issues(first: 100)` with 1 comment each | 100 + 100 = 200 | +2 |
| Issue-to-PR Conversion | Extend issue query with `labels(first: 5)` | +500 | +5 |
| Docs & Onboarding Quality | REST: 3 GET requests for file existence | 0 GraphQL | 3 REST |
| Release Cadence | `releases(first: 50)` | 50 | +1 |
| Review Coverage | 0 — derive from existing `comments.totalCount` | 0 | 0 |
| Bot Activity Ratio | 0 — `isBot()` already runs in client.go | 0 | 0 |
| Bus Factor | 0 — derive from existing `CommentAuthors` per PR | 0 | 0 |
| Fork-to-PR Ratio | ❌ Skip — requires paginating all forks, impractical | — | — |
| PR Sentiment Score | 0 GitHub API — LLM inference on existing comment text | 0 | 0 |

**Total additional GraphQL points per repo**: ~8 points (one new issues page + releases)
**Total additional REST calls per repo**: 3

### 9.3 Net Impact

| Scenario | Current | With New Metrics | Delta |
|---|---|---|---|
| Points per repo (avg) | 205 | ~215 | **+5%** |
| Repos/hour @ 5k budget | ~24 | ~23 | negligible |

**The new metrics add ~5% overhead.** This is not the bottleneck.

### 9.4 The Real Bottleneck — And How to Fix It

The `comments(first: 100)` per PR costs **10,000 nodes per page** when most PRs have <5 comments. This is 90%+ wasted capacity.

**Fix**: Change `comments(first: 100)` → `comments(first: 10)` in `RepoPRsQuery`.

```
Before: 100 PRs × 100 comments = 10,100 nodes → 102 points/page
After:  100 PRs × 10 comments  = 1,100 nodes  → 11 points/page
```

This single change yields **~9× throughput improvement**:
- Avg case: 22 points/repo instead of 205
- Repos/hour: **~227 repos/hour** vs current ~24

With this fix + new metrics: ~230 points/repo → still **~217 repos/hour**, a massive net win.

---

## 10. GitHub Rate Limit Scaling

### 10.1 Token Crowdsourcing — Verdict: ❌ ToS Violation

Direct quote from GitHub's Acceptable Use Policy:
> **"You may not share API tokens to exceed GitHub's rate limitations."**

Using logged-in user OAuth tokens to pool rate limits is explicitly prohibited and risks:
- OAuth app revocation
- Account suspensions for participating users
- Platform-wide block

This is not debatable. Don't do it.

### 10.2 What Others Have Done

| Project | Approach | Result |
|---|---|---|
| Renovate / Mend | GitHub App, one installation per org | Scales linearly with installations |
| Dependabot | GitHub-owned, elevated internal limits | Not replicable |
| Libraries.io | Their own service accounts (multiple PATs) | Gray area, manageable at small scale |
| CodeClimate | Per-user token for user-scoped calls only | Compliant |
| Mergify | GitHub App per org installation | Clean, scalable |

### 10.3 The Right Approach: GitHub App + Installation Tokens

GitHub Apps have a fundamentally different rate limit model:

```
Base rate:    5,000 req/hour per installation
Scaling rule: +50 req/hour per repository in the org (after 20 repos)
              +50 req/hour per user in the org (after 20 users)
Enterprise:   15,000 req/hour per installation
Cap:          12,500 req/hour for non-Enterprise installations
```

**How this solves the problem naturally:**

When a user installs the Opendoor GitHub App on their profile/org, you get a fresh 5,000 req/hour installation token *for that installation*. Each installation is independent.

The flywheel:
1. User logs in → prompted to install the GitHub App on their org
2. You gain 5,000+ req/hour for their namespace
3. With 100 installations → 500,000 req/hour theoretical capacity
4. Rate limits for each installation are scoped to that installation's context

**This is exactly what the user proposed, but done legally through GitHub's intended mechanism.**

### 10.4 Migration Plan: PAT → GitHub App

**Step 1**: Register Opendoor as a GitHub App (not just OAuth App)
- Request scopes: `pull_requests: read`, `issues: read`, `contents: read`, `metadata: read`
- All read-only. No write access needed.

**Step 2**: Update `github/client.go` to support installation token auth
```go
// Instead of:
// Bearer {PAT}

// Use:
// Bearer {installation_access_token}  // rotated hourly via JWT
```

**Step 3**: Token rotation middleware
- Cache installation tokens in Valkey (they expire in 1 hour)
- Key: `github:token:install:{installation_id}`
- On expiry: re-fetch via `POST /app/installations/{id}/access_tokens` using app JWT

**Step 4**: Partition the crawl queue by installation
- Repos owned by org A → use org A's installation token
- Repos owned by org B → use org B's installation token
- Falls back to the service account PAT for repos with no installation

**Step 5**: Prompt installation at login
- After GitHub OAuth, show: "Install Opendoor on your org to contribute rate limits to faster repo scoring"
- Framing: community benefit, fully transparent, entirely legal

### 10.5 Supplemental Strategies

**Webhooks (eliminate polling for active repos)**

GitHub webhooks for `pull_request` and `issues` events cost **zero rate limit points**.

For repos that have installed the GitHub App, subscribe to webhooks:
- `pull_request.closed` / `pull_request.merged` → trigger re-score immediately
- `issues.labeled` with `good-first-issue` → refresh the `/good-first-issue/[lang]` page

This means **S-tier and A-tier repos never need to be polled** — they push updates to you.

**Conditional Requests (ETags)**

GitHub REST API supports `If-None-Match` / `If-Modified-Since` headers. A `304 Not Modified` response **costs 0 rate limit points**. For slow-moving repos (D/C tier), most requests will 304.

**Tiered Crawl Frequency**

| Tier | Crawl Frequency | Rationale |
|---|---|---|
| S | Via webhook (real-time) | Active, changes frequently |
| A | Every 12 hours | Active |
| B | Every 24 hours | Current default for all repos |
| C | Every 48 hours | Slow movers |
| D | Every 7 days | Stale, rarely changes |

This cuts total API load by ~60% vs. crawling everything every 24 hours.

**GH Archive (for bootstrapping history)**

[gharchive.org](https://www.gharchive.org/) archives all public GitHub events (PRs, issues, comments) since 2011, available as public BigQuery datasets or hourly JSON.gz files.

For repos already in the database, you can **backfill the 180-day PR window from GH Archive** without touching the GitHub API at all. This is how many analytics tools bootstrap historical data. Zero API cost, freely available.

### 10.6 Combined Capacity Projection

| Source | Req/Hour | Notes |
|---|---|---|
| Service PAT (current) | 5,000 | Always available |
| GitHub App — 10 installs | 50,000 | 10 orgs install the app |
| GitHub App — 100 installs | 500,000 | 100 orgs (realistic at 1k users) |
| Webhooks (top-tier repos) | ∞ effective | No polling needed |
| Tiered frequency (60% reduction) | ×1.67 multiplier | B/C/D repos crawled less |

At 100 installations + query optimisation (`comments(first: 10)`) + tiered crawl:
- Effective throughput: **~50,000+ repos scored per hour**
- Current corpus (5k repos): fully rescored in **< 6 minutes**

---

## 11. Automated SEO System

This is fully implementable with the existing Next.js 15 App Router architecture. No new infrastructure needed.

### 11.1 Dynamic Metadata (`generateMetadata`)

Every dynamic route already renders via SSR. Adding `generateMetadata` makes each page fully SEO-autonomous:

```typescript
// app/repo/[owner]/[name]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const repo = await fetchRepo(params.owner, params.name);
  const tier = repo.c_rank_tier;
  const mergeRate = Math.round(repo.external_pr_merge_rate);
  
  return {
    title: `${repo.full_name} — ${tierLabel(tier)} on Opendoor`,
    description: `${repo.full_name} is ${tierLabel(tier)} for contributors. ${mergeRate}% external PR merge rate, ${repo.time_to_first_response_hours.toFixed(0)}h avg first review. Scored by C-Rank™.`,
    openGraph: {
      images: [`/api/og/repo/${params.owner}/${params.name}`],
    },
    alternates: { canonical: `https://opendoor.abhishekco.de/repo/${params.owner}/${params.name}` },
  };
}
```

All new pages (topics, org, compare, leaderboard) get the same treatment — data-driven titles and descriptions generated entirely from the database. **Zero manual effort as the corpus grows.**

### 11.2 Dynamic Sitemap (`sitemap.ts`)

Replace the static binary generator with a Next.js native sitemap:

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repos = await db.query(`SELECT full_name, updated_at FROM repositories`);
  const langs = await db.query(`SELECT DISTINCT language FROM repositories`);
  
  return [
    { url: 'https://opendoor.abhishekco.de', changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://opendoor.abhishekco.de/leaderboard', changeFrequency: 'daily', priority: 0.9 },
    ...repos.map(r => ({
      url: `https://opendoor.abhishekco.de/repo/${r.full_name}`,
      lastModified: r.updated_at,
      changeFrequency: 'daily',
      priority: 0.8,
    })),
    ...langs.map(l => ({
      url: `https://opendoor.abhishekco.de/rankings/${l.language.toLowerCase()}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  ];
}
```

For 10,000 repos the sitemap will exceed the 50MB / 50,000 URL limit — split into `sitemap/[id]/route.ts` shards indexed by `sitemap-index.xml`.

### 11.3 Dynamic OG Images (`/api/og/...`)

Next.js `ImageResponse` generates Open Graph images at request time with no external service:

```typescript
// app/api/og/repo/[owner]/[name]/route.tsx
export async function GET(req, { params }) {
  const repo = await fetchRepo(params.owner, params.name);
  return new ImageResponse(
    <div style={{ display: 'flex', background: '#09090b', ... }}>
      <span style={{ color: tierColor(repo.c_rank_tier) }}>{repo.c_rank_tier}</span>
      <h1>{repo.full_name}</h1>
      <p>{Math.round(repo.external_pr_merge_rate)}% merge rate</p>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

Every repo page, language ranking page, topic page, and compare page gets a unique, data-accurate social preview. When shared on Twitter/Discord/Slack, the card shows live C-Rank data.

### 11.4 Structured Data (JSON-LD)

Inject schema.org JSON-LD as a `<script>` in each page's Server Component:

| Page Type | Schema | Benefit |
|---|---|---|
| Repo detail | `SoftwareSourceCode` + `Review` | Rich snippet in Google |
| Language ranking | `Dataset` | Dataset rich result |
| Blog posts | `Article` | Article rich snippet |
| `/contribute` wizard | `HowTo` | Step-by-step SERP feature |
| Annual report | `Report` + `Dataset` | Backlink authority |

### 11.5 Automated Internal Linking

A simple rule engine in each Server Component:

- **Repo detail page** → link to: same language ranking, same tier repos, `/compare` with most-similar repo, `/good-first-issue/[lang]`
- **Language ranking page** → link to: top 5 repos in that language, `/topics` that overlap, `/contribute?lang=X`
- **Topic page** → link to: language pages for languages present, relevant repos

This creates a dense, contextually relevant internal link graph — the single most impactful on-page SEO signal — with zero manual work as the corpus grows.

### 11.6 Freshness Signals (Automated Content Updates)

Google rewards pages that update frequently. The pipeline already runs daily snapshots — surface that:

- Each repo detail page shows `lastModified` HTTP header matching `snapshot_date` from DB
- Language ranking pages show "Updated X hours ago"
- The `/digest` page regenerates every Monday via ISR `revalidate: 604800` (7 days)

This tells Google these are live, maintained pages — not stale data dumps.

### 11.7 Automated Blog via Pipeline Data

Once per month, the scoring pipeline can emit a structured JSON report:
```json
{
  "period": "2026-07",
  "top_improvers": [...],
  "biggest_drops": [...],
  "new_s_tier_repos": [...],
  "language_trends": {...}
}
```

A Next.js route reads this JSON and renders it as a blog post with auto-generated title, description, and structured data. **The pipeline writes the blog.** Zero human authorship required for the data-heavy posts.
