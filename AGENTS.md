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

## 2. 🚨 ZERO FAKE / MOCKED UI FEATURES (ABSOLUTE PROHIBITION)
- **NEVER create UI features, cards, buttons, modals, or forms that use fake client-side `setTimeout` simulations, placeholder mock saves, fake bots, or unbacked endpoints.**
- **EVERY interactive user feature MUST have a real, tested, working backend API, persistent database schema, and live integration before ANY user-facing button or form is placed in the UI.**
- **NO MOCK DATA OR PLACEHOLDERS in production UI.** If a feature or integration (e.g. Telegram/Discord bot, alerts, webhooks) is not fully built and working end-to-end on the backend, **DO NOT render or ship the UI for it.**
- **Ship real functionality or do not ship the component at all.** Empty promises, fake loading states, and non-working upsells immediately destroy user trust.

## 3. 📋 Product Inventory Grounding & Maintenance (MANDATORY)
- **Always check `product-inventory.md` before starting a task.** It is the authoritative ground truth for every feature, page, endpoint, and component in GetMerged. Reading it first prevents wasting tokens exploring or re-auditing existing features.
- **MUST update `product-inventory.md` whenever a major feature lands, changes, or is removed.** Whenever any significant feature worth writing about is added, refactored, or deprecated in the codebase, the agent must update `product-inventory.md` in the same turn.

