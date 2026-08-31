# Full Website SEO Audit: GetMerged (getmerged.abhishekco.de)

**Date**: August 31, 2026  
**Target URL**: `https://getmerged.abhishekco.de/`  
**Business Profile**: SaaS / Open-Source Developer Intelligence Platform  
**Overall SEO Health Score**: **89 / 100**  
**Audit Artifacts Generated**:
- Structured Envelope: [`audit-data.json`](file:///home/deploy/src/opendoor/getmerged.abhishekco.de-audit/audit-data.json)
- Enterprise PDF Report: [`Google-SEO-Report-getmerged.abhishekco.de-full.pdf`](file:///home/deploy/src/opendoor/getmerged.abhishekco.de-audit/Google-SEO-Report-getmerged.abhishekco.de-full.pdf)
- Enterprise HTML Report: [`Google-SEO-Report-getmerged.abhishekco.de-full.html`](file:///home/deploy/src/opendoor/getmerged.abhishekco.de-audit/Google-SEO-Report-getmerged.abhishekco.de-full.html)
- Action Plan: [`ACTION-PLAN.md`](file:///home/deploy/src/opendoor/getmerged.abhishekco.de-audit/ACTION-PLAN.md)

---

## 1. Executive Summary

GetMerged demonstrates an exceptionally strong **SSR-First architecture** with instant pre-rendered HTML, deep programmatic coverage across **167,655 repository scorecards and language ranking hubs**, and rich Schema.org structured data (`Dataset`, `SoftwareSourceCode`, `ItemList`, `WebApplication`). 

The primary bottlenecks preventing maximum indexation efficiency and Core Web Vitals performance are:
1. **Sitemap Size Cap Exceeded**: `sitemap/main.xml` contains **66,349 URLs** in a single file, exceeding Google's hard protocol limit of 50,000 URLs.
2. **Missing Transactional URLs**: Key conversion landing pages (`/pricing`, `/talent`, `/maintainers`) are absent from the XML sitemap index.
3. **Render-Blocking Third-Party Asset**: Synchronous `<link>` loading `cdn.jsdelivr.net/gh/devicons/...` in `<head>` adds unnecessary critical rendering path latency.
4. **Heading Hierarchy Anomalies**: Homepage features dual `<h1>` tags; `/pricing` and `/compare` lack `<h1>` tags entirely; text concatenation glitches omit spaces in dynamic headings (`Open-SourceRustRepositories`).
5. **Conflicting Security Headers & bfcache Invalidation**: Server returns dual `x-frame-options: DENY` and `SAMEORIGIN`, alongside `Cache-Control: ... no-store` on public pages disabling browser Back/Forward Cache.

---

## 2. Category Scorecard Breakdown

| Category | Weight | Score | Status | Key Focus Area |
|:---|:---:|:---:|:---:|:---|
| **Technical SEO** | 22% | **86 / 100** | ⚠️ Attention | Sitemap file chunking, security header cleanup, bfcache enablement |
| **Content Quality & E-E-A-T** | 23% | **92 / 100** | ✅ Strong | Empirical telemetry, C-Rank transparency, default state depth |
| **On-Page SEO & Semantic Structure** | 20% | **85 / 100** | ⚠️ Attention | Single H1 on home, add H1 to pricing/compare, fix heading whitespace |
| **Schema / Structured Data** | 10% | **94 / 100** | ✅ Excellent | Dataset & ItemList active; Product schema enhancements |
| **Performance (CWV)** | 10% | **88 / 100** | ✅ Strong | Self-host devicons CSS, speculation rules, hero priority |
| **AI Search Readiness (GEO)** | 10% | **92 / 100** | ✅ Strong | `/llms.txt` active, AI crawlers allowed, publish `/llms-full.txt` |
| **Images & UX (SXO)** | 5% | **90 / 100** | ✅ Strong | 100% alt text coverage, Agent UX 100/100, add compare breadcrumbs |
| **Overall Health Score** | **100%** | **89 / 100** | **Grade: B+ / A-** | **Ready for high-scale search indexing post-sitemap fix** |

---

## 3. Detailed Specialist Findings

### A. Technical SEO (Score: 86/100)
- **Crawlability & Sitemaps**: 
  - 168 sub-sitemaps discovered in `sitemap.xml`.
  - `sitemap/main.xml` has 66,349 URLs. **Must be chunked into <= 50,000 URLs** per Google Search Console specifications.
  - `/pricing`, `/talent`, and `/maintainers` are omitted from the sitemap index.
- **Security & Headers**:
  - `strict-transport-security: max-age=15552000; includeSubDomains; preload` is active.
  - Conflicting `x-frame-options: DENY` and `SAMEORIGIN` sent simultaneously.
  - `Cache-Control: public, max-age=0, must-revalidate, no-store` prevents browser bfcache.
- **Robots Directives**:
  - `robots.txt` explicitly authorizes `GPTBot`, `ClaudeBot`, `PerplexityBot`, and `Anthropic-ai`.
  - Disallows internal `/api/` endpoints cleanly.

### B. Content Quality & E-E-A-T (Score: 92/100)
- **First-Hand Experience**: Provides objective PR merge rates (90d), P50 review turnaround hours, bus factors, and line-of-code Sweet Spot thresholds.
- **Transparency & Authoritativeness**: Methodology explained on `/how-c-rank-works`, `/about`, and `/guides/*`.
- **Thin Content Analysis**:
  - Homepage: 2,031 words.
  - Repository scorecards: 1,342 words.
  - Language ranking hubs: 1,573 words.
  - Compare default state: 37 words (needs curated default showdowns).
  - Pricing default state: 34 words (needs feature comparison table on SSR).

### C. On-Page SEO & Metadata (Score: 85/100)
- **Title Tags**: Concise and keyword-focused (`rust-lang/rust • 59.1/100 C-Rank (A-Tier) | GetMerged`).
- **Meta Descriptions**: Compelling click-through triggers with real merge rate stats.
- **Headings**:
  - Homepage has 2 `<h1>` tags.
  - `/pricing` and `/compare` have 0 `<h1>` tags.
  - Missing space in interpolated template strings:
    - `/rankings/rust`: `Top Welcoming Open-SourceRustRepositories`
    - Repo scorecard: `Contributor Compatibility & Review Speed Analysis forrust-lang/rust`
    - Compare showdown: `dani84bs/AnnotationSync.kopluginvsntop/ntopng`

### D. Schema & Structured Data (Score: 94/100)
- **Dataset Schema**: Embedded on all `/rankings/[lang]` pages with direct JSON distribution links (`/api/v1/repos?language=...`) and CC-BY-4.0 licensing.
- **ItemList Schema**: Lists 1-50 ranked repositories with URLs.
- **SoftwareSourceCode**: Implemented on all repository scorecards.
- **Product Schema**: Configured on `/pricing` with 3 tiered offers (Community Free $0, Pro Monthly $9, Pro Annual $90).

### E. Performance & Core Web Vitals (Score: 88/100)
- **Edge TTFB**: ~25ms via Cloudflare edge caching.
- **Font Optimization**: Google WOFF2 fonts preloaded without layout shifts.
- **Render Blocking Assets**: `cdn.jsdelivr.net` devicon stylesheet should be bundled locally.
- **Navigation Optimizations**: Add `<script type="speculationrules">` for instant client-side route transitions.

### F. AI Search / GEO Readiness (Score: 92/100)
- `/llms.txt` cleanly defines C-Rank™ tiers (S, A, B, C, D) and AI agent discovery instructions.
- Public JSON API (`/api/v1/repos`) and Raw Markdown (`/repo/{owner}/{name}/raw`) provide high citability for AI search engines.
- Recommended next step: Publish `/llms-full.txt` with extended mathematical scoring benchmarks.

---

## 4. Prioritized Implementation Roadmap

Refer to [`ACTION-PLAN.md`](file:///home/deploy/src/opendoor/getmerged.abhishekco.de-audit/ACTION-PLAN.md) for full phase-by-phase implementation guidelines, falsifiability tests, and leading indicators.
