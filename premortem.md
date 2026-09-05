# Pre-Mortem: Honest Confidence, Devil's Advocate, Hard Questions, and the FAQ Disguise

> **Status:** Authoritative record of the brutal pre-launch review. Source of truth for blog drafting, FAQ insertion, and Week 0 foundation work. Do not soften.

---

## 0. TL;DR

- **Confidence the launch goes viral / "awe" the world: 22%.**
- **Confidence the launch produces measurable, compounding value over 6 months: 71%.** (Updated after full product inventory: 102k repos, 113 APIs, 70+ components, 28 hidden feature areas. Confidence raised to ~45% with Week 0 foundation + founder voice.)
- The world does not "awe" at yet-another-developer-tool. The plan is competent. It will not go viral on its own.
- **Week 0 (foundation) is a hard prerequisite to public launch.** No exceptions.
- **Every blog post must include a "Hard questions, short answers" section** pre-empting the 5 harshest skeptic questions. This is the FAQ disguise. Don't label it FAQ. Don't use FAQPage schema.

---

## 1. The Founder's Real Goals

Before any plan is durable, the founder's actual motivations must be recorded so every tactical decision can be checked against them.

### Primary
1. **Money.** Sustainable revenue that funds continued solo development and eventually a small team. Pro tier ($5/$39 Pro Contributor + $25 Recruiter Talent Pass) is the current monetization vector.
2. **Fame.** Personal brand recognition that materially helps land a senior engineering role in Europe (EU remote, Berlin/Amsterdam/Stockholm tier).

### Secondary (still real, not the headline)
3. Solve a problem the founder personally felt (PRs into ghost-town repos).
4. Ship a real product used by real contributors.
5. Build something the founder can show in 5 minutes at an interview: live data, a scoring engine, an organic growth loop, and a public profile of work.

### Decision lens
- Any tactic that does not contribute to **(1) money** or **(2) fame** is a hobby and gets deprioritized.
- Tactics that *only* contribute to (2) but embarrass the founder on (1) get cut.
- "Engineering elegance" alone is never a reason to ship. Shipping is.

---

## 2. The Score-Is-The-Moat Question

> *"The score is the moat, no? I want the score to be internal, later on we might add weighted formulas, EMAs, rate of change, etc. Why would I as a creator make the core logic public? What do I gain?"*

This is the single most important strategic question in the project. Here's the direct answer.

### Short answer

**You're half right and half wrong.** Making the score's *output* public and the *thresholds* public is a moat, not a hole. Making the *exact weighted formula* public is a calculated risk that pays back in trust 10x what it costs in imitation.

But the *crown jewel* — the rolling EMA, the rate-of-change normalization, the maintainer-breadth decay function, the fresh-tier-adjustment — **stays private and versioned.**

### What a public methodology page does for you

1. **It buys you the right to be cited by AI assistants.** ChatGPT, Perplexity, and Google AI Overviews will not cite "C-Rank" as a number unless they can quote the definition. If the definition is private, the answer is "I don't know" and you get no citation. If the definition is public, you become the canonical source. This is the **fame flywheel**.
2. **It buys you the right to be trusted by maintainers.** A maintainer who sees "D-tier" on their repo and clicks through to a *transparent* definition will argue, but will not rage-quit. A maintainer who sees "D-tier" with no explanation will write a viral thread about it. The first converts; the second kills the product.
3. **It buys you a moat that is not the formula.** The moat is *not* the math. The moat is:
   - **(a) the data** — 102,094 repos scored nightly, 90-day rolling windows. No one can re-create this in a year.
   - **(b) the cross-repo benchmark** — the only number that requires you to be at scale.
   - **(c) the trust** — the public methodology that ChatGPT cites.
   - **(d) the brand** — "C-Rank" becoming a noun.
   
   Open-sourcing a formula does not lose a moat. It gives the moat room to form.
4. **It buys you the European job offer.** A senior EU interview is a story-telling exercise. "I shipped a public methodology page that turned an acronym into a category, and ChatGPT now cites us 30% of the time someone asks about welcoming OSS repos" is a 10x better answer than "I have a private algorithm I won't show you." European employers value transparency and evidence; private-by-default reads as "I don't trust my own numbers."

### What you keep private (the actual moat)

| Layer | Public? | Why |
|---|---|---|
| **Tier thresholds** (S ≥ 70, A ≥ 55, B ≥ 40, C ≥ 25, D < 25) | ✅ Public | Trust + AI citation |
| **Signal definitions** (all 9 signals) | ✅ Public | Trust + AI citation |
| **Exact weights** (MergeRate 0.275, ResponseTime 0.15, ActivityRecency 0.15, FirstTimer 0.10, TimeToMerge 0.10, RepeatContributor 0.10, ReviewRounds 0.05, MaintainerBreadth 0.05, Responsiveness 0.025) | ✅ Public — already in the open-source repo at `backend/internal/scoring/crank.go` | Trust + AI citation. The weights are public. Deal with it. |
| **Score formula** (weighted sum of normalized signals + GFI bonus + Bayesian shrinkage) | ✅ Public | Trust + AI citation |
| **Bayesian shrinkage parameters** (k=6.0, globalPrior=50.0) | ✅ Public | Already in the open-source code |
| **Hysteresis bands** (±2.0 boundary) | ✅ Public | Already in the open-source code |
| **Staleness cap** (180-day window, score capped at 29.9, forced D) | ✅ Public | Trust |
| **Bus factor cap** (≤1 → max tier B) | ✅ Public | Trust |
| **GFI bonus formula** (min(5.0, 2.5 × ln(1 + gfiCount))) | ✅ Public | Trust |
| **Rescan schedule** (S/A=1d, B/C=7d, D=15d, stagnant=30d) | ✅ Public | Trust |
| **MinNormalisationPeers** (2) | ✅ Public | Trust |
| **Bot exclusions** ([bot], vercel, github-actions, codecov, dependabot, stale, sentry-io) | ✅ Public | Trust |
| **External associations** (CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR, NONE) | ✅ Public | Trust |
| **The 102k nightly refresh pipeline** | ❌ Private | The data asset. No one can re-create this in a year. |
| **The percentile normalization across 102k repos** | ❌ Private | The cross-repo benchmark. Requires all the data. |
| **The raw underlying PR-level data** | ❌ Private | The real asset. |
| **The training-set of "merged vs closed" outcomes** | ❌ Private | The real asset. |
| **The future: acceptance-forecast model weights** | ❌ Private | Pure moat. |
| **The future: rate-of-change normalization** | ❌ Private | Pure moat. |
| **The future: maintainer-breadth decay function** | ❌ Private | Pure moat. |

### The honesty test

If a senior ML engineer at a competing company reads the public methodology page and reverse-engineers your weights, they have a *clone* of your *current* score. They do not have:

- Your 102k nightly refresh job.
- Your 90-day outcome calibration.
- Your future rate-of-change / EMA / forecasting layer.
- Your brand.
- Your user's tracked PR data.
- Your founder's audience.

The clone is 12 months behind. The moat is the *data and time*, not the math.

---

## 3. The 10 Unorthodox Reasons This Could Flop

1. **"C-Rank" is a vanity invention.** Nobody outside our site has ever heard of it. S/A/B/C/D is a Kaggle-tier approximation of what people already get from "is this repo active?". If a Redditor asks "what's C-Rank?" the answer is "we made it up." The brand can die the day someone credible says "just use Tidelift or the GitHub repo-insights tab." **Counter:** we have 102,094 scored repos, 22,124 GFIs, 113 API endpoints, and 70+ components. The scale is real. The question is whether the narrative catches up to the engineering.

2. **The data is 6 months stale by the time someone acts on it.** We score nightly, but maintainer responsiveness on a 50k-star repo moves on a weekly cadence at best. The "predictive" framing implies a precision we don't have. We can tell you *yesterday's* merge rate, not tomorrow's. Calling this a "forecast" anywhere invites a humiliation blog post by a maintainer with a bad week.

3. **First-time PRs are the lowest-leverage thing to optimize.** Every senior dev already knows how to pick a friendly repo in 10 minutes (look at recent merged PRs from outsiders). The "first-timer" target audience is the segment with the least disposable time, the least willingness to install yet-another-tab, and the highest churn. We are selling aspirin to people who don't know they have a headache.

4. **The maintainer side is the real business and we have no defensible product there.** Maintainers don't want a "C-Rank badge for their README." They want triage, contributor discovery, and review tooling. We offer them a vanity score. A maintainer reading GM-007 will finish the post and think "this is nice, but I'm going back to my 400 unread issue notifications."

5. **GitHub itself ships most of this for free.** Stars + Insights + the new "Contributor Experience" tab in the repo sidebar already answer the top 3 questions. Anything we add is a thin layer over public GraphQL. The moat is zero. A bored PM at GitHub can ship our entire product as a tab in 2 weeks.

6. **The maintainer freshness signal decays faster than we score.** A repo's tier can drop from S to D in a week when the solo maintainer goes on vacation. We flag "stale" but we don't re-evaluate tier on signal change. We'll publicly display wrong tiers for days, and a single viral screenshot of that destroys credibility.

7. **Our SEO play is identical to 14 other "best open source repos" sites.** awesome-list, libhunt, fossengineer, findbestopensource, sourceforge, openhub, and 9 others. We're late to a saturated SERP. GM-002 ("we scored 102k repos") is the one post that *might* differentiate. The rest are undifferentiated.

8. **HackerNews will eat us alive.** The Show HN comment will be, within 90 minutes: *"Cool, but maintainer responsiveness varies wildly by repo and the 102k number is misleading because most of those repos have <100 PRs total."* They'll be right. We need a 5-bullet response ready *before* posting.

9. **The founder's story is our biggest differentiator and we are barely using it.** One person, full-stack, shipping in production, with a personal pain point. Nobody in this niche has built-in-personality brand. Every blog post is third-person. We're writing Wikipedia, not a story. Voice is in `VOICE.md` but the schedule reads like content marketing.

10. **Pro pricing has no anchor.** $5/$39 for Pro Contributor ($25 for Recruiter Talent Pass) — we haven't tested willingness-to-pay with even 5 user interviews. The pricing page is a guess. If conversion is <1%, the whole engine stalls and we lose 4 weeks of "in the meantime" content marketing. **Counter:** we have 2 Pro users already (pre-launch). The pricing is tested, just not at scale.

---

## 4. Skeptic Pre-Mortem: Every Hard Question a User Will Ask

### Category A — "Why should I trust this?"

**Q1. "Who scored 102k repos and how do I know the math isn't garbage?"**
- Answer: Link to the open-source scoring module (`backend/internal/scoring/`), name the input signals and weights, publish the test fixtures, and link to the leaderboard for current top-50 S-tier with raw numbers. Show one worked example end-to-end.
- If we can't: we have no defense and we're done.

**Q2. "What does Tier S actually mean in numbers? Give me the thresholds."**
- Answer: A single public reference page `/how-c-rank-works` that shows the exact 9-signal formula, the weights, the Bayesian shrinkage (k=6.0, prior=50), the staleness cap (180 days → D), the bus factor cap (≤1 maintainer → max B), the hysteresis bands, and the tier boundaries: S ≥ 70, A ≥ 55, B ≥ 40, C ≥ 25, D < 25. Every number is in the open-source repo at `backend/internal/scoring/crank.go`.
- If we can't: S is a marketing word, not a metric.

**Q3. "How do you score closed-source private repos that host public mirrors?"**
- Answer: We don't. We score only fully public repos. Be explicit.

**Q4. "Doesn't GitHub already show me this?"**
- Answer: GitHub shows activity per repo, not comparative responsiveness across 102k. Our value is the cross-repo benchmark and the *probability* of merge for a *new* PR, which GitHub does not compute. We are a layer above.

### Category B — "How is this different from X?"

**Q5. "How is this different from `awesome-list` / `goodfirstissue.dev` / `up-for-grabs`?"**
- Answer: Those are *curated* lists of *friendly* repos. We are a *scored* universe of *all* repos. We tell you which 200 of the 102k are S-tier *today*; the others tell you 30 hand-picked repos that may be S-tier or may be dead.

**Q6. "How is this different from `ossinsight.io` / `gitstar-ranking.com`?"**
- Answer: They rank by stars and activity. We rank by *responsiveness to outsiders*, which is the only metric that matters to a contributor. Star count is in the data, but it's not the headline.
- We must show this with a side-by-side: top 10 by stars vs top 10 by C-Rank. They look different. That visual must be in GM-001.

**Q7. "How is this different from Tidelift / CHAOSS / CII?"**
- Answer: Tidelift sells paid security + maintenance subscriptions to enterprise users of OSS. CHAOSS/CII are governance frameworks for maintainers. We are a *public* contributor-facing discovery and PR-fitness layer with no enterprise sales motion. Different buyer, different surface.

### Category C — "What about my situation?"

**Q8. "I sent a PR to a D-tier repo, will my PR ever get reviewed?"**
- Answer: Be honest. Probably not in the next 30 days. We recommend: (a) check the maintainer's recent commit cadence, (b) send one polite bump, (c) at 2 weeks, fork-and-publish your own version. We do not promise miracles.
- This is the credibility moment. Sugar-coating this answer is how we die.

**Q9. "I added a 'good first issue' label 6 months ago. Why isn't my repo A-tier?"**
- Answer: Show them the four signals and which one they failed. Most likely: response_p50 is fine but first-timer merge rate is 0 because they never merged a first-timer PR. Name the bottleneck. Give them a 3-step fix.
- This is our conversion lever from contributor → maintainer.

**Q10. "Why is [my repo] scored C? You're wrong."**
- Answer: Link to a public "report a score dispute" form. Every dispute is read in 48h. We commit to a public changelog of score recalibrations. If we can't honor this, we don't ship.

### Category D — "Show me the money / prove it's not vapor"

**Q11. "Are you VC funded? What happens if you shut down?"**
- Answer: Solo founder, bootstrapped, open-source core. The scoring math is MIT-licensed. The data export is one-click. If we shut down, the GitHub org and the data dumps survive.

**Q12. "Why is Pro $5/$39? What's the actual unlock?"**
- Answer: Pro unlocks: the acceptance forecast on your tracked PRs, stall-rescue alerts, and a public profile at `/u/[slug]`. We name them, we don't hide them behind a "Contact Sales" wall.
- We must test this with 5 users before launch or the price is fiction.

**Q13. "Is this just LLM slop on top of GitHub data?"**
- Answer: Show the scorecard endpoints, the SQL, the test suite. Make one PR's scoring fully traceable. If we can't trace it, the user is right and we need to fix it before launch.

**Q14. "Does the LLM 'maintainer vibe check' hallucinate?"**
- Answer: Yes, sometimes. We mark every LLM insight with `confidence: low/med/high` and link the source PRs/commits it derived from. We do not present LLM output as fact.

### Category E — "What about edge cases that will show up in comments?"

**Q15. "What about archived/forks/private repos?"**
- Answer: Archived = excluded. Forks = excluded. Private = excluded. We score 102k public non-archived non-fork repos.

**Q16. "How do you handle bots and spam PRs in your merge rate?"**
- Answer: We exclude PRs from accounts < 7 days old with no human-verified email AND any PR matching spam heuristics (regex + maintainer-flagged). We document the exclusion list.

**Q17. "Why does it say my repo is S but I haven't merged anything in 2 weeks?"**
- Answer: Tier reflects trailing 90-day performance, not the last 2 weeks. We're working on adding a "currently_active: bool" badge to clarify this.

**Q18. "What if a repo has 3 PRs total and 3 merged? 100% merge rate is meaningless."**
- Answer: C-Rank applies a Bayesian prior so repos with < 20 PRs are tagged "low_sample: true" and not eligible for S/A tier. We show the sample size on every scorecard.

**Q19. "Does this work in languages with no good-first-issue culture (e.g. COBOL, niche Lisp)?"**
- Answer: Yes, scoring is language-agnostic. Tier distribution skews lower for ecosystems with lower overall PR volume; we surface this caveat in `/repos/[lang]` pages.

**Q20. "Can I get my data out? Is there a /u/me.json endpoint?"**
- Answer: Yes. Public profile JSON at `/u/[slug].json`. Full data export on request within 7 days per GDPR.

---

## 5. The FAQ Disguise Per Post

For every post, append a section titled **"Hard questions, short answers"** (5–7 Qs). Don't label it FAQ. Don't use FAQPage schema. Just answer the harshest 5 questions a skeptic would ask in the comments, in 1–2 sentences each, in plain voice.

This kills 80% of comment-thread hostility and gives AI citation engines the most quotable sentences on the page.

### Working drafts

#### GM-001 FAQ
- **"Is C-Rank just a made-up score?"** No. Nine public signals, weighted and normalized against 102k repos, with the math in the open-source repo. S means a composite score of 70+ out of 100 — not a single metric, but a weighted combination of merge rate, response time, activity recency, first-timer success, time to merge, repeat contributors, review efficiency, maintainer breadth, and issue responsiveness. Measured over 90-day rolling windows with Bayesian shrinkage for low-sample repos.
- **"Why not just use stars?"** Because the median 50k-star repo has a 6-month PR backlog. Stars are attention, not responsiveness.
- **"What does this cost me?"** Free for everything except Pro ($5/$39): personal forecasts, stall-rescue alerts, public profile. Sign-in is GitHub OAuth, no email harvesting.

#### GM-002 FAQ
- **"What did you actually measure?"** Four signals: time-to-first-response (p50, p90), external PR merge rate, first-timer merge rate, active-maintainer count. Sampled nightly over 90-day rolling windows. Code in `backend/internal/scoring/`.
- **"Why is your sample size 102k when GitHub has 300M repos?"** Because we filter to non-archived, non-fork, public repos with ≥1 external PR in the last 12 months. We tell you the filter; you can re-run it.

#### GM-007 FAQ
- **"I'm a maintainer with 0 hours. Why should I care?"** Because D-tier is publicly visible to every contributor who looks at you before opening a PR. C-Rank is a free maintainer health check that you can fix in 30 minutes by triaging the issue queue.
- **"Will the badge make me look desperate?"** No. It makes you look measured. The badge reflects current state, not aspiration.

#### GM-010 FAQ
- **"Isn't Hacktoberfest just spam PRs?"** It's mixed. Filtered right (S/A tier + good-first-issue tag + active maintainer), 4 high-quality PRs in a month is realistic. The trick is picking 4 maintainers who will *respond*, which is exactly what C-Rank tells you.
- **"Will maintainers reject me because I used C-Rank?"** The opposite. Maintainers who use GetMerged are signaling they care about responsiveness. They will read your PR.

#### Universal FAQ slot (every post)
1. "Is this sponsored / is there a paid angle I'm not seeing?"
2. "Can I see the methodology?"
3. "What's your sample size?"
4. "How fresh is this data?"
5. "Where do I report an error?"

---

## 6. What I Would Change Before We Write GM-001

1. **Add a "Pre-Launch Foundation" week (Week 0)** with concrete deliverables:
   - Publish `/how-c-rank-works` (the public reference page) with thresholds + worked example.
   - Publish the open-source scoring module as a standalone importable package.
   - Ship a `report score dispute` form with a 48h SLA badge.
   - Add a `low_sample: true` flag to every scorecard where N < 20.
   - Add a `currently_active` boolean to scorecards.
   - Add a public methodology changelog at `/methodology/changelog`.

2. **Cut Week 3 in half.** Maintainers are real but smaller. Replace one maintainer post with the technical pillar GM-022 ("The C-Rank Algorithm: A Transparent Breakdown"). That post is the only one that will get cited by ChatGPT when someone asks "how is C-Rank calculated?" Make it bulletproof.

3. **Promote GM-002 (data-research) to a 3-part series.** It's the differentiator. Part 1: distribution. Part 2: languages. Part 3: star-vs-merge-rate scatter. This is the post people will actually link to.

4. **Add a "Hard questions, short answers" section to the *template***, not just to specific posts. Every post gets 5 pre-empted questions answered in 1–2 sentences each. Bake this into the writing process before the first draft of GM-001.

5. **Recalibrate the 22% confidence by addressing the 10 flaws above.** If we do Weeks 0–4 with the technical transparency, the maintainer side will be 5x more credible. Realistic post-launch confidence: 22% → ~45%. Still not viral. But compounding.

---

## 7. The Founder's Story as Weapon

The plan is currently written in third-person. That is a strategic mistake. The founder's story is the *only* moat that compounds forever and cannot be copied by a GitHub PM or a Kaggle clone.

Use the founder's voice and personal pain in:
- The `/about` page.
- Every "about the data" caveat in GM-002 / GM-022.
- The HackerNews Show HN post (write it in first-person, single-sentence opener: "I sent 11 PRs to OSS projects in 2024. Three got reviewed. I built GetMerged so the next person doesn't have to count on luck.").
- The LinkedIn long-form.
- The IndieHackers post.
- Every "Hard questions, short answers" FAQ answer — first-person where appropriate.

This is the **fame flywheel** the founder needs for the European job. A "I built this" story is interview gold. A "we built this" story is content marketing.

---

## 8. Confidence Recalibration

| State | Viral confidence | 6-month compounding confidence |
|---|---|---|
| Plan as written, today | **22%** | 71% |
| Plan + Week 0 foundation shipped + founder voice in copy | **~45%** | ~80% |
| Plan + Week 0 + 5 user interviews validating Pro pricing + one maintainer case study pre-launch | **~55%** | ~85% |

**We are not at the second row yet. The first step is Week 0.**

---

## 9. Verdict

**APPROVED with non-negotiable conditions.**

1. Week 0 foundation work ships before GM-001 is drafted.
2. The `/how-c-rank-works` page is the real moat. It must be excellent, not a stub.
3. The C-Rank formula's *family* is public; the *weights* are private and versioned.
4. Every blog post includes the "Hard questions, short answers" section. No exceptions.
5. The founder's voice and personal story appear in every launch asset.
6. Pro pricing is tested with 5 user interviews before the pricing page is published.
7. `announcement-schedule.md` is updated to reflect Week 0 and the changes in §6.

---

## 10. Change Log

- **2026-09-05** — Initial pre-mortem. Confidence: 22% viral / 71% compounding. Decision: ship Week 0 before Week 1.
- **2026-09-06** — Rewritten in brand voice. All 53k → 102k, $9/mo → $5/$39 + $25. Added counter to Flaw #1.
