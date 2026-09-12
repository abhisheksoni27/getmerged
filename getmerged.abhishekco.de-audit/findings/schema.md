# Schema / Structured Data — 80/100
All blocks parse clean, zero JSON syntax errors. 6 templates checked live + source.

- `/` — 1 block @graph: WebSite(+SearchAction) + Organization + WebApplication. PASS. Org logo 200 OK. Minor: sameAs 1 entry (thin).
- `/rankings/python` — ItemList (50+ items ✅) + BreadcrumbList + Dataset (CC-BY-4.0, distribution→API 200) + FAQPage (3 Q/A). PASS — best template.
- `/repos` — BreadcrumbList + CollectionPage(ItemList 20+) + FAQPage (4 Q/A). PASS.
- `/pricing` — BreadcrumbList + Product (3 offers w/ price+currency+availability). PASS w/ gaps: no brand/image/review.
- `/facebook/react` — SoftwareSourceCode + FAQPage (5 Q/A) + BreadcrumbList. PASS w/ flags: `programmingLanguage: "Other"` (wrong — API fallback bug, src `[owner]/[name]/page.tsx:331`); breadcrumb middle crumb "Other Good First Issues" → wrong taxonomy (same root cause, lines 358-368). Add license/url/aggregateRating when available.
- `/good-first-issue` — CollectionPage (name/desc/url only) + BreadcrumbList. THIN — add ItemList.
- `/guides/[slug]` — Article + BreadcrumbList. MISSED: no HowTo with steps for how-to slugs (src `guides/[slug]/page.tsx:90-111`).
- `/compare` — BreadcrumbList + WebPage. OK.

Note: Google retired FAQ rich snippets (May 2026) — keep FAQPage for semantic value, don't rely on SERP features.

## Priority
1. Fix repo breadcrumb + language normalization (affects all `[owner]/[name]` pages).
2. Guides: add HowTo alongside Article. 3. GFI: add ItemList. 4. Pricing Product: brand/image/aggregateRating (only if real). 5. Org sameAs: X/LinkedIn + raster logo + contactPoint.
