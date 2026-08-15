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
- **Contributor DNA** — the data layer behind digest + PR-Likelihood + First-Merge Track. Runs on the *user's own* GitHub token (zero opendoor API budget). Full mechanics in §3.3.
- **Weekly digest** (Monday, Resend email + in-app): 5 repos + 5 issues matched to profile with PR-likelihood. *The habit trigger.*
- **PR Likelihood score** (formula, no LLM per-request): `merge_rate×.40 + skill_match×.30 + first_timer_success×.20 + recency×.10`; LLM only writes the "Why / Watch out" text, cached per repo+skill.
- **First-Merge Track** (`is_newbie`): 5 curated repos (S/A, first-timer >60%, response <48h, bus factor ≥2) + exact issue + AI PR checklist → on merge detect: confetti + shareable card → acquisition flywheel.

### 3.3 Contributor DNA — detailed mechanics

**Goal:** a cached profile of the user that powers the weekly digest (§3.2), PR-Likelihood, and First-Merge Track. Think of it as the contributor's "skill card" — languages, level, contribution style, goals.

**Data source = the user's own GitHub token → zero burden on opendoor.**
- On OAuth login GitHub gives us the user's access token. Scope stays minimal (`user:email`, public data only — we never request `repo`, never touch private repos).
- **Currently the token is discarded after login.** We add an encrypted `github_access_token` column on `users` (encrypt with existing `ENCRYPTION_KEY`) and store it at login.
- Every DNA data pull uses **their** token → rides their own 5,000 req/hr GitHub rate limit and quota. Opendoor spends 0 API budget and 0 money on profiling.
- Token health: classic-app OAuth tokens don't expire on their own; on a `401`, prompt the user to re-login.

**Build flow (first pass on login, then weekly cron for active/Pro users):**

1. **Fetch raw signals** (all public, ~10–30 requests per build):
   - `GET /user` → id, login, account age
   - `GET /search/issues?q=author:{login}+type:pr` → every PR they authored
   - `GET /search/issues?q=author:{login}+is:pr+is:merged` → merged PRs
   - `GET /users/{login}/repos` → repos they own (languages, stars)
   - `GET /users/{login}/starred` (cap ~100) → interests

2. **Compute attributes** — deterministic heuristics + one cheap local inference (nlp_sidecar). No cloud LLM per user.

| Attribute | Computed from | How |
|---|---|---|
| `primary_languages` | language of repos they got PRs in, weighted by PR count | top 3 |
| `skill_level` per language | star-tier of repos they merged into + merge rate + PR size | ≥2 merged in a 10k+⭐ repo → *expert*; else threshold → *intermediate / beginner* |
| `contribution_style` | PR titles + linked issues | keyword classify: `bug-fixer` / `feature-builder` / `docs` / `reviewer` (same approach as nlp_sidecar rules) |
| `pr_size_preference` | median lines-changed per merged PR | small ≤100 · medium ≤500 · large >500 |
| `feedback_tolerance` | review rounds + re-pushes after comments | from PR review data (their own PRs) |
| `goals_inferred` | recency + consistency + starred repos | portfolio-building vs skill-expansion |
| `is_newbie` | merged PR count | `== 0` → true (drives First-Merge Track) |
| `merged_pr_count`, `streak` | event/PR stream | count + consecutive months |

3. **Persist** as a `contributor_profiles` row (JSON). Build once, refresh weekly.

4. **Consumers:** weekly digest (5 repos + 5 issues matched to the card) · PR-Likelihood (skill-match input) · First-Merge Track (curation) · later the recruiter/B2B signal (§3.5).

**Privacy & consent:** only public data; the card is also the `/u/[username]` public profile; users can delete it; we never post on their behalf.

### 3.4 The $5 math

| Users | Conv | MRR |
|---|---|---|
| 1k | 3% | $150 |
| 10k | 3% | $1.5k |
| 50k | 5% | $12.5k |
| 200k | 5% | $50k |

### 3.5 B2B layers (after trust, ~month 3+)

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

## 5. Growth & virality — established plan

> Research: developer-tool growth is trust + distribution loops, not ads. The two
> highest-leverage mechanics are (1) **embeddable badges in READMEs** (GitVital,
> LiveArch, Reboosty all prove badge = backlink + discovery) and (2)
> **Wrapped-style shareable proof cards** (GitVital's achievement badges "The
> Speedster"/"The Closer", "better than 90% of developers" leaderboard). Plus
> seasonal spikes (Hacktoberfest) and launch surface ops (Show HN / Reddit / Dev.to).

### 5.1 Keep — the compounding loops

| # | Loop | Why it wins | Build |
|---|------|-------------|-------|
| 1 | **Badge & embed flywheel** | Every C-Rank/contributor badge embedded in a README = permanent backlink + discovery. Repo badge + contributor-grade badge already ship — make embedding frictionless | one-click embed copy on repo + profile pages; per-language repo badges; maintainer "welcomes newcomers" badge (badge doubles as social proof maintainers WANT to share); banner preview |
| 2 | **Wrapped-style proof cards** (upgrade of "Merge Streak trophies") | "I got my PR merged — found via Opendoor" is an emotional, shareable moment; streaks/achievements drive return visits | achievement system (real merged-PR stats → badges: Speedster, Closer, First-Merge); annual/quarterly **Contribution Wrapped** card; one-click share to X/LinkedIn with copy |
| 3 | **First-merge celebration** | Newbie success is the strongest acquisition event; every first merge = free marketing | confetti + auto-share card + tweet template (already in First-Merge Track §3) |
| 4 | **Weekly data report as social object** | Our automated "State of Welcoming OSS" report is unique data — shareable + linkable; feeds Reddit/HN/tech media | auto-post report to X/LinkedIn; "send to HN/Reddit" packaging (claude-blog `/blog repurpose`) |
| 5 | **DoorPal browser extension** | Overlays C-Rank on github.com; every install = persistent distribution point | GitHub-inject extension; MVP = repo-page C-Rank chip + GFI quality |
| 6 | **Maintainer "welcome rank"** | Maintainers share their rank/badge → free supply-side distribution | embeddable welcome badge + leaderboard share CTA (leaderboard page exists) |
| 7 | **Seasonal spikes** | Hacktoberfest (Oct) is the biggest OSS acquisition event of the year | Hacktoberfest welcome-leaderboard + content cluster + shareable "I completed Hacktoberfest" card (prep in Sep) |
| 8 | **Community** | Contributors become ambassadors; discussions = SEO content | GitHub Discussions now; Discord/Slack at >100 active users |

### 5.2 Launch & distribution surfaces (one-off + recurring)

- **Launch ops:** Show HN ("Show HN: Opendoor — C-Rank, a score for whether your PR will get merged"), Reddit (r/programming, r/webdev, language subs), Dev.to/Hashnode syndication, Product Hunt — coordinated within a 48h window for GitHub Trending velocity.
- **Micro-KOL outreach:** find maintainers of 1k–10k-star repos in our niche, DM them their repo's welcome score + badge → high-converting share.
- **GEO/measurement:** track where ChatGPT / Perplexity / Copilot surface opendoor (astrophile-style `geo` checks); feed wins into the blog pipeline.
- **Newsletter** (weekly digest, §3/§4) is the retention + distribution backbone.

### 5.3 Discarded (from old NEXT_STEPS)

| Item | Why dropped |
|------|-------------|
| "Find My Door" bounty thread | Heavy, weak social object, poor loop; adds moderation burden |
| Door-of-the-day + share-unlock | Forced-friction sharing; gimmicky; conflicts with "never gate the data" |
| Repo Roast / Warm Hug cards | Fun but diverts brand energy; reformatted as *blog/social content* formats instead of product features |

---

## 6. Metrics & scoring backlog — expanded

> **What this section is:** candidates for new signals. C-Rank™ currently blends
> 9 signals (merge rate, response time, first-timer success, …). Each row below is
> a *new* signal we could fold into that blend, expose on repo pages, or feed the
> Pro PR-Likelihood score. Adding a signal = compute it → assign a weight → re-anchor
> tiers (the nightly recalc does this automatically). **Order matters:** most of
> these only make sense *after* Pro ships, because they enrich the paid layer.
>
> Format per signal: **What it measures → why contributors care → how we compute it → where it feeds.**
> Cost = extra GitHub API calls (we have a budget). ✅ = can use data we already store, no new crawl.

### A. Moat signals (nobody else owns these — build first)

**1. GFI Quality Score — *is this good-first-issue actually mergeable?***
- **What:** a score for a *specific* issue (not the repo). A `good first issue` label is unreliable: research shows ~50% of GFIs are never solved by newcomers (ESEC/FSE 2020), yet working a GFI gives **5.57× merge odds** (FSE 2024). So "which GFI" is the real decision — not "which repo".
- **How (heuristics, no LLM per issue):** description readability + has code snippet (ESEM 2021 features) · scope size (est. LOC) · repo's GFI→merge history · maintainer response <48h · mentor/expert comment presence (ICSE 2023: expert reply within ~8.5h predicts success) · has `help wanted`/`first-timers-only` labels · open <90 days.
- **Feeds:** sort/filter `/good-first-issue`, Pro PR-Likelihood, weekly blog report. ✅ mostly from stored data + issue text.
- **Cost:** one issue-text crawl per GFI; low.

**2. Onboarding Docs Score — *does this repo help a newcomer start?***
- **What:** does the repo have working CONTRIBUTING.md, CODE_OF_CONDUCT, issue/PR templates, welcome bot? Research: ~65% of projects lack CONTRIBUTING.md (FSE 2023); newcomers rank "set up the environment" as their #1 need (ESEM 2022).
- **How:** boolean existence checks via GitHub Contents API (3 requests/repo, no GraphQL cost) + optional classifier on how many of the 6 newcomer-barrier categories CONTRIBUTING covers (Fronchetti FSE 2023).
- **Feeds:** C-Rank small-weight input + visible badge. **Cost:** ~3 REST calls/repo, one-time + on change.

**3. PR-Rejection Classification — *why did that PR close unmerged?***
- **What:** classify closed PRs: `abandoned` (contributor stopped) vs `maintainer_closed` vs `superseded` vs `duplicate`. A 20% merge rate means different things if maintainers close everything vs contributors give up.
- **How:** timeline analysis (author's last comment before close → abandoned) + keyword heuristic via the built nlp_sidecar.
- **Feeds:** refines merge-rate interpretation on repo detail + C-Rank. ✅ from stored `repo_pr_events`.

**4. Bus Factor — *is this repo one person away from dying?***
- **What:** count of distinct maintainers who merged/reviewed in last 90d.
- **How:** distinct reviewer logins — we already have CommentAuthors data. ✅
- **Feeds:** C-Rank hard gate (bus factor = 1 → max tier B) + warning on repo page.

### B. Sentiment & vibe (nlp_sidecar already built — just surface it)

**5. PR-Comment Sentiment / Maintainer Tone** — welcoming vs harsh. The built sidecar already returns `warmth_score`, `patience_score`, `nitpick_ratio`, `maintainer_persona`. Surface as a badge on repo detail. Feeds: C-Rank small weight, trust signal for first-timers.

### C. Cheap-to-compute, C-Rank inputs (add after A)

**6. Time-to-First-Triage** — hours from issue open → first maintainer label/comment. Fast triage = active repo. New `issues` GraphQL query (~2 pts/repo). Feeds C-Rank.
**7. Issue→PR Conversion** — do labelled issues (`good first issue`/`help wanted`) actually close via a merged PR? Proves the label is real. Cross-ref closed issues to linked PRs. ✅ + one query. Feeds C-Rank + GFI Quality.
**8. Weekly Activity Trend** — 4-week rolling delta of merge rate + response time; ↑↓ arrows on cards. A B trending to A beats a stagnant A. Computed from existing daily snapshots. ✅ Feeds C-Rank + display.
**9. Review Coverage** — % of external PRs with ≥1 non-author comment. Blind merges and silent closes are both red flags. ✅ from stored comments. Feeds C-Rank.
**10. Bot Activity Ratio** — % of comments from bots. >40% signals heavy CI gatekeeping that intimidates newcomers. Bot detection (`isBot`) already exists. ✅ Feeds C-Rank small weight.
**11. Release Cadence** — median days between releases (12-month window). Active shipping = active maintainer. New `releases` GraphQL query. Feeds C-Rank.
**12. Contributor Graduation / Repeat Rate** — do one-timers come back (30/90/180d cohorts)? We already track `repeat_contributor_rate`; add cohort framing + trend. Feeds C-Rank + retention storytelling.

### D. Parked

**13. Fork→PR Ratio** — % of forks that produced a PR to parent. Nice signal but requires paginating all forks = expensive. Revisit only if it becomes a C-Rank differentiator.
**14. PR-Completion Model (ML)** — predict PR acceptance from issue/repo features. High effort; the formula-based PR-Likelihood (§3) covers 90% of the value today.

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
- ✅ **Event-diff backfill** — already built (rolling 30-day event backfill via `repo_pr_events` + checkpoint script). No GH Archive/BigQuery needed.
- ✅ **Python AI sidecar** — already built (`backend/nlp_sidecar/app.py`: sentiment, maintainer vibe, PR guidelines, warmth/patience/persona on localhost:8095). Reuse it for sentiment + PR-rejection (§6.A3) instead of new LLM calls.
- **Store GitHub access token (encrypted, `ENCRYPTION_KEY`)** on `users` at OAuth time — required for Contributor DNA (§3.3). Currently the token is discarded after login.
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
