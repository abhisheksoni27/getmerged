<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into opendoor — a Next.js 15.2.0 App Router application. PostHog is initialized via a `PostHogInit` client component (using `useEffect`, the correct approach for Next.js < 15.3) and a reverse proxy is configured in `next.config.ts` to route requests through `/ingest` to avoid ad blockers. User identification is wired to GitHub OAuth — on each page load the Header fetches the authenticated user profile and calls `posthog.identify()` with the GitHub user ID as the distinct ID. A server-side PostHog client (`src/lib/posthog-server.ts`) is also available for future API route instrumentation. Three new event captures were added: `github_sign_in_clicked` on the homepage CTA banner, `github_sign_in_clicked` on the header sign-in button (with a `source` property to distinguish call sites), and `github_star_clicked` on the "Star on GitHub" header nudge.

| Event name | Description | File |
|---|---|---|
| `repo_filter_applied` | User applies a filter (language, star bucket, or tier) to the repository list. | `src/app/page.tsx` |
| `trending_toggled` | User toggles the daily trending repos filter on or off. | `src/app/page.tsx` |
| `repo_searched` | User submits a search query to find a specific repository. | `src/app/page.tsx` |
| `pagination_changed` | User navigates to a different page of repository results. | `src/app/page.tsx` |
| `github_sign_in_clicked` | User clicks the 'Sign in with GitHub' CTA on the homepage banner. | `src/app/page.tsx` |
| `repo_card_clicked` | User clicks a repository card to view its full detail page. | `src/components/RepoCard.tsx` |
| `github_sign_in_clicked` | User clicks the 'Sign in with GitHub' button in the site header. | `src/components/Header.tsx` |
| `github_star_clicked` | User clicks the 'Star on GitHub' button in the header. | `src/components/Header.tsx` |
| `user_signed_out` | User signs out of the application. | `src/components/Header.tsx` |
| `repo_watch_toggled` | User adds or removes a repository from their watchlist. | `src/components/ClientRepoDetail.tsx` |
| `github_sign_in_clicked` | User clicks the 'Sign in with GitHub' button on the AI insights auth wall. | `src/components/ClientRepoDetail.tsx` |
| `repo_github_link_clicked` | User clicks the GitHub external link button on a repository detail page. | `src/components/ClientRepoDetail.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/529652/dashboard/1911508)
- [GitHub Sign-in Conversion Funnel (wizard)](https://us.posthog.com/project/529652/insights/Te031udV) — conversion from browsing repos to clicking Sign in
- [GitHub Sign-in Clicks by Source (wizard)](https://us.posthog.com/project/529652/insights/DUZJvDCv) — which sign-in entry point (header, homepage CTA, AI wall) drives the most clicks
- [Repository Searches Over Time (wizard)](https://us.posthog.com/project/529652/insights/SoAJ7UiD) — how often users search for repositories
- [Repo Watch Actions (wizard)](https://us.posthog.com/project/529652/insights/6fm7Atg1) — watched vs unwatched actions over time
- [Repo Filter Activity (wizard)](https://us.posthog.com/project/529652/insights/jNClssrP) — which filter types (language, tier, stars) users reach for most

## Verify before merging

- [ ] Run `npm add posthog-js posthog-node` to install the PostHog SDKs (the wizard could not reach the npm registry during setup due to sandbox network restrictions).
- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any deployment environment configuration (Vercel, Railway, etc.) so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the Header currently fetches `/api/v1/auth/me` on mount, which is correct, but verify the cookie is present on hard refresh for returning sessions.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
