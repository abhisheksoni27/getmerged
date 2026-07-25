```markdown
# OpenDoor – Product Requirements Document
## 1. Executive Summary

OpenDoor is a web platform that helps open‑source contributors find repositories where their pull requests are actually welcomed and merged.  
It scores public GitHub repositories using a proprietary **C‑Rank™** system (S to D) based on objective metrics: merge rates, response times, and first‑timer success.  
Think of it as _Glassdoor for open‑source repos_.

This document describes the complete product specification, broken into **phased deliverables** suitable for implementation with Claude.

---

## 2. Problem & Solution

**Problem**  
Contributors waste time on repositories that ignore external PRs, have unresponsive maintainers, or label issues as “good first issue” but never mentor newcomers. There’s no data‑driven way to pick a project.

**Solution**  
A live dashboard that ranks repositories by contributor experience.  
Users can filter by language, experience level, and star count.  
Each repo gets a transparent C‑Rank based on real GitHub activity data, updated daily.

---

## 4. Core Metrics & Scoring Algorithm

### 4.1 Raw Metrics (per repository)

| Metric | Description | Calculation |
|--------|-------------|-------------|
| `external_pr_merge_rate` | Percentage of external PRs merged (last 90 days) | `merged_external_prs / total_external_prs_closed` |
| `time_to_first_response` | Median hours from PR open to first human comment | Median of all external PRs in last 90 days |
| `time_to_merge` | Median hours from PR open to merge | Median of merged external PRs |
| `first_timer_success_rate` | Percentage of first‑time contributors who got a PR merged | `first_timers_merged / total_first_time_contributors` |
| `repeat_contributor_rate` | Percentage of contributors who return for a second PR | `contributors_with_>1_pr / total_contributors` |
| `issue_triage_speed` | Median hours from issue open to first label/comment | Median of all new issues |
| `maintainer_responsiveness` | Composite of response time + comment frequency | Weighted combination |
| `staleness_flag` | Binary if no external PR merged in 6 months | boolean |

All data fetched via GitHub GraphQL API for the last 90 days (rolling window).

### 4.2 C‑Rank Score Calculation

**Normalisation**  
Each metric is normalised to a 0–100 scale using percentile rank among all tracked repositories (same language group optional).

**Weighted Sum**  
Weights (MVP defaults):

```
C-Rank Score = 
  0.35 * merge_rate_score
+ 0.20 * response_time_score
+ 0.15 * first_timer_score
+ 0.10 * time_to_merge_score
+ 0.10 * repeat_contributor_score
+ 0.05 * issue_triage_speed_score
+ 0.05 * responsiveness_score
```

**Tier Thresholds**  

| Tier | Score Range | Label |
|------|-------------|-------|
| S | ≥ 80 | Exceptional |
| A | 65 – 79 | Great |
| B | 50 – 64 | Mixed |
| C | 30 – 49 | Poor |
| D | < 30 | Avoid |

**Special Rule**  
If `staleness_flag == true`, the repo is automatically D‑Tier regardless of score.

---

## 5. System Architecture

```
[GitHub GraphQL API] ← (daily cron job) ← [Data Pipeline] → [MySQL]
                                                         ↓
                                               [REST API (gin-gonic golang)]
                                                         ↓
                                               [Next.js Frontend]
```

- **Backend**: golang
- **Database**: PostgreSQL 15+ with SQLAlchemy
- **Cache**: Valkey *using Aiven*
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcdnui
- **Deployment**: Vercel (frontend), mysql - turso using sqlite, and backend apis on oracle vm (add Makefile for common ops)

---

## 7. Phase‑wise Implementation Plan

### Phase 1: Data Pipeline & Scoring Engine (Backend Only)

**Goal**: Fetch repository data, compute C‑Rank scores, store in DB.

**Tasks**:
1. Set up gin-gonic golang 
2. Create database tables (`repositories`, `daily_snapshots`).
3. Implement a GitHub GraphQL client (using an access token, handle rate limits).
4. Build a seed script that:
   - Queries top repositories by language (e.g., stars > 100, sort by stars).
   - Inserts/updates `repositories` table.
5. Build a daily cron job (can be triggered via endpoint or scheduler) that:
   - For each repository not updated in last 24h, fetch PR/issue data for the last 90 days.
   - Compute raw metrics.
   - Normalise and calculate C‑Rank score & tier.
   - Insert a new `daily_snapshots` row.
6. Write unit tests for metric calculations.

**Acceptance Criteria**:
- Running `POST /api/v1/update-scores` (with auth) updates all repos.
- Querying the DB shows correct scores and tiers for sample repos (e.g., gin-gonic golang gets S, a stale repo gets D).

**Deliverables**:  
- GitHub repo with backend code.
- Environment variables: `GITHUB_TOKEN`, `DATABASE_URL`.
- README with setup instructions.

---

### Phase 2: Public API for Data

**Goal**: Expose a read‑only REST API for the frontend to consume.

**Endpoints**:
```
GET /api/v1/repos
  Query params:
    language (string, optional)
    tier (string, optional, e.g. S,A,B)
    min_stars (int, optional)
    experience (string, optional: "first-timer", "experienced")
    sort_by (string, default: "c_rank_score")
    order (string, default: "desc")
    page (int, default: 1)
    per_page (int, default: 20)

  Response:
  {
    "data": [
      {
        "id": "uuid",
        "full_name": "gin-gonic golang/gin-gonic golang",
        "language": "golang",
        "stars": 42000,
        "description": "...",
        "c_rank_tier": "S",
        "c_rank_score": 88,
        "external_pr_merge_rate": 78.5,
        "time_to_first_response_hours": 4.2,
        "first_timer_success_rate": 92.0,
        ...other metrics...
      }
    ],
    "meta": { "page": 1, "per_page": 20, "total": 1234 }
  }
```

**Tasks**:
1. Implement query parameters validation and filtering using SQLAlchemy.
2. Add caching headers (ETag) to reduce load.
3. Rate limit the public API (100 req/min per IP).
4. Swagger documentation auto‑generated by gin-gonic golang.

**Acceptance Criteria**:
- `GET /api/v1/repos?language=golang&tier=S` returns only golang repos with S tier.
- API docs accessible at `/docs`.

All the APIs must be versioned, starting from /api/v1/ etc.
All internal routes, if any, must start with /internal/ and should not be versioned. These will be denied at base nginx level from external hosts, but can be run locally using localhost. These must also required x-api-key.