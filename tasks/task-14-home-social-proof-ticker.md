# Jira Story: Real-Time Successful PR Merges Social Proof Ticker

## Epic Link
EPIC-201: Homepage Revamp & User Retention

## Description
As a visitor exploring the home page, I want to see a live activity feed/ticker of recently merged pull requests across indexed projects to feel the pulse of the community.

## Why
Social proof is a powerful motivator. Showing real-time activity of developers successfully getting their code merged into open-source projects using opendoor triggers FOMO (Fear Of Missing Out) and proves that our telemetry works.

## Specific Key Result
- **Sign-up Conversion**: Boost overall GitHub oauth sign-ups by 20%.
- **Dwell Time**: Increase average session time on the homepage by 15%.

## How to Solve (Solution)
1. **Marquee Ticker Component**: Design a subtle, horizontal marquee or auto-scrolling ticker bar directly below the navigation header.
2. **Dynamic Log Activity**: Feed the ticker with mock or real public GitHub events: "🎉 Developer @alice got a PR merged in [golang/go] (Response: 42m)" or "🔥 @bob closed an issue in [rust-lang/cargo] (Vibe: S-Tier)".
3. **Interactive Click Paths**: Clicking an item in the ticker navigates the user directly to that repository's detail page.
