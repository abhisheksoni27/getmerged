# Technical SEO — 82/100
Verified live 2026-09-12 via curl. Next.js SSR (x-nextjs-prerender HIT) on Cloudflare. 179,318 URLs across 170 sitemaps.

## High
- **`/dashboard` → 307 → `/api/v1/auth/github` → 404.** GitHub login hop ends in 404. Verify OAuth works in browser; fix route/redirect. Evidence: `curl -sSIL $B/dashboard`.
- **`/pr-simulator` mis-indexed (P0).** `"use client"`, no generateMetadata: title = site default, canonical → `/` (verified live). Add server wrapper + metadata + self-canonical.

## Medium
- **Uppercase `/Rankings/Python` 200s as junk repo page** (title "Scan Rankings/Python…", canonical → homepage). 200 on unknown `[owner]` paths = thin-content surface. Fix: 404 unknown owners or middleware 301-lowercase. `/REPOS`, `/PRICING` correctly 404.
- **Duplicate headers** (Next.js + Cloudflare both emit): `x-frame-options` ×2, `referrer-policy` ×2. Dedupe at one layer.
- **CSP report-only, not enforced.** Cap on XSS score until enforced. Missing `Permissions-Policy` (Low). `X-Powered-By: Next.js` exposed → `poweredByHeader: false` (Low).
- **HSTS drift:** live `max-age=15552000` vs next.config `31536000`. Align.

## Low / Info
- `/talent` is 404 (route removed), not noindexed — no action unless path should exist.
- Hreflang=0 correct (single-locale, `<html lang=en>`). No rel next/prev — correct (Google-retired).
- `/repos` HTML shows zero `page=` links — if pagination is client-side only, deep pages rely on sitemaps (covered). Confirm SSR pagination links.
- `main-1.xml` at 45,000 URLs — under 50k cap but near ceiling; generator must reshard before breach.
- `/repos?page=2` canonical → `/repos` (collapses paginated variants — intentional; paginated content not individually indexed).

## Healthy
robots.txt valid (Allow /, Disallow /api, per-bot AI rules, Sitemap directive, src `robots.txt/route.ts`). Sitemap index fresh (lastmod 2026-09-11). 12/12 sampled python URLs → 200. Canonicals self-referencing on /, /rankings/python, /good-first-issue, /repos, /compare, /pricing + real compare URL. Trailing-slash 308s, http→301 https, custom 404 with noindex. Per-route generateMetadata on ~17 routes. Sitemaps from backend Go generator.
