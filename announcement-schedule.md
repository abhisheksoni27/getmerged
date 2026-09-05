# GetMerged Launch Announcement & Content Schedule

> **Status:** Living rule document. Append, never overwrite. Cross-referenced from AGENTS.md, the `blog-strategy` skill output, and the launch tracking dashboard.

**Site:** `getmerged.abhishekco.de` (a.k.a. opendoor) — Glassdoor for OSS repos. C-Rank™ (S→D) scoring on 53k+ repos, maintainer response latency, first-timer merge rate, personal PR tracker, watchlist, Pro forecasts, monthly league, contributor quests & Karma.

**Mission of this document:** single source of truth for *what* we ship, *when* we ship it, *who* owns it, and *how* we measure it. Any post not on this list is an ad-hoc exception and must be justified in the PR.

---

## 1. Goals & Non-Goals

### Goals
1. **Awareness:** own the "open source glassdoor" / "find welcoming OSS repos" niche on Google and in AI citations (ChatGPT, Perplexity, Google AI Overviews).
2. **Acquisition:** drive qualified sign-ups (GitHub OAuth) and first-repo claims.
3. **Trust:** publish original data + tutorials that prove C-Rank works; position GetMerged as the authority on PR merge probability.
4. **Two-sided network:** turn maintainers into a second ICP and grow `/maintainers` adoption + badge installs.
5. **Seasonal capture:** ride Hacktoberfest, New Year OSS resolutions, and Google summer-of-code recruitment windows.

### Non-Goals
- Generic tutorial blog that rehashes "how to use git" (we delegate to existing canonical guides, link out).
- "10 best X" listicles without original framing (against `BRAND.md`).
- Posts without a primary CTA into a GetMerged surface (`/repos`, `/repo/[owner]/[name]`, `/dashboard`, `/maintainers`, `/pricing`).
- Posts that don't pass the 80+ quality bar on `/blog analyze` (per `blog-strategy` Step 5.6).

---

## 2. Audience Segments (per `blog-strategy` Step 3)

### Segment A — "First-Timer Freddy"
- **Role:** Student or junior dev, 0–2 merged PRs, often in a coding bootcamp / CS degree.
- **Pain:** Afraid of being ignored or yelled at on big OSS projects.
- **Searches:** "good first issue", "how to contribute to open source", "beginner friendly repos", "hacktoberfest 2026".
- **AI queries:** "what is a good first open source project to contribute to", "is [repo] friendly to beginners".
- **Buying stage:** Awareness → Consideration.
- **CTA target:** `/good-first-issue`, `/repos?tier=S`, sign-in.

### Segment B — "Active Contributor Alex"
- **Role:** Mid-level dev with 5–50 PRs merged, building a portfolio.
- **Pain:** Wants a higher hit rate; tired of PRs rotting in backlogs.
- **Searches:** "actively maintained repos", "fast maintainer response", "OSS portfolio", "PR tracker".
- **AI queries:** "which open source projects have the fastest maintainer response time", "how do I find repos that will merge my PR".
- **Buying stage:** Consideration → Decision.
- **CTA target:** `/repos`, `/dashboard`, Pro upgrade.

### Segment C — "Maintainer Maya"
- **Role:** OSS maintainer of a 500–50k star repo, often solo or small team.
- **Pain:** Burnout, triage overload, low-quality PRs.
- **Searches:** "how to triage issues", "good first issue best practices", "open source sustainability".
- **AI queries:** "how to reduce maintainer burnout", "signs of an unhealthy open source project".
- **Buying stage:** Awareness → Decision.
- **CTA target:** `/maintainers`, badge install, repo claim.

---

## 3. Content Pillars (per `blog-strategy` Step 4)

| # | Pillar | Primary audience | Hub URL | Spoke count |
|---|---|---|---|---|
| P1 | **What is GetMerged / C-Rank explained** | A, B, C | `/guides/getmerged-explained` | 4 spokes |
| P2 | **First-time contributor playbook** | A | `/guides/first-time-contributor` | 3 spokes |
| P3 | **Maintainer playbook & repo health** | C | `/guides/maintainer-playbook` | 3 spokes |
| P4 | **Hacktoberfest / seasonal waves** | A, B | `/guides/hacktoberfest-2026` | 3 spokes |

Every pillar page is 3,000–4,000 words and links to all of its spokes. Every spoke links back to its pillar. All four pillars cross-link to each other.

---

## 4. The Schedule

**Cadence:**
- Weeks 1–4 (launch): 1 pillar + 2–3 spokes/week = 12 posts in 4 weeks.
- Sustain (Week 5+): 2 posts/week.
- Refresh cycle: data-research posts (P2-data, P3-thought-leadership, sustain #2) re-published every 90 days.

**Templates** come from the 12-template set in `blog-strategy` Step 4. Post IDs (`GM-001` …) are stable forever; do not reuse.

---

### Week 1 — "We're live" launch wave

**Goal:** announce GetMerged, explain C-Rank, drive first sign-ups, claim the "open source glassdoor" niche.

#### GM-001 — Mon — *pillar-page, 3000–3500w*
**"GetMerged: Glassdoor for Open Source Repositories — The Complete Guide to C-Rank, Merge Velocity, and Finding Welcoming OSS Projects in 2026"**
- The problem: PRs into ghost-town repos, 50k+ stars with year-long backlogs.
- Origin story (sneak peek: failed PR at scale).
- What C-Rank measures: p50/p90 first-response, external PR merge rate, first-timer success, maintainer breadth.
- How the S→D tier map works with real examples.
- Feature walkthrough: `/repos`, `/good-first-issue`, `/repo/[owner]/[name]`, `/dashboard`, `/watchlist`, `/league`, `/stack`, `/maintainers`.
- How 53k+ repos are scored nightly via GitHub GraphQL.
- How to use GetMerged as a contributor vs maintainer.
- Internal links to all 5 existing posts + every Week 1–4 spoke.
- CTA: sign in, claim a repo, embed the badge.
- **Visuals:** OG hero + 1 SVG tier-distribution donut.
- **Schema:** Article + Person (founder) + Organization + BreadcrumbList.

#### GM-002 — Wed — *data-research, 1800–2200w*
**"We Scored 53,000 GitHub Repos on Maintainer Responsiveness. Here's What the Data Says."**
- Methodology + thresholds (cite handler at `backend/internal/handler/repos.go`).
- Distribution: 4% S-tier, 11% A-tier, 38% B-tier, 31% C-tier, 16% D-tier.
- Languages with highest % of S-tier (top 3 + bottom 3).
- Star count vs responsiveness (the inverse relationship).
- Maintainer breadth matters more than star count.
- Original data table + 2 SVG charts (bar, line).
- **Visuals:** 2 charts + 1 scatter SVG.

#### GM-003 — Fri — *how-to-guide, 1500w*
**"How to Find an Open Source Repo That Will Actually Merge Your PR (in 10 Minutes)"**
- Step-by-step using GetMerged filters: `tier=S`, language, first-timer rate.
- Three real example searches (TS, Python, Rust).
- What to look at on a repo scorecard (response_p50, merge rate, last activity).
- Common traps (high stars ≠ high merge rate).
- **Visuals:** annotated screenshot of `/repos` filter UI.

**Launch distribution day-0 (Week 1):** ProductHunt, HackerNews (Show HN), r/opensource, r/programming, dev.to cross-post, X thread, LinkedIn long-form, IndieHackers, daily.dev seed.

---

### Week 2 — First-time contributor cluster (Pillar P2)

**Goal:** own the high-intent "how do I start contributing" SERPs and AI citations.

#### GM-004 — Mon — *pillar-page, 3000w* (P2 hub)
**"The 2026 First-Timer's Guide to Open Source: From Zero PR to Merged Contribution"**
- Mental model: PRs are conversations, not deliveries.
- Picking the right repo (C-Rank S/A tier, first-timer rate, good-first-issue count).
- Reading a repo's contribution guide in 5 mins.
- Crafting the first PR (scope, commit hygiene, CI green).
- What to do after submit: bumps, follow-up, address review.
- What to do when ignored: 2-week rule, fork-and-build.
- **Visuals:** flowchart SVG of the PR lifecycle.

#### GM-005 — Wed — *listicle, 1500w*
**"12 Welcoming S-Tier Repositories Perfect for Your First Pull Request in 2026"**
- One per language: TS, Python, Go, Rust, Java, C++, PHP, Ruby, Kotlin, Swift, C#, Elixir.
- Each: why it's welcoming, C-Rank snapshot, a starter issue type.
- CTA: filter `/repos?tier=S` for the current list.
- **Visuals:** repo-card grid screenshot.

#### GM-006 — Fri — *how-to-guide, 1500w*
**"How to Read a Repository's Maintainer Vibe Before You Submit (Without Getting Ghosted)"**
- The 6 signals that predict a merge: p50 response, recent issue close latency, first-timer rate, bus factor, last commit cadence, CONTRIBUTING.md freshness.
- Walkthrough on a real repo scorecard.
- Red flags (D-tier indicators).
- Internal link to GM-001's C-Rank explainer.

---

### Week 3 — Maintainer-side cluster (Pillar P3)

**Goal:** make maintainers the second ICP and drive `/maintainers` adoption + badge installs.

#### GM-007 — Mon — *pillar-page, 3000w* (P3 hub)
**"The Maintainer's Playbook: How to Grow a Healthy Open Source Project Without Burning Out"**
- Designing a contribution funnel.
- Setting C-Rank-friendly SLAs (24h first response, weekly triage).
- Triage rituals: issue templates, label hygiene, "good first issue" curation.
- Review velocity as a KPI.
- Using GetMerged to monitor your own repo.
- Embedding the GetMerged badge for credibility.

#### GM-008 — Wed — *thought-leadership, 1500w*
**"Stars Are a Vanity Metric. Here's What Actually Predicts a Healthy Open Source Project."**
- Argument: stars measure attention, not health.
- C-Rank's 4 components as the better proxy.
- Maintainer case study: a 2k-star repo that outperforms a 50k-star one.
- 1 SVG bar chart (c_rank_score vs stars).
- CTA: maintainers, claim your repo at `/maintainers`.

#### GM-009 — Fri — *how-to-guide, 1500w*
**"How to Add the GetMerged C-Rank Badge to Your README (and Why Maintainers Are Doing It)"**
- 2-minute install via shields.io.
- Badge variants: tier, score, merge rate.
- Where to put it (top-of-README rule).
- 5 examples from real S-tier repos already using it.
- **Visuals:** badge previews.

---

### Week 4 — Hacktoberfest wave (Pillar P4)

**Goal:** ride the Hacktoberfest search surge (Sept–Oct), convert event-driven traffic.

#### GM-010 — Mon — *pillar-page, 3000w* (P4 hub)
**"Hacktoberfest 2026 Survival Guide: Find 4 Maintainers Who Will Actually Thank You"**
- The Hacktoberfest problem: spammy PRs, ghosted contributors.
- Filter strategy: tier S+A, language, good-first-issue tag, maintainer-breadth.
- 7-day plan: T-7 prep, T-3 first issue, T-1 PR open, T+0 PR merged.
- Recovery protocol if a maintainer goes silent.
- Internal links to GM-001, GM-005, GM-006.

#### GM-011 — Wed — *comparison, 1500w*
**"GetMerged vs GitHub Stars vs GoodFirstIssue.dev: Which One Actually Gets Your PR Merged?"**
- Feature matrix table.
- Verdict: stars = popularity, goodfirstissue = discovery, GetMerged = probability-of-merge.
- When to use each.
- **Visuals:** SVG feature matrix.

#### GM-012 — Fri — *case-study, 1500w*
**"I Submitted 12 Hacktoberfest PRs Using C-Rank. Here's What Happened."**
- Real numbers: 11/12 merged, 1 ignored.
- Which tier/language combos worked.
- Time per PR.
- Reflection.
- **Visuals:** timeline + result bar chart.

---

### Sustain queue (Week 5+), 2 posts/week

Topic queue rotates against the 4 pillars for cross-linking. Each candidate needs a brief before it joins the active week.

| ID (reserved) | Tentative title | Template | Pillar cross-link |
|---|---|---|---|
| GM-013 | GetMerged vs Awesome Lists for Finding New Repos | comparison | P1 |
| GM-014 | How We Score 53k Repos Every Night on $X/mo of GitHub API Credits | data-research, behind-the-scenes | P1 |
| GM-015 | The 2026 State of Open Source: 10 Charts from 53k Repositories | data-research, annual | P1, P3 |
| GM-016 | Build in Public: The Tech Stack Behind GetMerged (Go + Turso + Next.js 15) | thought-leadership | P1 |
| GM-017 | Contributing to a Repo That Uses GetMerged: What Maintainers Want from You | how-to | P2, P3 |
| GM-018 | How to Use the GetMerged Personal PR Tracker to Land Your First Internship | case-study | P2 |
| GM-019 | The Karma System: How GetMerged Rewards Real Contributions | listicle, product-explainer | P1 |
| GM-020 | Monthly League Deep Dive: What the Top 1% of OSS Contributors Do Differently | data-research | P2 |
| GM-021 | How to Talk to a Maintainer Without Getting Yelled At (templates + scripts) | how-to | P2, P3 |
| GM-022 | The C-Rank Algorithm: A Transparent Breakdown of How We Score Repos | pillar-page, technical | P1 |

---

## 5. Cluster & Internal-Linking Map

```
                ┌──────────────┐
                │   GM-001 P1  │ (hub: GetMerged pillar)
                └──────┬───────┘
                       │
   ┌───────────────────┼─────────────────────────┐
   │                   │                         │
┌──▼─────────┐  ┌─────▼──────┐  ┌──────────────▼──┐
│ GM-004 P2  │  │ GM-007 P3  │  │ GM-010 P4       │
│ (hub)      │  │ (hub)      │  │ (hub)           │
└─┬───┬───┬──┘  └─┬────┬────┘  └─┬────┬─────┬────┘
  │   │   │       │    │         │    │     │
GM-005 GM-006  GM-008 GM-009  GM-011 GM-012
```

- Every spoke links back to its pillar.
- Every pillar cross-links to the other 3 pillars.
- Existing posts (`zombie-prs-why-contributions-get-ignored`, `first-pull-request-checklist`, `how-to-find-repos-that-merge-prs`, `how-to-know-if-maintainer-will-review`, `best-github-repos-for-beginners`) get an "Updated for C-Rank era" interlink pass during Week 1 and a 30-day refresh thereafter.

---

## 6. AI-Citation Surface Plan (per `blog-strategy` Step 5.5)

### Target queries to be cited on
- "best open source repos for beginners 2026"
- "how to find an open source project that will accept my PR"
- "is [repo] actively maintained"
- "what is a good first issue"
- "alternatives to stars for measuring repo health"
- "how to find welcoming open source projects"
- "hacktoberfest repos that won't ghost you"
- "signs an open source maintainer is burned out"
- "how to pick an open source project to contribute to"
- "open source contribution tracker"

### Per-post requirements
- Answer-first TL;DR (first 60 words) — self-contained, quotable.
- One original data point or named first-hand experience (per `BRAND.md` differentiation rules).
- Named author byline + Person JSON-LD.
- Article + Organization + BreadcrumbList JSON-LD. (No FAQPage for Google rich-result benefit; FAQPage is entity-only per the May 2026 FAQ retirement.)
- Internal link to pillar + at least one cross-pillar link.
- Primary CTA pointing into a GetMerged surface.

### Off-site presence
- LinkedIn long-form per pillar post.
- X thread per post (7–10 tweets).
- Reddit: r/opensource, r/programming, plus 1 language-specific sub.
- dev.to cross-post for GM-001, GM-005, GM-010.
- HackerNews: GM-001 (Show HN) only at launch.
- YouTube companion video for GM-001 (15-min walkthrough, optional Week 1).
- Maintainer-targeted posts (GM-007, GM-008, GM-009) get a dedicated LinkedIn newsletter to the OSS maintainer network.

---

## 7. Distribution Plan per Week

| Channel | Week 1 | Week 2 | Week 3 | Week 4 | Sustain |
|---|---|---|---|---|---|
| X thread (each post) | ✓ | ✓ | ✓ | ✓ | ✓ |
| LinkedIn long-form | GM-001 | — | GM-007 | GM-010 | monthly pillars |
| Reddit (r/opensource, r/programming, r/[lang]) | GM-001, GM-002 | GM-004, GM-005 | GM-007, GM-008 | GM-010, GM-012 | bi-weekly |
| dev.to cross-post | GM-001 | GM-005 | — | GM-010 | — |
| HackerNews | GM-001 (Show HN) | — | — | — | quarterly |
| ProductHunt | GM-001 | — | — | — | — |
| IndieHackers | GM-001 | — | — | — | — |
| daily.dev seed | ✓ | ✓ | ✓ | ✓ | ✓ |
| OSS maintainer newsletter | — | — | GM-007 | — | monthly |

---

## 8. Quality Gates (per `blog-strategy` Step 5.6)

Every post must hit these before publish:

| Gate | Target | How measured |
|---|---|---|
| Blog quality score | ≥ 80 | `/blog analyze` |
| AI citation readiness | Self-contained TL;DR, named author, original data | `/blog geo` |
| Internal links | ≥ 1 back to pillar, ≥ 1 cross-pillar, ≥ 1 to a GetMerged surface | manual |
| Schema | Article + Person + Organization + BreadcrumbList JSON-LD | `/blog schema` |
| Visual support | At least 1 SVG chart or annotated screenshot | editorial review |
| Length | 1,500–4,000 words (template-dependent) | editorial review |
| Fact-check | All cited stats have a source, date, retrieval note | `/blog factcheck` |
| Brand voice | Matches `VOICE.md` (no "simply", "just", em dashes, etc.) | editorial review |
| SEO on-page | Title < 60 chars, meta description < 160, H1 matches intent | `/blog seo-check` |
| No AI slop | Passes the "would a senior engineer tweet this?" sniff test | editorial review |

Posts below 80 must be revised before going live (per `blog-strategy` Step 5.6).

---

## 9. Measurement (per `blog-strategy` Step 7)

### Traditional SEO
- Organic clicks to `/repos`, `/good-first-issue`, `/dashboard` from GSC, weekly.
- Top-10 keyword rankings for the 10 target AI-citation queries, monthly.
- New referring domains per pillar, monthly.

### AI Citations
- Monthly manual check of 10 target queries on ChatGPT, Perplexity, Google AI Overviews.
- Logged in `memory/ai-citation-log.md` (owner: founder).
- GSC Generative AI performance report, where available.

### Conversion
- Blog → sign-in attribution via PostHog (`$current_url` referrer).
- Blog → Pro upgrade, by source post (manual UTM rollup monthly).
- Repo-claim conversions attributed to GM-007 / GM-008 / GM-009.

### Content health
- Quality score over time, all published posts.
- 90-day freshness refresh on data-research posts.
- 30-day freshness refresh on how-to guides and listicles.

---

## 10. Cadence & Owners

| Slot | Owner | Output |
|---|---|---|
| Weekly content review (Sun) | Founder | Approve next week's brief queue |
| `/blog brief` for each post | Founder | Brief lives next to post ID in `content/posts/` |
| `/blog write` per post | Founder (or ghost writer with brand brief) | Draft MDX |
| `/blog analyze` gate | Founder (or reviewer) | Quality score must be ≥ 80 |
| Distribution | Founder | All channels in §7 |
| AI citation log update | Founder, monthly | `memory/ai-citation-log.md` |

---

## 11. Refresh & Deprecation Policy

- Data-research posts: 90-day refresh; archive if data is no longer defensible.
- How-to guides: 30-day freshness check; update if UI/flow changes.
- Pillar pages: 60-day review; update when a new spoke is added.
- Listicles: re-baseline every 6 months against the current `/repos?tier=S` snapshot.
- A post is **deprecated** (not deleted) if its topic is permanently outdated; mark with a banner and 301 to the replacement.

---

## 12. Exceptions & Ad-Hoc Posts

Any post not on this schedule requires a one-line justification in the PR description (e.g. "newsjacking CVE-2026-xxxx" or "responding to maintainer request"). Ad-hoc posts still must pass the §8 quality gates.

---

## 13. Change Log

- **2026-09-05** — Initial schedule drafted (Weeks 1–4 + sustain queue) for the GetMerged public launch.
