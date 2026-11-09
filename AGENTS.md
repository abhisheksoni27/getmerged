# AGENTS.md — Rules & Architecture Standards for GetMerged

## 0. Communication & Execution Rules
- Tell crisply, using minimum tokens.
- No corporate jargon, no fluff. Speak like a senior developer.
- Do not make generic AI slop design. Align with the codebase, the product, the audience.
- **🚨 PR-First Workflow (ZERO DIRECT PUSHES TO MAIN & ZERO AUTO-MERGING)**:
  - **ALL code changes MUST go through a feature/fix branch and a GitHub Pull Request.** Never push commits directly to `main`.
  - **NEVER merge pull requests automatically.** Always present the created PR link to the user with full context, test verification, and visual proof. A PR can ONLY be merged when the user explicitly instructs to merge it.
  - **Atomic, Cohesive PRs**: Group logically related changes together (e.g. backend endpoint + DB query + frontend consumption). Keep PRs scoped, focused, and reviewable. Do not lump unrelated refactors into a single PR.
  - **Code the system properly, not hacky patches**: Build clean, maintainable architecture fitting the existing system conventions. This is an MVP—build real, robust primitives without over-engineering or going berserk with unnecessary abstractions.
- **🚨 Visual & Design Identity Compliance**:
  - The GetMerged product palette is **Obsidian & Precision Developer Slate** (`#090D16`, `#0D111A`, `#111827`, `#F0F6FC`, `#8B949E`) with **Brand Violet/Indigo** (`#8250DF`, `#A371F7`) as primary accents, inspired by Trigger.dev and GitHub Primer.
  - **NEVER generate generic neon-green or template AI-slop themes.** Semantic colors (green for Welcoming / success, blue for latency, amber for warning, red for stalled) must be used judiciously as indicators, not as the dominant card or page background.


## 1. 🚨 SSR-First Architecture Rule (ZERO EXCEPTIONS)
- **ALL public page data, widgets, scorecards, benchmarks, and SEO content MUST be fetched server-side in `page.tsx` during SSR and passed down as props.**
- **NEVER** use client-side `useEffect` fetches as the primary data source for widgets on public SEO routes (e.g. `/[owner]/[name]`, `/rankings/[lang]`, `/good-first-issue`, `/compare`).
- Client components may accept `initialData` props from the server and only use client fetch for optimistic mutations, user interactions, or real-time polling refreshes.
- If a widget renders on a repository or profile page (such as **PR Size Sweet Spot**, **Maintainer Latency**, **Good First Issues**, **Community Reviews**, or **Karma Score**), it **MUST** be present in the initial server-rendered HTML so Googlebot, crawlers, and users get instant, zero-CLS rendering.

## 2. 🚨 ZERO FAKE / MOCKED UI FEATURES (ABSOLUTE PROHIBITION)
- **NEVER create UI features, cards, buttons, modals, or forms that use fake client-side `setTimeout` simulations, placeholder mock saves, fake bots, or unbacked endpoints.**
- **EVERY interactive user feature MUST have a real, tested, working backend API, persistent database schema, and live integration before ANY user-facing button or form is placed in the UI.**
- **NO MOCK DATA OR PLACEHOLDERS in production UI.** If a feature or integration (e.g. Telegram/Discord bot, alerts, webhooks) is not fully built and working end-to-end on the backend, **DO NOT render or ship the UI for it.**
- **Ship real functionality or do not ship the component at all.** Empty promises, fake loading states, and non-working upsells immediately destroy user trust.

## 3. 📋 Product Inventory Grounding & Maintenance (MANDATORY)
- **Always check `product-inventory.md` before starting a task.** It is the authoritative ground truth for every feature, page, endpoint, and component in GetMerged. Reading it first prevents wasting tokens exploring or re-auditing existing features.
- **MUST update `product-inventory.md` whenever a major feature lands, changes, or is removed.** Whenever any significant feature worth writing about is added, refactored, or deprecated in the codebase, the agent must update `product-inventory.md` in the same turn.