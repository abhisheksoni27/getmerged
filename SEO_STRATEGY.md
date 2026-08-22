# GetMerged SEO Strategy: 80 → 95+

> Reference plan derived from full site audits (2026-08-23). Health Score trajectory: **69 → 74 → 80 → target 95+**.
> All Critical/High technical findings are closed. The remaining gap is **content depth, trust surface, and polish** — plus off-site authority, which gates real-world rankings even though it is not part of the weighted health score.

---

## 1. Where the score stands

| Category | Weight | Now | Target | Gap driver |
|---|---|---|---|---|
| Technical SEO | 22% | 82 | 93 | CSP, apple-touch-icon, /topics pagination, header hygiene |
| Content Quality | 23% | 78 | 90 | Guide-layer absence, thin prose on data pages, title lengths |
| On-Page SEO | 20% | 75 | 90 | Over-length titles/metas, internal-link mesh, maintainer entry point |
| Schema / Structured Data | 10% | 80 | 93 | `@graph`, ListItem `item` objects, Dataset completeness |
| Performance (CWV) | 10% | 81 | 92 | Polyfill chunk, render-blocking CSS, unmeasured INP |
| AI Search Readiness | 10% | 85 | 93 | Definitional blocks, `.md` coverage of new sections |
| Images | 5% | 80 | 92 | Missing dimensions on avatars, external icon dep, per-template OG |
| **Weighted** | | **≈80** | **≈94–96** | |

**Off-site (not scored, but decides whether any of this ranks):** Domain authority ≈ 0, invisible to Common Crawl. Treated as its own pillar below because 95+ mechanics with zero links still loses SERPs to DR-90 guides.

---

## 2. Macro view — four pillars

```
PILLAR A: MECHANICAL POLISH      → closes the last measurable audit gaps (fast, weeks 1–2)
PILLAR B: CONTENT LAYER          → guides hub + per-language starters + data studies (weeks 2–8)
PILLAR C: AUTHORITY ENGINE       → links, launches, digital PR from own telemetry (weeks 3–12, ongoing)
PILLAR D: MEASUREMENT LOOP       → GSC/RUM/drift so every change is verified, not assumed (continuous)
```

Sequencing rule: **A before B** (don't pour links onto broken pages), **B before C** (never launch traffic to a thin site), **D always**.

---

## 3. Pillar A — Mechanical Polish (target: every scored category ≥ 90)

### A1. Security & headers — Technical
- [ ] Add CSP header (start `report-only`, tighten after a week): `Content-Security-Policy: default-src 'self'; ...`
  - Effort M · Technical +2 · Check: securityheaders.com grade ≥ B, zero console violations after enforce.
- [ ] Keep HSTS at current values; submit to hstspreload.org once subdomains are cert-covered.
  - Effort S · Check: preload API returns "eligible".
- [ ] Add `X-Robots-Tag: noindex` response header for 404/soft-error responses (belt-and-suspenders vs canonical-to-home bug seen earlier).
  - Effort S · Check: `curl -I` on garbage URL shows header.

### A2. Site-wide metadata — Technical / Images
- [ ] `apple-touch-icon` in root layout (180×180 PNG).
  - Effort S · Images +2 · Check: present in homepage HTML.
- [ ] Dynamic OG images per template (`opengraph-image.tsx`): rankings/{lang}, guides/*, /repo/{o}/{n} with repo C-Rank badge.
  - Effort M · Images +4 · Check: og:image URL returns 1200×630 on each template.

### A3. Pagination & crawl paths — Technical
- [ ] Make /topics pagination real `<a>` links (currently JS-only; ?page=2 returns 200 self-canonical with no robots meta — pick SSR links OR noindex,follow, not neither).
  - Effort M · Technical +3 · Check: raw HTML contains page-2 anchors.
- [ ] Reduce sitemap lastmod to date precision (no seconds) to cut recrawl churn.
  - Effort S · Check: no `T..:..:` timestamps in sitemap XML.

### A4. Titles & metas — On-Page
- [ ] Trim all templates to ≤60c titles / ≤160c metas. Homepage currently 78c/238c; 4/5 sampled pages over-length.
  - Effort S · On-Page +5 · Check: script/grep over rendered pages reports 100% within limits.
- [ ] Front-load primary keyword in each template's title (e.g., "Rust Repos That Merge PRs — Rankings | GetMerged").
  - Effort S · On-Page +2.

### A5. Bundle & CSS — Performance
- [ ] Remove legacy polyfill chunk (~112KB) via modern build targets / browserslist.
  - Effort M · Perf +3 · Check: no polyfills chunk referenced in HTML.
- [ ] Inline critical CSS, defer remainder of 90KB sheet; verify FCP improvement.
  - Effort M · Perf +3 · Check: single non-blocking stylesheet; lab FCP <1.8s mobile.
- [ ] Self-host skill icons as one SVG sprite; delete external preloads (availability + speed).
  - Effort M · Perf +2, Images +2 · Check: zero skillicons.dev requests.

### A6. Measure INP properly — Performance
- [ ] Ship `web-vitals` beacon to your backend (or Cloudflare RUM); you cannot score INP you never measure.
  - Effort M · Perf gate · Check: p75 INP visible in dashboard; ≤200ms or fix long tasks.

### A7. Schema completion — Schema
- [ ] Consolidate homepage JSON-LD into one `@graph`.
- [ ] Convert `ListItem.url` → nested `item: {@type: Thing}` across ItemLists (hall-of-fame, leaderboard, gfi).
- [ ] Dataset on ALL 105 ranking pages with `variableMeasured` + `distribution`.
- [ ] WebApplication: add `offers` (free) + `browserRequirements`.
- [ ] BreadcrumbList on /repos, /compare, /topics, /privacy, /terms.
  - All Effort S–M · Schema +8 total · Check: Rich Results Test = 0 errors/warnings per template.

### A8. Image hygiene — Images
- [ ] Add explicit width/height to the 24 avatar imgs on /repos missing them.
  - Effort S · Images +3 · Check: grep = 0 imgs without dimensions.

**Exit criteria Pillar A:** re-run `/seo audit` → expect **86–88**, zero High findings.

---

## 4. Pillar B — Content Layer (biggest score mover: Content 78 → 90)

### B1. Guides hub `/guides` (currently 404)
- [ ] Hub page: "How to find open-source projects that actually merge your PR" — 1,800+ words, links into rankings/gfi tools.
- [ ] 10 evergreen pillars targeting guide-SERPs we can't win today:
  - how to find open source projects to contribute
  - best github repos for beginners (by language × top 5 langs)
  - how to know if a maintainer will review your PR
  - zombie PRs: why contributions get ignored (+ original data)
  - first PR checklist / etiquette
  - hacktoberfest reality-check guide
  - Effort L (each guide M) · Content +6 · Quality gate: ≥60% unique vs each other, ≥300 words substantive minimum, author byline + reviewed-date on every guide.
- [ ] Per-language starter guides: fold into `/contribute/{lang}?level=*` (already in sitemap) or create `/guides/{lang}` — ensure unique intro copy, not boilerplate skeletons (rankings pages showed 22% cross-template overlap; keep guides under that).
  - Effort L · Content +4 · Check: pairwise 5-gram overlap between sibling pages <25%.

### B2. Definitional / citability layer — GEO
- [ ] "What is C-Rank™?" extractable definition block on homepage (one self-contained sentence: scale, range, grading).
- [ ] `.md` routes for /guides, /rankings/{lang}, /repos (extend existing raw-markdown pattern); list them in llms.txt + llms-full.txt.
- [ ] Data-glossary page defining every metric (merge rate, review turnaround, first-timer conversion) with formulas.
  - Effort M · GEO +5 · Check: llms.txt URLs all 200; definitions appear verbatim in raw HTML.

### B3. Provenance & freshness — E-E-A-T / Content
- [ ] Every data page carries "Telemetry updated {ts}" (done on rankings — replicate to gfi, hall-of-fame, compare, repo pages).
- [ ] Methodology page: cite named sources for the "60% maintainers unpaid" stat or drop it; add "as of" dates to all claims.
- [ ] Case-study section: 3 real contributor stories (own merged PRs via GetMerged discovery) with screenshots — pure Experience signal, nothing fabricated.
  - Effort M · Content +4, trust multiplier for everything · Check: E-E-A-T spot-audit finds named sources + dated claims on all data pages.

### B4. Maintainer persona — SXO (54 → 70)
- [ ] "Check any repo" URL-paste input in hero (serves devs validating + maintainers discovering; creates shareable repo pages = organic link bait).
- [ ] Maintainer claim flow stub: "Own this repo? See why contributors bounce." 
  - Effort M · SXO +8, On-Page +2 · Check: input live above fold; persona re-score ≥6/10 for maintainers.

**Exit criteria Pillar B:** `/seo content` ≥ 88; guides indexed in GSC within 30 days of publish.

---

## 5. Pillar C — Authority Engine (off-score; unlocks actual rankings)

> Rule 12 spirit applies: no fake data, no paid-link junk. Only durable, topical, white-hat plays.

### C1. Foundation (week 3, before any launch)
- [ ] Google Search Console property + submit sitemap; verify indexation of homepage + top 20 money pages.
- [ ] Bing Webmaster Tools: verify, import, use free backlink + index data (free tier is generous).
- [ ] Moz free API key (2,500 rows/mo) for DA tracking baseline.
- [ ] IndexNow: auto-submit changed URLs on deploy (key file already live — wire submission into CI/deploy hook).
  - Effort S each · Check: GSC shows sitemap processed; Bing lists ≥1 inbound link.

### C2. Launch wave (week 4)
- [ ] Show HN post: "Show HN: I ranked 53k GitHub repos by how fast they merge PRs" (data angle > tool angle).
- [ ] r/opensource, r/SideProject, dev.to cross-post of the methodology story.
- [ ] Product Hunt / Uneed / DevHunt / AlternativeTo listings (each = durable referring domain + CC-visible citation).
  - Effort M · Expected: 10–50 RDs if HN lands · Falsifiability: CC graph shows centrality within 60 days, else channel failed → pivot budget to long-tail only.

### C3. Ecosystem embedding (weeks 4–8, ongoing)
- [ ] PRs to awesome-lists (awesome-go given stack, awesome-nextjs, etc.) adding GetMerged under "discovery/tools".
- [ ] GitHub Org (not personal profile) + link from site footer; org README links back.
- [ ] Free-tool embeds: "C-Rank badge" snippet maintainers paste into their READMEs (links back automatically) — highest-leverage loop for this product.
  - Effort M · Badge loop compounds; track RD velocity monthly.

### C4. Digital PR from own telemetry (month 2+, repeatable)
- [ ] Quarterly data study: "State of Open Source Hospitality 2026" — median review times by language, ghost-town rate, first-timer success. Journalists/aggregators cite original data; this is THE link magnet for a data company.
- [ ] Publish as page + PDF + CSV (also feeds GEO citability).
  - Effort L per edition · Expected: recurring RD growth; leading indicator = unlinked brand mentions.

**Exit criteria Pillar C:** ≥30 referring domains, CC centrality nonzero, ≥5 RDs from badges/lists.

---

## 6. Pillar D — Measurement Loop (continuous)

- [ ] `/seo drift baseline https://getmerged.abhishekco.de/` now; `/seo drift compare` after each phase (regression guard).
- [ ] Weekly: GSC queries report — track impressions for "good first issues {lang}", "find open source project", branded terms.
- [ ] Monthly: full `/seo audit`; log score per category in this file's table below.
- [ ] Guardrails: soft-404 count flat, sitemap↔DB count parity, llms.txt↔llms-full consistency test in CI.
- [ ] Kill-criteria honesty: any tactic showing no leading indicator after its falsifiability window (noted per item) gets dropped, not defended.

### Score log
| Date | Score | Notes |
|---|---|---|
| 2026-08-23 | 69 → 80 | Criticals closed (counters, soft-404s, robots, schema, sitemap, HSTS, weights, timestamps, IndexNow, .md routes) |
| | | |

---

## 7. Execution order (one-glance)

| Sprint | Focus | Ships |
|---|---|---|
| W1 | A1–A8 | CSP, icons, titles, dims, schema batch, polyfills, sprite, RUM |
| W2 | B1 start + B2 | Guides hub skeleton, definition blocks, .md routes |
| W3 | C1 + B3 | GSC/Bing/Moz wired, provenance pass, case studies drafted |
| W4 | C2 + B1 finish | Launch wave, 10 pillar guides published |
| W5–6 | B4 + C3 | Repo-check input, badge loop, awesome-list PRs |
| W7–8 | C4 v1 + re-audit | First data study, drift compare, `/seo audit` → expect 90+ |
| Monthly | D loop | Re-audit, drift, score log row |

**Projection:** Pillar A alone ≈ 87. A+B ≈ 91. A+B+C(D) sustained ≈ 95+ — because content depth, citability, image/OG coverage, and schema saturation are all scored categories, while authority converts those scores into traffic.
