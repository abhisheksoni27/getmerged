# Performance — 68/100
curl lab data, 2026-09-12 (SIN pop, cache HIT).

| Page | HTML raw/gzip | TTFB/total | Scripts | Images |
|---|---|---|---|---|
| `/` | 304,843 / 45.7KB | 0.28/0.47s | 38 | 9 github PNG, lazy+w/h, no srcset |
| `/rankings/python` | 422,392 / 36.3KB | 0.31/0.67s | **89** (mostly RSC flight chunks) | none |
| `/repos` | 416,153 / 39.8KB | 0.29/0.59s | 38 | 24 github PNG avatars |
| `/good-first-issue` | 115,665 / 19.0KB | 0.28/0.37s | 44 | none |

## Findings
1. **H1 `opacity:0` LCP risk — `/` only.** framer-motion `HeroSection.tsx initial={{opacity:0,y:20}}`; H1 invisible until hydrate+animate = delayed LCP + CLS risk. Other pages clean.
2. **400KB+ HTML = RSC flight data**, not copy (rankings/python ~209K chars flight payload). SSR-first embeds full datasets — good for crawlers, bad for parse + mobile.
3. **No next/image, no avif/webp, no srcset.** `next.config` has no `images:` key. CSP allows avatars.githubusercontent but pages use github.com PNGs.
4. Fonts good (next/font, display:swap, woff2 preloads). PostHog proxied first-party (`/ingest/*`) — zero third-party DNS. `_next/static/*` immutable 1y.
5. `Cache-Control: ...no-store` on HTML blocks bfcache; `max-age=0,must-revalidate` already forces revalidation — reconsider.
6. No `experimental.optimizePackageImports` (framer-motion ships everywhere); homepage pulls 5 extra chunks.

## Fixes (S<2h M=half-day L=1d+)
- S: static visible H1, animate decorations only (biggest LCP win). S: images formats+remotePatterns, migrate avatars to next/image. S: optimizePackageImports framer-motion.
- M: paginate/stream rankings rows via Suspense (209K→<100K flight chars). M: reconsider no-store. M: preconnect github.com or proxy avatars.
- L: next/dynamic below-fold homepage showroom.

## Risk verdict
/ HIGH · /rankings/python + /repos MEDIUM (parse/DOM size) · /good-first-issue LOW.
