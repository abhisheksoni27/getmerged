# Architecture Decision Records (ADRs)

## ADR-001: Auto-Memory System Integration
- **Date**: 2026-09-02
- **Status**: Accepted
- **Context**: Autonomous agents and developers need a persistent, evolving repository-level source of truth across sessions to prevent context drift and regressions.
- **Decision**: Adopt repo-level `memory/` storage with `memory-index.md` as the master index and modular topic files (`architecture.md`, `decisions.md`, etc.).
- **Consequences**: Agents check `memory/memory-index.md` to ground assumptions before planning and automatically record/update decisions as they happen.

## ADR-002: User Account Deletion (GDPR Right to Erasure)
- **Date**: 2026-09-02
- **Status**: Accepted
- **Context**: For global regulatory compliance (GDPR, CCPA), users need an explicit self-serve mechanism to delete their accounts.
- **Decision**: Added a triple-dots (`MoreVertical`) menu to the user profile view (`/u/[username]`) visible to the profile owner. Selecting "Delete Account" triggers [`DeleteAccountModal`](file:///home/deploy/src/opendoor/frontend/src/components/DeleteAccountModal.tsx), requiring typing "DELETE MY ACCOUNT" to confirm. The request invokes the existing backend endpoint `DELETE /api/v1/me/data` which anonymizes user PII, clears sessions, and purges tokens.

## ADR-003: Daily X (Twitter) Spotlight Engine & Telegram Drop
- **Date**: 2026-09-16
- **Status**: Accepted
- **Context**: Growth and distribution requires daily organic presence on X.com highlighting top repos, human responsiveness metrics, and open good first issues, without requiring paid API keys or manual copywriting.
- **Decision**: Implemented `internal/spotlight` and `cmd/daily_x_post` with `daily_tweet_spotlights` table tracking. Integrated into the daily `morning_brief` Telegram pulse. Morning brief drops a pre-formatted tweet (<280 chars) and a 1-click `twitter.com/intent/tweet` URL. Also supports bulk CSV export (`-bulk 1000 -format csv`) for Buffer/Typefully.

## ADR-005: Directory of Awesomeness & Crawl Budget Optimization
- **Date**: 2026-09-27
- **Status**: Accepted
- **Context**: Google Search Console showed 183k discovered pages but stalled indexed counts and flatlined impressions following an Aug 31 spike. Investigation revealed ~56% of Googlebot crawl requests were squandered on raw JSON API endpoints and SVG badges, legacy domain `opendoor.abhishekco.de` lacked a 301 redirect to `getmerged.abhishekco.de`, and sitemaps contained ~102k thin/dead graveyard repos (0% merge rate, 0 PRs) and 1-repo topic tags.
- **Decision**: 
  1. Updated `robots.txt` to disallow `/api/` completely, recapturing 100% of Googlebot's crawl budget for HTML pages.
  2. Added Nginx 301 permanent redirect from `opendoor.abhishekco.de` to `getmerged.abhishekco.de`.
  3. Implemented the "Directory of Awesomeness" filter in `sitemap_generator.go`: pruned sitemaps from 183,524 URLs down to 81,403 high-signal, active, scored repositories (Tier S/A/B, active GFIs, or 1000+ stars) and rich topic hubs with >= 3 repos.
  4. Added `robots: { index: false, follow: true }` to repo detail metadata for unscored and dead/stale graveyard pages.
  5. Added Nginx 301 redirect mapping legacy `main-[0-9].xml` sitemaps to unified `main.xml`.

