# Design System Master File — GetMerged

> **LOGIC:** When building or refactoring a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** GetMerged (Open Source Contributor Discovery & PR Review Telemetry)  
**Style Archetype:** Swiss Minimalist Data Workbench & Utilitarian Developer Platform (Linear / FreeHire / Raycast inspired)  
**Target Audience:** Software engineers, open-source contributors, maintainers, engineering leaders  
**Design Dials:** Variance 7/10 (Architectural, Asymmetric, Data-First) | Density 8/10 (High-Density Tabular Workbench)

---

## 1. Core Architectural Direction (Anti-Slop Standard)

### What GetMerged Is:
- A high-density, real-time developer discovery workbench.
- Information-dense data tables, clean tabular metrics, instant search, and verified telemetry.
- Zero fluff. The product is front-and-center within the first viewport.

### What GetMerged Is NOT (Strict Prohibitions):
1. **NO 11-section marketing landing page loops** that bury the actual repository directory behind marketing slogans and generic pillar cards.
2. **NO cookie-cutter rounded card kits** with excessive padding (`p-8`), floaty drop shadows, and 10-dot micro gauges.
3. **NO generic AI color tropes**: Banned warm cream background (`#F4F1EA`) with terracotta (`#D97757`) and spaced em dashes.
4. **NO black OLED theme** that hides typography and makes data unreadable.
5. **NO fake or mocked features**: Every row, metric, and button must map to real backend data and live endpoints (per `AGENTS.md #3`).

---

## 2. Global Token Palette (Light Crisp Precision)

| Role | Hex | CSS Variable | Usage & Contrast |
|---|---|---|---|
| **Canvas Background** | `#FBFBFA` | `--bg-canvas` | Main page background (crisp, warm-neutral off-white) |
| **Surface (Tables/Rows)**| `#FFFFFF` | `--bg-surface` | Data tables, rows, header, modals |
| **Elevated / Controls** | `#F3F4F6` | `--bg-elevated` | Filter chips, search bar, active tab containers |
| **Border Subtle** | `#E5E7EB` | `--border-subtle` | Table row dividers, input borders (1px hairline) |
| **Border Strong** | `#D1D5DB` | `--border-strong` | Active tabs, hover states, card perimeters |
| **Text Primary (Ink)** | `#111827` | `--text-primary` | Headings, repo names, primary metrics (16.2:1 contrast) |
| **Text Secondary** | `#4B5563` | `--text-secondary` | Descriptions, labels, secondary metadata (7.1:1 contrast) |
| **Text Tertiary** | `#6B7280` | `--text-tertiary` | Column headers, timestamps, shortcuts (4.8:1 contrast) |
| **Accent / Action** | `#2563EB` | `--color-primary` | Primary action buttons, active indicators, links |
| **Grade S (Tier)** | `#059669` | `--color-grade-s` | Super Welcoming pill & telemetry |
| **Grade A (Tier)** | `#2563EB` | `--color-grade-a` | Welcoming pill & telemetry |
| **Grade B (Tier)** | `#7C3AED` | `--color-grade-b` | Solid pill & telemetry |
| **Grade C (Tier)** | `#D97706` | `--color-grade-c` | Moderate pill |
| **Grade D (Tier)** | `#DC2626` | `--color-grade-d` | Risky / Low response pill |

---

## 3. Typography Architecture

- **Display / Headings**: `Space Grotesk` (weights: 600, 700) — Confident, geometric, architectural.
- **Interface / Body**: `Inter` (weights: 400, 500, 600) — Highly legible system sans-serif.
- **Data & Telemetry**: `DM Mono` (weights: 400, 500) with `font-feature-settings: "tnum" 1` — Monospaced numerals for all percentages, turnaround hours, star counts, and ratios.

---

## 4. Layout & Viewport Composition

### Homepage (`/`):
- **Sticky Header**: 56px height. Brand mark, global search modal trigger (`⌘K`), quick links (Directory, Rankings, Good First Issues), GitHub auth button.
- **Viewport Hero (Max 280px)**:
  - 2-line direct H1: "Find Repositories That Actually Merge Your PRs."
  - 1-sentence value proposition (under 20 words).
  - High-precision search bar with instant filter chips (Languages: TS, Python, Go, Rust; Tiers: S-Tier, Fast Review).
  - Inline live telemetry strip: `102,000+ Scored Repos` · `82% Avg Merge Rate` · `<12h Median Turnaround` · `22k+ Starter Issues`.
- **Primary Stage (Directly Visible)**:
  - **Live Repository Directory Table**: High-density interactive table.
  - Tabs: `All Welcoming`, `Fast Turnaround (<24h)`, `First-Timer Friendly`, `Good First Issues`, `Hall of Fame`.
  - Columns:
    1. **Repository**: 40px avatar, full name (`owner/name`), description, topic pills.
    2. **Ecosystem**: Language icon + name.
    3. **C-Rank**: Grade pill (`S` / `A` / `B`) + numeric score (`78/100`).
    4. **Merge Rate**: Monospace percentage with mini horizontal progress line.
    5. **Turnaround**: Median response time (`<2h`, `14h`).
    6. **1st Timers**: First-timer success rate %.
    7. **Action**: 1-click "Inspect Scorecard" button.
- **Methodology & Contributor Guides**:
  - Located cleanly beneath the directory in an uncluttered 2-column architectural split: Left = "How C-Rank Works" (4 weighted factors); Right = Contributor vs Maintainer playbooks.

### Directory Page (`/repos`):
- Full-bleed data table view with multi-facet sidebar (Tiers, Languages, Min Stars, Sort Order).
- Zero card padding bloat; compact table rows with sticky column headers.

### Repository Detail (`/[owner]/[name]`):
- Compact header with live status, verified maintainer badge, star count, and 1-click Watch/Star.
- 2-Column Split Workbench:
  - Left (65%): Core diagnostics table, PR acceptance likelihood calculator, submission time heatmap.
  - Right (35%): Live Good First Issues list, README badge embedder, claim/audit CTA.

---

## 5. Pre-Delivery Checklist
- [x] Zero white-on-white or faint zinc text (WCAG AAA for primary text, AA for secondary).
- [x] High-density tabular layout replaces puffy 3-column AI card grids.
- [x] Strict SSR-first data hydration (`page.tsx` fetches server-side, zero client CLS).
- [x] Zero mock data or placeholder UI (all controls backed by real APIs).
- [x] Full responsive behavior down to 375px mobile screens.
