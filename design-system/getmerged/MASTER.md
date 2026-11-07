# Design System Master File — GetMerged (Direction A: Industrial Neo-Brutalism)

> **LOGIC:** This is the authoritative Master Design System for GetMerged.
> Direction A: Industrial Developer Terminal / Neo-Brutalist Engineering Ledger.
> Strict anti-slop rules enforced. No generic marketing SaaS templates.

---

**Project:** GetMerged  
**Style Archetype:** Industrial Neo-Brutalism & Developer Terminal  
**Visual Influences:** Retool, Gumroad, Figma Config, Bloomberg Developer Terminal, Teenage Engineering  
**Primary Materials:** High-contrast crisp paper canvas, 2px–3px hard black ink borders, zero blur hard offset shadows, high-saturation signal accents, mechanical monospace typography, tactile physical controls.

---

## 1. Visual Token Engine

| Token | Value | Description |
|---|---|---|
| `--bg-canvas` | `#FFFDF8` | Crisp industrial paper canvas |
| `--bg-surface` | `#FFFFFF` | Solid white card & table surfaces |
| `--bg-elevated` | `#F4F4EE` | Muted background for inputs, table headers, inactive tabs |
| `--border-ink` | `#000000` | Hard black 2px/3px borders everywhere |
| `--text-primary` | `#000000` | Pure black ink for maximum contrast |
| `--text-secondary` | `#1F2937` | High-contrast secondary typography |
| `--text-tertiary` | `#4B5563` | Metadata, timestamps, and column labels |
| `--accent-yellow` | `#FACC15` | Acid star yellow (GitHub stars, spotlights, active tags) |
| `--accent-green` | `#10B981` | Punchy emerald (Tier S, fast merge, active maintainers) |
| `--accent-blue` | `#38BDF8` | Cyan / electric blue (Review turnaround, PR velocity) |
| `--accent-purple`| `#A855F7` | Purple (First-timer friendly, hospitality) |
| `--accent-red` | `#EF4444` | High-stall risk, low sample, warnings |
| `--shadow-brutal-sm` | `2px 2px 0px 0px #000000` | Badges, small pills, chip tags |
| `--shadow-brutal` | `4px 4px 0px 0px #000000` | Standard cards, search bar, rows, buttons |
| `--shadow-brutal-lg`| `6px 6px 0px 0px #000000` | Modals, hero panels, featured spotlight cards |

---

## 2. Geometry & Materiality Rules

1. **Hard Borders (Strict 2px Black)**:
   - Every card, button, table header, and input MUST have `border-2 border-black`.
   - Never use soft gray hairlines (`#E5E7EB`).
2. **Hard Offset Box Shadows (Zero Blur)**:
   - Standard: `shadow-[4px_4px_0px_0px_#000]`.
   - On Hover: `hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5`.
   - On Active / Click: `active:translate-x-1 active:translate-y-1 active:shadow-none`.
3. **Sharp Edges**:
   - `rounded-none` or strict `rounded-sm` (max 2px).
   - Absolute ban on `rounded-xl`, `rounded-2xl`, and `rounded-full` pill shapes.
4. **Zero AI Slop**:
   - No glass-morphism, no `backdrop-blur`, no gradient text fills, no soft colored drop shadows.

---

## 3. Structural Wireframe Overhaul

### Header: Industrial Utility Ribbon
- Hard `border-b-2 border-black bg-[#FFFDF8]` with sticky 56px height.
- Logo: Bold blocky mark with hard black border and acid green fill.
- Real-time status ticker: `[ ● 102,094 REPOS INDEXED ]` in a high-contrast black-bordered pill.
- Command search trigger with hard black 3px shadow.

### Hero: Industrial Terminal Banner
- Asymmetric layout replacing the standard centered SaaS pitch.
- Left / Top: Huge mechanical display title:
  `OPEN-SOURCE TELEMETRY TERMINAL`
  `VERIFIED PR MERGE RATES & REVIEW LATENCY`
- High-saturation physical parameter badges (`[ 82% AVG MERGE ]`, `[ <12H MEDIAN REVIEW ]`, `[ 22,000+ GFIs ]`).
- High-impact search console with hard black borders, 4px black shadow, and tactile language chips.

### Main Directory: The Engineering Ledger Table
- Not isolated floating cards. A full-bleed **Industrial Ledger Table**:
  - Heavy black table headers with uppercase monospace column markers.
  - Each repository row has a 2px black border, white surface, and 4px black drop shadow.
  - S-Tier badge: Solid `#10B981` fill with 2px black border and `text-black font-black`.
  - Telemetry columns in bold monospace (`font-mono font-bold text-black`).
  - Action button: Hard brutalist `[ VIEW SCORECARD → ]` with physical press physics.

### Detail & Scorecard Pages (`/[owner]/[name]`):
- Dual-column workbench: Diagnostics console on left, GFI & actions ledger on right.
