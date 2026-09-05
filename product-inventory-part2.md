# Part 2: Component-to-Page Mapping, Missing Features, and Strategy

## 6. Component-to-Page Mapping (Key surfaces)

| Page | Key components used |
|---|---|
| `/` | MacroStatsGrid, RepoCard, RepoTrendChart, FloatingRepoCircles |
| `/repos` | ReposClient, RepoCard, LangLogo, TopicDirectoryGrid |
| `/rankings/[lang]` | RankingsClient, RepoCard, RepoTrendChart |
| `/good-first-issue/[lang]` | GfiSniperCard, ClaimIssueButton, ClaimIssueModal, IssueSniperTrigger |
| `/topics/[topic]` | TopicReposExplorer, TopicDirectoryGrid |
| `/leaderboard` | LeagueClient, KarmaProfileBadge, RepoCard |
| `/hall-of-fame` | RepoCard, CRankBadge |
| `/community-powerhouses` | RepoCard, OrgConsoleCard |
| `/[owner]/[name]` | ClientRepoDetail, RepoDetailHero, RepoScorecards, PRSizeSweetSpotCard, RepoTrendChart, SimilarRepos, RepoStickyBar, OptimalReviewWindow, PRAcceptanceWidget, RepoReviewsSection, UnscoredExplainer, RepoBadgeGenerator |
| `/[owner]/[name]/audit` | RepoAuditReport, RepoAuditCTA |
| `/compare/[...slug]` | VsShowdownCard, CompareShareBar, PRSizeSweetSpotCard, RepoTrendChart |
| `/dashboard` | DashboardClient, FirstMergeTrack, SeasonCard, QuestTrackCard, EmbedKarmaBadgeCard, MergeCelebrationModal, ProofOfWorkResumeModal, WeeklyWrapCard |
| `/u/[username]` | KarmaProfileBadge, EmbedKarmaBadgeCard, RecruiterContactSection, OpenToOpportunitiesToggle, ProofOfMergeModal |
| `/u/[username]/resume` | ProofOfWorkResumeModal |
| `/maintainers` | MaintainerConsoleModal, RaiseYourRank, RepoBadgeGenerator |
| `/pricing` | PricingClient |
| `/contribute/[language]` | TopMatches, ForYou, RepoCard |
| `/pr-simulator` | PRSim (client-side), ShareForecastButton |
| `/pr-readiness` | PRReadiness (client-side), ShareForecastButton |
| `/stack` | StackAnalyzer, GlobalSearch |
| `/talent` | TalentClient, RecruiterContactSection |
| `/league` | LeagueClient, SeasonCard, ProofOfMergeModal |
| `/hacktoberfest` | HacktoberfestLeaderboard, FirstMergeTrack, ShareCardButton |
| `/c/[id]` | ShareCard (public) |

---

## 7. What Was Missing from `announcement-schedule.md` and `premortem.md`

### Entire feature areas not covered
1. **Season/XP/streak system** — UTC-seasons, `AwardXPs` (50/merge, 10/review, weekly cap), `LevelForXP`, `StreakMonths` → 1.0–1.5x multiplier, deterministic `sr…` shareable season-rank cards with PNG OG
2. **Instant Scan + OG verdict cards** — `POST /api/v1/scan`, `/og/scan/:owner/:name`, InstantScanPanel, UnscoredExplainer
3. **PR Size Sweet Spot** — `sweet_spot_threshold` per repo, PRSizeSweetSpotCard, side-by-side in compare
4. **Bounty/boost economy** — cash-bounty label parsing (💰, algora, polar), `bounty_amount_usd`, sponsored issue ordering, boost checkout/activation/expiry, `repo_boost_orders`
5. **Maintainer Console** — `/api/v1/repos/:id/console`, MaintainerConsoleModal with C-Rank breakdown, checklist, claim status
6. **Raise Your C-Rank Playbook** — `/api/v1/repos/:id/playbook`, before/after OG share cards, 90-day token-scoped URLs, `crank_playbook_cards`
7. **Stall-Rescue episode state machine** — `pr_stall_alerts` + `pr_stall_rescue_alerts` migrations, episode gate, state machine, failure log, reviewer nudge mentions
8. **Weekly Wrap digest** — `GenerateWeeklyDigest`, WeeklyWrapCard: streak, karma delta, PR turnaround, curated GFIs
9. **Language Digest + email queue** — `lang_digest_subscribers`, `lang_digest_tokens`, CAN-SPAM footer, `gfi_email_queue` with instant/weekly modes, idempotent delivery
10. **Referral credits + credit packs** — `referral_credits` ledger, referrer bonus 3 / referee bonus 1, lifetime cap 10, credit pack checkout
11. **Achievement badges** — `achievements.go`, `achievement.svg`, AchievementBadge notification category
12. **Karma engine details** — tier counts, first_timer bonuses, streak multiplier, rank tiers, reputation headline
13. **Sniper subscriptions** — real-time Discord + generic webhook delivery for fresh GFIs, `user_sniper_subscriptions`, IssueSniperModal
14. **Contributor DNA** — `ContributorDNA`: languages, skill level, PR size preference, feedback tolerance, goals inferred, async background worker from 50 merged PRs
15. **Score trending charts** — `RepoTrendChart.tsx`, `/api/v1/repos/:id/trend?days=90`, `daily_snapshots` time-series
16. **Resume/Proof-of-Work PDF** — `/u/[username]/resume`, ProofOfWorkResumeModal, printable PDF export
17. **Share cards with referral attribution** — signed referral tokens, ShareForecastButton, FirstMergeTrack share prompt
18. **Org Console** — `/api/v1/orgs/:org/console`, OrgConsoleCard: aggregate tier, scored count, avg score, bus factor
19. **Talent/Recruiter Pass** — `/talent`, `GET /api/v1/recruiter/search`, recruiter-pass checkout, `RecruiterPass` entitlement, async reindex
20. **PR Preflight evaluator** — GitHub Action (`action.yml`), `POST /api/v1/preflight/evaluate`, scores diff on title quality, diff size, tests, description
21. **Proof-of-Merge celebration** — MergeCelebrationModal, confetti, shareable card
22. **Low-sample Bayesian prior** — repos with <20 PRs tagged `low_sample: true`, not eligible for S/A tier
23. **C-Rank change alerts** — `crank_alerts.go`, compare-and-swap last-alerted guard
24. **Issue claim flow** — `PostClaimIssueHandler`, ClaimIssueButton, ClaimIssueModal, `issue_claims` table
25. **Stack scanner** — `POST /api/v1/stack/analyze`, `POST /api/v1/stack/scan-repo`, reads package.json/go.mod/Cargo.toml
26. **Language Match Quiz** — interactive quiz recommending repos by experience level
27. **Weekly Wrap notification category** — `weekly_wrap` in `notifications.ts`
28. **GFI alert preferences** — per-category toggles, instant/weekly modes, email queue

### Specific numbers/claims in original plan that need updating
- "53,000 repos" → **102,094 repos** (1.02 lakh)
- "22,124 good first issues" → added
- "4 users, 2 pro" → added (pre-launch numbers, will scale)
- Tier distribution was not in original plan → added (S=1,594, A=10,463, B=31,795, C=4,937, D=53,065)
- The plan said "350+ JavaScript & TypeScript projects, 280+ Python repos" → actual: JS 7,784, TS 9,157, Python 12,532

---

## 8. The Real Product Map (Condensed for Strategy)

```
GetMerged
├── DISCOVERY (11 pages, 50+ API endpoints)
│   ├── Repo directory (102k repos, SSR-filtered, sort by c_rank_score)
│   ├── Good First Issues (22k issues, bounty-aware)
│   ├── Rankings (20 ecosystems, top-50 each)
│   ├── Topics (100+ tags)
│   ├── Hall of Fame / Community Powerhouses
│   ├── Instant Scan + OG verdict cards
│   ├── Compare / VS Showdown
│   └── Stack scanner (finds GFIs in YOUR deps)
├── CONTRIBUTOR (11 pages, 30+ API endpoints)
│   ├── Dashboard (PR tracker, forecasts, FirstMergeTrack, SeasonCard, QuestTrack, Karma, WeeklyWrap)
│   ├── Profile (/u/:username) + Proof-of-Work Resume + PDF
│   ├── PR Simulator + PR Readiness checker
│   ├── Contribute matchmaker
│   ├── Contribution guides (5 existing + pipeline)
│   ├── Talent directory (WorkDone)
│   ├── For-You / Top-Matches
│   └── Season/XP/streak + League + Karma + Achievements
├── MAINTAINER (3 pages, 20+ API endpoints)
│   ├── Maintainer landing + claim flow
│   ├── Maintainer Console (C-Rank breakdown, checklist, claim status)
│   ├── Raise Your C-Rank Playbook (quantified gaps, before/after OG cards)
│   ├── Stall-Rescue alerts + C-Rank change alerts
│   ├── Repo Audit ($10) with AI-prioritized fixes
│   └── Org Console (org-wide aggregate)
├── SOCIAL / GAMIFICATION (5 pages, 15+ API endpoints)
│   ├── League (monthly sprint, Bronze→Gold)
│   ├── Hacktoberfest leaderboard + live merge tracker
│   ├── Share cards with referral attribution
│   ├── Proof-of-Merge + Proof-of-Work
│   └── Issue Sniper (real-time Discord/webhook alerts)
├── MONETIZATION (1 page, 15+ API endpoints)
│   ├── Pro Contributor ($5/$39)
│   ├── Recruiter Talent Pass ($25)
│   ├── Credit packs (pay-as-you-go)
│   ├── Repo Boost ($X)
│   ├── Maintainer SLA ($X)
│   └── Referral program (bonus 3 / 1, cap 10)
└── INFRA (hidden but real)
    ├── 113 API endpoints
    ├── 70+ React components
    ├── Email queue (instant/weekly modes)
    ├── Language Digest + Weekly Wrap
    ├── SSE notification stream
    ├── GitHub App webhook + SNS email webhook
    └── Dodo Payments + Stripe webhooks
```

---

## 9. Immediate Action Items

1. **Update `announcement-schedule.md`** with real numbers (102k repos, 22k GFIs, tier distribution, language counts).
2. **Add the 28 missing feature areas** from §7 to the schedule as either new posts or section references.
3. **Promote GM-002 to a 3-part series** — it's the only differentiator.
4. **Add Season/XP/streak + League + Karma as a dedicated pillar** — this is the gamification moat competitors don't have.
5. **Add the "Instant Scan + OG verdict card" as a launch feature** — it's a perfect viral share mechanic.
6. **Add the "Stack scanner" as a launch feature** — "find GFIs in YOUR dependencies" is a unique angle no competitor has.
7. **Add bounty/boost economy as a maintainer monetization story** — "maintainers can earn from their issues" is a powerful pitch.
8. **Update the API count** from "~30 endpoints" to 113.
9. **Update the component count** from "~20 components" to 70+.
10. **Add the "Hard questions, short answers" FAQ disguise** to the writing template (not just specific posts).

---

## 10. Change Log

- **2026-09-05** — Initial full product inventory. DB counts, 30 public routes, 113 API endpoints, 70+ components, 28 hidden feature areas, gap check against launch plan.
