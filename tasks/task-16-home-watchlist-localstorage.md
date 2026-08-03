# Jira Story: No-Auth Personal Contribution Watchlist (localStorage)

## Epic Link
EPIC-201: Homepage Revamp & User Retention

## Description
As an unauthenticated user, I want to add projects to a personalized watchlist saved in my browser so that I can monitor them without needing to sign up immediately.

## Why
Requiring login immediately creates high drop-off. By offering "watchlist" functionality locally using localStorage, we give users utility first. Once they see the value of watching repositories (e.g., triage notifications, velocity changes), we convert them to authenticated accounts.

## Specific Key Result
- **Watchlist Engagement**: Achieve a 25% engagement rate (adding at least 1 repo to watchlist) for unauthenticated visitors.
- **Conversion to Account**: Convert 30% of local watchlist users to authenticated accounts within 7 days.

## How to Solve (Solution)
1. **Watchlist Local Storage Utility**: Set up helper hooks managing a list of watched repo IDs in `localStorage`.
2. **Watch Button Card Action**: Render a tiny "Watch / Save" bookmark icon on each repository card.
3. **Home Watchlist Tab**: Render a dedicated "My Watchlist" tab on the homepage alongside "All Repositories" and "Recommended".
4. **Auth Nudge Trigger**: When a user attempts to add a 4th repo or clicks "Subscribe to Alerts", trigger a sleek login modal explaining the benefits of account sync.
