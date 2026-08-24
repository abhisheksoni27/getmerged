# opendoor

> **Glassdoor for open‑source repositories.**  
> Don't guess which door is open. Opendoor shows you where your pull requests are actually welcomed, reviewed fast, and merged.

[![C-Rank Telemetry](https://img.shields.io/badge/C--Rank%E2%84%A2-Telemetry%20Engine-10b981?style=flat-square)](https://opendoor.abhishekco.de)
[![License: MIT](https://img.shields.io/badge/License-MIT-zinc?style=flat-square)](LICENSE)

<img width="1280" height="657" alt="image" src="https://github.com/user-attachments/assets/f11c824a-c940-40a5-bfb8-3e61390da119" />


---

## 🌟 Overview

**opendoor** is an open-source platform designed to end the frustration of submitting pull requests to ghost-town repositories. 

Using objective mathematical telemetry gathered via the **GitHub GraphQL API**, Opendoor scores public repositories on a **C-Rank™ scale (S to D)** based on maintainer responsiveness, external PR merge velocity, and first-time contributor success rates.

Try now: [OpenDoor](https://opendoor.abhishekco.de?utm_campaign=try_now&utm_source=github&utm_medium=github)

<img width="1240" height="220" alt="image" src="https://github.com/user-attachments/assets/0c01a45e-fab3-4e20-9701-63222a95076b" />

<img width="405" height="323" alt="image" src="https://github.com/user-attachments/assets/70ee113d-697c-4bde-93f8-4cae4e712b0e" />

---

## 🚀 Key Features

- ⚡ **Proprietary C-Rank™ System (S to D)**: Objective scoring based on response times, merge rates, issue triage velocity, and maintainer breadth.
- 🎯 **Server-Side Filtering & Pagination**: Instant filtering across top programming languages (`Go`, `TypeScript`, `Python`, `Rust`, `C++`, etc.) and star range buckets (`500-1k` to `500k+`).
- 🤖 **AI Maintainer Vibe Check & PR Guidelines**: Gated LLM insights generating maintainer review summaries and PR submission checklists.
- 🌌 **Spacetime Continuum Particle Grid**: Interactive relativity lens background effects using modern HTML5 Canvas.
- 📊 **Macro Telemetry Visualizations**: Real-time distribution charts showing winning languages and tier breakdowns across 1,200+ scored repositories.
- ⚡ **Valkey & Cloudflare Edge Caching**: High-performance API responses cached with `Cache-Control` headers for sub-millisecond page loads.
- 🔒 **GitHub OAuth Integration**: Custom 7-day signed JWT authentication for user sessions and watchlists.

<img width="552" height="104" alt="image" src="https://github.com/user-attachments/assets/d2e825cb-6c18-4498-b2a1-7222ec5dcc83" />

---

## 🛠️ Architecture & Tech Stack

### Backend (`/backend`)
- **Language**: Go 1.22+ with `gin-gonic` framework
- **Database**: Turso (LibSQL) in production, SQLite in local dev (Native SQL queries only - **No ORMs**)
- **Cache**: Valkey in-memory cache
- **External API**: GitHub GraphQL API & OpenCode AI

### Frontend (`/frontend`)
- **Framework**: Next.js 15 (App Router) & React 19
- **Styling**: Tailwind CSS v4, Framer Motion, and HSL Design Tokens
- **Icons**: Lucide Icons & Magic UI Shimmer components
- **Rendering**: Server Components (SSR) for zero Cumulative Layout Shift (CLS) and dynamic SEO meta tags

---

## 📦 Project Structure

```
opendoor/
├── backend/
│   ├── cmd/
│   │   ├── server/               # Main API entrypoint
│   │   └── recalculate_history/  # CLI tool to upgrade historical snapshot ratings
│   ├── internal/
│   │   ├── analytics/            # Macro stats aggregation service
│   │   ├── auth/                 # Custom JWT issuer & GitHub OAuth
│   │   ├── scoring/              # C-Rank scoring math & percentile normalizer
│   │   ├── pipeline/             # GitHub GraphQL collector & scoring pipeline
│   │   └── handler/              # Gin REST HTTP handlers
│   └── docs/                     # Database migrations & SQL schemas
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router (SSR Pages & SEO)
│   │   ├── components/           # UI Header, RepoCard, & RelativityCanvas
│   │   ├── lib/                  # API client configuration
│   │   └── types/                # Opendoor TypeScript interface definitions
└── Makefile                      # Cross-compilation & automated scp deployment tasks
```

---

## 💻 Local Development

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in required GITHUB_TOKEN, DATABASE_URL, VALKEY_URL, and JWT_SECRET
go run ./cmd/server
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

---

## 🚀 Deployment & Operations

Use the included `Makefile` commands for deployment to your production server:

- **Deploy Backend**: `make deploy` (Cross-compiles Linux ARM64 binary and restarts service via scp)
- **Deploy Frontend**: `make deploy-frontend` (Syncs Next.js standalone output and static assets)
- **Recalculate Ratings**: `make recalculate-history` (Executes database snapshot upgrade on Turso)
- **Purge API Cache**: `make purge-cache INTERNAL_API_KEY=<your-key>` (Flushes Valkey API cache)

---

## 📜 License

Distributed under the MIT License. Built for open-source contributors worldwide.

---

## ✈️ Preflight GitHub Action (`opendoor/preflight`)

Add one line to any workflow and every push to a PR posts a check run forecasting acceptance odds with the C-Rank:

```yaml
- uses: opendoor/preflight@main
  with: { token: "${{ secrets.PREFLIGHT_TOKEN }}" }
```

### Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `api_url` | no | `https://getmerged.abhishekco.de` | Forecast API base URL |
| `token` | no | — | `PREFLIGHT_TOKEN`; omit on fork PRs |
| `github_token` | no | `${{ github.token }}` | Reads the PR diff, publishes the check run |
| `pr_number` | no | event payload | Pull request number |

### Outputs

| Output | Description |
| --- | --- |
| `score` | Preflight score 0-100 (empty when skipped/unavailable) |
| `rank` | C-Rank grade A-F |
| `conclusion` | `success` (≥70) · `neutral` (40-69) · `failure` (<40) · `skipped` (no PR diff) |

### Quota model

- **Fork PRs** (no repo secrets): public unauthenticated endpoint, **1 eval/month/IP**, check runs published read-only via job summary.
- **Repo-owner PRs**: pass the `PREFLIGHT_TOKEN` secret for **3 evals/month/token** on a rolling 30-day window.
- On `429 {limit, reset_at}` the action posts a neutral check: *"Quota exhausted — upgrade to Pro"* — the build never fails.

### Reliability contract

API timeout (10s), 5xx, or malformed response → neutral check **"Forecast unavailable"**, exit 0. Only invalid input (no PR diff) → `skipped`. The check run is named deterministically `preflight/<pr-number>`; pushes reuse the head SHA so stale runs auto-supersede, and in-flight runs are guarded by an idempotency key (`sha+attempt`).
