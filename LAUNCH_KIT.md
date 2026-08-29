# GetMerged Public Launch Distribution Kit

This kit contains turnkey, battle-tested launch copy, headlines, and angles tailored for each distribution channel.

---

## 1. Hacker News — "Show HN"

**Suggested Title**:
> Show HN: GetMerged – Stop submitting PRs to abandoned 50k-star repos

**URL**: `https://getmerged.abhishekco.de`

**Body Text**:
```text
Hey HN,

Over the last few years of contributing to open source, I kept hitting the same wall: finding a repo with 40k+ GitHub stars, spending a weekend fixing a bug, opening a well-tested PR, and watching it sit completely untouched for 8 months.

The problem is that GitHub stars measure historical hype, not current maintainer availability. Over 60% of maintainers are overwhelmed or single-maintainer bottlenecks.

We built GetMerged (https://getmerged.abhishekco.de) to track empirical maintainer responsiveness instead of vanity stars.

We built an automated telemetry engine (C-Rank™) that benchmarks public GitHub repos on:
1. Median time to first maintainer review (p50 response hours)
2. Outside/external PR merge acceptance rates
3. First-timer issue merge velocity
4. Multi-maintainer core activity (detecting single-maintainer bottlenecks)

You can search any public GitHub repo or paste a GitHub URL to see its live C-Rank scorecard, PR merge probability, and good first issues. You can also embed dynamic SVG badges directly into READMEs.

Stack: Next.js 15, Tailwind v4, Edge runtime, Canvas particle physics, Go/Python backend pipeline.

Would love feedback from maintainers and contributors on our scoring methodology!
```

---

## 2. Product Hunt Launch

- **Product Name**: GetMerged
- **Tagline**: Glassdoor for open-source repos. Find projects that actually merge PRs.
- **Topics**: Developer Tools, Open Source, GitHub, Productivity, Engineering

**Short Description**:
> GitHub stars measure hype. GetMerged scores 53,000+ repositories on real maintainer response velocity, outside PR merge rates, and first-timer acceptance. Stop waiting months for PR reviews.

**First Maker Comment**:
```text
👋 Hey Product Hunt community!

I'm excited to share GetMerged with you today.

Every developer knows the frustration: you spend hours crafting a clean PR for a popular open-source project, only to have it sit in silence for months because the maintainer burned out or moved on.

We built GetMerged to bring empirical transparency to open source:
🌟 C-Rank™ Scoring: Objective 9-factor benchmarks on PR merge rates & response times.
⚡ Instant Scans: Paste any GitHub repo URL to get an instant contributor readiness scorecard.
🛡️ Live README Badges: Maintainers can embed verified C-Rank tier badges in their repos.
🏆 Monthly Contributor League: Track your merged PRs and build a verified Proof-of-Merge portfolio.

Check out your favorite repos, check your own project’s C-Rank grade, and let us know what you think! 🚀
```

---

## 3. X (Twitter) Launch Thread

**Tweet 1 (The Hook & Video/GIF)**:
> GitHub stars are a lie. 🧵
> 
> A 45,000★ repo can have an 8-month PR review backlog.
> A 2,000★ repo can review and merge your PR in under 4 hours.
> 
> Today we're launching GetMerged: the first empirical C-Rank™ scorecard for open-source repos.
> 
> 🔗 https://getmerged.abhishekco.de
> 
> [Attach 30s screen recording of live search + Lumos wand physics + scorecard]

**Tweet 2 (The Data Contrast)**:
> Why stars fail contributors:
> 
> Stars measure historical vanity. They don't tell you if:
> ❌ Maintainers are overwhelmed
> ❌ Outside PRs are ignored
> ❌ The project is a single-maintainer bottleneck
> 
> GetMerged calculates median response velocity & outside PR merge rates across 53k+ repos.

**Tweet 3 (Interactive Telemetry & Badges)**:
> What you get:
> 📊 C-Rank™ Grade (Tier S to D)
> ⏱️ Median time to first review (p50)
> 🎯 First-timer issue acceptance rates
> 🛡️ 1-click embeddable SVG badges for your README
> 
> Paste any GitHub URL to run an instant diagnostic.

**Tweet 4 (For Maintainers)**:
> Maintainers: If your repo welcomes community PRs, claim your scorecard, embed the verified C-Rank badge, and attract high-quality contributors who know you respond quickly.

**Tweet 5 (CTA)**:
> Explore the live index, test your favorite repos, and join the active Monthly Contributor League:
> 
> 👉 https://getmerged.abhishekco.de

---

## 4. Dev.to / Medium Article Draft

**Title**: *Why GitHub Stars Are Broken (And How We Built C-Rank to Measure Open-Source Hospitality)*

**Outline**:
1. The Open Source Ghost Town Problem (The 40k-star PR abyss).
2. The Anatomy of C-Rank™:
   - External PR Acceptance Rate (Filtering core team vs community).
   - Turnaround Velocity (p50 review hours).
   - Contributor Retention & Multi-maintainer core.
3. How contributors can use GetMerged to build real developer portfolios.
4. How maintainers can benchmark their repository health.
5. Embeddable Badges and live API endpoints.

---

## 5. Reddit Communities

- **r/opensource**: Focus on community health, helping newcomers find responsive projects, and reducing maintainer burnout through scoped good-first issues.
- **r/webdev & r/programming**: Focus on the engineering architecture, telemetry pipeline, and the contrast between star counts and merge velocities.
