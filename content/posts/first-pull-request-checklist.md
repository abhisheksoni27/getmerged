---
title: "First Pull Request Checklist: The Pre-Flight Routine for Open Source Contributions"
description: "A first pull request checklist that survives contact with real maintainers: repo pre-flight signals, reproduction-step structure, commit message hygiene, and draft PR strategy — grounded in what GetMerged's merge telemetry says actually gets PRs merged."
slug: first-pull-request-checklist
date: 2026-08-23
lastUpdated: 2026-08-23
author: "GetMerged Team"
section: Guides
keywords: ["first pull request checklist", "open source contribution checklist", "commit message hygiene", "draft pull request"]
jsonld: |
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        "@id": "https://getmerged.abhishekco.de/guides/first-pull-request-checklist#howto",
        "name": "First Pull Request Checklist: Pre-Flight for Open Source Contributions",
        "description": "Repo pre-flight checks, reproduction steps, commit hygiene, and draft PR strategy before opening your first open source pull request.",
        "author": { "@type": "Organization", "name": "GetMerged" },
        "publisher": { "@type": "Organization", "name": "GetMerged" },
        "datePublished": "2026-08-23",
        "dateModified": "2026-08-23",
        "totalTime": "PT45M",
        "step": [
          { "@type": "HowToStep", "position": 1, "name": "Verify the repo merges outsiders", "text": "Confirm external merge rate above 50%, p50 response under 72 hours, and a merged external PR within 180 days." },
          { "@type": "HowToStep", "position": 2, "name": "Pick a live, scoped issue", "text": "Choose an issue under 60 days old with maintainer activity within 48 hours and a 50-1200 word description." },
          { "@type": "HowToStep", "position": 3, "name": "Claim and reproduce", "text": "Comment to claim, then reproduce the issue and record exact steps in the PR description." },
          { "@type": "HowToStep", "position": 4, "name": "Write clean commits", "text": "Imperative subjects under 72 characters, one logical change per commit, issue references in the body." },
          { "@type": "HowToStep", "position": 5, "name": "Open as draft, then ready", "text": "Push early as a draft PR, mark ready only when CI is green and the description is complete." }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://getmerged.abhishekco.de/" },
          { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://getmerged.abhishekco.de/guides" },
          { "@type": "ListItem", "position": 3, "name": "First Pull Request Checklist" }
        ]
      }
    ]
  }
---

# First Pull Request Checklist: The Pre-Flight Routine for Open Source Contributions

Most first PRs fail on process, not code quality. They target repos that never review outsiders, reference issues nobody owns anymore, or arrive as 900-line diffs against a moving branch. Every one of those failures is checkable *before* you write code.

This checklist is ordered by when each item becomes cheap to verify — starting minutes before you clone, ending at "Mark ready for review." It encodes what our telemetry shows about merged versus abandoned external PRs across 53,000+ repositories ([methodology](/how-c-rank-works)).

> **Key Takeaways**
> - Verify three repo-side numbers first: external merge rate > 50%, p50 response ≤ 72 h, last external merge ≤ 180 days.
> - Claim issues with maintainer heat (reply within 48 h) and age under 60 days; both are strong merge predictors.
> - Small diffs outperform: fit scoring rates small changes 95/100 vs 60/100 for large ones.
> - Open draft early, go ready late — after CI passes and the description contains reproduction steps, not before.

## Stage 1: Repo Pre-Flight (5 Minutes)

Run these checks before writing any code. All five are precomputed on every [GetMerged repo page](/repos); manual instructions in [how to know if a maintainer will review](/guides/how-to-know-if-maintainer-will-review).

| # | Check | Pass condition | Why it's first |
|---|---|---|---|
| 1 | External merge rate | > 50% (ideally 60%+) | Highest-weighted C-Rank term; below half, most outside work dies |
| 2 | p50 first response | ≤ 72 h | 74% of all answered PRs get their answer within 72 h of opening |
| 3 | Last external merge | ≤ 180 days | Past this line the repo is formally stale — capped at tier D |
| 4 | Active maintainers (90 d) | ≥ 2, ideally ≥ 3 | Bus factor 1 caps even great repos at tier B and couples you to one calendar |
| 5 | CONTRIBUTING.md exists | Any of 4 standard paths | Worth 40% of the onboarding score; its absence means improvising procedure |

Failing #1–#3? Don't fixate — pick another candidate from [/rankings](/rankings/python) or the beginner shortlist in [best GitHub repos for beginners](/guides/best-github-repos-for-beginners). The sunk cost so far is five minutes.

## Stage 2: Issue Selection (10 Minutes)

The issue you pick predicts your outcome more than the code you write.

- **Age ≤ 60 days** (half credit to 120). Older "good first issues" usually have invisible blockers or an inactive claimant.
- **Maintainer heat:** maintainer-authored, maintainer-replied within 48 h, or a mentor comment. This block is worth up to 40 of 100 points on GFI Quality Score — it's the difference between triaged and decorative labels.
- **Scope evidence:** description of 50–1,200 words, ideally with a snippet or repro. Over 1,500 words usually means an unresolved crash saga wearing a friendly label.
- **Unclaimed:** confirm no assignee and no recent "working on this" comment; if claimed 2+ weeks ago without a linked PR, politely ask whether it's still active.

Live candidates per language with quality scores attached: [/good-first-issue/{lang}](/good-first-issue/python).

## Stage 3: Claim and Reproduce (15 Minutes)

1. **Claim visibly.** One short comment: what you'll do, roughly when. In bus-factor-1 repos this doubles as a reservation ticket.
2. **Reproduce before fixing.** For bugs: trigger it on the default branch. For features/docs: locate the exact file, build, or output affected.
3. **Record the reproduction while it's fresh** — environment, commands, expected-vs-actual. This text becomes the core of your PR description; writing it now means the fix can't quietly drift from the problem.
4. **Check the docs you're joining:** PR template fields, commit-signoff requirements (DCO), lint/format hooks, test commands. Enterprise-governed projects (common in Java/C#) often require signed commits — cheaper to configure now than in review.

## Stage 4: Commit Message Hygiene (Ongoing While Coding)

Reviewers read your log before your diff. Keep it boring:

- **Subject:** imperative mood ("Add retry to webhook dispatcher"), ≤ 72 characters, no trailing period. `Fix bug` fails; `Fix off-by-one in rate limiter window` passes.
- **One logical change per commit.** If a commit message needs "also" or "and", split it.
- **Body:** wrap ~72 characters; explain *why* where the diff can't; reference the issue (`Fixes #1234` auto-closes it on merge — use deliberately).
- **No debris:** no commented-out code, debug prints, or unrelated formatting sweeps. Reformat-only noise inflates your diff size — and diff size itself is scored against you (next stage).
- **Sign-off/config per project rules:** `-s` for DCO repos, branch naming if CONTRIBUTING.md specifies it.

## Stage 5: Size the Diff Like It's Being Graded (Because It Is)

Fit scoring explicitly rewards smaller surface area:

| Diff shape | Fit score | Reviewer reality |
|---|---|---|
| Small, focused (< ~100 lines, few files) | 95 | Reviewable in one sitting; fast merge path |
| Medium | 80 | Normal; expect a round or two |
| Large (> ~400 lines / many files) | 60 | Multi-session review; highest abandonment risk |

If scope crept: split the PR (foundational refactor first, feature second), or strip nice-to-haves into follow-up issues. A merged 60-line PR beats an unreviewed 600-line one by every metric we track.

## Stage 6: Draft PR Strategy

The draft model removes the worst failure mode — silence between "I opened it" and "someone looked":

1. **Push early, open as draft** once it compiles and your reproduction case runs. Drafts signal "feedback welcome, not merge-ready," which buys reviewer patience for visible progress.
2. **Paste the reproduction steps into the description** using the repo's template headings. Lead with the problem, then approach, then verification ("reproduced on `main`, fixed by this change, covered by test X").
3. **Let CI run fully.** Mark ready only when checks are green locally observed — red-dot PRs sink to the bottom of triage queues exactly when you need visibility most.
4. **Link, don't orphan:** connect the draft to its issue so it appears in the maintainer's triage view instead of relying on notifications.
5. **Timebox the wait after marking ready:** ping politely at ~72 hours if silent (the window where 74% of eventual answers land); past day 14, redirect effort rather than accumulate zombie risk ([abandonment curve](/guides/zombie-prs-why-contributions-get-ignored)).

GetMerged's [watchlist](/watchlist) tracks a candidate repo's telemetry while you work so staleness surprises don't land mid-review.

## The 30-Second Version

```
[ ] Repo merges outsiders   (merge rate > 50%, p50 <= 72h, last merge <= 180d)
[ ] Issue has maintainer heat (<= 48h reply) and age <= 60d
[ ] Reproduced + steps recorded
[ ] Commits: imperative, <= 72 chars, one change each, Fixes #ref
[ ] Diff small and focused
[ ] Draft pushed early -> ready only on green CI + full description
[ ] Pinged at ~72h if silent; redirected by day 14
```

Seven boxes, roughly 45 minutes of overhead. Against them: the difference between becoming someone's repeat contributor and feeding the index's next abandonment-curve data point.
