---
title: "GitHub Maintainer Response Time: 5 Signals That Predict Whether Your PR Gets Reviewed"
description: "How to read a repository's maintainer response time before writing code: p50/p90 response latency, the 180-day activity pulse, review cycle density, discussion triage, and maintainer breadth — with green/yellow/red thresholds from GetMerged's 53k-repo telemetry."
slug: how-to-know-if-maintainer-will-review
date: 2026-08-23
lastUpdated: 2026-08-23
author: "GetMerged Team"
section: Guides
keywords: ["github maintainer response time", "pr review time", "maintainer responsiveness", "will my pr be reviewed"]
jsonld: |
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "https://getmerged.abhishekco.de/guides/how-to-know-if-maintainer-will-review#article",
        "headline": "GitHub Maintainer Response Time: 5 Signals That Predict Whether Your PR Gets Reviewed",
        "description": "Five measurable signals — p50 latency, activity pulse, review density, discussion triage, maintainer breadth — that predict PR review before you write code.",
        "author": { "@type": "Organization", "name": "GetMerged" },
        "publisher": { "@type": "Organization", "name": "GetMerged" },
        "datePublished": "2026-08-23",
        "dateModified": "2026-08-23",
        "mainEntityOfPage": "https://getmerged.abhishekco.de/guides/how-to-know-if-maintainer-will-review",
        "keywords": "github maintainer response time, pr review time, maintainer responsiveness"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://getmerged.abhishekco.de/" },
          { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://getmerged.abhishekco.de/guides" },
          { "@type": "ListItem", "position": 3, "name": "Will the Maintainer Review Your PR" }
        ]
      }
    ]
  }
---

# GitHub Maintainer Response Time: 5 Signals That Predict Whether Your PR Gets Reviewed

Whether a maintainer reviews your pull request is decided largely before you open it — by patterns visible in the repo's public history. Five of those patterns are measurable in minutes, and together they beat every heuristic ("check recent commits," "look for activity") that contributors normally improvise.

All five come from GetMerged's production pipeline, which computes them for 53,000+ repositories on rolling 180-day windows via the GitHub GraphQL API. Below: what each signal is, why it predicts review, and the thresholds we use to grade them.

> **Key Takeaways**
> - p50 first-response time is the single strongest predictor; ≤ 6 h is elite, > 72 h predicts a multi-week sit.
> - Always check the p90 alongside the median: half the index's repos answer quickly while stranding their slower half for nine-plus days.
> - No external PR merged in 180 days means the review loop is closed — GetMerged hard-caps such repos at tier D.
> - One active maintainer (bus factor 1) caps even excellent repos at tier B, because one calendar controls your entire outcome.

## Signal 1: p50 Response Latency

**What it is:** the median hours between an external PR being opened and its first comment or review by another human. Bots are excluded — Dependabot, GitHub Actions, codecov, stale-bot, `[bot]` suffix accounts, vercel, and sentry-io would otherwise flatter dead repos.

Index-wide median is **27 hours**. The grading bands (used in our fit scoring):

| p50 first response | Grade | Expectation |
|---|---|---|
| ≤ 6 h | Green | Maintainer watches the queue; same-day triage culture |
| ≤ 24 h | Green | Healthy daily cadence |
| ≤ 72 h | Yellow | Weekly batching; your PR waits, but gets processed |
| > 72 h | Red | Structural neglect or extreme batching |

Why it dominates: in our abandonment analysis ([zombie PRs study](/guides/zombie-prs-why-contributions-get-ignored)), 74% of external PRs that ever received a human response got it within 72 hours of opening. Repos whose median sits beyond 72 hours are structurally outside that window.

## Signal 2: The p90 Tail

Medians hide queues. The **p90 response latency** — the point by which 90% of PRs have been answered — exposes repos that respond fast to some PRs and strand others indefinitely.

| p90 | Reading |
|---|---|
| ≤ 72 h | Even the tail is served; no hidden slow lane |
| ≤ 7 days | Normal triage variance |
| > 30 days | A permanent slow lane exists; ask *why* PRs get parked |

A repo can post a beautiful 12-hour p50 while its p90 exceeds a month — typically because drive-by contributions without an assigned reviewer are the ones that rot. Both percentiles appear on every GetMerged [repo page](/repo/kubernetes/kubernetes); manually, you compute them from the same first-comment timestamps as the p50.

## Signal 3: The 180-Day Activity Pulse

Response-time stats describe *how* a repo answers; recency describes whether it still answers at all.

The metric is **days since the last external PR was merged** (`LastActivityDays`), and the thresholds align with the staleness machinery:

| Last external merge | Pulse | Consequence in C-Rank |
|---|---|---|
| ≤ 7 days | Green | Live review loop; S/A-tier repos rescan daily at this level |
| ≤ 60 days | Yellow | Alive but slowing; check commit pulse on the default branch too |
| ≥ 180 days | Red | Staleness flag fires; score capped at 29.9, tier D, regardless of history |

That red row is absolute. A legendary project that stopped merging outsiders six months ago is graded identically to an abandoned toy — because for contribution purposes they are identical. Scan cadence decays accordingly: D/stale repos drop to 15-day rescans, then 30 days after two consecutive stagnant scans.

## Signal 4: Review Cycle Density and Discussion Triage

Two related measures of whether engagement, once it starts, actually goes somewhere:

**Review coverage** — the share of external PRs receiving any human comment:

| Coverage | Reading |
|---|---|
| ≥ 90% | Nearly every outsider gets a reply; zombies are exceptional |
| 60–89% | Normal range; some low-effort PRs pass unreviewed |
| < 50% | Half of all outside work is ignored outright |

**Review rounds** — median comment count per merged PR. Low counts (0–3) indicate rubber-stamp or very small diffs; high counts (10+) indicate deep design review. Neither is bad per se, but match your appetite: design-heavy review cultures stretch timelines regardless of raw latency. (Rust's ecosystem runs long rounds deliberately — see [best GitHub repos for beginners](/guides/best-github-repos-for-beginners).)

**Discussion triage** extends the same question to issues, which you'll touch before coding: do maintainers respond on issue threads within ~48 hours? Are issue templates enabled? An untriaged issue tracker with a fast PR queue usually means the queue is fast because nobody new gets in.

## Signal 5: Maintainer Breadth (Bus Factor)

Count distinct insiders (`OWNER`, `MEMBER`, `COLLABORATOR`) who authored or commented on PRs in the trailing 90 days. Exclude bots.

| Active insiders | Reading |
|---|---|
| ≥ 3 | Resilient rota; vacations don't stall the queue |
| 2 | Acceptable; check both accounts' recent activity |
| 1 | Single point of failure — C-Rank caps the repo at tier B |

Bus factor 1 doesn't mean avoid: many solo-maintained repos are exemplary responders. It means your outcome equals one person's availability, so verify their last-activity date directly, and prefer small diffs that need one focused review rather than consensus. The mechanics of what happens when that person goes quiet are quantified in the [zombie PRs study](/guides/zombie-prs-why-contributions-get-ignored).

## Running All Five Signals

| # | Signal | Green | Yellow | Red |
|---|---|---|---|---|
| 1 | p50 first response | ≤ 24 h | ≤ 72 h | > 72 h |
| 2 | p90 first response | ≤ 72 h | ≤ 7 d | > 30 d |
| 3 | Days since last external merge | ≤ 7 d | ≤ 60 d | ≥ 180 d |
| 4a | Review coverage | ≥ 90% | ≥ 60% | < 50% |
| 4b | Median review rounds | 1–5 | 6–9 | 10+ (design-heavy) |
| 5 | Active insiders (90 d) | ≥ 3 | 2 | 1 |

Decision rule: **any two reds = don't invest original code there.** File the idea, pick a healthier repo, revisit if the repo's telemetry improves. One red with everything else green is workable if the red is review-round depth rather than latency — depth wastes time politely; latency abandons it.

**Fast paths:** every signal above is precomputed on each repo's page at [getmerged.abhishekco.de/repos](/repos) with explicit telemetry-update timestamps, tier-relative context in [/compare](/compare), and language-filtered shortlists on [/rankings](/rankings/python). Doing it by hand instead? The GraphQL query shape (`RepoPRsQuery`: closed/merged PRs, `UPDATED_AT DESC`, comments and reviews with author associations) is documented in [how C-Rank works](/how-c-rank-works).

Once the signals clear, protect the investment you're about to make: run the [first pull request checklist](/guides/first-pull-request-checklist) before pushing your branch.
