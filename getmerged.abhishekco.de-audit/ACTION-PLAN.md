# Prioritized SEO Action Plan: GetMerged

## Phase 1: Critical Fixes & Crawl Budget (Week 1)

### 1. Split `sitemap/main.xml` into Validly Sized Partitions
- **Severity**: **Critical**
- **Principle (THINK)**: Google Search Console rejects or truncates single sitemaps exceeding 50,000 URLs. `main.xml` currently has 66,349 URLs.
- **Action**: Chunk `main.xml` into `main-1.xml` (<= 45,000 URLs) and `main-2.xml` (<= 45,000 URLs), and update `sitemap.xml` index.
- **Dependency (CONNECT-system)**: Blocks full crawl discovery of ~16,000 repository and topic URLs.
- **Falsifiability (ACCEPT)**: Validate via `curl -sSL https://getmerged.abhishekco.de/sitemap.xml` that all referenced sub-sitemaps contain <= 50,000 `<url>` entries and return HTTP 200.
- **Leading Indicator (GROW)**: Google Search Console reported valid sitemap URLs rises from 50,000 cap to 167,000+.

### 2. Add High-Intent Missing Landing Pages to XML Sitemaps
- **Severity**: **High**
- **Principle (THINK)**: High-converting landing pages (`/pricing`, `/talent`, `/maintainers`) must be explicitly declared to crawlers.
- **Action**: Add static pages to `sitemap/main-1.xml` or create a dedicated `sitemap/static.xml`.
- **Falsifiability (ACCEPT)**: `curl -sSL https://getmerged.abhishekco.de/sitemap/main-1.xml | grep -E "(pricing|talent|maintainers)"` returns matches.

### 3. Deduplicate and Harmonize Security Headers
- **Severity**: **Medium**
- **Principle (THINK)**: Returning conflicting `DENY` and `SAMEORIGIN` values in `x-frame-options` triggers browser parser warnings.
- **Action**: In `next.config.mjs` / Cloudflare Transform Rules, standardize on `SAMEORIGIN` (or rely on CSP `frame-ancestors 'none'`).

---

## Phase 2: On-Page & Performance Optimization (Weeks 2–3)

### 4. Remove External Render-Blocking CSS (`cdn.jsdelivr.net`)
- **Severity**: **High**
- **Principle (THINK)**: Synchronous external CSS in `<head>` blocks First Contentful Paint while DNS and TLS handshakes execute.
- **Action**: Self-host `devicon.min.css` under `/fonts/` or replace with inline SVG icons.
- **Falsifiability (ACCEPT)**: No external stylesheet requests to `jsdelivr.net` in HTML `<head>`.
- **Leading Indicator (GROW)**: FCP improves by ~120–250ms on mobile devices.

### 5. Standardize Heading Hierarchy Across Templates
- **Severity**: **High**
- **Principle (THINK)**: A page should contain exactly one semantic `<h1>` representing its core topic.
- **Action**:
  - Homepage: Combine visually hidden and visual hero into a single `<h1>`.
  - `/pricing`: Convert `<h2>GetMerged Pro Contributor Plans & Pricing</h2>` to `<h1>`.
  - `/compare`: Convert `<h2>Compare Open Source Repositories Side-by-Side</h2>` to `<h1>`.
  - Fix string interpolation missing spaces in `Open-SourceRustRepositories` and `forrust-lang/rust`.
- **Falsifiability (ACCEPT)**: Automated `parse_html.py` on all 7 key routes shows exactly one non-empty `<h1>` per page.

### 6. Enable Browser Back/Forward Cache (bfcache)
- **Severity**: **Medium**
- **Principle (THINK)**: `Cache-Control: ... no-store` prevents bfcache snapshotting, making back button navigation slow.
- **Action**: Replace `no-store` on public static routes with `public, max-age=0, s-maxage=86400, stale-while-revalidate=86400`.

---

## Phase 3: Content Depth & Rich Knowledge Graph (Month 2)

### 7. Populate Default SSR States for Dynamic Tools (`/compare`, `/pricing`)
- **Severity**: **High**
- **Principle (THINK)**: Empty interactive states result in thin content warnings (<40 words) during bot crawling.
- **Action**: Render top 5 curated framework comparisons (e.g. React vs Vue, Next.js vs Remix, Axum vs Actix) directly on initial SSR of `/compare`.

### 8. Publish Extended `/llms-full.txt`
- **Severity**: **Medium**
- **Principle (THINK)**: LLM web scrapers benefit from a complete, single-document index of platform algorithms and benchmark lists.
- **Action**: Generate `/llms-full.txt` containing full C-Rank mathematical definitions, metric weightings, and the top 200 S-Tier repository directory.

---

## Phase 4: Monitoring & Continuous Iteration (Ongoing)

### 9. IndexNow & Automated Drift Baselines
- **Severity**: **Low**
- **Action**: Trigger IndexNow API submissions upon daily repository telemetry recalculations; run automated weekly drift checks via `drift_compare.py`.
