---
title: "How to Find Open Source Projects to Contribute To (Using Merge Data, Not Stars)"
description: "A data-driven method for finding open source projects that actually merge outside contributions: C-Rank formula weights, response velocity bands, Bayesian sample-size math, and how to spot ghost codebases before you write code."
slug: how-to-find-repos-that-merge-prs
date: 2026-08-23
lastUpdated: 2026-08-23
author: "GetMerged Team"
section: Guides
keywords: ["how to find open source projects to contribute to", "open source contribution", "merge rate", "C-Rank", "ghost repository"]
jsonld: |
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": "https://getmerged.abhishekco.de/guides/how-to-find-repos-that-merge-prs#article",
        "headline": "How to Find Open Source Projects to Contribute To (Using Merge Data, Not Stars)",
        "description": "A data-driven method for finding open source projects that actually merge outside contributions: C-Rank weights, response velocity, and ghost codebase detection.",
        "author": { "@type": "Organization", "name": "GetMerged" },
        "publisher": { "@type": "Organization", "name": "GetMerged" },
        "datePublished": "2026-08-23",
        "dateModified": "2026-08-23",
        "mainEntityOfPage": "https://getmerged.abhishekco.de/guides/how-to-find-repos-that-merge-prs",
        "keywords": "how to find open source projects to contribute to, merge rate, C-Rank, ghost repository"
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://getmerged.abhishekco.de/" },
          { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://getmerged.abhishekco.de/guides" },
          { "@type": "ListItem", "position": 3, "name": "How to Find Repos That Merge PRs" }
        ]
      }
    ]
  }
---

# How to Find Open Source Projects to Contribute To (Using Merge Data, Not Stars)

Most contribution advice tells you to browse by topic and hope for the best. The measurable alternative: rank candidate repositories by what happens to outside pull requests after they're opened — merge rate, first-response latency, and maintainer breadth — all computable from public GitHub GraphQL data.

We run exactly this pipeline at [GetMerged](https://getmerged.abhishekco.de/): 53,000+ public repositories indexed via the GitHub GraphQL API, each scored on a rolling 180-day window of PR telemetry. This guide shows the full scoring math so you can apply it manually or let the rankings do it for you.

> **Key Takeaways**
> - External merge rate carries the highest weight (0.275) in GetMerged's C-Rank™ score; star count carries zero.
> - Repositories need roughly 6 closed external PRs before their score reaches ~63% confidence, and ~20 before it exceeds 96% — small samples are shrunk toward neutral, so a lucky repo can't fake an S-tier.
> - A repository with no external PR merged in 180 days is flagged stale and hard-capped at tier D, regardless of every other metric.
> - Median first-response time across the GetMerged index is 27 hours; S-tier velocity starts under 6 hours.

## Star Count Is the Wrong Filter

Stars measure attention. They say nothing about whether a stranger's pull request gets read. Across the GetMerged index, the correlation between log-star-count and external merge rate is r ≈ 0.11 — statistically detectable, practically useless for picking a target. Our full breakdown of this gap is in [zombie PRs: why contributions get ignored](/guides/zombie-prs-why-contributions-get-ignored).

What does predict a merged PR is recent, observed merge behavior on *external* contributions — PRs from people with `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or no association to the repo. Insiders (`OWNER`, `MEMBER`, `COLLABORATOR`) merging each other's work tells you nothing about your odds.

## The C-Rank Formula, Weight by Weight

C-Rank scores each repository 0–100 as a weighted sum of nine percentile-normalized metrics, then maps the score to a tier: **S** ≥ 70, **A** ≥ 55, **B** ≥ 40, **C** ≥ 25, **D** below 25.

| Metric | Weight | What it measures |
|---|---|---|
| External PR merge rate | 0.275 | % of outside PRs closed as MERGED in the 180-day window |
| First-response time | 0.150 | Median hours until a human comments on an external PR |
| Activity recency | 0.150 | Days since the last external PR was merged |
| First-timer success | 0.100 | % of first-time contributors whose PR was merged |
| Time-to-merge | 0.100 | Median hours from PR open to merge |
| Repeat contributor rate | 0.100 | % of external authors who came back |
| Review rounds | 0.050 | Median comment count per merged PR (fewer = tighter process) |
| Maintainer breadth | 0.050 | Distinct maintainers active on PRs |
| Responsiveness | 0.025 | Mirrors first-response latency |

Three design choices matter when you're choosing where to spend a weekend:

1. **Merge rate dominates.** A repo that merges 8 of 10 outside PRs beats a repo that merges 2 of 10 even if the second has better response times everywhere else.
2. **First-timer success is a real term (0.10),** computed from GitHub's own `FIRST_TIME_CONTRIBUTOR` association — not inferred.
3. **Repos with live `good first issue` backlogs get a damped bonus:** min(5.0, 2.5 · ln(1 + issueCount)), capped at 5 points. One labeled issue adds ~1.7 points; ten or more hits the cap. Beginner-friendly posture nudges, never dominates.

The complete metric definitions live on [how C-Rank works](/how-c-rank-works); you can browse the output on the [/repos explorer](/repos) or per-language [/rankings](/rankings/go).

## Sample Size: When to Trust a Score

Raw percentages lie when the denominator is two PRs. GetMerged applies Bayesian shrinkage toward a neutral prior of 50 using confidence = 1 − e^(−n/6):

| Closed external PRs (n) | Confidence in observed behavior |
|---|---|
| 1 | 15% |
| 3 | 39% |
| 6 | 63% |
| 15 | 92% |
| 20+ | 96%+ |

Practical rule: treat sub-6-PR scores as weak signals. If you compute merge rates by hand from a repo's closed-PR list, don't trust anything below ~6 closed external PRs either. A repo with 1 PR, merged, showing "100% merge rate" is statistically indistinguishable from noise.

## Response Velocity: The Band That Predicts Everything Else

Median hours to first human response (bots excluded — Dependabot, GitHub Actions, `[bot]` accounts, codecov, stale-bot, sentry-io, vercel are filtered before averaging) splits the index into four velocity bands:

| p50 first response | Velocity score | What it feels like as a contributor |
|---|---|---|
| ≤ 6 h | 98 | Same-day triage; maintainer is watching the queue |
| ≤ 24 h | 80 | Normal healthy project cadence |
| ≤ 72 h | 65 | Reviewed weekly; fine for patient contributors |
| > 72 h | 45 | Your PR will sit. Plan accordingly |

Across the whole index, median p50 response is 27 hours, but the p90 tail stretches past nine days — which is why we track both percentiles. A repo can respond to half its PRs same-day and still strand the other half for weeks. Check the p50 *and* p90 on any [repo detail page](/repo/kubernetes/kubernetes) before committing work.

## Ghost Codebases: The 180-Day Kill Switch

A ghost codebase looks alive — commits land, stars accrue — but no outsider has gotten anything merged in months. These absorb the most wasted contributor-hours in open source.

GetMerged enforces this mechanically:

- **Staleness flag:** true when no external PR was merged in the rolling 180-day window (or the last external merge is ≥ 180 days old).
- **Hard cap:** a stale repo's score is capped at 29.9 and tiered D — every other metric becomes irrelevant.
- **Scan decay:** S/A-tier repos rescan daily, B/C weekly, D/stale every 15 days; two consecutive stagnant scans push the interval to 30 days, because dead repos rarely resurrect mid-cycle.

In the August 2026 index snapshot, 31% of tracked repositories had merged zero external PRs in their trailing 180 days. Roughly one in three "active-looking" projects will not merge your work, and none of them advertise that fact on their README.

## The 15-Minute Manual Workflow

If you'd rather verify a repository yourself with the GitHub GraphQL API, these are the exact fields our collector pulls (`RepoPRsQuery`: closed/merged PRs ordered by `UPDATED_AT DESC`, with per-comment timestamps, author associations, and review threads):

1. **Pull the last ~50 closed/merged PRs** with `states: [CLOSED, MERGED]`. Note each author's `authorAssociation`.
2. **Filter to external authors** (`CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, `NONE`). Compute merged ÷ closed. Below 50%? Move on unless you have a specific in.
3. **Compute first-response latency:** for each external PR, find the earliest comment or review by anyone other than the author or a bot. Take the median.
4. **Check recency:** most recent *external* merge date. Older than 180 days → ghost, skip.
5. **Count distinct insider responders** over the last 90 days (owners/members/collaborators who commented). One name means bus factor 1 — acceptable risk, but expect vacation black holes (see [how to know if a maintainer will review](/guides/how-to-know-if-maintainer-will-review)).
6. **Cross-check onboarding docs:** the pipeline probes four `CONTRIBUTING.md` paths, three `CODE_OF_CONDUCT` paths, plus issue/PR templates via GraphQL `object(expression:)` lookups. Missing CONTRIBUTING.md correlates with ad-hoc review culture.

Or skip steps 1–6: every number above is precomputed and dated ("Telemetry updated …") on each GetMerged repo page, with tier-relative comparisons in [/compare](/compare).

## Where to Point This Method

- Shortlist candidates by language on [/rankings/python](/rankings/python), [/rankings/typescript](/rankings/typescript), [/rankings/go](/rankings/go) — 105 language ranking pages total, refreshed on tier-weighted schedules (S/A daily, B/C weekly).
- Beginners should start from the beginner-specific shortlist in [best GitHub repos for beginners](/guides/best-github-repos-for-beginners), then validate with the workflow above.
- Already have a target repo? Paste its history through the five pre-PR signals in [how to know if a maintainer will review](/guides/how-to-know-if-maintainer-will-review) before writing code.

Finding a project that merges outsiders isn't about luck or topic affinity. It's a filterable property of the repository — measured, not guessed.
