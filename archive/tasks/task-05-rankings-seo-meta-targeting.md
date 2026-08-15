# Jira Story: Dynamic SEO Title & Meta Description Targeting for Language Rankings

## Epic Link
EPIC-103: Dynamic Language Rankings Revamp

## Description
As a developer searching for "how to contribute to rust projects" or "best open source go repositories for beginners", I want opendoor rankings pages to rank on the first page of Google.

## Why
Currently, the dynamic rankings pages have plain titles. By embedding targeted, language-specific search intent keywords ("best", "welcoming", "easy", "contribute") into our dynamic head metadata, we intercept developer search intent.

## Specific Key Result
- **Search Ranking**: Place at least 5 language rankings pages in the Top 3 positions on Google SERP for key phrases like `contribute to [language] open source`.
- **Search Impression Volume**: Raise rankings impression count on Google Search Console by 150%.

## How to Solve (Solution)
1. **Dynamic head Metadata**: Refactor `/rankings/[lang]/page.tsx` metadata function to generate customized SEO configurations:
   - **Title**: `Top Welcoming [Language] Open Source Repositories to Contribute to ([Year])`
   - **Meta Description**: `Find the most active and welcoming [Language] repositories on GitHub. View real-time merge rates, average responsiveness speeds, and first-timer success logs.`
2. **SEO Header Copy**: Inject semantic descriptions at the top of the rankings lists describing the language community, typical project profiles, and tips.
