# Architecture & Technical Standards

## Tech Stack & Runtime
- **Next.js (App Router)** + **TypeScript**
- **SSR-First Mandate**: Zero client-side `useEffect` data fetching for primary widget data on public SEO routes. All initial props must come from `page.tsx` server components.
- **Backend & Database**: Real persistent endpoints and database tables for all user interactions.

## Key Rules
1. Zero fake / mock UI interactions.
2. Zero CLS on SEO scorecard and profile pages.
