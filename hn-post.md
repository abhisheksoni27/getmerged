# Show HN Post Draft: GetMerged

**URL:** https://getmerged.abhishekco.de  
**Target Submission Window:** Tuesday or Wednesday 08:00 AM – 09:30 AM PT (optimal HN frontpage trajectory)

---

### Title Options

**Option 1 (Recommended — Problem + Personal Narrative):**
> Show HN: GetMerged – I sent 11 PRs and 8 rotted, so I scored 102k repos

**Option 2 (Direct / Glassdoor framing):**
> Show HN: GetMerged – Glassdoor for open-source repository maintainer responsiveness

**Option 3 (Data/Scale focus):**
> Show HN: GetMerged – A 9-signal contributor readiness index for 102k GitHub repos

---

### Post Body (Copy & Paste for First Comment)

I sent 11 pull requests to open-source repositories last year. Eight of them rotted for months without a single human reply, even though several had thousands of GitHub stars and active commit graphs.

Stars tell you how popular a project is. They tell you nothing about whether maintainers will review outside contributions or let them decay.

I built **GetMerged** (https://getmerged.abhishekco.de) to solve this cold-start guessing game. We run nightly telemetry pipelines evaluating maintainer responsiveness across **102,480 public repositories**:

- **C-Rank™ Index (S through D Tier):** Evaluates rolling 90-day review latency (P50/P75), external PR merge rate, first-time contributor acceptance rate, and maintainer bus factor.
- **Sample-Size Safeguards:** Repos with fewer than 20 external PRs are tagged `Low Sample (<20 PRs)` and capped below S/A tier to prevent small-sample distortion.
- **Freshness Pulse:** Live 30-day activity tracking prevents inactive repos from riding historical momentum.
- **Community Dispute & SLA:** If our classification misses an off-platform review workflow (e.g. Gerrit/mailing lists) or bot storm, maintainers have a 1-click dispute form with a 48-hour SLA and a public changelog.

Scoring methodology breakdown: https://getmerged.abhishekco.de/how-c-rank-works  
Public changelog & dispute process: https://getmerged.abhishekco.de/methodology/changelog  

100% free to search, compare repos side-by-side, and inspect scorecards. Would love your unvarnished feedback on the scoring methodology, false positives, or edge cases we haven't caught yet.
