# GetMerged Public Launch Distribution Kit

Written to strictly match `BRAND.md` and `VOICE.md` standards: zero em dashes, short punchy paragraphs, conversational coffee-shop delivery, and practical data.

---

## 1. Hacker News — Show HN

**Submission Title**:
> Show HN: GetMerged – We scored 53k GitHub repos on whether they actually merge PRs

**URL**: `https://getmerged.abhishekco.de`

**Body / First Comment Text**:
```text
Hey HN,

Here is the blunt reality of contributing to open source: GitHub stars are a vanity metric.

A repository with 45,000 stars can have an eight-month PR review backlog where outside contributions go to die. Meanwhile, a 2,000-star project might review and merge your bugfix in under four hours.

Over the last few years, I kept burning weekends opening well-tested pull requests on popular projects, only to watch them sit in complete silence because the maintainer burned out or moved on.

So I built GetMerged (https://getmerged.abhishekco.de) to track empirical maintainer responsiveness instead of hype.

We built an automated telemetry engine (C-Rank) that benchmarks public repositories on:
1. Median time to first maintainer response (p50 hours)
2. Outside contributor PR merge acceptance rate (filtering out core team PRs)
3. First-timer issue success rate
4. Maintainer review team size (detecting single-maintainer bottlenecks)

You can paste any GitHub URL to inspect its live scorecard, see PR merge probability, or grab an embeddable SVG badge for your README.

Stack: Next.js 15, Tailwind v4, Edge runtime, Canvas particle physics, Go/Python background telemetry pipeline.

I would love to hear your thoughts on our scoring weights and methodology.
```

---

## 2. X (Twitter) Launch Thread

### Tweet 1 (The Hook):
```text
GitHub stars are a lie.

A 45,000★ repo can have an 8-month PR review backlog.
A 2,000★ repo can review and merge your PR in 4 hours.

Today I am launching GetMerged: the first empirical C-Rank™ scorecard for open-source repos.

Find projects that actually merge PRs:
👉 https://getmerged.abhishekco.de
```

### Tweet 2 (The Problem):
```text
Here is the thing most people miss:

Stars measure historical hype. They do not tell you if:
❌ Maintainers are overwhelmed
❌ Outside PRs are ignored
❌ The repo is a single-maintainer bottleneck

You spend a weekend fixing a bug, and your PR sits in silence for 9 months.
```

### Tweet 3 (The Telemetry Engine):
```text
So we built an automated telemetry engine that scores repos on hard data:

📊 C-Rank Grade (Tier S to D)
⏱️ Median time to first review (p50 hours)
🎯 First-timer PR merge success rate
🛡️ 1-click dynamic SVG badges for your README

Paste any GitHub URL to run an instant diagnostic.
```

### Tweet 4 (For Maintainers):
```text
If you maintain a welcoming open-source project, claim your scorecard. 

Embed the verified C-Rank badge in your README so contributors know your review team is fast and active.
```

### Tweet 5 (CTA):
```text
Stop guessing which door is open.

Search your favorite repos or explore the live index:
👉 https://getmerged.abhishekco.de
```

---

## 3. Reddit (`r/opensource` & `r/webdev`)

**Title**:
> I built a tool to find open-source repos that actually review and merge pull requests (GetMerged)

**Body**:
```text
Hey everyone,

Every developer has had this happen: you find a popular repo, spend a weekend crafting a clean, well-tested pull request, and it sits untouched for six months because the maintainer has zero review bandwidth.

GitHub stars tell you what was popular in 2021. They tell you nothing about whether a project welcomes outside contributors today.

To fix this for myself and other contributors, I built **GetMerged** (https://getmerged.abhishekco.de).

It is a public telemetry index that benchmarks repositories with an objective C-Rank grade based on:
- Median time to first maintainer review (hours vs weeks)
- Outside PR merge rate (filtering out core team self-merges)
- First-timer issue conversion rate
- Multi-maintainer review capacity

You can paste any GitHub repository link to inspect its review velocity, find beginner-friendly issues that actually get merged, or embed a live dynamic SVG badge in your project README.

Give it a spin on your favorite repositories and let me know what other metrics you would like to see!
```

---

## 4. Product Hunt Launch

- **Product Name**: GetMerged
- **Tagline**: Stop guessing which door is open. Find repos that actually merge PRs.
- **Short Description**: GitHub stars measure hype. GetMerged benchmarks 53,000+ repositories on real maintainer response velocity, outside PR merge rates, and first-timer acceptance.

**Maker First Comment**:
```text
👋 Hey Product Hunt!

I built GetMerged because I was tired of wasting weekends opening pull requests on 40,000-star repositories that turned out to be ghost towns.

Stars tell you a project got popular on Hacker News three years ago. They say nothing about whether the maintainer has time to review your code this week.

GetMerged brings empirical transparency to open source:
🌟 C-Rank Telemetry: Objective benchmarks on PR merge rates and response turnaround.
⚡ Instant Scans: Paste any GitHub link to get a live contributor readiness scorecard.
🛡️ Live README Badges: Maintainers can embed verified tier badges directly in GitHub.
🏆 Monthly Contributor League: Track your merged PRs and build a verified portfolio.

Check out your favorite repos, test your own projects, and let me know what you think! 🚀
```
