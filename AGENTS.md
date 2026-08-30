# AGENTS.md — Rules & Architecture Standards for GetMerged

## 0. Communication & Execution Rules
- Tell crisply, using minimum tokens.
- No corporate jargon, no fluff. Speak like a senior developer.
- Do not make generic AI slop design. Align with the codebase, the product, the audience.

## 1. 🚨 SSR-First Architecture Rule (ZERO EXCEPTIONS)
- **ALL public page data, widgets, scorecards, benchmarks, and SEO content MUST be fetched server-side in `page.tsx` during SSR and passed down as props.**
- **NEVER** use client-side `useEffect` fetches as the primary data source for widgets on public SEO routes (e.g. `/[owner]/[name]`, `/rankings/[lang]`, `/good-first-issue`, `/compare`).
- Client components may accept `initialData` props from the server and only use client fetch for optimistic mutations, user interactions, or real-time polling refreshes.
- If a widget renders on a repository or profile page (such as **PR Size Sweet Spot**, **Maintainer Latency**, **Good First Issues**, **Community Reviews**, or **Karma Score**), it **MUST** be present in the initial server-rendered HTML so Googlebot, crawlers, and users get instant, zero-CLS rendering.

## 2. Brand Voice & Copywriting Standards
- Refer to `.agents/skills/brand-copy-voice/SKILL.md`.
- Ban words like *telemetry*, *protocol*, *inbound radar*, *bespoke*, *pre-flight guard*, *synergy*.
- Keep text simple, punchy, and human. 2-second comprehension rule.
- Naturally include developer high-intent SEO keywords (*good first issues*, *pull request review speed*, *open source contribution*).
