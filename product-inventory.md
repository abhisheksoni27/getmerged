# GetMerged Full Product Inventory (2026-09-05)

> **Status:** Authoritative ground truth. Every feature, page, endpoint, and component. Source of truth for the launch plan, blog strategy, and all marketing copy. Do not reference a feature in any external document unless it appears here first.

---

## 1. Real Numbers (MySQL, 2026-09-05)

| Table | Count | Notes |
|---|---|---|
| repositories | **102,094** | Non-archived, non-fork, public repos scored nightly |
| latest_snapshots | **101,854** | Current C-Rank snapshot per repo |
| daily_snapshots | **341,455** | Historical time-series for trend charts |
| repo_good_first_issues | **39,207** (21,634 open, 17,573 closed) | Curated beginner-friendly issues with 9-month freshness cutoff, real-time read-through self-healing, and continuous background lifecycle sync |
| repo_ai_insights | **98,077** | AI-generated maintainer insights per repo |
| pr_tracked | 0 | User-tracked PRs (grows after first sign-in) |
| pr_stall_alerts | 0 | Stall-rescue alert episodes (grows with users) |
| users | 4 | Current registered users (pre-launch) |
| user_watchlists | 5 | Watchlisted repos |
| user_entitlements (pro) | 2 | Pro subscribers |
| user_monitored_stacks | 3 | Stack scanner results |
| seasons | 1 | Active season |
| notifications | 0 | In-app notifications (pre-launch) |
| gfi_subscribers | 0 | GFI email subscribers (pre-launch) |
| contributor_feedback | 0 | Repo reviews (pre-launch) |
| crank_playbook_cards | 0 | Playbook cards (pre-launch) |

### Languages (top 20)
Python 12,532 | TypeScript 9,157 | JavaScript 7,784 | Go 7,128 | C++ 5,891 | Rust 5,655 | Java 5,648 | C# 4,424 | Shell 4,194 | PHP 4,183 | Kotlin 3,245 | Swift 3,149 | C 2,984 | HTML 2,938 | Ruby 2,105 | Dart 1,972 | Lua 1,816 | Objective-C 1,779 | CSS 1,538 | Vue 1,378

### Tier Distribution
| Tier | Count | % |
|---|---|---|
| S (Super Welcoming) | 1,594 | 1.6% |
| A (Welcoming) | 10,463 | 10.3% |
| B (Solid) | 31,795 | 31.2% |
| C (Moderate) | 4,937 | 4.9% |
| D (Risky) | 53,065 | 52.1% |

---

## 2. Public Routes (Grouped by Purpose)

### Discovery
| Route | What it does |
|---|---|
| `/` | Homepage: macro stats, top S-tier repos, spotlight repos, 90-day trend charts, SSR JSON-LD |
| `/repos` | Paginated directory (102k repos) with SSR filters: language, tier, stars, merge rate, first-timer success, trending. Dual layout toggle (Rows/Cards). CollectionPage + FAQ schema. Default sort `c_rank_score desc`. |
| `/rankings` | Ecosystem hub: 20 language leaderboard cards with aggregate stats |
| `/rankings/[lang]` | Per-language top-50: C-Rank score, merge rate, GFI count, dataset download, FAQ, ItemList schema |
| `/good-first-issue` | Beginner issue hub: 14 language ecosystems, LanguageMatchQuiz, GfiSniperCard |
| `/good-first-issue/[lang]` | Live GFI feed: repo grid, boosted badges, freshness labels, claim actions |
| `/topics` | Paginated topic directory (100+ topics) with search and stat badges |
| `/topics/[topic]` | Repos tagged with a topic: aggregate merge rate, review latency, TopicReposExplorer grid |
| `/hall-of-fame` | Curated S-tier showcase: highest C-Rank repos, responsive RepoCard grid |
| `/community-powerhouses` | Repos sustained by 5+ distinct active maintainers: bus-factor resilience, faster review cycles |
| `/[owner]/[name]` | Full repo scorecard: SSR-fetched insights, related repos, GFI list, PR size sweet spot, acceptance likelihood, optimal review time, 90-day trend, comprehensive JSON-LD |
| `/[owner]/[name]/audit` | Deep maintainer audit: PR drop-off funnel, reviewer burnout signals, first-timer journeys, AI-prioritized fixes, actionable templates, $10 report purchase |

### Contributor
| Route | What it does |
|---|---|
| `/contribute` | Matchmaker hub: pick language ecosystem to find high-merge-rate, fast-review repos |
| `/contribute/[language]` | Matched repos for language/experience level: match scores, tier badges, GFI counts, sign-in gate |
| `/how-to-contribute/[owner]/[name]` | Data-backed contribution guide: stats strip, step-by-step game plan, linked open GFIs |
| `/guides` | Directory of step-by-step contribution guides with reading time, author, cover images |
| `/guides/[slug]` | Individual guide article: ReactMarkdown, styled typography, code blocks, tables |
| `/how-c-rank-works` | In-depth methodology: 9 C-Rank telemetry signals, tier classification, calculation formulas |
| `/stack` | Tech stack dependency scanner: reads package.json/go.mod/Cargo.toml to find beginner-friendly issues in user's dependencies |
| `/talent` | WorkDone developer database: search verified engineers by merged PR complexity, language mastery, maintainer reviews (noindex) |
| `/pr-simulator` | Client-side PR acceptance simulator: scores pasted diff on title quality, diff size, tests, description, CONTRIBUTING.md match; generates shareable badges |
| `/pr-readiness` | Client-side PR readiness checklist: scores title, diff size, summary, tests, issue link, red-flag terms with live acceptance gauge |
| `/u/[username]` | Public contributor profile: SSR-fetched karma data, client-side showcases, imported repos, benchmarks |
| `/u/[username]/resume` | Printable proof-of-work resume: audited PR merges, maintainer review scores, PDF export |

### Maintainer
| Route | What it does |
|---|---|
| `/maintainers` | Maintainer landing page: value props, repo claim CTA, zero low-effort PRs pitch |
| `/audit/sample` | Interactive $10 Maintainer Intelligence Report sample using synthetic facebook/react dataset |

### Social / Gamification
| Route | What it does |
|---|---|
| `/league` | Monthly open-source contributor sprint: repo leaderboard + contributor MVP table (level, streak, season XP) |
| `/league/[month]` | Archived monthly sprint leaderboard for YYYY-MM |
| `/hacktoberfest` | Hacktoberfest 2026 welcoming repo leaderboard + live merge tracker |
| `/c/[id]` | Shareable verified Hacktoberfest completion card: OG image, score, outcome tracking |
| `/dashboard` | Personal PR tracker: open PRs to C+ repos, live status, acceptance forecasts, FirstMergeTrack, SeasonCard, QuestTrackCard, EmbedKarmaBadgeCard, profile sharing, PDF resume |

### Utility
| Route | What it does |
|---|---|
| `/compare` | Repo comparison picker with semantic crawl floor for popular showdowns |
| `/compare/[...slug]` | Side-by-side: merge rate, review latency, PR size sweet spots, optimal submission windows, bus factor; VsShowdownCard, canonical redirects |
| `/org/[org]` | Organization repo directory: aggregated stats, avg merge rate, response velocity, total stars, OrgConsoleCard |
| `/docs` | Public REST API docs: endpoint reference, rate limits, auth instructions |
| `/status` | Real-time system status and API health dashboard |
| `/about` | Mission, C-Rank scoring breakdown, contact links |
| `/privacy` | Full privacy policy: OAuth data, encryption, analytics consent, GDPR/CCPA, sub-processors |
| `/terms` | Terms of service: acceptable use, C-Rank telemetry, feedback rules, IP, liability, open-source license |
| `/share/pr-eval/[id]` | Shared PR pre-flight verification: static snapshot + live verified outcome, accuracy tracking, referrer attribution |
| `/[owner]` | Legacy user profile route: canonical redirect to `/u/:username` |

### Monetization
| Route | What it does |
|---|---|
| `/pricing` | 3 tiers: Community Free, Pro Contributor ($5/$39), Recruiter Talent Pass ($25). Product + Breadcrumb schema. |

---

## 3. API Endpoints (113 total)

### Public discovery & scoring
| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/health` | Service health check |
| GET | `/api/v1/docs/swagger.json` | OpenAPI spec |
| GET | `/api/v1/repos` | List public repos (SSR-friendly) |
| GET | `/api/v1/repos/:id` | Single repo scorecard |
| GET | `/api/v1/repos/:id/pr-likelihood` | Predicted merge probability |
| GET | `/api/v1/repos/:id/optimal-time` | Optimal submit window |
| GET | `/api/v1/repos/:id/fit-radar` | Contributor fit radar |
| GET | `/api/v1/repos/:id/related` | Related repos |
| GET | `/api/v1/repos/:id/good-first-issues` | GFI list for a repo (with real-time >24h self-healing from GitHub & auto-closing of resolved issues) |
| GET | `/api/v1/repos/:id/insights` | AI repo insights |
| GET | `/api/v1/repos/:id/claim-status` | Public claim status |
| GET | `/api/v1/repos/:id/playbook` | Public maintainer playbook |
| GET | `/api/v1/repos/:id/pr-size-sweetspot` | PR size sweet spot telemetry |
| GET | `/api/v1/repos/:id/trend` | 90-day trend deltas |
| GET | `/api/v1/repos/:id/history` | Score history |
| GET | `/api/v1/repos/:id/feedback` | Repo feedback list |
| POST | `/api/v1/repos/queue` | Request on-demand repo indexing |
| POST | `/api/v1/repos/:id/claim` | Submit maintainer claim |
| POST | `/api/v1/repos/:id/verify` | Verify claim via GitHub |
| POST | `/api/v1/repos/:id/claim-dispute` | Submit score dispute |
| POST | `/api/v1/repos/:id/rescore` | Trigger re-score |
| POST | `/api/v1/repos/:id/boost-checkout` | Start repo-boost checkout |
| GET | `/api/v1/repos/:id/boost-status` | Repo-boost entitlement status |
| GET | `/api/v1/repos/:id/console` | Maintainer console data |
| GET | `/api/v1/repos/:id/sla-badge` | Maintainer SLA badge SVG |
| GET | `/api/v1/badges/:owner/:name/badge.json` | Badge metadata JSON |
| GET | `/api/v1/badges/:owner/:name/badge.svg` | Badge SVG image |
| GET | `/api/v1/issues/good-first` | Global GFI listing (bounty-aware) |
| GET | `/api/v1/languages` | Supported languages |
| GET | `/api/v1/languages/trends` | Language trend data |
| GET | `/api/v1/topics` | Topic catalog |
| GET | `/api/v1/stats/macro` | Platform macro stats |
| GET | `/api/v1/hall-of-fame` | Hall-of-fame rankings |
| GET | `/api/v1/contributor-leaderboard` | Contributor leaderboard |
| GET | `/api/v1/match` | Repo match recommendations |

### Seasonal / gamification
| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/hacktoberfest/leaderboard` | Hacktoberfest ranking |
| GET | `/api/v1/hacktoberfest/progress` | Hacktoberfest progress |
| POST | `/api/v1/hacktoberfest/nudge` | Send Hacktoberfest nudge |
| GET | `/api/v1/league/leaderboard` | League leaderboard |
| GET | `/api/v1/league/progress` | League progress |
| GET | `/api/v1/u/:username/karma` | Contributor karma score |
| GET | `/api/v1/u/:username/karma.svg` | Karma badge SVG |
| GET | `/api/v1/u/:username/achievement.svg` | Achievement card SVG |
| GET | `/api/v1/u/:username` | Public contributor profile |
| GET | `/api/v1/u/:username/report-card` | Contributor report card |
| GET | `/api/v1/user/season` | Current XP season progress |
| GET | `/api/v1/user/quests` | User progression quests |
| GET | `/api/v1/user/dna` | Contributor DNA profile |
| POST | `/api/v1/user/dna/refresh` | Enqueue DNA refresh |
| GET | `/api/v1/user/matches` | Curated user matches |
| GET | `/api/v1/user/top-matches` | Top user matches |
| GET | `/api/v1/user/for-you` | For-you feed |
| GET | `/api/v1/user/referral` | Referral code + stats |
| GET | `/api/v1/user/repo-boosts` | List user's repo-boosts |
| GET | `/api/v1/u/:username/merges` | User's merged-PR history |

### Auth & user
| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/auth/github` | Start GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | GitHub OAuth callback |
| GET | `/api/v1/auth/google` | Start Google OAuth |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |
| POST | `/api/v1/auth/logout` | End session |
| GET | `/api/v1/auth/me` | Current user profile |
| PATCH | `/api/v1/user/consent` | Update privacy consent |
| PATCH | `/api/v1/user/profile-visibility` | Toggle profile visibility |
| PATCH | `/api/v1/user/profile` | Update profile customization |
| GET | `/api/v1/user/github-repos` | List user's GitHub repos |
| GET | `/api/v1/user/open-to-opportunities` | Read talent-pass opt-in |
| PATCH | `/api/v1/user/open-to-opportunities` | Toggle talent-pass opt-in |
| GET | `/api/v1/user/api-keys` | List API keys |
| POST | `/api/v1/user/api-keys` | Create API key |
| DELETE | `/api/v1/user/api-keys/:id` | Revoke API key |
| DELETE | `/api/v1/me/data` | GDPR-delete account data |
| GET | `/api/v1/user/claims` | List user's claims |
| POST | `/api/v1/maintainer-claims` | Create maintainer claim |
| PATCH | `/api/v1/maintainer-claims/repo/:owner/:name/onboarding` | Set onboarding state |
| GET | `/api/v1/maintainer-claims/me` | List my maintainer claims |
| GET | `/api/v1/maintainer-claims/repo/:owner/:name` | Public claim info |
| POST | `/api/v1/maintainer-claims/repo/:owner/:name/interest` | Express interest in claim |
| GET | `/api/v1/maintainer-claims/oauth/github` | Start maintainer OAuth |
| GET | `/api/v1/maintainer-claims/oauth/github/callback` | Maintainer OAuth callback |
| GET | `/api/v1/orgs/:org/console` | Org console data |
| POST | `/api/v1/user/recruiter-pass/checkout` | Start recruiter-pass checkout |
| POST | `/api/v1/user/pro/checkout` | Start Pro checkout |
| POST | `/api/v1/user/pro/cancel` | Cancel Pro |
| POST | `/api/v1/user/maintainer-sla/checkout` | Start maintainer-SLA checkout |
| GET | `/api/v1/user/maintainer-sla/status` | Maintainer-SLA status |
| POST | `/api/v1/credits/pack-checkout` | Credit-pack checkout |
| GET | `/api/v1/credits/pack-status` | Credit-pack status |
| POST | `/api/v1/user/hire-inquiry` | Submit hire inquiry |

### PR tracker
| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/user/prs` | List tracked PRs (with optional `?refresh=1` for live sync) |
| GET | `/api/v1/user/prs/connection` | PR tracker connection status |
| POST | `/api/v1/user/prs/reconnect` | Reconnect PR tracker |
| POST | `/api/v1/user/prs/track` | Track a new PR |
| GET | `/api/v1/user/pr-status` | Current PR status |
| POST | `/api/v1/preflight/evaluate` | Preflight score evaluation |
| POST | `/api/v1/preflight/pr-details` | Fetch PR details for preflight |
| POST | `/api/v1/preflight/share` | Create share card |
| GET | `/api/v1/pr-evals` | Register PR evaluation |
| GET | `/api/v1/pr-evals/:id/outcome` | Fetch PR eval outcome |
| POST | `/api/v1/pr-sim/score` | Score a PR simulation |
| GET | `/api/v1/pr-sim/badge/:hash.svg` | PR-sim badge SVG |
| POST | `/api/v1/scan` | Start repo scan |
| GET | `/api/v1/scan/status/:owner/:name` | Poll scan status |

### Notifications & alerts
| Method | Path | What it does |
|---|---|---|
| GET | `/api/v1/notifications` | List notifications |
| GET | `/api/v1/notifications/unread-count` | Unread count |
| POST | `/api/v1/notifications/mark-read` | Mark read |
| GET | `/api/v1/notifications/preferences` | Read prefs |
| PUT | `/api/v1/notifications/preferences` | Update prefs |
| GET | `/api/v1/notifications/stream` | SSE notification stream |
| GET | `/api/v1/notifications/since` | Replay since cursor |
| POST | `/api/v1/gfi-alerts/subscribe` | Subscribe to GFI alerts |
| GET | `/api/v1/gfi-alerts/verify` | Verify subscription email |
| GET | `/api/v1/gfi-alerts/prefs` | Read GFI alert prefs |
| POST | `/api/v1/gfi-alerts/prefs` | Update GFI alert prefs |
| GET | `/api/v1/gfi-alerts/unsubscribe` | One-click unsubscribe |
| POST | `/api/v1/gfi-alerts/unsubscribe` | One-click unsubscribe POST |
| GET | `/api/v1/gfi-alerts/unsubscribe-short` | Short unsubscribe link |
| POST | `/api/v1/gfi-alerts/unsubscribe-short` | Short unsubscribe POST |
| GET | `/api/v1/gfi-alerts/claim` | Claim GFI alert subscription |
| POST | `/api/v1/alerts/subscribe-sniper` | Subscribe to issue sniper |
| POST | `/api/v1/alerts/test-webhook` | Test sniper webhook delivery |
| GET | `/api/v1/alerts/my-snipers` | User's sniper subscriptions |
| POST | `/api/v1/webhooks/email-events` | SNS email events webhook |

### Social & sharing
| Method | Path | What it does |
|---|---|---|
| POST | `/api/v1/user/feedback` | Submit repo feedback |
| DELETE | `/api/v1/user/feedback/:id` | Delete feedback |
| POST | `/api/v1/user/watchlist` | Add repo to watchlist |
| DELETE | `/api/v1/user/watchlist/:id` | Remove from watchlist |
| GET | `/api/v1/user/watchlist` | List watchlist |
| PATCH | `/api/v1/user/watchlist/:id` | Toggle watchlist alerts |
| POST | `/api/v1/user/watchlist/webhooks` | Add watchlist webhook |
| GET | `/api/v1/user/watchlist/webhooks` | List watchlist webhooks |
| DELETE | `/api/v1/user/watchlist/webhooks/:id` | Remove watchlist webhook |
| POST | `/api/v1/user/share-cards` | Create share card |
| GET | `/api/v1/user/share-cards` | List share cards |
| DELETE | `/api/v1/user/share-cards/:id` | Revoke share card |
| GET | `/api/v1/cards/:id` | Retrieve share card |
| GET | `/api/v1/cards/:id/og.png` | Share card OG image |
| GET | `/api/v1/og/forecast/:id` | Forecast OG image |
| GET | `/api/v1/og/scan/:owner/:name` | Scan verdict OG image |
| GET | `/api/v1/og/playbook/:owner/:name` | Playbook OG image |
| GET | `/api/v1/og/playbook-card/:token` | Playbook card OG image |
| GET | `/api/v1/og/season-card` | Season rank card OG image |
| POST | `/api/v1/webhooks/github-app` | GitHub App webhook |
| POST | `/api/v1/webhooks/github-push` | GitHub push webhook |
| POST | `/api/v1/payments/webhook/dodopayments` | Dodo payments webhook |
| POST | `/api/v1/payments/webhook/stripe` | Stripe repo-boost webhook |
| POST | `/api/v1/stack/analyze` | Analyze a stack against a repo |
| POST | `/api/v1/stack/scan-repo` | Scan repo dependencies |
| GET | `/api/v1/recruiter/search` | Recruiter talent search |

---

## 4. Components Catalog (70+ components)

| Component | What it does |
|---|---|
| AIBadgePromptGenerator | Generates AI-powered badge prompt copy for README insertion |
| AuthModal | GitHub/Google OAuth sign-in modal |
| ClaimIssueButton | Trigger for claiming a GFI |
| ClaimIssueModal | Modal for claiming a GitHub issue on GetMerged |
| ClientRepoDetail | Client wrapper for repo detail pages consuming SSR insights |
| CompareShareBar | Share/export bar for compare pages |
| ContributorWrappedModal | Seasonal wrap/stats modal |
| CookieBanner | Analytics cookie consent |
| CopyBadgeButton | Copies badge SVG/URL to clipboard |
| CRankBadge | Renders S/A/B/C/D tier badge with color coding |
| DeleteAccountModal | GDPR account deletion flow |
| EmbedKarmaBadgeCard | Embeddable karma badge for external sites |
| FirstMergeTrack | First merged PR milestone tracker |
| FloatingRepoCircles | Decorative animated background |
| Footer | Site footer with nav, legal, social |
| ForYou | Personalized repo recommendations |
| GfiSniperCard | Scans for freshly labeled GFIs with freshness + alert toggles |
| GlobalSearch | Command-palette search for repos, topics, users |
| Header | Sticky header: logo, nav, search, bell, auth menu |
| InstantScanPanel | On-demand C-Rank check with progress + verdict |
| IssueSniperModal | Real-time radar of fresh GFIs with claim actions |
| IssueSniperTrigger | Compact trigger for IssueSniperModal |
| KarmaProfileBadge | Animated karma badge: level, streak, rank, tier counts |
| LangDigestSignup | Email signup for weekly language-specific GFI digest |
| LangLogo | Language/ecosystem logo icon |
| LanguageMatchQuiz | Interactive quiz recommending repos/ecosystems |
| Logo | Scalable GetMerged logo |
| LogoutButton | Clears session, redirects home |
| MaintainerConsoleModal | Maintainer console: C-Rank breakdown, checklist, claim status |
| MetricGauge | Circular/linear gauge for a single metric |
| NotificationBell | Bell icon with badge + dropdown preview |
| OpenToOpportunitiesToggle | Talent-pass opt-in toggle |
| OptimalReviewWindow | Best day/hour to submit a PR for fastest review |
| OrgClaimButton | Org repo claim flow with verification |
| OrgConsoleCard | Org-wide aggregate C-Rank, scored count, avg score |
| PhysicsCanvas | Physics-based animated background |
| PRAcceptanceWidget | Predicted PR acceptance likelihood + guidance |
| ProfileEditModal | Edit public profile fields |
| ProjectCard | Project/repo card with metrics, tier badge, action links |
| ProofOfMergeModal | Verifiable proof-of-merge evidence with share |
| ProofOfWorkResumeModal | Printable proof-of-work resume modal |
| PRSizeSweetSpotCard | Optimal PR diff-size guidance with merge rates |
| QuestTrackCard | Gamified quest progress with karma rewards |
| RaiseYourRank | CTA to improve contributor rank / repo tier |
| RecruiterContactSection | Recruiter outreach to verified contributors |
| RecruiterInterestModal | Recruiter expresses interest in contributor |
| ReferralCard | Referral program: earned credits, link, bonus redemption |
| RelativityCanvas | Relativity-style visual effects background |
| RepoAuditCTA | CTA to purchase/full Maintainer Intelligence Report |
| RepoAuditReport | Full maintainer audit: PR funnel, burnout signals, AI fixes, templates |
| RepoBadgeGenerator | Generates embeddable C-Rank badge snippets |
| RepoCard | Dual-mode repo card (`layout="row" | "card"`): high-density tabular row view (FreeHire style) or showcase card with metric gauges |
| RepoDetailHero | Hero section for repo detail pages |
| RepoReviewsSection | Community contributor reviews with sentiment filters |
| RepoScorecards | C-Rank breakdown, merge rate, response time, first-timer success |
| RepoStickyBar | Sticky bottom bar: share, bookmark, compare, audit |
| RepoTrendChart | 90-day C-Rank / merge-rate trend line |
| SeasonCard | Season sprint: dates, participant count, progress |
| ShareCardButton | Share options: copy link, embed, social |
| ShareForecastButton | Share PR acceptance forecast with C-Rank attribution |
| ShimmerButton | Animated shimmer/skeleton button |
| SimilarRepos | Repos similar to target by language, stars, telemetry |
| TopicDirectoryGrid | Paginated topic directory grid |
| TopicReposExplorer | Topic page: repo grid, language filter, cross-links |
| TopMatches | Top matching repos for contributor |
| UnscoredExplainer | Why repo is not scored + instant scan CTA |
| UserFeedbackList | Community feedback/reviews for a repo |
| VsShowdownCard | Head-to-head showdown: merge probability, review turnaround, recommendation |
| WeeklyWrapCard | Sunday recap: streak, karma delta, PR turnaround, curated GFIs |

---

## 5. Hidden Features Found (Not in Original Plan)

### Scoring engine (private)
- **4 public signals** (response_p50, external_merge_rate, first_timer_success_rate, active_maintainer_count)
- **Trailing window:** 90-day rolling
- **Bayesian prior:** repos with <20 PRs tagged `low_sample: true`, not eligible for S/A tier
- **EMA decay constants** (private — private moat)
- **Rate-of-change normalization** (private — private moat)
- **Maintainer-breadth decay function** (private — future moat)
- **ActivityRecency decay** (`backend/internal/scoring/normalise.go`)

### Gamification engine
- **Season system:** UTC date-ranged seasons, deterministic `sr…` shareable season-rank cards, PNG OG renderer
- **XP awards:** 50 XP per merge, 10 per review, weekly cap
- **Level math:** `LevelForXP`, `XPToNextLevel`
- **Streak multiplier:** `StreakMonths` → 1.0–1.5x karma multiplier
- **Karma engine:** merged-tier counts, first-timer bonuses, streak multiplier, rank tiers, reputation headline, level progress
- **Achievement badges:** unlocked achievement cards beyond quests
- **Quest system:** quest definitions (e.g. `quest-issue-sniper`) with karma rewards
- **League:** monthly sprint with Bronze→Gold progression and Proof-of-Merge badges
- **Hall of Fame:** S-tier showcase
- **Community Powerhouses:** bus-factor resilience showcase

### Prediction & simulation
- **PR Likelihood Score:** per-repo acceptance probability (0–100) with p50/p90 response times
- **PR Preflight evaluator:** scores pasted diff on title quality, diff size, tests, description, CONTRIBUTING.md match
- **PR Simulator:** client-side acceptance simulator with shareable badges
- **PR Size Sweet Spot:** per-repo optimal diff-size guidance with merge rates
- **Optimal Review Window:** best day/hour to submit for fastest review
- **Contributor DNA:** languages, skill level, PR size preference, feedback tolerance, goals inferred, streak; async background worker from 50 merged PRs
- **For-You feed:** personalized repo recommendations
- **Top Matches:** curated user matches

### Maintainer tools
- **Maintainer Console:** C-Rank breakdown, checklist, claim status, funnel telemetry
- **Raise Your C-Rank Playbook:** quantified rank gaps, before/after OG share cards, 90-day token-scoped URLs
- **Stall-Rescue episode state machine:** episode gate, state machine, failure log, reviewer nudge mentions (max 5 per snapshot)
- **C-Rank Change Alerts:** compare-and-swap last-alerted guard
- **Org Console:** org-wide aggregate tier, scored count, avg score, bus factor
- **Repo Audit ($10):** 10-dimension maintainer intelligence scan with AI-prioritized fixes
- **Claim + Verify flow:** maintainer claim via GitHub webhook verification
- **Claim Dispute form:** public score dispute with 48h SLA

### Social & sharing
- **Share cards with referral attribution:** signed referral tokens embedded in share cards
- **Proof-of-Merge celebration:** confetti + shareable card
- **Proof-of-Work resume:** printable PDF with audited PR merges and maintainer review scores
- **Profile sharing:** public `/u/:username` with visibility toggle, copy-link, navigator.share
- **Achievement SVG cards:** `achievement.svg` endpoint with optional season line
- **Karma SVG badges:** `karma.svg` endpoint

### Discovery enhancements
- **Instant Scan:** on-demand repo scan with progress state, verdict tier, auto-generated OG share card
- **Unscored repo explainer:** UI for repos not yet scored + scan CTA
- **Stack scanner:** reads package.json/go.mod/Cargo.toml to find beginner-friendly issues in user's dependencies
- **Issue Sniper:** real-time Discord + generic webhook delivery for fresh GFIs (GfiSniperCard, IssueSniperModal)
- **GFI bounty detection:** cash-bounty label parsing (💰, algora, polar), sponsored issue ordering
- **GFI boost system:** paid boost checkout, activation, expiry, stale revocation
- **GFI claim flow:** claim an issue on GetMerged with verified proof of work
- **Topic directory:** 100+ topics with search, lazy expansion, stat badges
- **Compare / VS Showdown:** side-by-side merge probability, review turnaround, PR size sweet spots, recommendation engine

### Notifications & integrations
- **In-app notifications:** SSE stream, mark-read, preferences by category
- **Weekly Wrap digest:** Sunday recap: streak, karma delta, PR turnaround, curated GFIs
- **Language Digest:** language-specific email digest with CAN-SPAM footer, rate limits, idempotent queue
- **Email queue:** `gfi_email_queue` with instant/weekly delivery modes, fallback, retry, dedupe
- **Discord webhooks:** `DispatchSniperWebhooks` for GFI alerts
- **Telegram bot:** Issue Sniper push delivery (referenced in roadmap)

### Monetization (full stack)
- **Pro Contributor ($5/$39):** acceptance forecasts, stall-rescue alerts, public profile, weekly wrap, sniper alerts
- **Recruiter Talent Pass ($25):** talent search, direct outreach, verified contributor profiles
- **Credit packs:** pay-as-you-go preflight credit top-ups
- **Repo Boost ($X):** sponsored issue ordering, checkout, activation, metrics, stale revocation
- **Maintainer SLA ($X):** SLA claims, SLA badge, maintainer console
- **Referral program:** referrer bonus 3, referee bonus 1, lifetime cap 10
- **Entitlement middleware:** per-endpoint feature gating, 402 upgrade URLs
- **Dodo Payments + Stripe webhooks:** payment processing

- **Daily X (Twitter) Spotlight Engine:** automated daily repo discovery, plain-English human stats breakdown, 1-click Twitter intent generation, Telegram morning pulse integration, and bulk scheduler CLI (`daily_x_post`) with CSV/JSON export.
- **Public profile JSON:** `/u/:slug.json`
- **GitHub Action:** preflight evaluator as CI action (`action.yml`, `pr-readiness-action/`)
- **API keys:** user-scoped API key creation/revocation
- **Stack scan API:** analyze stack, scan repo dependencies
- **GitHub App webhook:** real-time push events
- **SNS email events webhook:** delivery/ bounce/ complaint handling
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
 
- **2026-11-07** — Single Monolithic Sitemap & Crawl Budget Consolidation. Replaced 150+ fragmented child XML sitemaps with a single, high-density, authoritative `sitemap.xml` (<urlset>) containing ~11,884 high-signal pages (~2.2MB uncompressed, ~180KB gzipped). Dropped thin programmatic compare combinations and low-repo topics. Added Nginx 301 redirects from legacy `/sitemap/*.xml` to `/sitemap.xml`, and broadcasted updates via IndexNow and Bing API.
- **2026-11-07** — Warm Editorial Design Overhaul. Replaced legacy pitch-black (`#0a0a0a`) theme and dark glassmorphic styling across all public routes, components, and scorecards with a high-contrast editorial aesthetic inspired by modern Silicon Valley products (`freehire.me`, Granola): linen/sand canvas (`#FAFAF7`), solid crisp white cards (`#FFFFFF`), warm parchment elevated wells (`#F5F3EE`), warm terracotta brand accents (`#D4590F`), WCAG AA light-mode grade colors, min 14px body text, min 12px badges, zero CLS, and full SSR compliance.
- **2026-09-16** — Added Daily X (Twitter) Spotlight Engine (`backend/internal/spotlight`, `cmd/daily_x_post`, `morning_brief` integration) for zero-jargon daily posts on X with 1-click Telegram drops and 1,000+ bulk CSV exporter.
- **2026-09-05** — Initial full product inventory. DB counts, 30 public routes, 113 API endpoints, 70+ components, 28 hidden feature areas, gap check against launch plan.
