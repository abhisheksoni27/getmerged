<div align="center">

# GetMerged

### Find GitHub repos that actually merge your PRs.

Open-source projects ranked by **review speed**, **outside-PR merge rate**, and **first-timer success**, so you stop sending pull requests into ghost towns.

[**Live site**](https://getmerged.abhishekco.de?utm_source=github&utm_medium=readme&utm_campaign=hero) · [Good first issues](https://getmerged.abhishekco.de/good-first-issue?utm_source=github&utm_medium=readme) · [How scoring works](https://getmerged.abhishekco.de/how-c-rank-works?utm_source=github&utm_medium=readme) · [Browser extension]([ADD: store link])

[ADD: badges row: license · CI status · live site status · GitHub stars]

[ADD: HERO SCREENSHOT or 10-sec GIF: home page with search + "Today's Open Doors" · 1600px wide, dark + light if possible]

</div>

---

## Why this exists

Most "good first issue" lists tell you where issues are. They don't tell you whether anyone will review your PR. A repo with 40k stars can have a median review wait of months, and a 1.8k-star repo can review in hours.

GetMerged scores repos on what maintainers actually do, using public GitHub activity, so you can pick projects where your PR has a real chance of getting merged.

**Who it's for**
- **First-timers and students** building a portfolio with merged PRs
- **Job-seekers** who want contribution proof that recruiters can verify
- **Developers giving back** to the tools they already use (see Stack Scanner)
- **Maintainers** who want to show contributors that their project reviews fast

## What you get

| Feature | What it does |
|---|---|
| **C-Rank score (S to D)** | Per-repo grade from outside-PR merge rate, review response time, recent activity, and first-timer acceptance |
| **Repo scorecards** | 90-day trend, PR-size vs. review-speed analysis, best time to submit, active maintainer count |
| **Good first issues** | Fresh issues from welcoming repos only, by language, with PR-in-progress flags |
| **Stack Scanner** | Paste your dependencies, get beginner issues in the tools you already use |
| **Compare** | Put two repos side by side before you commit to one |
| **README badge** | Maintainers embed a live C-Rank badge (see below) |
| **Browser extension** | Shows the score on any GitHub repo page ([ADD: status/link]) |
| **PR preflight Action** | Forecasts merge odds on your PR in CI (see below) |
| **Weekly digest / alerts** | Fresh issues for your language, no account needed |

[ADD: SCREENSHOT 1: repo scorecard (use a real, clean example repo)]
[ADD: SCREENSHOT 2: good first issues page, TypeScript or Python]
[ADD: SCREENSHOT 3: browser extension overlay on a GitHub repo page]

## How the score works

C-Rank is computed from public GitHub data via the GraphQL API and recalculated daily. Bot and org-member PRs are excluded so the numbers reflect what an outside contributor experiences.

| Signal | What it measures | Weight |
|---|---|---|
| External PR merge rate | Share of non-core PRs that get merged | [ADD] |
| Review response time | Hours until a maintainer first responds | [ADD] |
| Recent commit activity | Is the project alive right now? | [ADD] |
| First-timer success | Do first-time contributors get merged? | [ADD] |
| [ADD: remaining signals, or remove "9 signals" claim on the site] | | |

Grades: **S** (elite) · **A** · **B** · **C/D**. [ADD: score ranges per tier]

**Known limits** (we'd rather tell you than have you find out):
- Small samples are noisy. [ADD: how you handle / display sample size, e.g. "repos with fewer than N outside PRs are labeled low-confidence"]
- Merge rate can reward repos that accept trivial PRs. [ADD: what you do about it, e.g. weighting by PR substance]
- [ADD: any other honest caveat]

Full methodology: [getmerged.abhishekco.de/how-c-rank-works](https://getmerged.abhishekco.de/how-c-rank-works)

## Add the badge to your repo

```markdown
[![GetMerged C-Rank](https://getmerged.abhishekco.de/api/badge/OWNER/REPO)](https://getmerged.abhishekco.de/OWNER/REPO?utm_source=github&utm_medium=badge)
```

[ADD: SCREENSHOT: rendered badge examples, S / A / B tiers]

## Architecture

[ADD: DIAGRAM: GitHub GraphQL → collector → scoring pipeline → Turso → Go API (Gin) → Valkey cache → Next.js SSR → users. Excalidraw or Mermaid works.]

| Layer | Stack |
|---|---|
| Backend | Go 1.22+, Gin |
| Database | Turso (LibSQL) in prod, SQLite locally. Plain SQL, no ORM |
| Cache | Valkey, plus `Cache-Control` for edge caching |
| Data source | GitHub GraphQL API |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| Rendering | Server Components (SSR) for SEO and zero layout shift |
| Auth | GitHub OAuth, signed JWT sessions |

### Engineering decisions

- **Why plain SQL, no ORM:** [ADD: 1-2 sentences]
- **Scoring at scale ([ADD: N] repos):** [ADD: how the collector batches GraphQL queries, handles rate limits, and schedules refreshes]
- **Percentile normalization:** [ADD: why raw rates aren't enough and how scores are normalized across languages/sizes]
- **Caching strategy:** [ADD: what's cached, TTLs, purge flow, resulting p95 latency]
- **SEO:** [ADD: how per-repo and per-language pages are generated and kept from becoming thin or duplicate content]
- **Biggest trade-off / thing I'd change:** [ADD: honest one]

## Project structure

```
getmerged/
├── backend/
│   ├── cmd/
│   │   ├── server/               # API entrypoint
│   │   └── recalculate_history/  # Re-score historical snapshots
│   └── internal/
│       ├── analytics/            # Aggregate stats
│       ├── auth/                 # JWT + GitHub OAuth
│       ├── scoring/              # C-Rank math + percentile normalizer
│       ├── pipeline/             # GraphQL collector + scoring pipeline
│       └── handler/              # Gin HTTP handlers
├── frontend/                     # Next.js app (SSR pages, SEO)
├── extension/                    # Browser extension
├── [ADD: action dir]/            # PR preflight GitHub Action
└── docs/                         # Migrations and schemas
```

## Run it locally

**Backend**
```bash
cd backend
cp .env.example .env   # GITHUB_TOKEN, DATABASE_URL, VALKEY_URL, JWT_SECRET
go run ./cmd/server
```

**Frontend**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

[ADD: seed data / "no GitHub token?" quickstart so a visitor can see something running in under 5 minutes]
[ADD: how to run tests: `go test ./...`, `npm test`]

## Roadmap

- [ ] [ADD: next 3-5 items, e.g. org-level pages, Marketplace listing for the Action]
- [ ] [ADD]

## Contributing

This project eats its own cooking: good first issues are labeled [here]([ADD: issues link filtered by good first issue]). Read [CONTRIBUTING.md](CONTRIBUTING.md) first. [ADD: create it, with setup + PR expectations + response-time promise].

## FAQ

**How is this different from other good-first-issue lists?**
Those list issues. GetMerged scores whether maintainers actually review and merge outside PRs.

**Is my repo scored without my permission?**
Scores use only public GitHub data. Maintainers can claim a repo and [ADD: dispute process].

**How often is data refreshed?**
Scores are recalculated daily. [ADD: issue sync frequency]

## License

[ADD: MIT or other. Add a LICENSE file and state clearly whether the scoring weights/data are included.]

## Author

Built by [Abhishek Soni](https://github.com/abhisheksoni27). [ADD: X/LinkedIn/site links]

If GetMerged helped you land a PR, a star helps others find it.