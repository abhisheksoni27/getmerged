# SXO (Search Experience) — 72/100
curl × 12 URLs + `frontend/src/app` source.

| Intent | Page | Verdict |
|---|---|---|
| good first issue python | /good-first-issue/python (684KB SSR) | ✅ match |
| welcoming open source repos | /rankings/python (422KB) | ✅ match |
| repo merge rate | no page — /merge-rate + /audit 404 | ❌ gap |
| hacktoberfest repos | /hacktoberfest (280KB) | ✅, no FAQ schema |

## Personas
- First-time contributor (GFI claim) 8/10 — SSR cards, Claim CTA pre-JS, 1 click from home. Deduct: no FAQ; sign-in gate not SSR-visible.
- Experienced dev (welcoming repo) 9/10 — SSR 40 cards, FAQ on /rankings/python only (missing root/other langs).
- Maintainer (repo health) 6/10 — scorecard works (/getsentry/sentry 183KB, FAQ ✅); /facebook/react fetched 152KB on recheck (earlier empty = flake). /maintainers no FAQ; /audit root 404.
- Recruiter (talent) 4/10 — /talent gone (404); /pr-simulator + talent not linked from homepage.

## SSR violations (AGENTS.md)
1. pr-simulator: use client + no metadata → wrong title + canonical→/ (P0).
2. /stack: metadata OK but results require JS, no noscript fallback (acceptable for tool pages; flag if SEO-targeted).
3. GFI/rankings/scorecards PASS (SSR cards, metadata, no skeletons).

## Fixes
1. pr-simulator canonical+metadata (P0). 2. Create /merge-rate or redirect; add /audit index. 3. FAQ schema on /pricing, /maintainers, GFI, /hacktoberfest. 4. Link /pr-simulator from nav (talent is 404 — decide: restore or drop). 5. Surface claim sign-in requirement in SSR copy.
