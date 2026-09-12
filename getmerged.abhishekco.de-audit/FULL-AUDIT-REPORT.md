# GetMerged Full SEO Audit — getmerged.abhishekco.de (2026-09-12)

**Health score: 75/100.** SaaS directory / data platform (C-Rank repo intelligence). SSR-first Next.js on Cloudflare. 179,318 URLs / 170 sitemaps. Method: curl (Firecrawl unavailable) + 10 parallel specialists + direct verification of every critical claim.

| Category | Score | Weight |
|---|---|---|
| Technical SEO | 82 | 22% |
| Content Quality | 74 | 23% |
| On-Page SEO | 76 | 20% |
| Schema | 80 | 10% |
| Performance | 68 | 10% |
| AI Readiness | 62 | 10% |
| Images | 80 | 5% |

## Top 5 critical issues
1. **Raw scorecard corruption** — `/facebook/react/raw`: merge rate 6666.7%, Stars 0, Language Other, empty description. AI-cited; discredits brand. Cap at 100%, backfill stars/desc/language.
2. **`/pr-simulator` mis-indexed** — client component, site-default title, canonical → `/`. Server wrapper + metadata + self-canonical.
3. **Homepage H1: 3 tags + opacity:0 until hydration** — LCP/CLS HIGH risk. Single static-visible H1.
4. **Guide duplicate H1** (hero + article header) + truncating titles (GFI 82ch, guide 103ch).
5. **Repo orphan risk** — zero lateral repo links, RelatedRepos empty; 101k long-tail pages reachable only via sitemap. SSR related-repos + how-to-contribute CTA.

## Top 5 quick wins (<2h each)
1. Cap merge rate + backfill raw scorecards. 2. pr-simulator metadata/canonical. 3. Single visible H1. 4. Rewrite 2 titles ≤60ch; trim 4 metas to 120–155. 5. rel=sponsored (boosted) + rel=ugc (community). 6. `/methodology` → `/how-c-rank-works` redirect + llms.txt link. 7. Allowlist read-only `/api/v1` GETs in robots.txt.

## What's healthy
SSR prerender HIT, TTFB ~0.3s, fresh sitemaps (179k URLs, 12/12 sampled 200), self-canonicals everywhere, valid robots + AI-bot rules, zero JSON-LD syntax errors, ItemList+Dataset+FAQ on rankings, no thin pages, 49–117 internal links/page, real E-E-A-T (methodology/about/Person schema), fonts/PostHog/cache patterns solid, OG image live, 0 missing alt.

## Known gaps / not verified
Backlink RD/DA/anchors (no API keys); rendered pixels / real-device overflow; CrUX field data, GSC indexation, GA4 traffic (no Google creds); guides/compare/org sitemap entry-by-entry coverage; whether RelatedRepos empty globally or one repo; /repos pagination SSR vs client.

Details: `findings/*.md` (10 files). Machine-readable: `audit-data.json`. Phased plan: `ACTION-PLAN.md`.
