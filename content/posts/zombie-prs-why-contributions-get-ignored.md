---
title: "Zombie PRs: Why GitHub Pull Requests Get Ignored (A 53k-Repo Data Study)"
description: "Why do GitHub pull requests get ignored? A telemetry study of 53,000 repositories: the GitHub Star Illusion, single-maintainer bus factor bottlenecks, and the review abandonment curve that decides your PR's fate in 72 hours."
slug: zombie-prs-why-contributions-get-ignored
date: 2026-08-23
lastUpdated: 2026-08-23
author: "GetMerged Team"
section: Guides
keywords: ["why github pull requests get ignored", "zombie pull request", "stale PR", "maintainer bus factor", "open source data study"]
jsonld: |
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ScholarlyArticle",
        "@id": "https://getmerged.abhishekco.de/guides/zombie-prs-why-contributions-get-ignored#article",
        "headline": "Zombie PRs: Why GitHub Pull Requests Get Ignored (A 53k-Repo Data Study)",
        "description": "Telemetry study of why external pull requests get ignored: star-count illusion, single-maintainer bottlenecks, and review abandonment curves.",
        "author": { "@type": "Organization", "name": "GetMerged" },
        "publisher": { "@type": "Organization", "name": "GetMerged" },
        "datePublished": "2026-08-23",
        "dateModified": "2026-08-23",
        "mainEntityOfPage": "https://getmerged.abhishekco.de/guides/zombie-prs-why-contributions-get-ignored",
        "keywords": "why github pull requests get ignored, stale PR, maintainer bus factor"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://getmerged.abhishekco.de/" },
          { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://getmerged.abhishekco.de/guides" },
          { "@type": "ListItem", "position": 3, "name": "Zombie PRs" }
        ]
      }
    ]
  }
---

# Zombie PRs: Why GitHub Pull Requests Get Ignored

A zombie PR is an outside contribution that was never rejected. It just stopped existing as a conversation — no human ever commented, the author's notifications went quiet, and weeks later a bot closed it or it rotted open forever.

These PRs are the largest unmeasured cost in open source contribution. This study quantifies them using the GetMerged telemetry index: **53,000+ public repositories**, each observed through the same GitHub GraphQL collection pipeline (closed/merged PR threads with per-comment timestamps, author associations, and reviewer identity), rolling 180-day windows, snapshot dated **August 2026**. Bots — Dependabot, GitHub Actions, codecov, stale-bot, `[bot]` accounts, vercel, sentry-io — are excluded from every human-interaction figure below.

> **Key Takeaways**
> - 38% of closed external PRs in the index received zero human comments before closing. They weren't declined; they were never processed.
> - Star count predicts almost nothing: log(stars) correlates with external merge rate at r ≈ 0.11 across 53k repos.
> - 41% of repos with external PR activity had exactly one active insider across the trailing 90 days — when that person disengages, every open PR dies simultaneously.
> - Among external PRs that eventually got a first human response, 74% got it within 72 hours of opening. If your PR has no human comment after 14 days, its lifetime probability of review drops to ~9%.

## The GitHub Star Illusion

The default discovery heuristic — find popular repos, contribute there — assumes attention converts to maintenance capacity. The index says otherwise.

Correlating `log10(stargazerCount)` against external merge rate across all 53k indexed repos yields **r ≈ 0.11**: stars explain roughly 1% of the variance in whether outside PRs merge. The scatter has two regimes:

| Regime | Share of index | External merge behavior |
|---|---|---|
| High-star, high-throughput | ~14% | Median merge rate 71%; p50 response under a day; foundations and funded projects with review rotas |
| High-star, low-throughput | ~29% | Median merge rate 34%; p50 response over three days; popular code, closed maintenance loop |

Both regimes contain repos with tens of thousands of stars. The README cannot tell you which regime you're entering; the PR history can. That gap — identical stardom, opposite contributor outcomes — is what C-Rank's highest-weighted merge-rate signal exists to expose. Popular does not mean staffed.

## Bus Factor One: The Single-Maintainer Bottleneck

GetMerged computes each repo's bus factor as the count of distinct insiders (`OWNER`, `MEMBER`, `COLLABORATOR`) who authored or commented on PRs within a configurable window (90 days by default). Bot identities don't count.

**41% of repositories with any external PR activity had exactly one active insider.** For contributors this is the single most predictive fragility signal in the index:

- Single-insider repos show p50 first-response times 3–4× their multi-maintainer tier-peers, because the queue drains only when one person is online.
- Their merge rates are bimodal: either excellent (a dedicated sole maintainer who triages daily) or near-zero (the same person, after life intervenes). The distribution has no healthy middle.
- When the single insider disengages mid-window, *every* open external PR stalls at once — the classic mass-zombie event.

This risk is priced directly into C-Rank: **bus factor ≤ 1 caps a repository at tier B**, regardless of score. A heroically responsive solo maintainer can earn a strong B; they cannot be graded S, because the grade asserts something about the *next* contributor's experience, and that experience depends on one person's calendar.

## The Review Abandonment Curve

For every closed external PR, we measure the time from opening to the first comment or review by another human. Pooling the index:

| Milestone | Observation |
|---|---|
| First human response, all reviewed PRs | median (p50) 27 h, tail (p90) 9+ days |
| Response within 72 h | 74% of all PRs that were ever answered |
| Still unanswered at day 7 | 24% of opened external PRs |
| Still unanswered at day 14 | 11% — and only ~9% of these are ever reviewed before closing |
| Closed with zero human comments | 38% of all closed external PRs |

The curve is brutally front-loaded. **The first 72 hours decide almost everything.** A PR that gets no human interaction in its first two weeks is, functionally, already dead — the remaining 9% survival rate comes mostly from repos that batch-review monthly, not from late conversions.

Mechanically, zombies close in one of three ways:

1. **Stale-bot sweep:** an automated `stale` labeler closes the thread for inactivity — the bot's own closure notice is often the only "comment" the PR ever receives.
2. **Author retraction:** the contributor closes their own PR after silence, usually between day 10 and day 30.
3. **Quiet rot:** the PR stays open indefinitely against a moving default branch until it can no longer merge.

All three share the same root cause measured above: nobody with merge rights engaged in week one.

## What Actually Predicts Being Ignored

Ranked by effect size on zombie probability in the index:

| Signal | Zombie-risk multiplier (vs index baseline) |
|---|---|
| Repo merged zero external PRs in trailing 180 days (ghost) | ~6× |
| Bus factor 1 with last insider activity > 21 days ago | ~4× |
| p50 first-response latency > 72 h | ~3× |
| Review coverage < 50% (share of external PRs receiving any human comment) | ~2.5× |
| Large diff (> ~400 changed lines) to a file area without recent commits | ~2× |
| No CONTRIBUTING.md / no PR template | ~1.5× |

Note what's absent: issue count, release cadence, README polish, and stars all matter far less than the four behavioral metrics GetMerged scores. Ghost status alone — the staleness flag that hard-caps a repo at tier D — multiplies your odds of writing into a void by six.

## If You're the Contributor

- Check the abandonment profile *before* writing code: five signals in [how to know if a maintainer will review](/guides/how-to-know-if-maintainer-will-review), precomputed on every [repo page](/repos).
- Prefer repos where strangers' PRs demonstrably merge: start from [/rankings](/rankings/go) or the methodology in [how to find repos that merge PRs](/guides/how-to-find-repos-that-merge-prs).
- Timebox the wait: if no human responds within ~72 hours, a polite ping is warranted; past day 14, redirect effort to a repo whose curve shows it answers.
- First-timers should bias toward ecosystems and patterns with proven conversion — see [best GitHub repos for beginners](/guides/best-github-repos-for-beginners).

## If You're the Maintainer

Zombie PRs are unbilled debt, and the fixes are procedural: a review rota that survives one person's absence (pushes bus factor ≥ 2), a stated batching cadence ("we review PRs Tuesdays" beats silence), stale-bot grace periods longer than your actual response time, and a CONTRIBUTING.md that routes small fixes so they don't compete with design-heavy ones. Repos in the top decile of first-timer success differ from the median mainly on these four mechanics — not on headcount or fame.

## Methodology

Full metric definitions — merge rate, time-to-first-response percentiles, review coverage, bot filtering rules, bus factor windows — are documented on [how C-Rank works](/how-c-rank-works). All figures derive from the same production pipeline that scores the public rankings; per-repo numbers carry explicit "telemetry updated" timestamps on their pages. Index-level aggregates in this study reflect the August 2026 crawl of 53,000+ repositories.
