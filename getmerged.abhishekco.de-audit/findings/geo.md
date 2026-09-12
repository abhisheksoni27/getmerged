# AI Search Readiness (GEO) — 62/100

## Verified live
- `/llms.txt` 200, byte-identical to `frontend/public/llms.txt`, all 5 tiers + thresholds. Fresh ✅
- Tier-label "mismatch" = false alarm (llms.txt Moderate/Slow/Unmaintained match crank.go + inventory S/A/B/C/D).
- robots.txt: GPTBot/ClaudeBot/PerplexityBot/Anthropic-ai explicitly `Allow: /` + Content-Signal ✅
- `/facebook/react/raw` 200 text/markdown w/ attribution ✅ · `/llms-full.txt` 200 (9 dimensions) ✅
- Repo pages citation-excellent (FAQ direct answers, JSON-LD). `/about` citable (2024 origin, 102k repos, 48h SLA).

## Defects (verified live 2026-09-12)
1. **Raw scorecard data uncitable** — facebook/react: Merge Rate **6666.7%**, Stars 0, empty description, Language Other. Cap at 100%, backfill stars/desc/language. (−15)
2. **robots.txt blocks what llms.txt advertises** — `Disallow: /api/` vs llms.txt telling agents to fetch `/api/v1/repos`. Allowlist read-only GETs or remove from llms.txt. (−8)
3. **Dead methodology ref** — `/methodology` 404, yet /about says tiers are "open for inspection on our methodology page". Canonical is `/how-c-rank-works` (200) but llms.txt never links it. Add redirect + link. (−7)
4. **No dates on stats** — add `data-as-of` line to raw + visible date on repo pages. (−5)
5. **`/llms-full.txt` thin (2.7KB)** — missing full formula + top-200 S-tier directory. (−3)
6. **llms.txt examples use obscure `andrefetch/postal`** — swap to Tier-S flagship. (−2)
