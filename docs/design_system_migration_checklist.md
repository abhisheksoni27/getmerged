# Design System Migration Checklist (Auditing & Planning)

This checklist tracks the audit and step-by-step refactoring of the **opendoor** application to conform to the new design system inspired by **happy.engineering**.

---

## 1. Audit Findings

### Typography
- **Headings / Display**: Use `Space Grotesk` (`font-space` / `var(--font-space-grotesk)`).
- **Body / Interface**: Use `DM Sans` (`font-sans` / `var(--font-dm-sans)`).
- **Monospace / Data**: Use `DM Mono` (`font-mono` / `var(--font-dm-mono)`).

### Color Palette (Theme Tokens)
- **Background**: Soft warm cream `#faf9f6` (applied to all page wraps).
- **Foreground**: Charcoal `#1a1a1c` (for softer contrast than stark black).
- **Primary / Active Accent**: `#10b981` (Vibrant Emerald / Teal).
- **Secondary Accent**: `#3b82f6` (Vibrant Blue).
- **Muted Elements**: `#71717a` (Muted Gray).
- **Borders/Lines**: Replace `border-zinc-200` with soft ambient shadows and minimal light-gray lines.

### Layout & Sizing
- **Gaps**: Increase margins/paddings (`gap-6`, `gap-8`, `py-20`, `py-24`) for whitespace.
- **Card Radius**: `rounded-2xl` with zero border and shadow `shadow-[0_8px_30px_rgb(0,0,0,0.015)]`.

---

## 2. Migration TODO Checklist

- [x] **Phase 1: Configure Core Tokens**
  - [x] Configure Google Fonts in `layout.tsx`
  - [x] Map theme variables and fallback families in `globals.css`
  - [x] Set body background color and global font defaults in `globals.css`

- [x] **Phase 2: Refactor Shared Layout Components**
  - [x] **Header** (`components/Header.tsx`):
    - [x] Update fonts to `font-space` for brand names and `font-sans` for menu options.
    - [x] Refactor Star button and Login button to be borderless/soft shadow.
    - [x] Remove hard `border-b` lines, replace with subtle backdrop-blur and ambient shadow.
  - [x] **Footer** (`components/Footer.tsx`):
    - [x] Update layout grid to use soft text, `font-sans`, and remove rigid divider borders.
    - [x] Set background to match warm cream `#faf9f6`.

- [x] **Phase 3: Refactor Main Dashboard & Controls**
  - [x] **Home Dashboard** (`HomeClient.tsx`):
    - [x] Set wrapper background to `#faf9f6`.
    - [x] Make hero title use `font-space`.
    - [x] Refactor stats cards: remove borders, use soft shadows.
    - [x] Refactor search input: remove border, use soft shadow & background tint focus.
    - [x] Convert filter grid buttons/pills into rounded borderless pills.
  - [x] **RepoCard** (`components/RepoCard.tsx`):
    - [x] Convert title to `font-space`.
    - [x] Remove border and use soft shadow transition.
    - [x] Refactor language tags, stars bucket tag to be borderless.

- [x] **Phase 4: Refactor Supporting Pages**
  - [x] **Repo Detail View** (`components/ClientRepoDetail.tsx`):
    - [x] Redesign header stats and title (Space Grotesk + DM Mono).
    - [x] Redesign telemetry tabs: make them clean, borderless, and use active color gradients.
    - [x] Remove rigid panel boxes and double borders across charts and tables.
    - [x] Refactor C-Rank dials/badges to look clean and modern.
  - [x] **Leaderboard & Rankings** (`app/leaderboard/page.tsx`, `app/rankings/[lang]/page.tsx`, `app/hall-of-fame/page.tsx`):
    - [x] Apply warm background and Space Grotesk headers.
    - [x] Remove hard borders on ranking tables/grids, use ambient row grouping.
  - [x] **Static/Legal Pages** (`app/privacy/page.tsx`, `app/terms/page.tsx`, `app/status/page.tsx`):
    - [x] Clean up layout structure, margins, and borders.
    - [x] Improve reading layout with 70ch width container and DM Sans body.

- [x] **Phase 5: Visual Verification & Cleanup**
  - [x] Run typescript and lint checks to ensure zero regressions.
  - [x] Verify pages responsive design and mobile-friendliness.
  - [x] Cleanup any unused CSS variables or styling artifacts.
