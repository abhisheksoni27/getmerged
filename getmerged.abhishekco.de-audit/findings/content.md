# Content + On-Page SEO — 74/100 (Content) / 76/100 (On-Page)
7 URLs fetched live, all 200, parsed with Python.

| Page | Title | Meta | H1 | Words | Links int/ext |
|---|---|---|---|---|---|
| `/` | 61 chars ⚠️ | 140 ✅ | **3 H1s** 🔴 (hero sentence split in 3 tags); H1 not first in DOM | 2,247 | 102/1 |
| `/rankings/python` | 48 (short) | 147 ✅ | 1 ✅ | 1,894 | 117/1 |
| `/good-first-issue` | **82 🔴** | 158 ⚠️ | 1 ✅ | 613 (thinnest hub) | 59/1 |
| `/repos` | 63 ⚠️ | **169 🔴** | 1 ✅, not first in DOM | 2,225 | 93/1 |
| `/how-c-rank-works` | 55 ✅ | 159 ⚠️ | 1 ✅ clean | 1,720 | 49/2 |
| `/guides` | 50 ✅ | 135 ✅ | 1 ✅ | 457 (5 guides only) | 50/1 |
| guide article | **103 🔴** | 154 ✅ | **2 identical H1s 🔴** (hero + article header) | 1,694 | 56/6 |

## High
1. Guide template renders same H1 twice — demote one to `<p>`. Likely affects all 5 guides.
2. Homepage hero = 3 `<h1>` tags — single H1 wrapping full sentence, style inner spans.
3. `/good-first-issue` (82) + guide (103) titles truncate — rewrite ≤60, front-load keyword.

## Medium
4. Metas over 155: /repos 169, /gfi 158, /how-c-rank-works 159, /about 161 — trim to 120–155.
5. H1 not first in DOM on / and /repos (telemetry h2 precedes). Move H1 first.
6. Heading fragmentation: sentences split across h-tags (rankings/python "Ranked/Python/Repositories", gfi count heading) — one tag + spans.
7. Guides hub thin: 5 posts, 457 words — plan 5–10 more + card descriptions.
8. `/good-first-issue` schema gap: only CollectionPage+Breadcrumb; add ItemList + FAQ.

## Low
- Borderline titles (61/63/48) → nudge to 50–60. OG title/desc diverge from title/meta on / and /gfi — align. ~1 outbound link/page — add a few authoritative links. `/repos` meta "53,000+" vs 102k positioning — verify freshness.

## Solid
Self-referencing canonicals everywhere. No thin (<300w) pages. No duplicate guides. 49–117 internal links/page. Methodology + about + Article/Person schema = real E-E-A-T.
