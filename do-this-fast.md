# Do This Fast

> **Status:** Execution backlog derived from `premortem.md`. Every item here is a concrete task with a file path, a one-line acceptance test, and a priority. Nothing is vague. Nothing is "nice to have." Do these before you write a single word of GM-001.

**Rule:** If a task is marked **P0**, it blocks public launch. **P1** should ship within 48 hours of launch. **P2** is within 2 weeks. **P3** is backlog.

---

## P0 — Blocks public launch. Do these first.

### 1. Publish `/how-c-rank-works` (public methodology page)

**Why:** The #1 HN comment will be "what's C-Rank?" If this page is a stub, we die. If it's excellent, we become the canonical source.

**What to build:**
- Route: `frontend/src/app/how-c-rank-works/page.tsx` (already exists — read it, then upgrade it).
- Content requirements (from `premortem.md` §2 table):
  - Tier thresholds: S = response_p50 ≤ 24h AND external_merge_rate ≥ 50% AND first_timer_rate ≥ 30% AND ≥2 active maintainers.
  - All 4 signal definitions (what counts as "external PR", "first-timer", "active maintainer").
  - Trailing window: 90 days.
  - Exclusion rules: spam bots, low-sample, archived, forks.
  - Score formula family: "weighted sum of normalized signals, calibrated annually via held-out PR outcomes."
  - Do NOT publish exact weights (0.35/0.30/0.20/0.15). Keep those private.
- Add a "Methodology changelog" section: "v2026.1 calibrated Q1 2026 against 12,000 PR outcomes."
- Link to the open-source scoring module: `backend/internal/scoring/`.
- Link to the leaderboard for current top-50 S-tier with raw numbers.
- Show one worked example end-to-end: pick a real repo, show its 4 signals, show how it gets its tier.

**Acceptance test:** A senior dev with no context can read this page in 3 minutes and explain C-Rank to a colleague without making anything up.

**File path:** `frontend/src/app/how-c-rank-works/page.tsx`

---

### 2. Add `low_sample: true` flag to every scorecard

**Why:** Q18 in the premortem — "What if a repo has 3 PRs total and 3 merged? 100% merge rate is meaningless." This is the #1 data integrity issue. A single viral screenshot of a 3-PR repo with S-tier destroys credibility.

**What to build:**
- Backend: in `backend/internal/handler/repos.go`, add `low_sample: true` to the JSON response when `total_prs_scored < 20` (or whatever threshold you set).
- Frontend: in `RepoCard.tsx` and `RepoScorecards.tsx`, render a "low sample" badge when `low_sample === true`. Style it as an amber/yellow caution badge, not a red error.
- In `latest_snapshots` or `repositories` table, add a `low_sample` boolean column if it doesn't exist. If it does, make sure it's populated during scoring.

**Acceptance test:** Browse to any repo with <20 PRs. The scorecard shows "low sample" badge. The repo is NOT eligible for S/A tier (enforce this in the tier assignment logic, not just the UI).

**File paths:**
- `backend/internal/scoring/` (add the flag during scoring)
- `backend/internal/handler/repos.go` (expose it in JSON)
- `frontend/src/components/RepoCard.tsx` (render badge)
- `frontend/src/components/RepoScorecards.tsx` (render badge)

---

### 3. Add `currently_active: bool` to every scorecard

**Why:** Q17 — "Why does it say my repo is S but I haven't merged anything in 2 weeks?" We flag "stale" but we don't re-evaluate tier on signal change. This is the freshness signal decay issue.

**What to build:**
- Backend: add a `currently_active` boolean to the scorecard response. Logic: `true` if the repo has had at least 1 merged PR or 1 closed issue in the last 30 days. `false` otherwise.
- Frontend: render a small green dot (active) or grey dot (inactive) next to the tier badge on every repo card and scorecard.
- Tooltip on the dot: "Active in last 30 days" or "No activity in last 30 days."

**Acceptance test:** Pick a repo that hasn't had a PR merged in 45 days. It shows S-tier but the grey dot is visible. Tooltip explains why.

**File paths:**
- `backend/internal/handler/repos.go` (expose `currently_active`)
- `frontend/src/components/RepoCard.tsx` (render dot + tooltip)
- `frontend/src/app/[owner]/[name]/page.tsx` (render on scorecard)

---

### 4. Ship a `report score dispute` form with 48h SLA badge

**Why:** Q10 — "Why is [my repo] scored C? You're wrong." Without a dispute form, this becomes a viral thread. With a form + 48h SLA badge, it becomes a trust signal.

**What to build:**
- Frontend: a simple form at `/dispute` or a modal on the repo scorecard page. Fields: repo URL, your GitHub username, what you think is wrong, evidence link.
- Backend: `POST /api/v1/repos/:id/claim-dispute` already exists (found in API inventory). Wire it to the form.
- Add a "Dispute" button on every repo scorecard page (`/[owner]/[name]/page.tsx`).
- Add a public changelog page at `/methodology/changelog` that lists every score recalibration with date, repo, and reason.

**Acceptance test:** Submit a dispute. You get a confirmation. The backend logs it. The changelog page shows it within 48 hours (manual step, but the infrastructure must be there).

**File paths:**
- `frontend/src/app/[owner]/[name]/page.tsx` (add Dispute button)
- `frontend/src/app/dispute/page.tsx` (new page, or modal)
- `backend/internal/handler/repos.go` (ensure `claim-dispute` endpoint works)
- `frontend/src/app/methodology/changelog/page.tsx` (new page)

---

### ~~5. Add `stale` threshold + re-evaluation trigger~~ → MOVED TO P2 (#11)

**Downgraded from P0.** Reason: the `currently_active` badge (P0 #3) already communicates freshness to users. Nightly scoring already runs — tier decay within a single day won't be noticed by anyone in launch week. Building a real-time re-evaluation pipeline risks destabilizing the scoring engine right before go-live. Ship this after launch settles.

---

### 6. Write the 5-bullet HN defense before posting

**Why:** Flaw #8 — "HackerNews will eat us alive." The Show HN comment will be "Cool, but maintainer responsiveness varies wildly by repo and the 102k number is misleading because most of those repos have <100 PRs total." They'll be right. We need a response ready.

**What to build:**
- A text file `hn-defense.md` in the repo root. 5 bullet points. Plain English. No jargon.
- Bullet 1: "We filter to repos with ≥1 external PR in the last 12 months. The 102k number is the filtered set, not all GitHub repos."
- Bullet 2: "We apply a Bayesian prior: repos with <20 PRs are tagged `low_sample: true` and are not eligible for S/A tier. We show the sample size on every scorecard."
- Bullet 3: "We score over a 90-day trailing window, not a snapshot. A single bad week doesn't tank a tier."
- Bullet 4: "The 4 signals are public. The math is in the open-source repo. You can re-run it."
- Bullet 5: "We're not claiming perfection. We're claiming transparency. If we're wrong, you can see exactly why and dispute it."

**Acceptance test:** A HN commenter posts the expected criticism. You can paste the 5-bullet response in under 2 minutes. It sounds human, not corporate.

**File path:** `hn-defense.md` (repo root)

---

### 7. Seed your own usage data (cold-start prevention)

**Why:** Product inventory shows 4 users, 0 tracked PRs, 0 feedback, 0 playbook cards. Every screenshot in GM-001 will show an empty product if you don't seed it with your own real usage first.

**What to do:**
- Track 5–10 of your own open/merged PRs via the Dashboard.
- Claim 3–5 repos you maintain or contribute to.
- Submit 2–3 contributor feedback entries on repos you've actually used.
- Ensure your `/u/[username]` profile has karma, level, and streak data populated.

**Acceptance test:** Your Dashboard shows real tracked PRs with statuses. Your profile shows real karma. The League/Season pages have at least one participant. Screenshots look alive.

**Owner:** Founder (no code — just use the product)

---

### 8. Verify OG images work for all shareable routes

**Why:** Social sharing is your viral loop. If OG images are broken, every X/LinkedIn/Reddit post shows a blank card. Kills distribution.

**What to test:**
- `/[owner]/[name]` — repo scorecard OG
- `/compare/[...slug]` — compare OG
- `/u/[username]` — profile OG
- `/c/[id]` — share card OG
- Homepage — main OG
- Use [opengraph.xyz](https://opengraph.xyz) or Twitter Card Validator.

**Acceptance test:** All 5 routes produce correct, readable OG images when pasted into a social sharing debugger.

**Owner:** Founder (15 min)

---

### 9. Write the Show HN post in first-person

**Why:** The premortem (§7) says the founder's story is the biggest differentiator. The Show HN post must be first-person, not third-person marketing.

**What to write:**
- Single-sentence opener: "I sent 11 PRs to OSS projects in 2024. Three got reviewed. I built GetMerged so the next person doesn't have to count on luck."
- 3–4 sentences on what GetMerged does (C-Rank, 102k repos, the scoring approach).
- One sentence on what's free vs Pro.
- "Try it: [link]. Feedback welcome."
- Have `hn-defense.md` ready to paste from.

**Acceptance test:** The post reads like a real person talking, not a landing page. Under 200 words.

**File path:** `hn-post.md` (repo root)

---

### 10. Test GitHub OAuth flow end-to-end from a fresh browser

**Why:** One broken OAuth = zero sign-ups on launch day. This is a 15-minute smoke test that catches the worst possible launch-day failure.

**What to test:**
- Open an incognito/fresh browser. Click "Sign in with GitHub." Complete the flow. Verify you land on Dashboard with your GitHub data populated.
- Test on mobile Safari and Chrome.
- Verify the callback URL matches production, not localhost.

**Acceptance test:** A fresh user can sign in via GitHub OAuth and see their Dashboard within 30 seconds.

**Owner:** Founder (15 min)

---

## P1 — Ship within 48 hours of launch

### 11. Add founder first-person voice to `/about`

**Why:** Flaw #9 — "The founder's story is our biggest differentiator and we are barely using it." Every blog post is third-person. The `/about` page should be first-person.

**What to build:**
- Read `frontend/src/app/about/page.tsx`.
- Rewrite in first-person: "I built this because..."
- Include the origin story: failed PR at scale → built the scoring engine.
- Include the personal pain: "I sent 11 PRs in 2024. Three got reviewed."
- Include the European job context subtly: "I'm a solo founder building in public. If this doesn't work, I have a great story for my next EU senior engineering interview."

**Acceptance test:** A stranger reads the `/about` page and can describe the founder's motivation in one sentence without reading any other page.

**File path:** `frontend/src/app/about/page.tsx`

---

### 12. Add founder byline + photo to every blog post template

**Why:** The blog template currently has no author byline. AI citation engines and readers need a named author.

**What to build:**
- In the blog post template (`content/posts/*.md` or the MDX template), add a byline: "By [Founder Name]" + avatar + date.
- Add `Person` JSON-LD to every post.
- Add a 1-sentence founder bio at the bottom of every post: "I'm [name], a solo founder building GetMerged. I wrote this because [one sentence]."

**Acceptance test:** Every published post has a visible author byline, a Person schema, and a 1-sentence founder bio.

**File paths:**
- Blog post template (wherever it lives in `content/` or `frontend/`)
- JSON-LD generator for posts

---

### 13. Implement the "currently_active" badge on repo cards

**Why:** This is a P0 item that may have been missed if the scoring pipeline doesn't have the data yet.

**What to build:**
- Same as P0 #3 above, but specifically the frontend rendering part.

**Acceptance test:** Repo cards show green/grey activity dot.

**File paths:**
- `frontend/src/components/RepoCard.tsx`
- `frontend/src/app/[owner]/[name]/page.tsx`

---

### 14. Add `low_sample: true` badge rendering

**Why:** Same as P0 #2 — the frontend rendering part.

**What to build:**
- Same as P0 #2 above, but specifically the frontend rendering part.

**Acceptance test:** Repos with <20 PRs show the amber "low sample" badge. They are not eligible for S/A tier in the UI.

**File paths:**
- `frontend/src/components/RepoCard.tsx`
- `frontend/src/components/RepoScorecards.tsx`

---

## P2 — Ship within 2 weeks

### 15. Implement tier re-evaluation on signal change (moved from P0 #5)

**Why:** Flaw #6 — tier decay. A repo's tier should reflect current state, not a week-old snapshot.

**What to build:**
- Backend: when new PR events arrive, recalculate the tier. If it changed, update `latest_snapshots` and trigger a webhook/notification.
- Frontend: show "Tier changed recently" badge with old/new tier.

**Acceptance test:** A repo's tier changes from S to D. The scorecard shows the change within 24 hours.

**File paths:**
- `backend/internal/scoring/`
- `backend/internal/pipeline/`
- `frontend/src/components/RepoCard.tsx`

---

### 16. Add the dispute form + changelog page

**Why:** P0 #4 — the backend endpoint exists. The frontend is the missing piece.

**What to build:**
- Frontend form at `/dispute` or modal.
- Changelog page at `/methodology/changelog`.

**File paths:**
- `frontend/src/app/[owner]/[name]/page.tsx` (Dispute button)
- `frontend/src/app/dispute/page.tsx` (new)
- `frontend/src/app/methodology/changelog/page.tsx` (new)

---

### 17. Add the "Hard questions, short answers" section to the blog template

**Why:** Every post needs the FAQ disguise. Baking it into the template means writers can't forget it.

**What to build:**
- In the blog post MDX template, add a `<section className="mt-8 pt-6 border-t border-white/[0.1]">` block with the heading "Hard questions, short answers" and 5 Q/A pairs.
- Add a comment in the template: `<!-- REQUIRED: fill in 5 skeptic questions + answers before publishing -->`

**Acceptance test:** Every new blog post draft includes the section with 5 questions filled in.

**File path:** Blog post template (wherever it lives)

---

### 18. Test Pro pricing with 5 user interviews

**Why:** Flaw #10 — "Pro pricing has no anchor." We have 2 Pro users but we don't know why they paid. We need to validate the price before scaling distribution.

**What to do:**
- Reach out to the 2 existing Pro users. Ask: "Why did you upgrade? Was it worth $5/$39? What would make you cancel?"
- Find 3 more potential Pro users (friends, HN commenters, early sign-ups). Offer free Pro in exchange for 15 minutes of feedback.
- Record the answers. Update pricing page if needed.

**Acceptance test:** You have 5 quotes from real users about the price. You can defend the price in a blog post or HN comment with real words, not guesswork.

**Owner:** Founder (no code)

---

### 19. Add the "currently_active" and "low_sample" flags to the API response

**Why:** P0 items #2 and #3 — the backend data layer.

**What to build:**
- Same as P0 #2 and P0 #3 above.

**File paths:**
- `backend/internal/scoring/`
- `backend/internal/handler/repos.go`

---

## P3 — Backlog (do after launch)

### 20. Implement the `currently_active` re-evaluation cron

**Why:** P0 #5 — the backend trigger.

**What to build:**
- A cron job that runs every 6 hours and re-evaluates `currently_active` for all repos.
- If `currently_active` changed from `true` to `false`, send a C-Rank Change Alert.

**File paths:**
- `backend/internal/pipeline/`
- `backend/internal/notification/crank_alerts.go`

---

### 21. Add the "Tier changed recently" badge

**Why:** P2 #15 — the frontend part of tier re-evaluation.

**What to build:**
- Same as P0 #5 above, but specifically the frontend rendering part.

**File paths:**
- `frontend/src/components/RepoCard.tsx`

---

### 22. Implement the score dispute backend workflow

**Why:** P0 #4 — the full workflow (backend + frontend + changelog).

**What to build:**
- Backend: dispute submission → email to founder → manual review → score recalculation → changelog entry.
- Frontend: dispute form + changelog page.

**File paths:**
- `backend/internal/handler/repos.go`
- `frontend/src/app/dispute/page.tsx`
- `frontend/src/app/methodology/changelog/page.tsx`

---

### 23. Add `low_sample` enforcement in tier assignment logic

**Why:** P0 #2 — the backend enforcement.

**What to build:**
- In `backend/internal/scoring/`, when assigning tiers, skip S/A if `low_sample === true`, regardless of the computed score.

**File paths:**
- `backend/internal/scoring/`

---

## Execution Order

**Day -1 (today, before any code):**
1. P0 #7: Seed your own usage data — track PRs, claim repos, submit reviews (2 hours)
2. P0 #9: Write the Show HN post in first-person (30 minutes)
3. P0 #6: Write `hn-defense.md` (30 minutes)
4. P0 #10: Test GitHub OAuth flow end-to-end (15 minutes)
5. P0 #8: Verify OG images on all shareable routes (15 minutes)

**Day 0 (code):**
6. P0 #1: Upgrade `/how-c-rank-works` page (4 hours)
7. P0 #4: Wire up dispute form to existing endpoint (1 hour)
8. P1 #11: Rewrite `/about` in first-person (1 hour)
9. P1 #12: Add founder byline to blog template (30 minutes)

**Day 1:**
10. P0 #2: Add `low_sample` flag — backend column + scoring logic + handler + frontend badge (4–6 hours — this is from scratch, not a quick wire-up)
11. P1 #18: Send 5 user interview emails (30 minutes)

**Day 2:**
12. P0 #3: Add `currently_active` — backend logic + handler + frontend dot/tooltip (3–4 hours)
13. P1 #17: Add FAQ disguise to blog template (30 minutes)
14. P1 #13 + #14: Verify frontend rendering of low_sample + currently_active (1 hour)

**Day 3–7:**
15. P2 #15: Tier re-evaluation on signal change (4 hours)
16. P2 #16: Dispute form page + methodology changelog page (2 hours)
17. P2 #18: Conduct user interviews, document quotes (2 hours)
18. Test everything. Run `npm run lint`, `go test ./...`, deploy.

**Day 8 (launch day):**
19. Post Show HN with `hn-defense.md` ready.
20. Post ProductHunt.
21. Post X thread, LinkedIn, Reddit.
22. First Instagram reel: walk through an S-tier repo scorecard.

**Days 9–12 (post-launch pivot window):**
23. Read all HN/Reddit/X feedback. Identify the #1 criticism.
24. If the criticism is about positioning: rewrite GM-002/GM-003 before publishing.
25. If the criticism is about data quality: prioritize P2 #15 (tier re-evaluation).
26. If the criticism is about pricing: fast-track P2 #18 (user interviews).
27. Do NOT publish GM-002 until you've absorbed launch-day feedback.

---

## File Path Index

| Task | File paths |
|---|---|
| P0 #1 | `frontend/src/app/how-c-rank-works/page.tsx` |
| P0 #2 | `backend/internal/scoring/`, `backend/internal/handler/repos.go`, `frontend/src/components/RepoCard.tsx`, `frontend/src/components/RepoScorecards.tsx` |
| P0 #3 | `backend/internal/handler/repos.go`, `frontend/src/components/RepoCard.tsx`, `frontend/src/app/[owner]/[name]/page.tsx` |
| P0 #4 | `frontend/src/app/[owner]/[name]/page.tsx`, `frontend/src/app/dispute/page.tsx`, `backend/internal/handler/repos.go`, `frontend/src/app/methodology/changelog/page.tsx` |
| ~~P0 #5~~ | Moved to P2 #15 |
| P0 #6 | `hn-defense.md` (repo root) |
| P0 #7 | No code (founder activity — seed usage data) |
| P0 #8 | No code (OG image verification) |
| P0 #9 | `hn-post.md` (repo root) |
| P0 #10 | No code (OAuth smoke test) |
| P1 #11 | `frontend/src/app/about/page.tsx` |
| P1 #12 | Blog post template (in `content/` or `frontend/`) |
| P1 #13 | `frontend/src/components/RepoCard.tsx` |
| P1 #14 | `frontend/src/components/RepoCard.tsx`, `frontend/src/components/RepoScorecards.tsx` |
| P2 #15 | `backend/internal/scoring/`, `backend/internal/pipeline/`, `frontend/src/components/RepoCard.tsx` |
| P2 #16 | `frontend/src/app/dispute/page.tsx`, `frontend/src/app/methodology/changelog/page.tsx` |
| P2 #17 | Blog post template |
| P2 #18 | No code (founder activity — user interviews) |
| P2 #19 | `backend/internal/scoring/`, `backend/internal/handler/repos.go` |
| P3 #20 | `backend/internal/pipeline/`, `backend/internal/notification/crank_alerts.go` |
| P3 #21 | `frontend/src/components/RepoCard.tsx` |
| P3 #22 | `backend/internal/handler/repos.go`, `frontend/src/app/dispute/page.tsx`, `frontend/src/app/methodology/changelog/page.tsx` |
| P3 #23 | `backend/internal/scoring/` |

---

## Change Log

- **2026-09-06** — Initial `do-this-fast.md` created from `premortem.md`. 19 tasks across P0/P1/P2/P3. Execution order with file paths and acceptance tests.
- **2026-09-06** — Revised: moved P0 #5 (tier re-evaluation) to P2 — `currently_active` badge covers the freshness concern at launch. Added 4 new tasks: P0 #7 (seed usage data), P0 #8 (OG image verification), P0 #9 (Show HN post), P0 #10 (OAuth smoke test). Adjusted time estimates for P0 #2 (2h→4-6h) and P0 #3 (2h→3-4h) — these are built from scratch. Added Days 9–12 post-launch pivot window. Total: 23 tasks.
