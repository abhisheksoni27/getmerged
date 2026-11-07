# GetMerged Design Overhaul — Master Execution Plan (Warm Editorial & Anti-Cramming)

> **Document Version:** 2.1.0 (Authoritative Implementation Contract)  
> **Target Audience:** Autonomous AI Coding Agents / Subagents  
> **Core Objective:** Overhaul GetMerged from a dark, cramped, micro-font developer dashboard into an expansive, warm editorial platform that feels welcoming to beginners and authoritative to senior engineers.  
> **Design Lineage & Pedigree (Silicon Valley & FreeHire):**
> 1. **FreeHire (`/home/deploy/src/freehire`):** Directly incorporates FreeHire's production design tokens and the **Granola palette** (`oklch(0.997 0.003 130)` linen canvas, `#5B6F00` olive / `#D4590F` terracotta brand accents, `#E5EACD` soft badge fills, `oklch(0.92 0 0)` warm hairline borders).
> 2. **"One Screen, One Field" Hero Rule (FreeHire / Google):** Deliberately unclutters the viewport. A single prominent search field at hero size, with verified catalog scale figures directly underneath. Eliminates the anti-pattern of repeating logos, competing widgets, and floating circles that make the app introduce itself three times before saying anything.
> 3. **Silicon Valley Top-Tier SaaS Standards (Linear, Granola, Stripe, Raycast):**
>    - **Breathing Room:** Cards upgraded from cramped `p-3.5` to generous `p-6` / `p-7` (24px–28px). Section margins upgraded to `py-20` / `py-24` (80px–96px).
>    - **Confident Typography:** Headlines calibrated to `text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance` (avoiding oversized, screaming 60px bold slop). Minimum readable body font `text-sm` (14px) and `text-base` (16px).
>    - **Zero AI / Web3 Slop:** 100% elimination of dated glass-morphism (`backdrop-blur-*`), neon ambient glow orbs, specular card bevels, and text shimmer animations. Separation is achieved through spacing, soft shadows (`0 1px 3px rgba(0,0,0,0.03)`), and warm hairline borders.

---

## Non-Negotiable Engineering Rules (Read Before Executing)

1. **🚨 SSR-First Rule (ZERO Exceptions):**
   - **DO NOT** convert any server-side fetching in `page.tsx` into client-side `useEffect` or client hooks.
   - **DO NOT** delete or alter the `sr-only` crawl floors in `page.tsx` routes (`/[owner]/[name]`, `/repos`, `/rankings/[lang]`, `/compare`, etc.). Crawlers depend on these for SEO.
   - Only modify layout, JSX markup structure, CSS tokens, and Tailwind classes.

2. **🚨 Zero Mock / Zero Broken Features:**
   - Maintain all existing interactivity, links, auth flows, and search hooks (`useSearch`, `SearchContext`).
   - Do not delete props or alter component interfaces unless specified in this plan.

3. **🚨 Atomic Validation Protocol:**
   - After modifying each phase or file group, run `npm run build` in `/home/deploy/src/opendoor/frontend`.
   - Never proceed to the next phase if a build error exists.

---

## Master Color & Design Token Specifications

All design decisions stem from this unified token specification:

```
Token Role                  Value (Hex / OKLCH)       Usage
──────────────────────────────────────────────────────────────────────────────────────────
Page Canvas                 #FAFAF7                   Warm off-white background (body & root)
Surface (Cards, Panels)     #FFFFFF                   Clean white card surfaces
Surface Elevated            #F5F3EE                   Secondary cards, search inputs, pills
Surface Accent Muted        #EFECE6                   Active states, dropdown hovers
Border Subtle               #E8E4DD                   Default 1px card borders & dividers
Border Hover                #D4CFC6                   Hover state card borders
Border Strong               #B8B2A8                   Focused inputs, selected chips
Text Primary                #1A1A18                   Headlines, primary card titles (warm near-black)
Text Secondary              #6B6560                   Subheadings, body paragraphs, descriptions
Text Tertiary / Muted       #9C958E                   Timestamps, helper captions, stats labels
Brand Primary               #D4590F                   Warm terracotta/orange CTA & brand mark
Brand Primary Hover         #B84807                   Darker terracotta for button hover
Grade S (Super Welcoming)   #0D9668 (Emerald)         Text/Badge S-Tier (contrast tested on white)
Grade A (Welcoming)         #2D8ABF (Sky/Steel)       Text/Badge A-Tier
Grade B (Solid)             #8B6BB5 (Purple/Amethyst) Text/Badge B-Tier
Grade C (Moderate)          #C4910A (Warm Amber)      Text/Badge C-Tier
Grade D (Risky)             #C4463A (Warm Crimson)    Text/Badge D-Tier
```

---

## Phase 0: Pre-Flight Verification & Baseline

Execute these commands before touching any file:

- [ ] **0.1** Verify git working tree is clean:
  ```bash
  cd /home/deploy/src/opendoor && git status
  ```
- [ ] **0.2** Run baseline frontend build to ensure clean starting state:
  ```bash
  cd /home/deploy/src/opendoor/frontend && npm run build
  ```
- [ ] **0.3** Create a dedicated feature branch:
  ```bash
  cd /home/deploy/src/opendoor && git checkout -b feat/design-overhaul-warm-editorial
  ```

---

## Phase 1: Foundational Design Tokens & CSS System (`globals.css`)

**File:** `/home/deploy/src/opendoor/frontend/src/app/globals.css` (282 lines)

### 1.1 — Overhaul the `@theme static` Block
Replace lines 3–25 in `globals.css` with:

```css
@theme static {
  --font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  --font-mono: var(--font-dm-mono), "SF Mono", Menlo, Monaco, monospace;
  --font-display: var(--font-space-grotesk), var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-space: var(--font-space-grotesk), var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;

  /* Accessible Grade Colors calibrated for high contrast on light/warm surfaces */
  --color-grade-s: #0d9668;
  --color-grade-a: #2d8abf;
  --color-grade-b: #8b6bb5;
  --color-grade-c: #c4910a;
  --color-grade-d: #c4463a;

  /* Brand Warm Terracotta */
  --color-primary: #d4590f;

  /* Warm Neutral Palette */
  --color-neutral-50: #FAFAF7;
  --color-neutral-100: #F5F3EE;
  --color-neutral-200: #E8E4DD;
  --color-neutral-300: #D4CFC6;
  --color-neutral-400: #9C958E;
  --color-neutral-500: #6B6560;
  --color-neutral-600: #4A4540;
  --color-neutral-700: #33302C;
  --color-neutral-800: #252320;
  --color-neutral-900: #1A1A18;
  --color-neutral-950: #0F0F0D;
}
```

### 1.2 — Replace `:root` CSS Custom Variables
Replace the existing `:root` variable declarations with:

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Warm Canvas & Surface System */
  --bg-canvas: #FAFAF7;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F5F3EE;
  --bg-accent-muted: #EFECE6;

  /* Warm Border Hierarchy */
  --border-subtle: #E8E4DD;
  --border-hover: #D4CFC6;
  --border-strong: #B8B2A8;

  /* Warm Typography Hierarchy */
  --text-primary: #1A1A18;
  --text-secondary: #6B6560;
  --text-tertiary: #9C958E;

  /* Semantic Feedback */
  --accent-success: #0D9668;
  --accent-info: #2D8ABF;
  --accent-warning: #C4910A;
  --accent-danger: #C4463A;
}
```

### 1.3 — Baseline Typography & Anti-Cramming HTML/Body Scales
Replace the `html` and `body` rules in `globals.css`:

```css
html {
  font-size: 16px;
  background-color: var(--bg-canvas);
  color-scheme: light;
  scroll-behavior: smooth;
}

@media (min-width: 640px) {
  html {
    font-size: 16.5px;
  }
}

@media (min-width: 1024px) {
  html {
    font-size: 17px;
  }
}

body {
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  line-height: 1.6;
  letter-spacing: -0.011em;
}

/* Confident Editorial Display Hierarchy */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  color: var(--text-primary);
  text-wrap: balance;
}

h1 { letter-spacing: -0.025em; line-height: 1.15; font-weight: 700; }
h2 { letter-spacing: -0.02em; line-height: 1.2; font-weight: 700; }
h3 { letter-spacing: -0.015em; line-height: 1.25; font-weight: 600; }
p, li { text-wrap: pretty; }
```

### 1.4 — Replace Surface & Card Utility Classes
Replace the outdated dark glass classes in `globals.css`:

```css
/* Clean Editorial Surface System */
.surface-base {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.surface-elevated {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.surface-glass,
.glass-panel,
.glass-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.02);
  transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 12px 28px rgba(0, 0, 0, 0.04);
}
```

### 1.5 — Clean Out Obsolete Dark Slop Animations
Delete entirely from `globals.css`:
- `.glow-ambient-emerald`, `.glow-ambient-orange`, `.glow-ambient-violet`
- `.text-shimmer` and `@keyframes textShimmer`
- `.card-specular-bevel`
- `.bg-dot-grid`
- `.mask-radial-faded`
- Mobile glass override `@media (max-width: 767px)`

Update selection and focus styles:
```css
::selection {
  background: rgba(212, 89, 15, 0.15);
  color: var(--text-primary);
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Phase 2: Root Layout Shell (`layout.tsx`)

**File:** `/home/deploy/src/opendoor/frontend/src/app/layout.tsx` (117 lines)

- [ ] **2.1** Remove the `dark` class from the `<html>` tag:
  - **Before:** `className={`${inter.variable} ${dmMono.variable} ${spaceGrotesk.variable} h-full antialiased dark`}`
  - **After:** `className={`${inter.variable} ${dmMono.variable} ${spaceGrotesk.variable} h-full antialiased`}`
- [ ] **2.2** Update body container classes:
  - **Before:** `className="min-h-full flex flex-col bg-[#0a0a0a] text-[#fafafa] selection:bg-[#ff6b00]/30 selection:text-white relative"`
  - **After:** `className="min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] relative"`
- [ ] **2.3** Remove dark background effect elements from body:
  - Delete the `<div className="fixed inset-0 -z-20 bg-dot-grid opacity-30 mask-radial-faded" ... />`
  - Delete `<ClientPhysicsCanvas />` and its dynamic import at the top of the file.
  - Delete the two ambient glow orb divs (the `fixed w-[900px]` emerald blur and `fixed w-[500px]` violet blur).
- [ ] **2.4** Run `npm run build` in `/home/deploy/src/opendoor/frontend` to verify layout compiles.

---

## Phase 3: Global Header & Navigation (`Header.tsx`, `Logo.tsx`)

**Files:**
- `/home/deploy/src/opendoor/frontend/src/components/Header.tsx` (294 lines)
- `/home/deploy/src/opendoor/frontend/src/components/Logo.tsx`

### Header.tsx Execution Steps:
- [ ] **3.1** Update Sticky Shell:
  - Change `bg-[#0a0a0a]/80 backdrop-blur-xl border-white/[0.08]` to `bg-[var(--bg-canvas)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)]`.
- [ ] **3.2** Increase navigation height from `h-16` to `h-18` (or `py-3.5`) for vertical breathing room.
- [ ] **3.3** Update Logo & Brand:
  - In `Logo.tsx` or Header logo SVG: ensure the SVG container has `fill="var(--text-primary)"` or warm brand colors.
  - Logo title text: `text-[var(--text-primary)]`, "Merged" badge: `text-[#0D9668]`.
- [ ] **3.4** Update Nav Links:
  - Change `text-xs font-medium text-[#a3a3a3]` to `text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]`.
  - Stalk Stack active dot: `bg-[#0D9668]`.
- [ ] **3.5** Header Search Trigger Button:
  - Replace `bg-[#141414] border-white/[0.08]` with `bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] shadow-sm`.
  - Icon & placeholder text: `text-[var(--text-tertiary)] text-xs font-medium`.
  - Kbd tag: `border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[11px] font-mono`.
- [ ] **3.6** Sign-In Button (High Contrast Solid CTA):
  - Replace `bg-[#1c1c1c] text-white border-white/[0.08]` with `bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:bg-[var(--color-neutral-800)] px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors`.
- [ ] **3.7** Mobile Drawer:
  - Replace `bg-[#0d0d0e]/95 backdrop-blur-2xl` with `bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] shadow-xl`.
  - Mobile link styling: `text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]`.

---

## Phase 4: Hero Section & Search Overhaul (`HeroSection.tsx`)

**File:** `/home/deploy/src/opendoor/frontend/src/app/home-sections/HeroSection.tsx` (210 lines)

### Current Problem:
Hero is crammed: small 14px font, dark blurred background, 4 stacked micro-boxes, cramped search bar.

### Execution Steps:
- [ ] **4.1** Expand Section Envelope:
  - Change `max-w-6xl px-4 pt-20 pb-12` to `max-w-5xl px-6 pt-24 pb-20 text-center`.
  - Delete the ambient glow blur div (`-top-10 h-[380px] w-[600px] opacity-60 blur-3xl`).
- [ ] **4.2** Overhaul Live Status Pill:
  - Replace neon emerald glow with calm badge:
    `inline-flex items-center gap-2 rounded-full border border-[#0D9668]/20 bg-[#0D9668]/10 px-4 py-1.5 text-xs font-mono font-semibold text-[#0D9668] mb-8`.
  - Active pulse dot: `h-2 w-2 rounded-full bg-[#0D9668]`.
- [ ] **4.3** Confident Display Headline:
  - Replace `text-4xl sm:text-6xl text-white font-sans leading-[1.1]` with:
    `text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-[var(--text-primary)] leading-[1.12]`.
  - Replace `.text-shimmer` on highlight word with:
    `text-[var(--color-primary)] font-extrabold`.
- [ ] **4.4** Subtitle (Legible & Airy):
  - Replace `mt-5 max-w-xl text-base text-[#a3a3a3]` with:
    `mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed font-sans font-normal`.
- [ ] **4.5** Primary Search Bar Centerpiece:
  - Make the search container an elegant, prominent card:
    ```tsx
    <div className="relative flex items-center w-full max-w-2xl mx-auto mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[var(--border-hover)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all">
      <Search className="h-5 w-5 text-[var(--text-tertiary)] mr-3 shrink-0" />
      <input
        type="text"
        placeholder="Search 102,000+ repos by name, language, or ecosystem..."
        className="w-full bg-transparent text-base text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
      />
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-mono font-medium text-[var(--text-tertiary)]">
        ⌘K
      </kbd>
    </div>
    ```
- [ ] **4.6** Quick Explore Chips:
  - Replace chips with clean warm pills:
    `rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-1 text-xs font-mono font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all`.
- [ ] **4.7** Macro Telemetry Metrics Strip:
  - Replace the 4-box dark blur container with an expansive white panel:
    ```tsx
    <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto rounded-2xl bg-[var(--bg-surface)] p-6 sm:p-8 border border-[var(--border-subtle)] shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      {/* Each Metric Item: */}
      <div className="flex flex-col items-center">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
          {statValue}
        </span>
        <span className="text-xs font-mono font-medium text-[var(--text-tertiary)] mt-1.5 uppercase tracking-wider">
          {statLabel}
        </span>
      </div>
    </div>
    ```
- [ ] **4.8** In `HomeClient.tsx`:
  - Locate `<FloatingRepoCircles />` and disable/remove its render to eliminate floating dark circles over the clean canvas.

---

## Phase 5: Homepage Sections Un-cramming

All sections live in `/home/deploy/src/opendoor/frontend/src/app/home-sections/`.

### 5.1 — Update Section Shell Defaults (`HomeSection.tsx`)
- In `HomeSection.tsx`:
  - Update `Panel`:
    ```tsx
    export function Panel({ children, className = "", tone = "solid" }: PanelProps) {
      const border = tone === "dashed" ? "border-dashed border-[var(--border-strong)]" : "border-[var(--border-subtle)]";
      return <div className={`rounded-2xl border ${border} bg-[var(--bg-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${className}`}>{children}</div>;
    }
    ```
  - Update `Eyebrow`:
    `text-xs font-mono font-bold text-[var(--color-primary)] uppercase tracking-wider mb-2`

### 5.2 — PillarGrid (`PillarGrid.tsx`)
- Un-cram cards from `p-5` to `p-7 rounded-2xl`:
  - Card background: `bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:shadow-md`.
  - Icon wrapper: `p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--color-primary)]`.
  - Pillar title: `text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)]`.
  - Pillar description: `text-sm text-[var(--text-secondary)] mt-2 leading-relaxed`.
  - Link text: `text-xs font-mono font-semibold text-[var(--color-primary)]`.

### 5.3 — SpotlightSection & RepoShowroom (`SpotlightSection.tsx`, `RepoShowroom.tsx`)
- Replace dark skeletons:
  - Replace `bg-[#141414]` with `bg-[var(--bg-surface)] border-[var(--border-subtle)]`.
  - Replace skeleton pulse lines `bg-[#1c1c1c]` with `bg-[var(--bg-elevated)]`.
- Section headings:
  - Subhead: `text-base text-[var(--text-secondary)] mt-2`.
  - Headings: `text-2xl sm:text-3xl font-bold font-display text-[var(--text-primary)]`.

### 5.4 — ScoreFactors & HowItWorks (`ScoreFactors.tsx`, `HowItWorks.tsx`)
- Factor cards:
  - Replace `bg-[#141414]` with `bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 rounded-2xl`.
  - Factor weights / badges: `font-mono text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg`.
  - Factor description: `text-sm text-[var(--text-secondary)] leading-relaxed`.

### 5.5 — MaintainerCta & FinalCta (`MaintainerCta.tsx`, `FinalCta.tsx`)
- Background:
  - Replace dark neon banner with a warm terracotta or rich warm-card tone:
    `bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-8 sm:p-12 rounded-3xl`.
  - Title: `text-3xl sm:text-4xl font-bold text-[var(--text-primary)] font-display`.
  - Primary button: `bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-semibold px-6 py-3 rounded-xl shadow-sm`.
  - Secondary button: `bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] px-6 py-3 rounded-xl`.

---

## Phase 6: Core Component Redesigns

### 6.1 — Master RepoCard Overhaul (`RepoCard.tsx`)
**File:** `/home/deploy/src/opendoor/frontend/src/components/RepoCard.tsx` (320 lines)

This is the most frequently rendered component across the entire product. It must look immaculate on light mode.

- [ ] **6.1.1** Card Shell:
  - Replace `bg-[#141414]/70 backdrop-blur-md border-white/[0.08]` with:
    `bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[var(--border-hover)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all`.
  - Spotlight variant:
    `ring-2 ring-[var(--color-primary)]/30 border-[var(--color-primary)]/40 shadow-[0_4px_20px_rgba(212,89,15,0.06)]`.
- [ ] **6.1.2** Avatar & Title Header:
  - Avatar container: `h-12 w-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden shrink-0`.
  - Repo name: `text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] tracking-tight`.
  - Repo full path: `text-xs font-mono text-[var(--text-tertiary)] mt-0.5`.
  - Stars / Language pills: `inline-flex items-center gap-1 font-mono text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg`.
  - Star icon: `h-3.5 w-3.5 text-[#C4910A] fill-[#C4910A]`.
- [ ] **6.1.3** Description:
  - Replace `text-sm text-[#a3a3a3]` with:
    `text-sm text-[var(--text-secondary)] leading-relaxed font-sans mt-3 mb-5 line-clamp-2 min-h-[2.75rem]`.
- [ ] **6.1.4** Topic Chips:
  - Replace `bg-[#1c1c1c] text-[#d4d4d4]` with:
    `inline-block px-2.5 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono text-xs hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]`.
- [ ] **6.1.5** Internal Telemetry Data Block:
  - Replace the black inner box `bg-[#0a0a0a] border-white/[0.04]` with:
    `grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] mb-5`.
  - Metric numbers: `font-mono text-sm sm:text-base font-bold text-[var(--text-primary)]`.
  - Metric labels: `font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5`.
- [ ] **6.1.6** Card Footer:
  - Replace `border-t border-white/[0.08]` with `pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-tertiary)]`.
  - GFI pill: `text-[#0D9668] bg-[#0D9668]/10 border border-[#0D9668]/20 px-2.5 py-1 rounded-lg font-medium`.
  - Trending pill: `text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1 rounded-lg font-medium`.
  - Scorecard action link: `text-[var(--color-primary)] font-bold inline-flex items-center gap-1 hover:underline`.

### 6.2 — CRankBadge Contrast Fix (`CRankBadge.tsx`)
**File:** `/home/deploy/src/opendoor/frontend/src/components/CRankBadge.tsx`

Update `getGradeColor()` return objects so text and badges have sharp contrast on light surfaces:

```typescript
export function getGradeColor(rank?: string) {
  switch (rank?.toUpperCase()) {
    case "S":
      return {
        hex: "#0D9668",
        bgClass: "bg-[#0D9668]/10",
        textClass: "text-[#0D9668]",
        borderClass: "border-[#0D9668]/30",
        dotClass: "bg-[#0D9668]",
        label: "Elite",
        title: "Super Welcoming",
      };
    case "A":
      return {
        hex: "#2D8ABF",
        bgClass: "bg-[#2D8ABF]/10",
        textClass: "text-[#2D8ABF]",
        borderClass: "border-[#2D8ABF]/30",
        dotClass: "bg-[#2D8ABF]",
        label: "Welcoming",
        title: "Very Welcoming",
      };
    case "B":
      return {
        hex: "#8B6BB5",
        bgClass: "bg-[#8B6BB5]/10",
        textClass: "text-[#8B6BB5]",
        borderClass: "border-[#8B6BB5]/30",
        dotClass: "bg-[#8B6BB5]",
        label: "Solid",
        title: "Welcoming",
      };
    case "C":
      return {
        hex: "#C4910A",
        bgClass: "bg-[#C4910A]/10",
        textClass: "text-[#C4910A]",
        borderClass: "border-[#C4910A]/30",
        dotClass: "bg-[#C4910A]",
        label: "Moderate",
        title: "Slow Review",
      };
    case "D":
    default:
      return {
        hex: "#C4463A",
        bgClass: "bg-[#C4463A]/10",
        textClass: "text-[#C4463A]",
        borderClass: "border-[#C4463A]/30",
        dotClass: "bg-[#C4463A]",
        label: "Risky",
        title: "High PR Stall Rate",
      };
  }
}
```

### 6.3 — MetricGauge (`MetricGauge.tsx`)
- Container: Replace `bg-black/50 border-white/[0.08]` with `bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-4 rounded-2xl`.
- Number: `text-xl font-bold font-space text-[var(--text-primary)]`.
- Empty meter bars: Replace `bg-zinc-800/90` with `bg-[var(--border-subtle)]`.
- Label: Replace `text-zinc-300` with `text-xs font-mono font-medium text-[var(--text-secondary)]`.

### 6.4 — GlobalSearch Modal (`GlobalSearch.tsx`)
- Backdrop: `bg-neutral-900/40 backdrop-blur-sm`.
- Dialog content shell: `bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden max-w-2xl`.
- Search input: `text-base text-[var(--text-primary)] placeholder-[var(--text-tertiary)] bg-transparent border-b border-[var(--border-subtle)] py-4 px-5`.
- Result items:
  - Inactive: `hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]`.
  - Active/selected: `bg-[var(--bg-elevated)] text-[var(--text-primary)] border-l-2 border-[var(--color-primary)]`.

---

## Phase 7: Public Route Pages Overhaul

### 7.1 — Repo Scorecard (`/[owner]/[name]/page.tsx`, `RepoDetailHero.tsx`, `ClientRepoDetail.tsx`)
- [ ] **7.1.1** Page Shell (`page.tsx`):
  - Change root wrapper: `min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]`.
- [ ] **7.1.2** RepoDetailHero (`RepoDetailHero.tsx`):
  - Replace `glass-panel` with:
    `rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-10`.
  - Repo title: `text-2xl sm:text-3xl font-bold font-display text-[var(--text-primary)] tracking-tight`.
  - Repo description: `text-base text-[var(--text-secondary)] mt-3 max-w-3xl leading-relaxed`.
  - Action buttons:
    - Primary CTA: `bg-[var(--text-primary)] hover:bg-[var(--color-neutral-800)] text-[var(--bg-canvas)] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm`.
    - Secondary buttons: `bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] px-4 py-2.5 rounded-xl text-xs font-semibold`.
- [ ] **7.1.3** Widget Sections (`components/repo-detail/*`, `RepoScorecards.tsx`, `PRSizeSweetSpotCard.tsx`):
  - In `WidgetSection.tsx`: ensure widget shells render with `bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 rounded-2xl shadow-sm`.
  - Section titles: `text-xl font-bold font-display text-[var(--text-primary)] mb-4`.
  - Graph/chart containers: ensure chart axes use `var(--text-tertiary)` and gridlines use `var(--border-subtle)`.

### 7.2 — Repos Directory (`/repos/page.tsx`, `ReposClient.tsx`, `FilterBar.tsx`)
- [ ] **7.2.1** FilterBar (`FilterBar.tsx`):
  - Replace `glass-panel rounded-3xl p-5 sm:p-6 shadow-xl` with:
    `rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-10`.
  - Search input inside filter: `bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)]`.
  - Language buttons & Tier pills: `border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-xs font-medium`.
  - Active filter pill: `bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-semibold`.
- [ ] **7.2.2** PaginationBar (`PaginationBar.tsx`):
  - Buttons: `border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] rounded-xl px-4 py-2 text-xs font-mono font-semibold`.
  - Current page indicator: `text-[var(--text-primary)] font-bold font-mono text-sm`.

### 7.3 — Good First Issue Feed (`/good-first-issue/page.tsx`, `/good-first-issue/[lang]/page.tsx`, `GfiSniperCard.tsx`)
- [ ] **7.3.1** Page Header:
  - Headline: `text-3xl sm:text-4xl font-bold font-display text-[var(--text-primary)]`.
  - Subtitle: `text-base text-[var(--text-secondary)] mt-2 max-w-2xl`.
- [ ] **7.3.2** Issue Cards (`GfiSniperCard.tsx`):
  - Card shell: `bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] p-6 rounded-2xl shadow-sm`.
  - Issue title: `text-base sm:text-lg font-bold text-[var(--text-primary)] hover:text-[var(--color-primary)]`.
  - Issue body excerpt: `text-sm text-[var(--text-secondary)] mt-2`.
  - Claim button: `bg-[#0D9668] hover:bg-[#0B7A54] text-white px-4 py-2 rounded-xl text-xs font-semibold`.

### 7.4 — Compare Showdowns (`/compare/page.tsx`, `VsShowdownCard.tsx`)
- [ ] **7.4.1** VsShowdownCard:
  - Card shell: `bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 rounded-2xl shadow-sm`.
  - Repo A / Repo B comparison columns: separated by clean border `border-[var(--border-subtle)]`.
  - Comparison gauges: `bg-[var(--bg-elevated)] p-4 rounded-xl`.

### 7.5 — Ecosystem Rankings (`/rankings/page.tsx`, `/rankings/[lang]/page.tsx`)
- [ ] **7.5.1** Language Leaderboard Table & Cards:
  - Table wrapper: `border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-sm`.
  - Table headers: `bg-[var(--bg-elevated)] text-[var(--text-tertiary)] font-mono text-xs uppercase px-4 py-3`.
  - Table rows: `border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/60 text-sm text-[var(--text-primary)]`.

### 7.6 — Guides & Content (`/guides/page.tsx`, `/guides/[slug]/page.tsx`)
- [ ] **7.6.1** Prose typography:
  - Article wrapper: `max-w-3xl mx-auto py-12 px-6`.
  - Ensure `@tailwindcss/typography` uses `prose-neutral` with warm text:
    `prose prose-neutral max-w-none text-[var(--text-primary)] prose-headings:font-display prose-headings:text-[var(--text-primary)] prose-a:text-[var(--color-primary)] prose-code:font-mono prose-code:bg-[var(--bg-elevated)]`.

---

## Phase 8: Global Footer (`Footer.tsx`)

**File:** `/home/deploy/src/opendoor/frontend/src/components/Footer.tsx` (220 lines)

- [ ] **8.1** Footer Shell:
  - Change `border-t border-white/[0.08] bg-transparent text-[#e5e5e5]` to:
    `border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] pt-20 pb-16 mt-auto`.
- [ ] **8.2** Column Headers:
  - Replace `text-white font-mono uppercase` with:
    `text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4`.
- [ ] **8.3** Footer Links:
  - Replace `text-[11px] font-mono text-[#e5e5e5]` with:
    `text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors`.
- [ ] **8.4** Bottom Bar & Copyright:
  - Border: `border-t border-[var(--border-subtle)] pt-8 mt-12`.
  - Copyright & telemetry disclaimer text: `text-xs font-mono text-[var(--text-tertiary)]`.

---

## Phase 9: AI Agent Component-by-Component Anti-Cramming Rulebook

When an AI agent modifies ANY `.tsx` component file in GetMerged, it must adhere strictly to these translation rules:

```
OLD PATTERN (Dark / Crammed)           NEW PATTERN (Warm Editorial)
──────────────────────────────────────────────────────────────────────────────────────────
bg-[#0a0a0a], bg-black                bg-[var(--bg-canvas)] (Canvas #FAFAF7)
bg-[#141414], bg-[#1a1a1a]            bg-[var(--bg-surface)] (White #FFFFFF)
bg-[#1c1c1c], bg-[#262626]            bg-[var(--bg-elevated)] (Parchment #F5F3EE)
border-white/[0.08], border-white/[0.1] border-[var(--border-subtle)] (#E8E4DD)
border-white/[0.16], border-white/[0.2] border-[var(--border-hover)] (#D4CFC6)
text-white                             text-[var(--text-primary)] (#1A1A18)
text-[#fafafa], text-zinc-100          text-[var(--text-primary)] (#1A1A18)
text-[#a3a3a3], text-zinc-400          text-[var(--text-secondary)] (#6B6560)
text-[#737373], text-zinc-500          text-[var(--text-tertiary)] (#9C958E)
text-[#ff6b00], text-[#ff8a33]         text-[var(--color-primary)] (#D4590F)
bg-[#ff6b00]                           bg-[var(--color-primary)] (#D4590F)
text-[10px], text-[11px]               text-xs (12px) minimum font size!
text-xs on descriptions/body           text-sm or text-base for readable prose!
p-3.5, p-4 on primary cards            p-6 or p-7 (24px - 28px) generous padding!
gap-1.5, gap-2 between card elements   gap-3.5 or gap-4 spacing!
backdrop-blur-*, bg-white/[0.04]       DELETE (use solid clean warm surfaces)
shadow-[0_0_20px_*] (neon glow)        DELETE (use clean drop shadows: shadow-sm, shadow-md)
```

---

## Phase 10: AI Subagent Execution Protocol

When invoking subagents to execute this plan, prompt them with this exact operational protocol:

### Step 1: Assign Scope
Assign one phase per subagent invocation (e.g. Subagent 1: Phases 1 & 2; Subagent 2: Phases 3 & 4; Subagent 3: Phases 5 & 6; Subagent 4: Phase 7).

### Step 2: Red-Green-Build Verification Loop
Before declaring a phase complete, the subagent MUST run:
```bash
cd /home/deploy/src/opendoor/frontend && npm run build
```
If any TypeScript or PostCSS error is reported:
1. Locate the exact file and line in the build trace.
2. Fix the syntax or missing closing tag immediately.
3. Re-run `npm run build` until exit code is 0.

### Step 3: Git Commit per Phase
After each phase builds cleanly:
```bash
cd /home/deploy/src/opendoor && git add frontend/ && git commit -m "feat(design): complete phase X of warm editorial overhaul"
```

---

## Phase 11: Final Quality Assurance & Zero-Regression Checklist

- [ ] **11.1 Build Health:** `cd /home/deploy/src/opendoor/frontend && npm run build` completes with exit code 0.
- [ ] **11.2 SSR Validation:**
  ```bash
  curl -s http://localhost:3000 | grep -i "C-Rank" | head -n 5
  curl -s http://localhost:3000/facebook/react | grep -i "Maintainer Response" | head -n 5
  ```
  Ensure server returns full HTML with zero CLS (content present in initial curl response).
- [ ] **11.3 Visual Verification (Playwright):**
  - Run Playwright snapshot on `/` (Homepage).
  - Run Playwright snapshot on `/facebook/react` (Repo Scorecard).
  - Run Playwright snapshot on `/repos` (Directory).
  - Confirm canvas is warm `#FAFAF7`, cards are `#FFFFFF`, and text contrast passes WCAG AA (4.5:1).
- [ ] **11.4 Mobile Responsiveness:**
  - Verify viewport at 375px width (iPhone SE): no horizontal overflow, touch targets are minimum 44px.
- [ ] **11.5 Cloudflare Cache Invalidation:**
  ```bash
  /home/deploy/src/opendoor/scripts/purge-cloudflare-cache.sh
  ```
- [ ] **11.6 Product Inventory Grounding:**
  - Update `product-inventory.md` noting the completion of the Warm Editorial Design Overhaul.
