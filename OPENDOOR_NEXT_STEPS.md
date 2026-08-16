# GetMerged (formerly Opendoor) — Next Steps (single source of truth)

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

**Verdict:** features are done. The next 10 weeks: validate value → monetize → content → measure → B2B interviews (§10).

---

## 1. Positioning & north star

- **"Glassdoor for open-source repositories."** Tagline: *Don't guess which door is open. GetMerged shows you.*
- **The moat is objectivity.** C-Rank™ is reproducible math from public GitHub data. Aggregators (GFI sites, GitHub's own `/contribute`, Copilot Chat) can list issues — they cannot claim an auditable S–D score. **Never gate the data; gate personalisation and time-saving.**
- **Glassdoor crossover = job boards / hiring.** Contributors are talent; merged-PR history is verifiable proof. Recruiters already pay for this signal elsewhere (FoundDev, Gitsight, OpenQ). Our C-Rank + contributor data is the same asset.
- **Platform risk:** GitHub keeps absorbing the surface (Explore, `/contribute`, Copilot). Win on transparent scoring + community + content, not aggregation.

### ✅ 1.1 Brand — **resolved: renamed to GetMerged**

**Why we renamed:** "Opendoor" is a litigated real-estate trademark — Opendoor
Labs Inc. holds USPTO reg. #5326559 for OPENDOOR and has actively sued over it
(Open Mortgage, 2019); a separate Open Door Real Estate also opposed the mark.
Opendoor.com is a major iBuyer with a large Partner API/ecosystem. Consequences
we avoided:
- **SEO noise** — "opendoor" queries surface houses, not repos.
- **Trademark risk** — real if we expand into hiring/recruiting (§3.6) where the
  real-estate mark's "services" classes could overlap.
- **Social confusion** — a trademark holder that litigates is the worst kind of
  neighbor.

**Decision (2026-08-15): full rename, no domain purchase.**
- **Brand:** **GetMerged** (one word). Tagline: *Don't guess which door is open. GetMerged shows you.*
- **Host:** `getmerged.abhishekco.de` (subdomain of the existing personal domain —
  **no new domain bought**, no money spent). Later domain upgrades stay optional.
- **Score:** **C-Rank™** unchanged (™ preserved).
- **Migration:** old `opendoor.abhishekco.de` → redirect to the new subdomain once
  the rename ships in code (weeks 1–3, §10). Repo/working name stays `opendoor`
  internally; public-facing copy uses GetMerged.

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

### 3.2 Pro tier ($9/mo or $79/yr) — gate personalisation, never the data

```
Anonymous  → page 1, tier badge, language filter, public metrics
Free (OAuth) → unlimited pages/filters, trending, watchlist ≤10, AI vibe check, GFI widget
Pro $9/mo  → Contributor DNA, weekly personalized digest, PR Likelihood score,
             score-history trends, First-Merge Track, unlimited watchlist + tier-change
             push, unlimited /compare
```

- **Upgrade trigger:** blurred personalised-digest preview + locked PR-likelihood on repo pages.
- **Login triggers:** "See trending" and page-2 pagination (high intent, low friction).
- **⚠️ SEO depth:** the page-2 login wall must not cap crawl depth. Keep repo pages + rankings SSR'd for crawlers (auth enforced client-side for pagination), and let the sitemap (§7) cover every repo/rankings URL so Google never depends on logged-in pagination. Never `noindex` gated pages that have SEO value.
- **Contributor DNA** — the data layer behind digest + PR-Likelihood + First-Merge Track. Runs on the *user's own* GitHub token (zero GetMerged API budget). Full mechanics in §3.3.
- **Weekly digest** (Monday, Resend email + in-app): 5 repos + 5 issues matched to profile with PR-likelihood. *The habit trigger.*
- **PR Likelihood score** (formula, no LLM per-request): `merge_rate×.40 + skill_match×.30 + first_timer_success×.20 + recency×.10`; LLM only writes the "Why / Watch out" text, cached per repo+skill.
- **First-Merge Track** (`is_newbie`): 5 curated repos (S/A, first-timer >60%, response <48h, bus factor ≥2) + exact issue + AI PR checklist → on merge detect: confetti + shareable card → acquisition flywheel.

### 3.3 Contributor DNA — detailed mechanics

**Goal:** a cached profile of the user that powers the weekly digest (§3.2), PR-Likelihood, and First-Merge Track. Think of it as the contributor's "skill card" — languages, level, contribution style, goals.

**Data source = the user's own GitHub token → zero burden on GetMerged.**
- On OAuth login GitHub gives us the user's access token. Scope stays minimal (`user:email`, public data only — we never request `repo`, never touch private repos).
- **Currently the token is discarded after login.** We persist the token so DNA can pull the user's own data later.
- DNA data pull uses **their** token. Note: GitHub Search API is capped at **30 req/min** per user, so DNA builds are batched into at most **2 search queries** (`author:{login} type:pr` and `author:{login} is:pr is:merged`), and standard REST endpoints for user/starred/repos.

**🔒 Security & privacy review (required before build — feedback round 1):**

1. **Token storage.** Encrypt at rest (AES-GCM with the existing `ENCRYPTION_KEY`, per-row IV, `key_id` for rotation) — never plaintext. Move the key to a secret manager / separate env surface, not app code. Audit-log every decrypt/use. *GitHub best practice:* prefer **short-lived tokens** — switch the OAuth flow to **expiring access tokens (8h) + refresh tokens (6mo)** via the `offline_access` scope (GitHub now enables this by default for new apps), and store the **refresh token** encrypted; the short-lived access token lives in memory/Valkey. Use **PKCE** on the auth flow.
2. **Revocation — first-class UX, not an error toast.** On `401`, route to a "Reconnect GitHub" flow that re-runs OAuth (keeps entitlements, just re-links the token). Handle GitHub-side revoke (user removes the app in GitHub settings) at next profile refresh/login. Provide an explicit "Disconnect GitHub / stop profiling" button that deletes the stored token + profile.
3. **Consent.** Profiling is now processing personal data, not just displaying a public profile. Add explicit consent at profile-build time, update the privacy policy, allow **opt-out** (stop building/refreshing) and **data deletion** (delete `contributor_profiles` + token; GDPR/CCPA right to erasure — give a `DELETE /api/v1/me/data` endpoint + UI). Get legal sign-off before launch.
4. **Abuse / rate-limit handling.** Profile builds are background jobs: queue them, cap concurrency (e.g. 5 workers), and respect GitHub **secondary** rate limits (backoff + retry on `403`/`429`). A stampede of builds must never hammer GitHub from our server or wedge the crawl pipeline.
5. **Compliance trigger.** Even with public data, storing OAuth tokens + building user profiles may hit GDPR/CCPA obligations. This is a deliberate product decision — document it, don't surprise users.

**Build flow (first pass on login, then weekly cron for active/Pro users):**

1. **Fetch raw signals** (strictly capped at ≤2 search calls to obey 30 req/min search rate limit):
   - `GET /user` → id, login, account age
   - `GET /search/issues?q=author:{login}+type:pr&per_page=100` → PRs authored
   - `GET /search/issues?q=author:{login}+is:pr+is:merged&per_page=100` → merged PRs
   - `GET /users/{login}/repos?per_page=100` → repos they own (languages, stars)
   - `GET /users/{login}/starred?per_page=100` → interests

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

4. **Consumers:** weekly digest (5 repos + 5 issues matched to the card) · PR-Likelihood (skill-match input) · First-Merge Track (curation) · later the recruiter/B2B signal (§3.6).

**Privacy & consent:** only public data; the card is also the `/u/[username]` public profile; users can delete it (endpoint in §3.3 security); we never post on their behalf.

### 3.4 Pricing & subscription lifecycle

- **Price is a hypothesis, not a fact.** $5/mo is low for a tool that predicts PR success and may become a hiring signal. Test **$8–12/mo**, plus an **annual (~2×) plan**. Use PostHog to measure activation first (see §11) — the conversion table below is meaningless without a real funnel number.
- **Subscription lifecycle** must be first-class: free trial or freemium, cancel, pause, **dunning** (failed payment emails), refunds, and churn. dodopayments/Paddle handle the payment state machine; we handle the entitlements + UX.
- **Email consent:** the weekly digest is *marketing email* — require explicit consent (checkbox, not pre-ticked), include one-click unsubscribe + a plain-text footer, and don't auto-subscribe OAuth users to it. `user:email` gives the address; consent gives the right to use it.
- **Conversion reality check:** with ~current user base, 3% of 1k = 30 Pro = $150 MRR. Before banking on the table, instrument the funnel: visitors → OAuth signups → activated free → upgraded (§11).

### 3.5 The $5 math (directional only — validate via §11 funnel)

| Users | Conv | MRR |
|---|---|---|
| 1k | 3% | $150 |
| 10k | 3% | $1.5k |
| 50k | 5% | $12.5k |
| 200k | 5% | $50k |

### 3.6 B2B layers (after trust + Pro retention proof, ~month 3+)

1. **Recruiter access (Portfolio Pass B2B)** — FoundDev model: devs opt-in, recruiters search shipped-code profiles + MatchScore. Highest ARPU. We already hold the data; add opt-in + recruiter UI.
2. **Developer-data API licensing** — OpenQ model: sell repo/contributor intelligence to DevRel/GTM teams. Same dataset, new surface.
3. **Maintainer tier + sponsored doors** — claim repo, contributor-side report, benchmark, sponsored slots. Only once community trust is solid.

---

## 4. Blog & content engine — semi-automated, human-gated (claude-blog)

Use **AgriciDaniel/claude-blog** (claude-blog.md skill suite: 30 commands, 4-agent pipeline, 5-gate delivery contract, 0–100 scoring, dual Google + AI-citation/GEO optimization).

> **Editorial gate (trust non-negotiable):** our moat is objectivity, so a
> *fully automated* blog is a brand risk. claude-blog's delivery contract catches
> style and structure — not factual nuance or brand voice. Every automated weekly
> report gets a **15-minute human sanity check** before publish: verify the data
> JSON matches the post's claims, tone matches brand, no invented stats. This is a
> hard gate in the pipeline, not a suggestion.

### 4.1 Pipeline (weekly cron + on-demand)

```
cron → scripts/blog-pipeline.sh
  1. curl POST /internal/blog-report (internal key) → data JSON
     { period, top_improvers, biggest_drops, new_s_tier, language_trends,
       top_gfis, welcoming_movers, merge_rate_stats }   ← I8-style export, from DB
  2. claude-blog /blog write "<State of Welcoming OSS — Weekly>"
     (agents research, draft from data JSON, inject charts)
  3. claude-blog /blog analyze → gate ≥ 90, zero P0
  4. **HUMAN EDITORIAL GATE** — 15-min sanity check vs data JSON + brand voice
     (pipeline stops here and pings; no autopublish)
  5. write MDX + frontmatter → frontend/src/app/blog/posts/
  6. update blog index + sitemap
  7. commit (hooks auto-deploy) or open PR
```

### 4.2 Content mix (users can come for anything)

- **Weekly data report** (automated, from our own corpus — nobody else has it): S/A/B/C/D movers, languages on the rise, most-welcoming new repos, hot GFIs with quality scores.
- **Evergreen clusters** (from `/blog strategy`): open source onboarding, good-first-issue how-tos, per-language "best repos for first PRs", OSS sustainability, contributor-portfolio building.
- **SEO/GEO:** every post JSON-LD `Article`, cross-linked to repo/rankings pages (internal-link rule engine, §7), optimized for AI-citation platforms.
- **Newsletter** (weekly digest doubles as distribution; GFI roundup option for non-Pro readers → free-list growth).
- **Cadence (clarified):** exactly **1 weekly data report** (auto-drafted → human-gated → published) **+ ≤1 evergreen post/week** (from the cluster queue, written on-demand via `/blog write`, not silently batch-generated). Ceiling ~2 posts/week; never autopublish evergreen content without review.

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
| 2 | **Wrapped-style proof cards** (upgrade of "Merge Streak trophies") | "I got my PR merged — found via GetMerged" is an emotional, shareable moment; streaks/achievements drive return visits | achievement system (real merged-PR stats → badges: Speedster, Closer, First-Merge); annual/quarterly **Contribution Wrapped** card; one-click share to X/LinkedIn with copy |
| 3 | **First-merge celebration** | Newbie success is the strongest acquisition event; every first merge = free marketing | confetti + auto-share card + tweet template (already in First-Merge Track §3) |
| 4 | **Weekly data report as social object** | Our automated "State of Welcoming OSS" report is unique data — shareable + linkable; feeds Reddit/HN/tech media | auto-post report to X/LinkedIn; "send to HN/Reddit" packaging (claude-blog `/blog repurpose`) |
| 5 | **DoorPal browser extension** | Overlays C-Rank on github.com; every install = persistent distribution point | GitHub-inject extension; MVP = repo-page C-Rank chip + GFI quality |
| 6 | **Maintainer "welcome rank"** | Maintainers share their rank/badge → free supply-side distribution | embeddable welcome badge + leaderboard share CTA (leaderboard page exists) |
| 7 | **Seasonal spikes** | Hacktoberfest (Oct) is the biggest OSS acquisition event of the year | Hacktoberfest welcome-leaderboard + content cluster + shareable "I completed Hacktoberfest" card (prep in Sep) |
| 8 | **Community** | Contributors become ambassadors; discussions = SEO content | GitHub Discussions now; Discord/Slack at >100 active users |

### 5.2 Launch & distribution surfaces (one-off + recurring)

- **Launch ops:** Show HN ("Show HN: GetMerged — C-Rank, a score for whether your PR will get merged"), Reddit (r/programming, r/webdev, language subs), Dev.to/Hashnode syndication, Product Hunt — coordinated within a 48h window for GitHub Trending velocity.
- **Micro-KOL outreach:** find maintainers of 1k–10k-star repos in our niche, DM them their repo's welcome score + badge → high-converting share.
- **GEO/measurement:** track where ChatGPT / Perplexity / Copilot surface getmerged (astrophile-style `geo` checks); feed wins into the blog pipeline.
- **Newsletter** (weekly digest, §3/§4) is the retention + distribution backbone.

### 5.3 One-click maintainer install — the badge prompt hack (growth hack)

**Mechanic:** the single highest-friction step in the badge flywheel is "maintainer
finds the badge, learns the markdown, edits README by hand." We remove that
friction: **one button copies a pre-written prompt; the maintainer pastes it into
Claude / Gemini / Codex / Copilot; the AI edits their README and adds our badge.**
Precedent is strong — readme-craft, general-readme-skill, and the README-generator
ecosystem all prove "one prompt → README + badges" is how maintainers operate in
2026. We ride that habit.

**The prompt (served on a `/maintainers` page + repo-page CTA, one-click copy):**

```
You are editing this repository's README to add a "C-Rank" welcome badge
from GetMerged (getmerged.abhishekco.de), a service that scores how welcoming
an open-source repo is to new contributors.

Tasks:
1. Find the README (README.md / README.rst) and locate the H1 title line.
2. Insert this badge block directly under the H1, aligned with any existing
   badges, and nothing else. Keep the existing badge URLs as-is.
3. Use the exact markdown (replace OWNER/REPO with this repo's name):
   [![C-Rank™](https://getmerged.abhishekco.de/OWNER/REPO/raw/badge.svg)](https://getmerged.abhishekco.de/OWNER/REPO)
4. If a C-Rank badge already exists, do nothing and say so.
5. Do NOT rewrite, reformat, or reorder anything else in the README.
6. Show the diff and let the user confirm before writing the file.
```

**Why it works:** the prompt is *conservative* (add a badge, touch nothing else)
so maintainers trust it; it needs no signup; and every executed prompt = a
permanent backlink + badge on someone else's homepage. It also self-serves the
**micro-KOL outreach** — the DM is "here's your score + this 10-second prompt."

**Variants (cheap, later):**
- Publish the same logic as a **SKILL.md** so Claude Code / Codex users can
  `/add-crank-badge` instead of pasting text (or `npx @getmerged/badge` CLI).
- A "badge for your README" wizard on `/maintainers` that pre-fills OWNER/REPO
  and emits the exact prompt with their repo baked in.

**Metric:** prompts copied → badges added to live READMEs → unique referring
domains from badge embeds (quarterly count).

### 5.4 Discarded (from old NEXT_STEPS)

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

**6. Time-to-First-Triage** — hours from *issue* open → first maintainer action (label/comment/assignment). Fast triage = active repo. **Differs from the existing C-Rank `time_to_first_response`:** that signal measures the first *comment on a pull request*; triage measures the *issue queue*, which is what contributors hit before they even write a PR. New `issues` GraphQL query (~2 pts/repo). Feeds C-Rank + GFI Quality.
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
- Brand: **GetMerged** (one word, formerly *Opendoor*), **C-Rank™** (™ preserved), tagline fixed. Host: `getmerged.abhishekco.de` (subdomain; no domain purchase). Renamed due to trademark collision — see §1.1.
- **Consent & deletion (GDPR/CCPA):** token storage + DNA profiling (§3.3) and the marketing email digest (§3.4) both require explicit consent, opt-out, and a data-deletion path (`DELETE /api/v1/me/data`). Legal sign-off before launch.
- Pay stack: dodopayments → Paddle MoR (India-first, global-capable). **Not** RevenueCat, not raw Stripe.

---

## 10. Execution Plan: 60-Day Sprint to 100 Paid Subscribers ($900+ MRR)

**Unified Sequencing Principle:** Build core analytical and data moats first → build interactive tools with free quotas → gate power features via Dodopayments → execute targeted community distribution.

| Sprint | Timeline | Focus | Deliverables |
|---|---|---|---|
| **Sprint 1: The Core Data Moats** | Days 1–15 | Score Quality & Moats | **Onboarding Docs Score** (`CONTRIBUTING.md`, templates) · **GFI Quality Score** (issue-level mergeability) · **Bus Factor Gate** · **Brand Rename to GetMerged** (`getmerged.abhishekco.de` redirect) · **OAuth Token Storage** (encrypted AES-GCM, refresh/PKCE) + GDPR deletion endpoint |
| **Sprint 2: The Acceptance Engine** | Days 16–30 | Predictive Tooling | **Async PR Ghost & Likelihood Predictor** (MySQL cached metrics + p50/p90 latency) · **Static Heuristic Pre-Flight Checker** · **Contributor DNA Engine** (≤2 search queries/user) · Free un-blurred preview on sample repos |
| **Sprint 3: Payments & Entitlements** | Days 31–45 | Paywall & Conversion | **Dodopayments Webhook** (`subscription.created`, `renewed`, `cancelled`) · **Persistent MySQL Quota Tracking** (3 free evaluations/month; unlimited Pro) · `/pricing` page ($9/mo, $79/yr) · Pro gating middleware · Monday morning match digest (Resend) |
| **Sprint 4: Growth & Distribution** | Days 46–60 | Acquisition & Viral Loops | **4x Data-Driven Reddit Drops** (`r/learnprogramming`, `r/cscareerquestions`, language subs) · **Show HN Launch** · **Shareable Merged-PR Achievement Cards** · Bootcamp & GSoC fellowship outreach |

---

## 11. Activation, retention & measurement

Funnels are guesses until instrumented. Wire these into PostHog before spending
on acquisition (§10).

**Activation events**
- Free: OAuth signup → lands on repo/rankings → **saves a watchlist item** or
  evaluates a repo PR likelihood → **repeat visit within 7 days**.
- Pro: pays → **opens the first weekly digest** → **uses PR Likelihood** on a
  repo → (if newbie) starts the First-Merge Track.
- North-star-ish proxy: a contributor who **picks a repo they found via us and
  merges a PR there**.

**Funnel to instrument:** visitors → OAuth signup → activated (≥1 gated action) → Pro → retained 30d.

**Churn signals (watch weekly):**
- Digest open/click rate drops (email health, not just MRR).
- Watchlist usage drops (personalization losing value).
- PR Likelihood clicks drop to zero.
- Failed payments (dunning) — dunning UX saves revenue before it's "churn".

---

## 12. Detailed Macro Epics & Granular Sub-Stories (Build-First, Paywall-Second Architecture)

### 🧱 Epic 1: Repository Data Moats & Onboarding Scoring (Sprint 1)
*Compute objective repository signals that no other aggregator provides.*
- **Story 1.1**: Implement Onboarding Docs checker (inspects `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates via GitHub API) and store `onboarding_score` (0–100).
- **Story 1.2**: Implement GFI Quality Score calculating issue description clarity, scope, maintainer response <48h, and mentor comment presence.
- **Story 1.3**: Calculate repository 90-day Bus Factor from distinct active maintainers; enforce cap (bus factor = 1 → max tier B).
- **Story 1.4**: Update C-Rank nightly calculation pipeline to incorporate Onboarding Docs and Bus Factor into global rank.
- **Story 1.5**: Execute brand rename to GetMerged across frontend copy, metadata, and routing.

### 🧬 Epic 2: Contributor DNA & Secure Auth (Sprint 1–2)
*Extract user skills and contribution habits securely without hitting API abuse limits.*
- **Story 2.1**: Update OAuth login flow to encrypt GitHub access/refresh tokens with AES-GCM and store in `users` table.
- **Story 2.2**: Implement `DELETE /api/v1/me/data` and explicit GDPR profiling consent checkbox.
- **Story 2.3**: Build Contributor DNA background worker restricted to ≤2 search queries (`author:{login} type:pr` and `is:merged`) + REST profile endpoints.
- **Story 2.4**: Generate contributor DNA JSON (`primary_languages`, `skill_level`, `pr_size_preference`, `feedback_tolerance`) and cache in `contributor_profiles`.

### 🏗️ Epic 3: Async PR Ghost & Acceptance Predictor (Sprint 2)
*Compute response latency percentiles and acceptance odds from stored event data.*
- **Story 3.1**: Compute maintainer response latency percentiles (p50, p90) and first-timer merge rates from stored `repo_pr_events` via background worker.
- **Story 3.2**: Implement `GET /api/v1/repos/:owner/:name/pr-likelihood` reading precomputed metrics from MySQL with sub-10ms response time.
- **Story 3.3**: Async worker pushes maintainer comment text to local `nlp_sidecar` to classify maintainer vibe (warm vs. strict, nitpicks, bot gatekeeping) and caches result.
- **Story 3.4**: Build frontend "PR Acceptance & Review Time" widget on `/repo/[owner]/[name]` with full un-blurred view on sample repos.

### 🛠️ Epic 4: Static Heuristic Pre-Flight Checker (Sprint 2)
*Fast, client-side/heuristic diff and PR validation checklist without expensive LLM diff parsing.*
- **Story 4.1**: Implement `POST /api/v1/preflight/evaluate` accepting target repo and file changes summary.
- **Story 4.2**: Validate PR against heuristic rules: presence of test files (`*_test.*`, `test_*`), docs updates, commit message conventional format, and PR size threshold.
- **Story 4.3**: Build interactive UI at `/preflight` showing pass/fail status with actionable guidance.

### 💳 Epic 5: Dodopayments & Quota Entitlements (Sprint 3)
*Monetization infrastructure with resilient MySQL quota tracking.*
- **Story 5.1**: Create DB migration for `users`: `is_pro`, `subscription_id`, `subscription_expires_at`, `billing_cycle`, and `monthly_eval_count`.
- **Story 5.2**: Implement `POST /api/v1/payments/webhook/dodopayments` handling `subscription.created`, `renewed`, `cancelled`, and `payment.failed`.
- **Story 5.3**: Build Go middleware `RequirePro()` and persistent MySQL quota checker (3 free likelihood evaluations/user/month; unlimited for Pro).
- **Story 5.4**: Build high-converting `/pricing` page ($9/mo, $79/yr) with 7-day money-back guarantee.
- **Story 5.5**: Implement Resend email pipeline for Monday morning personalized match digest delivering 3 high-probability issues.

### 🚀 Epic 6: Growth Flywheel & Social Proof (Sprint 4)
*Acquisition and shareable achievements.*
- **Story 6.1**: Implement PR merge webhook listener to detect when a user PR gets merged in an indexed repository.
- **Story 6.2**: Generate SVG & PNG Contributor Achievement Cards (*"Top 5% Go Contributor – PR Merged in [Repo]"*) on merge detect.
- **Story 6.3**: Add one-click LinkedIn and X share buttons with pre-formatted copy linking to user's public profile `/u/[username]`.
- **Story 6.4**: Execute 4x targeted Reddit data drops across `r/learnprogramming`, `r/cscareerquestions`, and language subreddits.
- **Story 6.5**: Launch on Show HN highlighting GraphQL crawl architecture and objective C-Rank math.

### ⏱️ Epic 7: Contributor Alignment & Timing Intelligence (Sprint 5)
*Dynamic reviewer availability and contributor persona matchmaking.*
- **Story 7.1**: Reviewer Timezone Overlap Indicator & Optimal PR Submission Window (`GET /api/v1/repos/:id/optimal-time`).
- **Story 7.2**: Contributor Fit Radar & PR Size / Filetype Success Probability Breakdown (`GET /api/v1/repos/:id/fit-radar`).

### 🎓 Epic 8: Maintainer Quality & Retention Flywheel (Sprint 6)
*Nurturing maintainer vibes and personalized contributor retention.*
- **Story 7.3**: Maintainer Mentorship Index measuring encouraging responses vs 1-word rejects attached to repo scorecards.
- **Story 7.4**: Automated Weekly Contributor Digest generator delivering personalized high-probability issues.

### 🤖 Epic 9: AI Prompt Badge Installer — Profile & Repo (Growth)
*One-click copy of AI prompts that add GetMerged badges to GitHub profiles AND repos. Two separate surfaces, two separate UI sections, never conflated.*
- **Story 9.1**: Repo badge prompt UI on `/maintainers` + repo-page CTA — one-click copy of the repo README badge prompt (OWNER/REPO pre-filled, §5.3 prompt). Server "Copy prompt" button, no signup.
- **Story 9.2**: **Separate** Profile badge prompt UI — emits a prompt that inserts the contributor C-Rank badge into the user's GitHub profile README (`[![GetMerged™](https://getmerged.abhishekco.de/u/[username]/raw/badge.svg)](https://getmerged.abhishekco.de/u/[username])`). Distinct section + distinct copy from 9.1.
- **Story 9.3**: Both prompts conservative (insert badge block only, touch nothing else, show diff, let user confirm); track prompts-copied → badges-live per surface (profile vs repo).

### 🌍 Epic 10: Language-Specific Content & Repo-Page GFI
*Kill the ~40% duplicate-content problem: localize copy and data per language, and surface real good-first-issue content on repo pages instead of a bare count.*
- **Story 10.1**: Language-specific copy + data on every language surface (`/rankings/[lang]`, language filter on `/repos`, GFI pages) — per-language intro, meta description, JSON-LD, and curated context, so each language page carries distinct value.
- **Story 10.2**: Repo detail page (`/repo/[owner]/[name]`) shows **good-first-issue content** (issue title, description snippet, labels, issue URL) fetched from stored GFI data — not just a count.
- **Story 10.3**: Graceful fallback — if a repo has no GFI content, show only the count (or omit the block); never fake or invent issue content.

### 🔍 Epic 11: SEO & Content-System Backlog (Growth)
*Ship the pending §7 backlog: more indexable surfaces, internal links, freshness, and authority pages.*
- **Story 11.1**: Build `/compare/[a]/[b]` repo comparison page (SSR, unique title/JSON-LD per pair).
- **Story 11.2**: Build `/topics/[topic]` + `/org/[org]` surfaces (needs topics index); each with distinct metadata + copy.
- **Story 11.3**: Build `/contribute` wizard — indexable landing that routes contributors to ranked repos/GFIs.
- **Story 11.4**: Internal-link rule engine — cross-link repo → language ranking → tier neighbors → compare → GFI; every repo/ranking page gets unique inbound context.
- **Story 11.5**: Freshness signals — `lastModified` = snapshot date + "updated Xh ago" on repo pages.
- **Story 11.6**: Annual "State of Welcoming OSS" report at `/reports/[year]` — backlink + authority asset from the blog pipeline (§4.1).

### 🎯 Epic 12: Good First Issue Strict Repo Scoping & Ingestion Integrity
*Ensure repo scorecards exclusively render verified issues belonging to that exact repository.*
- **Story 12.1**: Fix repo identifier parsing and URL decoding across `/api/v1/repos/:id/good-first-issues` to guarantee exact repo ID matching and eliminate cross-repo issue bleed.
- **Story 12.2**: Audit GFI ingestion pipeline (`repo_good_first_issues`) with strict foreign key verification and automated data purge for orphaned issue rows.
- **Story 12.3**: Update frontend `ClientRepoDetail` to assert `issue.repo_full_name === current_repo_full_name` as a secondary client-side integrity gate.




