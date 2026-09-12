# Sitemap + Indexation — 78/100
Verified live 2026-09-12 (sitemap agent output lost; re-verified directly).

## Numbers
- Index: **170 child sitemaps**, valid XML, fresh (lastmod 2026-09-11).
- **Total URLs: 179,318** (summed all 170 children, xargs -P8).
- Samples: main-1 45,000 · main-2 29,326 · python 12,646 · go 7,123 · javascript 7,956 · typescript 9,389.
- main-2 covers `/topics/*` spokes (topics grid fully in sitemap — mitigates client-rendered hub).
- 12/12 sampled python URLs → 200, zero non-200.

## Quality gates
- [x] All files <50k URLs / <50MB — but main-1 at 45,000 is near ceiling → reshard before breach.
- [⚠️] **Bloat risk:** 52% of repos are Tier D (unmaintained) per inventory; if all are in sitemap, ~90k+ stale pages compete for crawl budget. Consider pruning D-tier-with-no-activity from sitemap or lowering priority/changefreq.
- [x] lastmod fresh (2026-09-11 index; spokes 2026-07-28→2026-09-07).
- [x] Static coverage: topics spokes present in sitemap.
- [?] guides/org/compare-showdowns/league/hacktoberfest coverage in index — spot-check pending; guides slugs should each appear.
- [x] 404 page noindexed. `/talent`, `/dashboard` not indexable (404/307). `/repos?page=2` canonical → `/repos`.

## Fixes
1. Reshard main-1 before 50k. 2. Decide D-tier sitemap policy (prune or deprioritize). 3. Verify guides + compare showdowns + org pages each have sitemap entries.
