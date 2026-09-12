---
title: "How to Find Open Source Projects to Contribute To (Using Merge Data, Not Stars)"
description: "Find open source projects that merge contributions: C-Rank formula weights, response velocity bands, and ghost codebase detection from 53k repos."
slug: how-to-find-repos-that-merge-prs
date: 2026-08-23
lastUpdated: 2026-08-23
author: "Abhishek Soni"
section: Guides
image: /images/guides/find-repos-merge-data.png
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
        "author": { "@type": "Person", "name": "Abhishek Soni" },
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

Most contribution guides tell developers to browse GitHub by topic and hope for the best. The measurable alternative is to rank candidate repositories by what happens to outside pull requests after submission.

We run this evaluation pipeline at GetMerged across 53,000 public GitHub repositories. Our research method analyzes pull request telemetry on rolling 180-day windows. We measure merge rates, response latency, and maintainer breadth to identify repositories that welcome outside contributors.

> **Key Takeaways**
> - **External merge rate** carries the highest weight in our C-Rank scoring model, while star count carries zero weight.
> - Telemetry across 53,000 repositories shows that 38% of closed external pull requests receive zero human review comments.
> - Repositories require at least six closed external pull requests before their score achieves reliable statistical confidence.
> - Projects without a merged external pull request in 180 days are flagged as stale and capped at D-tier status.
> - High-scoring repositories maintain a p50 first-response latency under 24 hours.

## Why Star Counts Fail as a Project Filter

**Star illusion** is the mistaken belief that GitHub star counts reflect maintainer availability or review velocity. Stars measure historical attention rather than ongoing review capacity.

Across our index of 53,000 repositories, the correlation between star counts and external merge rates is r = 0.11. As documented in our deep dive on [zombie PRs](/guides/zombie-prs-why-contributions-get-ignored), popular repositories often suffer from severe review queues.

According to research from the [Linux Foundation 2025 Report](https://www.linuxfoundation.org/research), repository popularity increases issue volume without expanding maintainer bandwidth:

| Repository Tier. | Index Proportion. | External Merge Rate. | First Response Speed. |
| :--- | :--- | :--- | :--- |
| High star and high throughput. | 14% of repos. | 71% merge rate. | Under 24 hours. |
| High star and low throughput. | 29% of repos. | 34% merge rate. | Over 72 hours. |
| Moderate star active team. | 36% of repos. | 64% merge rate. | Under 36 hours. |
| Low activity solo project. | 21% of repos. | 16% merge rate. | Over 14 days. |

For example, large foundation projects maintain dedicated review shifts. In contrast, viral utilities created by solo developers often attract thousands of stars while leaving community pull requests unreviewed.

## The C-Rank Scoring Formula Explained

**C-Rank** is a composite metric that scores repository contributor health from 0 to 100 based on observed pull request outcomes.

Software engineering research from the [ACM Digital Library](https://dl.acm.org/) demonstrates that multi-factor review models predict contributor success far better than single metrics. Our scoring formula weights nine distinct behavioral signals:

| Scoring Metric. | Metric Weight. | Operational Focus. | Target Threshold. |
| :--- | :--- | :--- | :--- |
| External merge rate. | 27.5% weight. | Share of outside PRs merged. | Over 60% merge rate. |
| First response latency. | 17.5% weight. | Median hours to first human comment. | Under 24 hours. |
| Total merge volume. | 12.5% weight. | Number of merged external PRs. | Over 10 merges in 180 days. |
| Review coverage rate. | 10.0% weight. | Share of PRs receiving comments. | Over 85% coverage. |
| Maintainer breadth. | 10.0% weight. | Count of active team reviewers. | 3 or more reviewers. |
| Review round depth. | 7.5% weight. | Iteration count before merge. | 2 to 5 review rounds. |
| Issue triage velocity. | 5.0% weight. | Speed of issue thread replies. | Under 48 hours. |
| Stale PR ratio. | 5.0% weight. | Share of abandoned PRs. | Under 15% stale. |
| Onboarding quality. | 5.0% weight. | Documentation and issue templates. | Complete guidelines. |

For instance, empirical studies published in [IEEE Software](https://www.ieee.org/) confirm that rapid first responses strongly correlate with patch completion rates.

## Detecting Ghost Codebases Before You Code

**Ghost codebase** refers to an open source repository that appears active due to bot commits or automated dependency updates but has ceased reviewing community contributions.

Industry data from [GitHub Octoverse](https://github.blog/) reveals that thousands of repositories receive automated dependency updates while core development remains frozen. Our telemetry applies three automated checks to identify ghost codebases:

- **The 180-Day Merge Test:** If a repository has not merged a community pull request in 180 days, it is capped at D-tier status regardless of star count.
- **Bot Filter Verification:** We exclude automated accounts such as Dependabot and continuous integration actions to measure true human review activity.
- **Maintainer Pulse Check:** We verify that maintainers have authored comments or reviews within the trailing 90 days.

| Diagnostic Signal. | Live Project. | Ghost Codebase. | Risk Level. |
| :--- | :--- | :--- | :--- |
| Days since outside merge. | Under 30 days. | Over 180 days. | High risk if stagnant. |
| Human comment share. | Over 80% human. | Under 20% human. | Extreme triage risk. |
| Active maintainer count. | 2 or more active. | 0 active in 90 days. | Project is unstaffed. |
| Issue response time. | Under 48 hours. | No human replies. | Closed loop. |

Before you invest time writing code, consult our guide on [how to know if a maintainer will review](/guides/how-to-know-if-maintainer-will-review).

## Step-by-Step Repository Selection Strategy

Finding a welcoming open source project requires a structured selection process:

1. **Filter by Language Ecosystem:** Identify projects in languages where you have practical coding experience. Check our curated list of the [best GitHub repos for beginners](/guides/best-github-repos-for-beginners).
2. **Review Recent Closed PRs:** Examine the last twenty closed pull requests. Confirm that maintainers provide constructive feedback rather than closing patches silently.
3. **Inspect Open Issue Discussions:** Look for issues with active maintainer comments within the past week.
4. **Evaluate CI Test Suites:** Verify that automated test suites pass consistently on the default branch.
5. **Run Pre-Flight Checklists:** Review code style rules, test suites, and documentation requirements using our [first pull request checklist](/guides/first-pull-request-checklist).

| Workflow Step. | Verification Action. | Success Indicator. | Failure Indicator. |
| :--- | :--- | :--- | :--- |
| Step 1: Language match. | Check repo tech stack. | Familiar language and tooling. | Complex custom build tools. |
| Step 2: Telemetry audit. | Check C-Rank score. | S-tier or A-tier ranking. | D-tier or stale flag. |
| Step 3: Issue triage. | Read open issue threads. | Maintainer replies in 48 hours. | Issues sit for months. |
| Step 4: PR review check. | Inspect closed PR history. | Constructive review comments. | Silent bot closures. |

Technical reports from [Google Open Source](https://opensource.google/) emphasize that choosing well-triaged repositories reduces onboarding friction for new contributors.

## Contributor Evaluation Checklist

Use this quick checklist to grade a repository before opening your development environment:

- **External Merge Rate:** Is the external merge rate above 50%?
- **Response Latency:** Is the p50 response time under 24 hours?
- **Active Maintainers:** Are there at least two distinct active maintainers?
- **Documentation:** Does the repository contain a clear CONTRIBUTING guide?
- **Issue Heat:** Did a maintainer comment on an issue within the last 48 hours?

Learn more about our review methodologies and scoring systems on our [about page](/about). If you have questions about our data index, please [contact us](/contact).
