# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/badge-and-prompt.spec.ts >> Badge and Prompt Integration (GH-70) >> AC2: Copy Prompt button copies repo details and PR guidelines when insights loaded
- Location: tests/e2e/badge-and-prompt.spec.ts:44:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Copy Prompt/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Copy Prompt/i })

```

```yaml
- banner:
  - link "GetMerged":
    - /url: /
  - navigation:
    - link "Repositories":
      - /url: /repos
    - link "How C-Rank™ Works":
      - /url: /how-c-rank-works
    - link "Ecosystems":
      - /url: /rankings
    - link "Good First Issues":
      - /url: /good-first-issue
    - link "Hall of Fame":
      - /url: /hall-of-fame
  - button "Sign in"
- main:
  - link "Back to Explorer":
    - /url: /
  - img "facebook"
  - text: Scored 0
  - link "Other":
    - /url: /rankings/other
  - text: "Updated: Aug 17, 2026"
  - heading "facebook/react" [level=1]
  - paragraph: Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility.
  - button "Watch Repo"
  - link "GitHub":
    - /url: https://github.com/facebook/react
  - paragraph: Get alerts when review velocity or rank updates.
  - text: Response Velocity - No reviewer activity recorded
  - paragraph: Average Response Latency
  - paragraph: Tracks hours until a maintainer leaves a review, comment, or PR response.
  - text: Merge Efficiency 0.0% Selective PR acceptance rate
  - paragraph: External Acceptance Rate
  - paragraph: Percentage of community pull requests successfully merged into main.
  - text: First-Timer Success 0.0% No first-timer merges recorded in window
  - paragraph: First PR Conversion
  - paragraph: Rate at which developers submitting their first repository PR succeed.
  - text: Maintainers & Bus Factor - No active GitHub maintainers found (may review internally on Gerrit or internal tools)
  - paragraph: Distinct Reviewers & Docs
  - paragraph: Active maintainers in the 90-day window and newcomer documentation readiness score.
  - text: Contributor Vibe STEEP CURVE
  - img
  - text: 0/100 PR Merge Index
  - paragraph: Calculated from first response latency, external PR merge rate, and first-timer success.
  - heading "Embed C-Rank Badge on GitHub README" [level=3]
  - paragraph: Show contributors that your repository actively reviews and merges external pull requests.
  - checkbox "Show Raw C-Rank Score Points"
  - text: "Show Raw C-Rank Score Points Badge Color:"
  - combobox "Badge Color:":
    - option "Auto (Match C-Rank Tier)" [selected]
    - option "Emerald"
    - option "Blue"
    - option "Amber"
    - option "Purple"
    - option "Rose"
  - img "GetMerged C-Rank badge for facebook/react"
  - button "Copy Markdown"
  - button "Copy AI Prompt (for LLMs)"
  - heading "Similar Welcoming Repositories" [level=3]
  - paragraph:
    - text: Alternative open-source projects with active maintainers in
    - strong: Other
    - text: .
  - link "View all Other rankings":
    - /url: /rankings/other
  - link "abhisheksoni27 abhisheksoni27/wilson 0 • Other Welcoming No repository description available. - Merge Rate - First Review 0% 1st-Timers Telemetry active View details →":
    - /url: /abhisheksoni27/wilson
    - img "abhisheksoni27"
    - text: abhisheksoni27/wilson 0 • Other Welcoming
    - paragraph: No repository description available.
    - text: "- Merge Rate - First Review 0% 1st-Timers Telemetry active View details →"
  - link "puppeteer puppeteer/puppeteers 0 • Other Welcoming No repository description available. - Merge Rate - First Review 0% 1st-Timers Telemetry active View details →":
    - /url: /puppeteer/puppeteers
    - img "puppeteer"
    - text: puppeteer/puppeteers 0 • Other Welcoming
    - paragraph: No repository description available.
    - text: "- Merge Rate - First Review 0% 1st-Timers Telemetry active View details →"
  - link "wvlet wvlet/wvlet 157 • Scala Moderate A flow-style query language for SQL engines 99% Merge Rate <1h First Review 100% 1st-Timers 5 good first issues View details →":
    - /url: /wvlet/wvlet
    - img "wvlet"
    - text: wvlet/wvlet 157 • Scala Moderate
    - paragraph: A flow-style query language for SQL engines
    - text: 99% Merge Rate <1h First Review 100% 1st-Timers 5 good first issues View details →
  - button "Interactive Onboarding & Contribution Guidelines ▶"
  - paragraph:
    - text: Follow these instructions to increase the success rate of your pull requests in
    - strong: facebook/react
    - text: ":"
  - list:
    - listitem: Always run test suite before submitting PR
    - listitem: Keep PR descriptions concise and link issue tickets
  - heading "AI Maintainer Review Guidelines" [level=2]
  - text: Review Persona
  - heading "react Maintainer Team" [level=3]
  - paragraph: welcoming
  - heading "Contributor Community Vibe Feedback" [level=2]
  - paragraph: Rate what actually matters after opening a pull request here.
  - text: GitHub Verification Active
  - heading "Score this repo" [level=3]
  - paragraph: Three taps.
  - text: 3 ratings required Maintainer helpfulness
  - 'button "Maintainer helpfulness: 1 star"'
  - 'button "Maintainer helpfulness: 2 stars"'
  - 'button "Maintainer helpfulness: 3 stars"'
  - 'button "Maintainer helpfulness: 4 stars"'
  - 'button "Maintainer helpfulness: 5 stars"'
  - text: Review speed
  - 'button "Review speed: 1 star"'
  - 'button "Review speed: 2 stars"'
  - 'button "Review speed: 3 stars"'
  - 'button "Review speed: 4 stars"'
  - 'button "Review speed: 5 stars"'
  - text: Beginner friendliness
  - 'button "Beginner friendliness: 1 star"'
  - 'button "Beginner friendliness: 2 stars"'
  - 'button "Beginner friendliness: 3 stars"'
  - 'button "Beginner friendliness: 4 stars"'
  - 'button "Beginner friendliness: 5 stars"'
  - button "Submit Ratings" [disabled]
  - heading "Contributor Compatibility & Review Speed Analysis for facebook/react" [level=2]
  - paragraph:
    - text: When evaluating whether to contribute to
    - strong: facebook/react
    - text: ", response velocity and maintainer engagement are crucial. GetMerged continuously tracks pull request trajectories, first-comment latency, and code review rounds to help developers avoid submitting pull requests to backlogged repositories."
  - paragraph:
    - text: Currently, maintainers of facebook/react acknowledge new external contributions in approximately
    - strong: "-"
    - text: . Out of all submitted pull requests from non-core authors in the last 180-day window,
    - strong: 0.0%
    - text: were successfully merged into the primary branch.
  - heading "Frequently Asked Questions - Contributing to facebook/react" [level=2]
  - text: "01"
  - heading "Is facebook/react welcoming to first-time open-source contributors?" [level=3]
  - paragraph:
    - text: facebook/react has a recorded first-timer success rate of
    - strong: 0.0%
    - text: . Repositories ranked Scored typically provide actionable feedback during code reviews and actively nurture new community contributors.
  - text: "02"
  - heading "How fast can I expect code review feedback on my pull request?" [level=3]
  - paragraph:
    - text: The initial maintainer response time averages ~
    - strong: "-"
    - text: . Keeping PRs scoped to single concerns and ensuring CI checks succeed will optimize review turnaround.
  - text: "03"
  - heading "What does the 0.0 C-Rank™ score represent?" [level=3]
  - paragraph:
    - text: "The C-Rank™ index scores repositories on a 0 to 100 scale using an objective formula: external PR merge rates, initial response speed, active maintainer count, and first-time contributor retention. A score of 0.0 places facebook/react in the"
    - strong: Scored
    - text: tier.
  - text: "04"
  - heading "What is the external contributor pull request merge rate for facebook/react?" [level=3]
  - paragraph:
    - text: The external pull request merge rate is
    - strong: 0.0%
    - text: . GetMerged isolates non-core community contributions so external developers get an accurate benchmark of PR acceptance probability.
  - text: "05"
  - heading "Are there beginner Good First Issues open in facebook/react?" [level=3]
  - paragraph: facebook/react does not have open beginner labels indexed currently, but external PRs for bugs and documentation improvements are evaluated via normal issue triage.
  - text: "06"
  - heading "How many distinct maintainers review contributions in facebook/react?" [level=3]
  - paragraph:
    - text: Telemetry shows approximately
    - strong: "1"
    - text: distinct maintainer(s) actively participating in code review rounds, discussions, and commit merges.
  - text: "07"
  - heading "How long does it typically take for a PR to be merged into facebook/react?" [level=3]
  - paragraph:
    - text: On average, merged pull requests spend ~
    - strong: 24.0 hours
    - text: in review and CI testing before being merged into the primary branch.
  - text: "08"
  - heading "What programming language and ecosystem does facebook/react belong to?" [level=3]
  - paragraph:
    - text: facebook/react is developed in
    - strong: Other
    - text: with 0 stars. Contributing helps build verified public commits for your developer portfolio.
  - text: "09"
  - heading "How can I maximize my PR acceptance rate for facebook/react?" [level=3]
  - paragraph: Always link an existing GitHub issue in your PR body, write clean automated unit tests, keep pull request diffs small and focused, and run local linters prior to submission.
  - text: "10"
  - heading "Is facebook/react actively maintained or at risk of staleness?" [level=3]
  - paragraph: facebook/react is actively maintained with frequent PR reviews, continuous telemetry updates, and regular maintainer feedback.
  - heading "GetMerged C-Rank™ Indexing Standard" [level=2]
  - paragraph: All telemetry metrics displayed for facebook/react are automatically retrieved via the GitHub GraphQL API and recalculated daily. Insider pull requests submitted by repository owners or organization members are excluded from merge rate calculations to preserve objective external contributor statistics.
- contentinfo:
  - heading "Ecosystem Rankings" [level=4]
  - list:
    - listitem:
      - link "Top Python Repos":
        - /url: /rankings/python
    - listitem:
      - link "Top TypeScript Repos":
        - /url: /rankings/typescript
    - listitem:
      - link "Top Go Repos":
        - /url: /rankings/go
    - listitem:
      - link "Top Rust Repos":
        - /url: /rankings/rust
    - listitem:
      - link "Top C# Repos":
        - /url: /rankings/csharp
    - listitem:
      - link "Top C++ Repos":
        - /url: /rankings/cpp
    - listitem:
      - link "Top Java Repos":
        - /url: /rankings/java
  - heading "More Ecosystems" [level=4]
  - list:
    - listitem:
      - link "Top PHP Repos":
        - /url: /rankings/php
    - listitem:
      - link "Top Ruby Repos":
        - /url: /rankings/ruby
    - listitem:
      - link "Top Swift Repos":
        - /url: /rankings/swift
    - listitem:
      - link "Top Kotlin Repos":
        - /url: /rankings/kotlin
    - listitem:
      - link "Top Dart Repos":
        - /url: /rankings/dart
    - listitem:
      - link "Top Elixir Repos":
        - /url: /rankings/elixir
    - listitem:
      - link "Top Zig Repos":
        - /url: /rankings/zig
  - heading "Good First Issues" [level=4]
  - list:
    - listitem:
      - link "Python Good First Issues":
        - /url: /good-first-issue/python
    - listitem:
      - link "TypeScript Good First Issues":
        - /url: /good-first-issue/typescript
    - listitem:
      - link "Go Good First Issues":
        - /url: /good-first-issue/go
    - listitem:
      - link "Rust Good First Issues":
        - /url: /good-first-issue/rust
    - listitem:
      - link "C# Good First Issues":
        - /url: /good-first-issue/csharp
    - listitem:
      - link "C++ Good First Issues":
        - /url: /good-first-issue/cpp
    - listitem:
      - link "Java Good First Issues":
        - /url: /good-first-issue/java
  - heading "Curated & Platform" [level=4]
  - list:
    - listitem:
      - link "How C-Rank™ Works":
        - /url: /how-c-rank-works
    - listitem:
      - link "Hall of Fame (Super Welcoming)":
        - /url: /hall-of-fame
    - listitem:
      - link "Top 50 Global Leaderboard":
        - /url: /leaderboard
    - listitem:
      - link "System Status":
        - /url: /status
    - listitem:
      - link "API Health":
        - /url: /api/v1/health
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Terms of Service":
        - /url: /terms
  - text: Explore Open Source Repositories by Stack
  - link "Python":
    - /url: /good-first-issue/python
  - link "TypeScript":
    - /url: /good-first-issue/typescript
  - link "Go":
    - /url: /good-first-issue/go
  - link "Rust":
    - /url: /good-first-issue/rust
  - link "C#":
    - /url: /good-first-issue/csharp
  - link "C++":
    - /url: /good-first-issue/cpp
  - link "Java":
    - /url: /good-first-issue/java
  - link "PHP":
    - /url: /good-first-issue/php
  - link "Ruby":
    - /url: /good-first-issue/ruby
  - link "Swift":
    - /url: /good-first-issue/swift
  - link "Kotlin":
    - /url: /good-first-issue/kotlin
  - link "Dart":
    - /url: /good-first-issue/dart
  - link "Elixir":
    - /url: /good-first-issue/elixir
  - link "Zig":
    - /url: /good-first-issue/zig
  - text: © 2026 GetMerged, Glassdoor for Open Source Repositories.
  - link "Home":
    - /url: /
  - link "Hall of Fame":
    - /url: /hall-of-fame
  - link "Leaderboard":
    - /url: /leaderboard
  - link "Status":
    - /url: /status
  - link "Privacy":
    - /url: /privacy
  - link "Terms":
    - /url: /terms
- alert
- paragraph: We value your privacy
- paragraph:
  - text: GetMerged uses an essential cookie to keep you signed in and anonymized analytics (via PostHog) to improve the platform. Analytics run only with your consent. See our
  - link "Privacy Policy":
    - /url: /privacy
  - text: .
- button "Reject"
- button "Accept"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Badge and Prompt Integration (GH-70)", () => {
  4  |   test("AC1 & AC4: Exactly one Copy Markdown button is rendered on /facebook/react with accessible title", async ({ page }) => {
  5  |     await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
  6  |     
  7  |     // Exactly one Copy Markdown button should exist on the page
  8  |     const copyButtons = page.getByRole("button", { name: /Copy Markdown/i });
  9  |     await expect(copyButtons).toHaveCount(1);
  10 |     await expect(copyButtons.first()).toBeVisible();
  11 |     await expect(copyButtons.first()).toHaveAttribute("title", "Copy markdown badge embed code for GitHub README");
  12 |   });
  13 | 
  14 |   test("AC1 & AC4: Copy Markdown button handles click, copies to clipboard, and shows transient feedback", async ({ page, context }) => {
  15 |     await context.grantPermissions(["clipboard-read", "clipboard-write"], {
  16 |       origin: "http://127.0.0.1:3000",
  17 |     });
  18 | 
  19 |     await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
  20 |     const copyButton = page.getByRole("button", { name: /Copy Markdown/i }).first();
  21 |     await copyButton.click();
  22 | 
  23 |     // Tolerant to transient label transition
  24 |     await expect(page.getByRole("button", { name: /Copied Markdown!/i })).toBeVisible();
  25 | 
  26 |     const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  27 |     expect(clipboardText).toContain("badge/facebook/react.svg");
  28 |     expect(clipboardText).toContain("getmerged.abhishekco.de/facebook/react");
  29 |   });
  30 | 
  31 |   test("AC3 & AC4: Copy Prompt button has accessible title and disabled/loading state when unauthenticated/no insights", async ({ page }) => {
  32 |     await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
  33 | 
  34 |     // Open guideline drawer
  35 |     const drawerToggle = page.getByRole("button", { name: /Interactive Onboarding & Contribution Guidelines/i });
  36 |     await drawerToggle.click();
  37 | 
  38 |     const copyPromptBtn = page.getByRole("button", { name: /Copy Prompt/i });
  39 |     await expect(copyPromptBtn).toBeVisible();
  40 |     await expect(copyPromptBtn).toBeDisabled();
  41 |     await expect(copyPromptBtn).toHaveAttribute("title", "Copy paste-ready contribution prompt for LLMs");
  42 |   });
  43 | 
  44 |   test("AC2: Copy Prompt button copies repo details and PR guidelines when insights loaded", async ({ page, context }) => {
  45 |     await context.grantPermissions(["clipboard-read", "clipboard-write"], {
  46 |       origin: "http://127.0.0.1:3000",
  47 |     });
  48 | 
  49 |     // Mock insights API
  50 |     await page.route("**/api/v1/repos/*/insights", async (route) => {
  51 |       await route.fulfill({
  52 |         status: 200,
  53 |         contentType: "application/json",
  54 |         body: JSON.stringify({
  55 |           insights: {
  56 |             repo_id: "1",
  57 |             maintainer_vibe: "welcoming",
  58 |             pr_guidelines: [
  59 |               "Always run test suite before submitting PR",
  60 |               "Keep PR descriptions concise and link issue tickets",
  61 |             ],
  62 |           },
  63 |         }),
  64 |       });
  65 |     });
  66 | 
  67 |     // Set cookie to simulate authenticated session
  68 |     await context.addCookies([
  69 |       {
  70 |         name: "opendoor_token",
  71 |         value: "mock_jwt_token",
  72 |         domain: "127.0.0.1",
  73 |         path: "/",
  74 |       },
  75 |     ]);
  76 | 
  77 |     await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
  78 | 
  79 |     // Open guideline drawer
  80 |     const drawerToggle = page.getByRole("button", { name: /Interactive Onboarding & Contribution Guidelines/i });
  81 |     await drawerToggle.click();
  82 | 
  83 |     const copyPromptBtn = page.getByRole("button", { name: /Copy Prompt/i });
> 84 |     await expect(copyPromptBtn).toBeVisible();
     |                                 ^ Error: expect(locator).toBeVisible() failed
  85 |     await expect(copyPromptBtn).toBeEnabled();
  86 | 
  87 |     await copyPromptBtn.click();
  88 | 
  89 |     // Verify feedback label
  90 |     await expect(page.getByRole("button", { name: /Copied Prompt!/i })).toBeVisible();
  91 | 
  92 |     const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  93 |     expect(clipboardText).toContain("facebook/react");
  94 |     expect(clipboardText).toContain("https://getmerged.abhishekco.de/facebook/react");
  95 |     expect(clipboardText).toContain("Always run test suite before submitting PR");
  96 |     expect(clipboardText).toContain("Keep PR descriptions concise and link issue tickets");
  97 |   });
  98 | });
  99 | 
```