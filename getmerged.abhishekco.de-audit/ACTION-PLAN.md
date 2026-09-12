# Action Plan — getmerged.abhishekco.de audit 2026-09-12

## Phase 1: Critical (Week 1)
- [ ] Cap raw merge rate at 100%; backfill stars/description/language (raw scorecards)
- [ ] `/pr-simulator`: server wrapper + generateMetadata + self-canonical
- [ ] Homepage: single static-visible H1, animate decorations only (`HeroSection.tsx:89-96`)
- [ ] Fix `/dashboard` → `/api/v1/auth/github` → 404 OAuth chain
- [ ] `rel="sponsored"` + "Boosted" label on paid placements; `rel="ugc"` on community links

## Phase 2: High-impact (Weeks 2–3)
- [ ] Rewrite `/good-first-issue` (82ch) + guide (103ch) titles ≤60ch; trim `/repos`/`/gfi`/`/how-c-rank-works`/`/about` metas to 120–155
- [ ] Guide template: demote duplicate H1 (all 5 guides)
- [ ] Repo breadcrumb + language normalization (`[owner]/[name]/page.tsx:331,358-368`)
- [ ] SSR related-repos + how-to-contribute CTA on repo pages
- [ ] Redirect `/methodology` → `/how-c-rank-works`; link from llms.txt; allowlist read-only `/api/v1` GETs in robots.txt
- [ ] 404 or 301-lowercase unknown `[owner]` paths (`/Rankings/Python` junk-200)

## Phase 3: Content & authority (Month 2)
- [ ] Guides hub: 5–10 posts; FAQ schema on pricing/maintainers/GFI/hacktoberfest
- [ ] HowTo on guides, ItemList on GFI, brand/image on Product schema
- [ ] SSR `/topics` hub; normalize C++/C# slugs + redirects; header/Discover links for Contribute+Rankings
- [ ] Differentiate `/contribute` (matchmaker) vs `/good-first-issue` (live feed); filter-descriptive `/repos` titles; `/merge-rate` page or redirect; `/audit` index
- [ ] Visible dataset download + `/datasets` hub; GFI embed snippet UI; Ghost-town data post; standardize sameAs + social icons

## Phase 4: Ongoing
- [ ] Reshard main-1 sitemap before 50k; D-tier sitemap policy; verify guides/compare/org entries
- [ ] Enforce CSP; dedupe headers; align HSTS; `poweredByHeader: false`
- [ ] next/image migration; Suspense-stream rankings rows (<100K flight chars); reconsider `no-store`; `optimizePackageImports: framer-motion`
- [ ] Tap targets ≥44px; reduced-motion H1 fallback; confirm compare results overflow-x-auto
- [ ] Badge-referrer dashboard (UTM proxy); get backlink API for RD/DA; add data-as-of dates; expand llms-full.txt
