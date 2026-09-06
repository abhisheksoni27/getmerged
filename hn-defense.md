# HackerNews Defense Guide & Pre-Baked Responses

This guide provides verbatim, calm, senior-dev responses for the most anticipated criticisms during the Show HN launch. Keep replies crisp, respectful, transparent, and grounded in data.

---

### 1. "Most of those 102k repos have hardly any PRs. Your number is inflated vanity."

> Good point, and that was one of the first pitfalls we had to solve.
> 
> The 102k repos are filtered to public repositories that had at least one external PR or issue activity in the trailing 12 months (not all GitHub junk repos). More importantly, we apply a sample-size guardrail:
> 
> Any repository with fewer than 20 scored PRs is explicitly tagged with `Low Sample (<20 PRs)` on its scorecard and is strictly disqualified from S and A tiers. We never let a 2-PR repo show 100% merge rate and claim top tier. You can inspect sample size and rolling window volume directly on each card.

---

### 2. "Why is my repo scored D-tier? We review on Gerrit / mailing lists / internal Phabricator, not GitHub PRs."

> That's a completely legitimate workflow, and GitHub telemetry doesn't capture off-platform reviews natively.
> 
> If your project mirrors to GitHub and conducts reviews elsewhere (like Linux kernel, Chromium, or Go), our pipeline flags low GitHub PR merges because from a newcomer's perspective on GitHub, PRs appear unreviewed.
> 
> To handle this without unfair penalties, we launched our dispute system: maintainers can submit a 1-click dispute at `/dispute` citing their off-platform review workflow. We audit these under a 48-hour SLA, apply an override note or mirror badge, and log the change to our public changelog (`/methodology/changelog`).

---

### 3. "Maintainer burnout is real. Ranking repos puts unfair pressure on volunteer maintainers."

> We agree 100% that maintainer burnout is real and volunteer maintainers owe nobody free labor.
> 
> GetMerged's goal isn't to shame maintainers into working late nights. It's to stop junior/outside developers from spending 40 hours crafting PRs for projects that are effectively closed to outside code. A maintainer who only accepts internal commits or has zero bandwidth shouldn't have to sift through dozens of PRs they never wanted, and contributors shouldn't waste their weekends. Clear signal helps both sides.

---

### 4. "Your algorithm is arbitrary / just another black-box vanity metric."

> We don't believe in black-box vanity scores. The four core signals and tier definitions are fully documented at `/how-c-rank-works`:
> 1. Time to first human response (P50/P75)
> 2. External contributor PR merge rate
> 3. First-timer acceptance rate
> 4. Active maintainer diversity (bus factor)
> 
> The weights are calibrated against rolling real-world outcomes over a 90-day trailing window, and the scoring logic is open in our Go backend repository. If you see an anomaly or edge case in our math, we publish recalibrations on `/methodology/changelog`.

---

### 5. "What stops people from gaming this with dummy bot PRs?"

> Our ingestion pipeline excludes automated bot activity (Dependabot, Renovate, bot-labeled users, zero-diff commits) and requires human maintainer engagement. Furthermore, rapid bursts of PRs from fresh accounts without commit diversity trigger outlier filters and get held for manual review. Because we use Bayesian priors over a 90-day window, a sudden flood of 10 micro-PRs won't bump a repo into S-tier.

---

### 6. "GitHub will just ship this as a native feature."

> GitHub could, but their commercial and platform incentives make it nearly impossible to ship publicly.
> 
> GitHub is an infrastructure host that depends on enterprise repository owners and major foundations. Calling an enterprise or high-profile sponsor project "D-tier / Slow to Respond" directly harms GitHub's customer relationships. Third-party independent observability (like Glassdoor or Blind for companies) has always succeeded precisely because platform hosts cannot afford to rank their own customers objectively.
