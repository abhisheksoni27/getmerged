# DESIGN.md

## Visual World: Schiphol Concourse

**Direction:** Schiphol Concourse — saturated yellow panels hung as overhead bands, black humanist sans, white pictograms, gate numbers at monumental scale. The wayfinding metaphor maps to "finding open doors" in open source.

**Seed key:** `f4669acc` — Assigned index 7 of 7 (direction roll)

---

## THESE

The opendoor homepage is a terminal concourse. Visitors are travelers navigating a departure board of open-source repos. Yellow panels mark the gates where doors are open. The concourse is calm, authoritative, and unmistakable — no other dev tool looks like this.

## OWN-WORLD

- **Palette:** Saturated yellow `#f5c518` on near-black `#0a0a0a` and near-white `#fafafa`. Yellow is the only accent — everything else is black, white, and gray. The yellow carries 30-60% of the surface on key panels.
- **Type:** Frutiger-cut humanist sans for display (headings, gate IDs). System sans-serif for body text. Monospace (`SF Mono`, `Fira Code`) exclusively for data: metrics, counts, gate codes.
- **Material:** Flat panels with hard edges. No blur, no glass, no gradient fills. Shadows carry offset and soft blur only. Yellow panels are solid color fields.
- **Composition:** Wide, spacious, editorial. Body measure 65-75ch. Generous whitespace between sections. Headings are bold and large (display max 6rem). No kicker or eyebrow above headings.
- **Topology:** Wayfinding chain — hero panel → filter junction → gate grid → departure board. Each section is a concourse zone. Navigation advances like walking through a terminal.
- **Controls:** Filter pills styled as gate selectors. Active state is yellow fill. Hover states are subtle lift with shadow offset.

## STORY

A visitor arrives at the concourse and immediately sees the yellow hero panel: opendoor name in monumental type, the tagline, and a clear CTA. They scan the gate grid of repos, each gate showing its merge rate, response time, and first-timer success. They use the wayfinding junction to filter by language or tier, and the concourse repaints — matching gates highlight in yellow, others dim. They click a gate to see the departure board with detailed C-Rank telemetry. The visitor leaves knowing exactly which doors are open and which to walk toward.

## FIRST VIEWPORT

- Top: fixed yellow accent band (4px) + wayfinding header with OD mark, brand name, nav links, CTA
- Below header: full-width yellow hero panel with monumental H1 ("The doors that actually open."), tagline, and two CTAs
- Stats strip: four key metrics in monospace
- Wayfinding junction: filter pills as gate selectors
- Gate grid: 3-column repo cards styled as departure gates with gate IDs, tier badges, metrics
- Departure board: dark section with live telemetry

## FORM

The Schiphol Concourse direction, seed key `f4669acc`. The concourse layout with yellow panels, gate-grid repo cards, and departure board.

## FINISH

unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md