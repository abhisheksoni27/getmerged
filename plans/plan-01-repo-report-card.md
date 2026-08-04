# Implementation Plan: Revamp Repository Detail Page with Maintainer Report Cards

This plan maps to [task-01-repo-report-card.md](file:///home/deploy/src/opendoor/tasks/task-01-repo-report-card.md).

## Proposed Changes

### 1. Hero Header (Neobrutalist Sticker Layout)
- **Files**: [ClientRepoDetail.tsx](file:///home/deploy/src/opendoor/frontend/src/components/ClientRepoDetail.tsx)
- **Modifications**:
  - Replace the current title and badge container with a high-contrast, neobrutalist sticker block.
  - Implement solid dark borders (`border-3 border-[#222831]`) and flat shadows (`shadow-[4px_4px_0px_0px_#222831]`).
  - Render the repository logo using the GitHub owner avatar (`https://github.com/${owner}.png`).
  - Display the overall C-Rank tier badge as a sticker with rigid, thick-bordered neobrutalist styles.
  - Include language/category tags styled as smaller stickers.

### 2. Macro Metrics Grid
- **Files**: [ClientRepoDetail.tsx](file:///home/deploy/src/opendoor/frontend/src/components/ClientRepoDetail.tsx)
- **Modifications**:
  - Re-align the grid to focus on the four requested metrics:
    1. **Response Velocity**: Render `time_to_first_response_hours`.
    2. **Merge Efficiency**: Render `external_pr_merge_rate`.
    3. **First-Timer Success**: Render `first_timer_success_rate`.
    4. **Active Maintainers**: Render `distinct_maintainer_count` (falling back to a default indicator if null).
  - Add interactive tooltips with micro-animations when hovering over metrics to support the 15% CTR key result.

### 3. Visual Gauge Chart for cNPS
- **Files**: [ClientRepoDetail.tsx](file:///home/deploy/src/opendoor/frontend/src/components/ClientRepoDetail.tsx)
- **Modifications**:
  - Calculate cNPS dynamically from telemetry:
    ```typescript
    const responseScore = Math.max(0, 100 - ((repo?.time_to_first_response_hours || 0) * 2.5));
    const mergeScore = repo?.external_pr_merge_rate || 0;
    const firstTimerScore = repo?.first_timer_success_rate || 0;
    const compositeScore = (mergeScore * 0.4) + (responseScore * 0.3) + (firstTimerScore * 0.3);
    const cNPS = Math.round((compositeScore * 2) - 100); // Scale: -100 to +100
    ```
  - Render a SVG circular progress ring/gauge chart representing the cNPS value (ranging from -100 to +100), with color-coding matching the score (e.g., emerald for positive, red for negative).

### 4. Interactive Guideline Drawer
- **Files**: [ClientRepoDetail.tsx](file:///home/deploy/src/opendoor/frontend/src/components/ClientRepoDetail.tsx)
- **Modifications**:
  - Design a collapsible, animated drawer/accordion containing contribution instructions.
  - Populate content using `insights.pr_guidelines` from the [AIInsights](file:///home/deploy/src/opendoor/frontend/src/types/opendoor.ts#L45-L51) data model.
  - Present fallback messages if AI guidelines are not yet loaded or user is not logged in.

---

## Clarifications & Questions

1. **cNPS Calculation**: Is the proposed client-side computation acceptable, or should cNPS be computed on the Go backend and persisted in the database?
2. **Repository Logo Source**: Is fetching the owner avatar via `https://github.com/${owner}.png` correct, or should we query a specific database field/GitHub API?
3. **Category Tags**: Since repositories currently only store the `language` field, should we mock additional category tags or dynamically group repositories based on language/metadata?
