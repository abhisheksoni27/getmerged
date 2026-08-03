# Jira Story: Revamp Repository Detail Page with Glassdoor-Style "Maintainer Report Cards"

## Epic Link
EPIC-101: Repository Detail Page Revamp

## Description
As a contributor looking for active projects, I want to view a comprehensive, visual "Maintainer Report Card" for each repository so that I can quickly decide if contributing to this repository is a valuable use of my time.

## Why
Currently, repository pages present raw C-Rank metrics but lack visual hierarchy and comparative context. By designing a high-fidelity "Report Card" layout similar to Glassdoor's company overview, we build immediate trust, increase user scroll depth, and optimize dwell time—a major ranking signal for Google Search.

## Specific Key Result
- **Dwell Time**: Increase average session duration on repo detail pages by 35%.
- **Engagement**: Achieve a 15% click-through rate on interactive metric tooltip components.

## How to Solve (Solution)
1. **Hero Header**: Display repository logo, full name, category tags, and a prominent badge for the overall C-Rank (S to D) using our neobrutalist sticker layout.
2. **Macro Metrics Grid**: Implement a grid of four high-delight micro-cards:
   - **Response Velocity**: Time to first maintainer response/review.
   - **Merge Efficiency**: Percentage of external PRs that are successfully merged.
   - **First-Timer Success**: Conversion rate of first-time PR submissions.
   - **Active Maintainers**: Number of distinct maintainers active in reviews.
3. **Visual Gauge Chart**: Build a clean circular gauge chart or progress ring indicating the "Contributor Net Promoter Score (cNPS)" derived from telemetry statistics.
4. **Interactive Guideline Drawer**: Add a collapsible card summarizing contribution instructions (e.g., whether they require issue assignment before opening a PR).
