# OpenDoor Design System v2

## Philosophy: *Precision Gauge*

OpenDoor measures repo health with scientific rigor. The design reflects this: clean, data-forward, minimal ornamentation, and *calibrated* for discovery. We're not brutalist—we're **diagnostic**. Like a lab instrument, every visual element communicates a metric or state.

---

## Color Palette

### Primary Spectrum (C-Rank Grades)
Grade-to-color is semantic. Users learn it instantly.

| Grade | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **S** | `#10b981` | `16, 185, 129` | Elite repos (top 5%). Emerald. |
| **A** | `#3b82f6` | `59, 130, 246` | High performers. Cobalt. |
| **B** | `#8b5cf6` | `139, 92, 246` | Solid options. Violet. |
| **C** | `#f59e0b` | `245, 158, 11` | Acceptable. Amber. |
| **D** | `#ef4444` | `239, 68, 68` | Risky repos. Red. |

### Neutral Foundation
- **Slate-950**: `#0f172a` — Deep background (chart ink)
- **Slate-900**: `#111827` — Card/section backgrounds
- **Slate-200**: `#e2e8f0` — Border dividers
- **Slate-400**: `#94a3b8` — Tertiary text
- **White**: `#ffffff` — Primary text, high contrast

### Accent: Signal Orange
- **Orange-500**: `#f97316` — Interactive focus, CTAs (links, buttons)
- Minimal use. Precision instruments have one warning color.

---

## Typography

### Font Family
- **Headings & Labels**: `Inter` (system fallback: `-apple-system, BlinkMacSystemFont`)
  - Weight: 600 (bold) for hierarchy
  - Kerning: tight, letter-spacing: -0.01em on large display type
  
- **Body & UI**: `Inter`
  - Weight: 400 (regular)
  - Line-height: 1.5 for readability
  - Size: 14px (text), 12px (labels), 16px (paragraph)

### Scale (Rem-based, 16px root)
| Usage | Size | Weight | Line-height |
|-------|------|--------|-------------|
| H1 (Page Title) | 2.5rem (40px) | 600 | 1.2 |
| H2 (Section) | 1.875rem (30px) | 600 | 1.3 |
| H3 (Card Title) | 1.25rem (20px) | 600 | 1.4 |
| Body | 0.875rem (14px) | 400 | 1.6 |
| Label / Badge | 0.75rem (12px) | 500 | 1.5 |
| Mono (Data) | 0.8125rem (13px) | 500 | 1.4 |

### Letter Spacing
- Display (H1): -0.02em (tight, modern precision)
- Headings (H2, H3): -0.01em
- Body: 0 (neutral)
- Labels: +0.02em (breathing room for badges/tags)

---

## Component Patterns

### The Gauge Card (Repo Item)
OpenDoor's hero. A repo card should feel like a **digital gauge reading**.

```
┌─ RepoCard ─────────────────────────────────────────────┐
│                                                         │
│  📦 Repository Name              [C-Rank: S] ← Emerald │
│  owner/repo-name                                        │
│                                                         │
│  ┌─ Metrics Row ──────────────────────────────────────┐│
│  │ Merge Rate    Response Time   Issue Velocity       ││
│  │    87%            2.3d              1.1d            ││
│  │  ⬤⬀⬀⬀⬀      ⬀⬀⬮⬮⬮      ⬀⬀⬀⬮⬮        ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ★★★★★ 5/5 (42 PRs analyzed)  🔗 Details  ↗          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Anatomy:**
- **Header**: Repo name, right-aligned C-Rank badge (grade color, 14px label)
- **Subheader**: Owner/repo (slate-400, 12px mono)
- **Metrics Row**: 3 key metrics, each with a micro progress bar (5 dots) + percentage. Spacing: 2rem between metrics.
- **Footer**: Star rating (out of 5), sample size, call-to-action link (orange)

**Borders:**
- Top: 2px solid slate-200 (diagnostic line)
- All sides: 1px solid slate-200
- Radius: 6px (minimal rounding; precision)

**Spacing:**
- Padding: 1.25rem (20px) inside card
- Gap between metrics: 2rem
- Card-to-card: 1.5rem

### The C-Rank Badge
Semantic color, always tied to grade. Appears in:
- Repo cards (top-right, 14px label)
- Filter pills
- Chart legends

```css
.c-rank-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.05em;
  background-color: var(--grade-color);
  color: white;
  text-transform: uppercase;
}
```

### Micro Progress Bars (5-Dot Gauge)
Each metric (merge rate, response time, etc.) shows a 5-dot scale:
- Filled dots: `◉` (grade color)
- Empty dots: `○` (slate-200)

E.g., 87% merge rate = 4.35 dots ≈ `⬀⬀⬀⬀◐` (4 full, 1 half-filled).

```css
.gauge-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 2px;
  border-radius: 50%;
  background-color: var(--grade-color);
}
```

---

## Layout & Spacing

### Grid System
- **Container**: 1200px max-width, centered
- **Margin**: 2rem on desktop, 1rem on mobile
- **Column Gap**: 2rem (repo cards in grid, 3 cols on desktop, 2 on tablet, 1 on mobile)

### Spacing Scale (Tailwind convention)
| Token | Pixels | Usage |
|-------|--------|-------|
| xs | 4px | borders, micro gaps |
| sm | 8px | label gaps, small padding |
| md | 12px | component internal padding |
| lg | 16px | section padding |
| xl | 20px | card padding |
| 2xl | 28px | section margin |
| 3xl | 32px | page margin |

### Depth (Shadows)
Only for interactive hover states, minimal:
- **Hover**: `0 4px 12px rgba(0, 0, 0, 0.1)` (subtle lift)
- No drop shadows at rest (flat design, diagnostic).

---

## Interactive States

### Buttons & Links
- **Default**: Orange-500 text, no background
- **Hover**: Orange-500 + underline, opacity 80%
- **Active**: Orange-600 (darker)
- **Disabled**: Slate-400, cursor not-allowed

### Repo Card Hover
- Border color: slate-400 (brighten)
- Slight scale: `transform: scale(1.01)` (1% zoom)
- Transition: 120ms ease-out

### Filter Chips
- **Unselected**: Slate-200 border, slate-900 background, slate-400 text
- **Selected**: Grade-color background, white text, grade-color border
- **Hover (unselected)**: Slate-300 border

---

## Data Visualization (Charts)

### Histogram / Bar Chart
- **Bars**: Grade-colored (emerald for S, cobalt for A, etc.)
- **Grid lines**: Minimal, slate-200 at 0.25 opacity
- **Axis labels**: 12px, slate-400
- **Font**: Mono for tick values (data precision)

### Distribution Pie
- **Segments**: Grade colors in order S → A → B → C → D
- **Labels**: Badge-style (12px, bold)
- **Legend**: Below chart, horizontal, badge format

### Timeseries (Merge Trend)
- **Line**: Grade-color, 2px stroke
- **Fill**: Grade-color, 0.1 opacity
- **Dots**: 4px radius, grade-color (clickable for tooltip)
- **Grid**: Vertical only (time axis), slate-200 at 0.1 opacity

---

## Accessibility (a11y)

### Contrast Ratios
- All text on background: ≥ 4.5:1 (WCAG AA)
- Icons on grade colors: white text always (7:1+)

### Focus States
- Focus ring: 2px solid orange-500, offset 2px
- Never remove outline (`:outline-none` forbidden)
- Tab order: semantic HTML order, no tabindex hacks

### Color Alone Doesn't Mean Anything
- C-Rank grades must include **text labels** (S/A/B/C/D), never color-only
- Metric progress: use both dots + percentage
- Error/success: icon + text, never red/green alone

### Motion
- Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## Dark Mode (Default)

OpenDoor ships **dark mode only**. The slate palette is calibrated for low-light (reduced eye strain for contributors scanning at night). No light mode toggle.

---

## Responsive Design

### Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| mobile | < 768px | 1-column card grid, full-width buttons |
| tablet | 768px–1024px | 2-column grid, condensed sections |
| desktop | ≥ 1024px | 3-column grid, full layout |

### Mobile-First Adjustments
- Card padding: 1rem (down from 1.25rem)
- Font sizes: -2px (body: 12px, labels: 10px)
- Metric icons: 6px dots (down from 8px)
- Section margin: 1.5rem (down from 2rem)

---

## Imagery & Icons

### Icon Library
- **Lucide Icons** (24px default, 16px for labels)
- Stroke: 1.5px (thin, diagnostic precision)
- Color: Inherit from context (grade colors, orange for CTAs, slate-400 for disabled)

### Background Patterns
**Spacetime Continuum Particle Grid** (existing, keep it):
- Canvas-based, semi-transparent (0.05 opacity), slow animation
- Use as subtle *texture* under page content (not distraction)
- Color: slate-400
- Particle size: 2-4px, drift speed: 40px/s

### Illustrations
- Minimal line-art style
- Palette: grade colors + slate-400
- Never photorealistic (diagnostic aesthetic)
- Use only for empty states, onboarding

---

## Component Library

### Exports (Tailwind + HSL tokens)
Define in CSS variables (`:root`):
```css
:root {
  --color-grade-s: 16 185 129;      /* emerald-500 */
  --color-grade-a: 59 130 246;      /* blue-500 */
  --color-grade-b: 139 92 246;      /* violet-500 */
  --color-grade-c: 245 158 11;      /* amber-500 */
  --color-grade-d: 239 68 68;       /* red-500 */
  --color-primary: 249 115 22;      /* orange-500 */
  --color-neutral-50: 248 250 252;  /* slate-50 */
  --color-neutral-900: 15 23 42;    /* slate-900 */
  --color-neutral-950: 2 6 23;      /* slate-950 deep */
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.25rem;
  --spacing-2xl: 1.75rem;
  
  --font-family-sans: Inter, system-ui, sans-serif;
  --font-family-mono: Menlo, Monaco, monospace;
  
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

### Key Components
1. **RepoCard** — Gauge card (see above)
2. **CRankBadge** — Semantic grade label
3. **MetricGauge** — 5-dot progress + % (reusable)
4. **FilterPill** — Chip for language/star filters
5. **PrimaryButton** — Orange CTA
6. **SecondaryLink** — Text link
7. **Tooltip** — Grade/metric help text
8. **EmptyState** — Illustration + text for zero results

---

## Dos & Don'ts

### ✅ Do
- Use grade colors semantically (S = good, D = risky). Users will learn it.
- Emphasize metrics: every component should tell a data story.
- Keep whitespace generous (1.5rem+ between sections).
- Use mono fonts for raw data (merge counts, dates).
- Ensure keyboard navigation works (tab order, focus rings).

### ❌ Don't
- Mix multiple design systems (no Material Design, no Tailwind UI components wholesale).
- Add drop shadows or gradients (diagnostic simplicity).
- Use red/green for state alone (colorblind users).
- Oversaturate with animation (respect `prefers-reduced-motion`).
- Hardcode hex values (use CSS variables for theming).
- Skip `title` attributes on links (a11y requirement per AGENTS.md).

---

## Animation Guide

### Transitions
- **All**: `transition: all 120ms ease-out`
- **Focus**: `transition: box-shadow 120ms ease-out`

### Keyframes
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUpFadeIn {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Particle drift (for Spacetime Canvas) */
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(var(--tx), var(--ty)); }
}
```

### When to Use
- Page load: `fadeIn` (200ms)
- Card appearance: `slideUpFadeIn` (120ms, staggered 40ms between cards)
- Hover/focus: transitions on `transform`, `color`, `border-color` (120ms)
- Particle grid: `drift` (slow, 40s duration)

---

## Design Tokens (Figma / Storybook Export)

Export this as JSON for Figma sync:
```json
{
  "color": {
    "grade": {
      "s": { "hex": "#10b981", "hsl": "161, 84%, 58%" },
      "a": { "hex": "#3b82f6", "hsl": "217, 99%, 60%" },
      "b": { "hex": "#8b5cf6", "hsl": "260, 96%, 67%" },
      "c": { "hex": "#f59e0b", "hsl": "38, 92%, 50%" },
      "d": { "hex": "#ef4444", "hsl": "0, 84%, 60%" }
    },
    "primary": { "hex": "#f97316" },
    "neutral": {
      "50": "#f8fafb",
      "200": "#e2e8f0",
      "400": "#94a3b8",
      "900": "#111827",
      "950": "#0f172a"
    }
  },
  "typography": {
    "family": { "sans": "Inter", "mono": "Menlo" },
    "scale": {
      "h1": { "size": "40px", "weight": 600, "lineHeight": 1.2 },
      "body": { "size": "14px", "weight": 400, "lineHeight": 1.6 }
    }
  }
}
```

---

## Migration Notes (from neo-brutalism)

The new system ditches stark borders-only for **data-centric design**:
- Remove forced bottom-borders; use card containers instead
- Replace high-contrast black/white with slate palette (reduces eye strain)
- Add semantic color to grades (users learn S=green, D=red instantly)
- Emphasize metrics (5-dot gauges, percentages, charts)
- Keep typography clean and minimal (no serif fonts, no fancy weights)

**Result**: A design that feels like a **lab instrument**, not an avant-garde gallery. Opinionated, precise, and optimized for discovery.

---

## References & Inspiration

- **Apple Design System** (precision, spacing, dark mode default)
- **Data-driven UI** (Observable, Observability dashboards)
- **Automotive Gauges** (C-Rank badge visual hierarchy)
- **Tailwind CSS** (token-based, systematic scaling)
- **Web Accessibility Guidelines (WCAG 2.1 AA+)**