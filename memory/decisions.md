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
- **Date**: 2026-09-27 (Updated 2026-10-26)
- **Status**: Accepted
- **Context**: Google Search Console showed crawled/discovered disparity and crawl throttles post-Aug 31 broad core update. Sitemaps had grown to ~71,000 URLs, diluting Googlebot crawl priority on thousands of low-signal pages. Furthermore, dynamic `opengraph-image` endpoints lacked edge-level cache rules in Nginx, triggering edge cache misses and compute overhead.
- **Decision**: 
  1. Updated `robots.txt` to disallow `/api/` completely, recapturing 100% of Googlebot's crawl budget for HTML pages.
  2. Added dedicated Nginx caching rule for `/opengraph-image$` with `s-maxage=604800` (7 days edge) and `stale-while-revalidate=1209600` (14 days), cutting live response times from 1.6s down to 79ms on Cloudflare edge hits.
  3. Pruned static sitemap generator to prioritize ~20,000 top repositories (19,895 repos + core landings = 24,896 URLs). Weighted criteria:
     - User-watchlisted repositories (always included)
     - S-Tier welcoming repos (stars >= 150)
     - A-Tier responsive repos (stars >= 600)
     - Active Good First Issues (stars >= 400)
     - High search volume repositories (stars >= 1200)
  4. Added `robots: { index: false, follow: true }` to repo detail metadata for unscored and dead/stale graveyard pages.
  5. Added Nginx 301 redirect mapping legacy `main-[0-9].xml` sitemaps to unified `main.xml`.

## ADR-006: Warm Editorial Frontend Redesign & Anti-Cramming Standard
- **Date**: 2026-11-07
- **Status**: Superseded by ADR-007
- **Context**: The existing UI used harsh pitch-black canvas (`#0a0a0a`), micro typography (`text-[10px]`, `text-[11px]`), glass-morphism blurs, and tight padding (`p-3.5`), creating an intimidating, cramped developer-dashboard aesthetic that repels beginners.
- **Decision**: Adopted initial warm off-white canvas, but left hundreds of dark-mode classes intact.

## ADR-007: Swiss Minimalist Data Workbench & 125-File Design Overhaul
- **Date**: 2026-11-07
- **Status**: Accepted
- **Context**: The previous iteration left 125 files with dark-mode classes (`text-white`, `text-zinc-300`, `border-white/[0.1]`) on light surfaces, causing white-on-white text bugs across all inner pages (`/contribute`, `/docs`, `/community-powerhouses`, `/talent`, `/dashboard`, etc.) and relied on generic AI marketing layouts.
- **Decision**:
  1. Installed and integrated `ui-ux-pro-max` (146k stars) and Anthropic official `frontend-design` skills to govern design tokens and layouts.
  2. Adopted Swiss Minimalist Data Workbench design system codified in [`design-system/getmerged/MASTER.md`](../design-system/getmerged/MASTER.md):
     - Crisp light canvas (`#FBFBFA`), pure white surfaces (`#FFFFFF`), subtle hairline borders (`#E5E7EB`).
     - Deep neutral ink (`#111827`, 16.2:1 contrast ratio) and secondary slate text (`#4B5563`, 7.1:1 contrast ratio).
     - Developer electric blue primary action (`#2563EB`) and emerald green tier S signal (`#059669`).
  3. Replaced generic AI cliches: eliminated all-caps tracking-wider labels, single-word colored accent highlights, and 11-section marketing carousels.
  4. Executed systematic 125-file audit via `scripts/audit_and_fix_contrast.py`, eliminating all white-on-white text while preserving contrast on solid action buttons.
  5. Kept strict SSR-First architecture and zero-CLS performance across all 45 routes.

## ADR-008: Good First Issue Lifecycle Sync & is_open Integrity
- **Date**: 2026-11-07
- **Status**: Accepted
- **Context**: Closed Good First Issues on GitHub remained visible as active tickets on repo detail pages (e.g. `strelov1/freehire`) because `UpsertIssues` only updated open issues, ignored empty lists when all issues closed, and queries (`ListByRepoID`, `ListByLanguage`, `ListFeed`, alert matchers) lacked `is_open = 1` checks.
- **Decision**:
  1. Updated `gfiRepo.UpsertIssues` in `backend/internal/repository/gfi_repository.go` to mark issues `is_open = 0` when they are closed or absent from the latest GitHub GraphQL search, and mark all repo issues closed when `issues` is empty.
  2. Updated `ListByRepoID`, `ListByLanguage`, and `ListFeed` to strictly filter `g.is_open = 1`.
  3. Ensured background pipelines (`gfi_backfill`, `cron`, `seed`, `scan`) always invoke `UpsertIssues` even when 0 issues remain, and update `latest_snapshots.good_first_issue_count` to reflect the live count.
  4. Reduced Next.js SSR cache TTL for `getGoodFirstIssues` to 300s (aligned with backend `max-age=300`) so stale issues do not persist for 24 hours.

## ADR-010: Monolithic Single sitemap.xml Architecture
- **Date**: 2026-11-07
- **Status**: Accepted
- **Context**: Google sitemap specification permits up to 50,000 URLs and 50MB per sitemap file. Sharding 11,884 URLs across 26 sub-files under `sitemap/` required Googlebot to perform 27 individual HTTP requests (1 sitemap index + 26 child XMLs), introducing needless request overhead and crawler latency.
- **Decision**:
  1. Consolidated static sitemap generation into a single monolithic `<urlset>` file at `public/sitemap.xml` containing all ~11,884 high-signal URLs (~2.2MB uncompressed, ~180KB gzipped).
  2. Removed `sitemap/` directory completely. Retained fallback chunking only if total URLs ever exceed 45,000.
  3. Added Nginx 301 redirect for all legacy child sitemaps (`/sitemap/.*\.xml$`) to `https://getmerged.abhishekco.de/sitemap.xml`.
  4. Pinged IndexNow and Bing protocols for instant discovery.
  5. Purged `/contribute/[language]` from sitemaps, added `Allow: /contribute$` and `Disallow: /contribute/` to `robots.txt`, and injected `<meta name="robots" content="noindex, follow">` to drain Google's thin-page discovery queue.

## ADR-011: Strict Asynchronous Background GFI Reconciliation (No Read-Path Self-Healing)
- **Date**: 2026-11-07
- **Status**: Accepted
- **Context**: Synchronous live GitHub API querying inside `GET /api/v1/repos/:id/good-first-issues` caused severe Nginx upstream timeouts (`110: Connection timed out`) when GitHub rate limits or network latency exceeded Nginx's 30s `proxy_read_timeout`. Furthermore, `client.go` had a 1-minute `time.Sleep` on GraphQL rate limits, stalling incoming SSR requests and cascading 504 Gateway Timeouts across Next.js and Nginx.
- **Decision**:
  1. Removed synchronous GitHub API calls from `GetRepoGoodFirstIssues` in `backend/internal/handler/gfi_handler.go`. The endpoint now serves strictly from the indexed MySQL database with sub-5ms latency.
  2. Background crawler `GFIBackfillService` was upgraded to sweep repos with active open issues every 12 hours (reduced from 3 days), closing resolved issues across the platform continuously without touching the read path.
  3. Capped GraphQL rate-limit sleep in `client.go` to maximum 2 seconds to eliminate catastrophic goroutine hangs.
  4. Added `-repo` flag to `cmd/backfill_gfi` allowing instant, on-demand synchronization of targeted repositories (e.g. `neomjs/neo`).


