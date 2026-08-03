# Design System Iteration Feedback & Memory Log

This document tracks visual iterations, Playwright audits, and design improvements to keep the **opendoor** interface fun, engaging, and functionally robust.

---

## Iteration 1 (2026-08-03)

### Playwright Audit Insights
- **URL Audited**: `https://opendoor.abhishekco.de`
- **Browsers/Pages Tested**: Home (`/`), Leaderboard (`/leaderboard`), Status (`/status`), Repo Details (`/repo/cfw-guide/dsi.cfw.guide`).
- **Perspectives**:
  - **UX Designer**: Spacing and margins on the main filters bar could feel more spacious on smaller screens. The grid layout is clean but lacks dynamic entry.
  - **UI User Delight**: The new neobrutalist tier stickers are an awesome improvement. However, they should feel interactive! Adding hover scaling and active "sticker pressing" effects (shadow shrink) on click would enhance delight.
  - **Functional Techie**: Typecheck compiles cleanly. Verified repository details render correct first-timer stats.

### Action Plan
1. **Pill & Sticker Press Interactions**: Update `RepoCard.tsx` tier badges and first-timer pills to translate and reduce shadow sizing during active clicks, simulating a physical button click. (Completed)
2. **Micro-animations**: Add a subtle slide-up entry to the cards in `HomeClient.tsx` so the dashboard feels alive when loaded. (Completed)
3. **Logo Hover Delight**: Make the header brand logo rotate slightly on hover or change color playfully. (Completed)

---

## Iteration 2 (2026-08-03)

### Playwright Audit Insights
- **URL Audited**: `https://opendoor.abhishekco.de`
- **Pages Audited**: `/leaderboard`, `/hall-of-fame`, `/status`, `/rankings/go`
- **Perspectives**:
  - **UX Designer**: Standard text navigation breadcrumbs (e.g. "Back to Explorer") felt low-contrast and static.
  - **UI User Delight**: Static indicators on status cards lacked animation. S-Tier Showcase header elements looked clean but could match the custom rotating stickers aesthetic.
  - **Functional Techie**: All page compilations and typecheck rules are fully compliant.

### Action Plan
1. **Interactive Navigation Breadcrumbs**: Restyled back links as tag/pill buttons with active hover states to make navigation distinct.
2. **Pulsing Health Badges**: Implemented standard inline pulsing dots (`animate-ping`) for Valkey and API Gateway operational states.
3. **Showcase Sticker Headers**: Ported the dynamic neobrutalist sticker badge style to header labels (Global Leaderboard, S-Tier Showcase) with rotational adjustments.
4. **Neobrutalist Trending Button**: Redesigned the "Daily Trending Repos" button to morph into a bold neobrutalist button with active click animations and offsets.
