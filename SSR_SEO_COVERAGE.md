# SSR & SEO Crawl Floor Audit Report

| # | Route | File Path | Type | SSR Direct HTML (`<h1>`, text) | Dynamic Metadata | JSON-LD Schema | Fix Applied & Verified |
|---|---|---|---|---|---|---|---|
| 1 | `/` | `src/app/page.tsx` | Server Component | ✅ Yes | ✅ Yes (Root Layout) | ✅ WebSite, Org, WebApp | ✅ Applied |
| 2 | `/[owner]/[name]` | `src/app/[owner]/[name]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ SoftwareSourceCode, FAQPage, Breadcrumbs | ✅ Applied |
| 3 | `/[owner]/[name]/audit` | `src/app/[owner]/[name]/audit/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Applied |
| 4 | `/[owner]` | `src/app/[owner]/page.tsx` | Server Component | ✅ Canonical Redirect | ✅ Yes | N/A (Redirect to `/u/:slug`) | ✅ Applied |
| 5 | `/about` | `src/app/about/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ AboutPage, Organization, Breadcrumbs | ✅ Applied |
| 6 | `/c/[id]` | `src/app/c/[id]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Applied |
| 7 | `/community-powerhouses` | `src/app/community-powerhouses/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 8 | `/compare` | `src/app/compare/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ WebPage, Breadcrumbs | ✅ Applied |
| 9 | `/compare/[...slug]` | `src/app/compare/[...slug]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ItemList, Breadcrumbs | ✅ Applied |
| 10 | `/contribute` | `src/app/contribute/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 11 | `/contribute/[language]` | `src/app/contribute/[language]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 12 | `/dashboard` | `src/app/dashboard/page.tsx` | Server Component | ✅ Auth Protected | ✅ Yes (`noindex`) | N/A (Private Auth) | ✅ Verified |
| 13 | `/docs` | `src/app/docs/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ TechArticle | ✅ Applied |
| 14 | `/good-first-issue` | `src/app/good-first-issue/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 15 | `/good-first-issue/[lang]` | `src/app/good-first-issue/[lang]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ItemList, Breadcrumbs | ✅ Applied |
| 16 | `/guides` | `src/app/guides/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, Breadcrumbs | ✅ Applied |
| 17 | `/guides/[slug]` | `src/app/guides/[slug]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ TechArticle | ✅ Applied |
| 18 | `/hacktoberfest` | `src/app/hacktoberfest/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ItemList | ✅ Applied |
| 19 | `/hall-of-fame` | `src/app/hall-of-fame/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 20 | `/how-c-rank-works` | `src/app/how-c-rank-works/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ TechArticle, FAQPage, Breadcrumbs | ✅ Applied |
| 21 | `/how-to-contribute/[owner]/[name]` | `src/app/how-to-contribute/[owner]/[name]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ HowTo, FAQPage, Breadcrumbs | ✅ Applied |
| 22 | `/leaderboard` | `src/app/leaderboard/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ItemList, Breadcrumbs | ✅ Applied |
| 23 | `/org/[org]` | `src/app/org/[org]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Organization, ItemList, Breadcrumbs | ✅ Applied |
| 24 | `/pr-readiness` | `src/app/pr-readiness/page.tsx` | Client Component | ✅ Yes | ✅ Yes (Root Layout) | N/A (Interactive Tool) | ✅ Applied |
| 25 | `/pr-simulator` | `src/app/pr-simulator/page.tsx` | Client Component | ✅ Yes | ✅ Yes (Root Layout) | N/A (Interactive Tool) | ✅ Applied |
| 26 | `/preflight` | `src/app/preflight/page.tsx` | Client Component | ✅ Yes | ✅ Yes (Root Layout) | N/A (Interactive Tool) | ✅ Applied |
| 27 | `/pricing` | `src/app/pricing/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Product, Offer, Breadcrumbs | ✅ Applied |
| 28 | `/privacy` | `src/app/privacy/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ WebPage, Breadcrumbs | ✅ Applied |
| 29 | `/rankings` | `src/app/rankings/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 30 | `/rankings/[lang]` | `src/app/rankings/[lang]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ItemList, Dataset, FAQPage, Breadcrumbs | ✅ Applied |
| 31 | `/repo/[owner]/[name]` | `src/app/repo/[owner]/[name]/page.tsx` | Server Component | ✅ Canonical Redirect | N/A (Redirect to `/:owner/:name`) | N/A (Redirect) | ✅ Applied |
| 32 | `/repos` | `src/app/repos/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, FAQPage, Breadcrumbs | ✅ Applied |
| 33 | `/settings/notifications` | `src/app/settings/notifications/page.tsx` | Client Component | ✅ Auth Protected | ✅ Yes (`noindex`) | N/A (Private Auth) | ✅ Verified |
| 34 | `/share/pr-eval/[id]` | `src/app/share/pr-eval/[id]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Applied |
| 35 | `/status` | `src/app/status/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ WebPage | ✅ Applied |
| 36 | `/terms` | `src/app/terms/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ WebPage, Breadcrumbs | ✅ Applied |
| 37 | `/topics` | `src/app/topics/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 38 | `/topics/[topic]` | `src/app/topics/[topic]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ CollectionPage, ItemList, Breadcrumbs | ✅ Applied |
| 39 | `/u/[username]` | `src/app/u/[username]/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ ProfilePage | ✅ Applied |
| 40 | `/watchlist` | `src/app/watchlist/page.tsx` | Server Component | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Applied |
