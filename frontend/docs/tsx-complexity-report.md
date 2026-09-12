# TSX Complexity Report

Generated: 2026-09-06

## Criteria

- **Cyclomatic Complexity > 10** (industry standard upper limit)
- **LOC > 300** (industry "too long" threshold)

## Files Exceeding Both Limits (35 files)

| File | LOC | Complexity |
|------|-----|------------|
| src/components/FirstMergeTrack.tsx | 1,586 | 507 |
| src/components/ClientRepoDetail.tsx | 1,530 | 373 |
| src/app/HomeClient.tsx | 1,287 | 381 |
| src/components/RepoAuditReport.tsx | 1,256 | 288 |
| src/app/talent/TalentClient.tsx | 916 | 169 |
| src/app/u/[username]/ProfileClientView.tsx | 775 | 112 |
| src/app/compare/[...slug]/page.tsx | 762 | 262 |
| src/app/watchlist/WatchlistClient.tsx | 700 | 171 |
| src/app/how-c-rank-works/page.tsx | 666 | 236 |
| src/app/stack/StackClient.tsx | 655 | 120 |
| src/app/pricing/PricingClient.tsx | 633 | 79 |
| src/app/compare/CompareClient.tsx | 619 | 155 |
| src/app/dashboard/DashboardClient.tsx | 598 | 200 |
| src/app/rankings/[lang]/page.tsx | 592 | 165 |
| src/app/repos/ReposClient.tsx | 590 | 132 |
| src/app/hacktoberfest/HacktoberfestClient.tsx | 558 | 124 |
| src/components/MaintainerConsoleModal.tsx | 549 | 83 |
| src/components/ProfileEditModal.tsx | 476 | 91 |
| src/app/league/LeagueClient.tsx | 464 | 88 |
| src/components/FloatingRepoCircles.tsx | 401 | 289 |
| src/components/PhysicsCanvas.tsx | 393 | 130 |
| src/app/privacy/page.tsx | 386 | 96 |
| src/components/GfiSniperCard.tsx | 377 | 83 |
| src/app/pr-simulator/page.tsx | 368 | 109 |
| src/components/GlobalSearch.tsx | 367 | 61 |
| src/components/TopicDirectoryGrid.tsx | 321 | 60 |
| src/components/ShareForecastButton.tsx | 321 | 72 |
| src/components/RepoCard.tsx | 317 | 53 |
| src/app/guides/[slug]/page.tsx | 314 | 95 |
| src/app/terms/page.tsx | 313 | 66 |
| src/app/repo/[owner]/[name]/opengraph-image.tsx | 310 | 214 |
| src/app/[owner]/[name]/opengraph-image.tsx | 310 | 214 |
| src/app/[owner]/[name]/page.tsx | 431 | 169 |
| src/app/good-first-issue/[lang]/page.tsx | 423 | 133 |

## Recommendations

These files should be refactored by:
- Extracting reusable subcomponents
- Moving business logic into custom hooks
- Splitting conditional rendering into smaller components
- Extracting complex calculations into utility functions
