# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Go 1.22+ (gin-gonic) · Turso (LibSQL) · Valkey cache · GitHub GraphQL API

## Users

**Primary (equal weight):**

- **First-time contributors** - developers new to open source, reaching for Opendoor when they want to land their first merged PR but don't know which repos will actually accept them.
- **Experienced contributors** - developers who have contributed before but are tired of submitting PRs to unresponsive or hostile repos and want to route their time toward high-yield targets.

**Secondary (confirmed from codebase):**

- Maintainers checking their own repo's C-Rank and contributor-friendliness signals.

**Operating situation:** The user arrives from a place of past frustration - a PR ignored, a repo that never responded, wasted hours. They are about to decide where to invest next and want a signal they can trust fast.

## Product Purpose

Opendoor surfaces the open-source repositories where pull requests are genuinely welcomed, reviewed promptly, and merged. It removes the guess-work from contributor routing by scoring 1,200+ repos on objective telemetry via the GitHub GraphQL API and presenting results as a browsable, filterable grid.

Success = a contributor finds and submits to a repo that merges their PR. Long-term success = contributors bookmark Opendoor as the first stop before every new OSS project.

## Positioning

**"Glassdoor for open-source repositories."** The differentiating mechanism is the **C-Rank™ system** (S–D grades) - a proprietary composite score built from nine weighted signals including external PR merge rate, first-timer success rate, time-to-first-response, and repeat contributor rate. A neighboring product could offer a star count or activity graph; it could not truthfully offer C-Rank™ without replicating the exact methodology.

The staleness gate (any repo with no merged external PR in 180 days is capped at D) is a deliberate quality signal, not a limitation.

## Operating Context

- Users browse the home page grid, filter by language (14 supported) and star bucket, and use tier/merge-rate filters to narrow candidates.
- Clicking a repo opens its detail page: full C-Rank™ breakdown, AI maintainer vibe check, and PR guidelines.
- GitHub OAuth enables watchlists and personalisation.
- The product is deployed at `opendoor.abhishekco.de`. Backend runs as a Go binary on a VPS (Linux ARM64) with Valkey in-memory caching and Turso (LibSQL) as the database. Frontend is Next.js with SSR for SEO.
- Data is refreshed via a scoring pipeline that crawls GitHub GraphQL API; crawl frequency is currently uniform (tiered crawl per C-Rank is planned).

## Capabilities and Constraints

**Live today:**
- C-Rank™ scoring on 1,200+ repos across 14 languages
- Server-side filtering and pagination
- AI maintainer vibe check + PR guidelines (gated LLM)
- Spacetime Particle Grid interactive background (canvas)
- GitHub OAuth + custom 7-day signed JWT
- Watchlists
- Score history charts
- Good first issues widget
- SEO: sitemap, OG images, JSON-LD, leaderboard, hall-of-fame, `/rankings/[lang]`
- Repo C-Rank badge SVG (embeddable in READMEs)

**Planned (not live):**
- Pro tier via RevenueCat (free today, no paywall)
- Contributor DNA profile + personalised weekly digest
- Contributor grade badge + `/u/[username]` public profile
- `/compare/[repo-a]/[repo-b]` page
- `/good-first-issue/[lang]` and `/contribute` wizard
- Python AI sidecar (local HuggingFace classifiers)
- New metrics: issue triage speed, docs quality, release cadence, PR rejection classifier

**Constraints:**
- No ORMs - native SQL queries only
- Config-driven via `.env` - no hardcoded values
- Indian payment stack required (RevenueCat chosen over Stripe for India/UPI compatibility)
- No pgvector required at current scale (<50k repos)

## Brand Commitments

- Product name: **Opendoor** (one word, no camel case in prose)
- Proprietary system name: **C-Rank™** (trademark symbol preserved)
- Tagline: *"Don't guess which door is open. Opendoor shows you."*
- No other hard visual or brand constraints confirmed - visual direction is open for future design work.

## Evidence on Hand

- Live product at `https://opendoor.abhishekco.de`
- 1,200+ repos scored (visible in macro stats)
- Icon assets: `icon.svg.png`, `big-icon.svg.png` at repo root
- README screenshots (hosted on GitHub user-content CDN)
- MIT licensed - open source itself

No testimonials, press mentions, or case-study data confirmed. Future design work must not fabricate these.

## Product Principles

1. **Trust through objectivity.** C-Rank™ is math, not opinion. Every score is reproducible from public GitHub data; the methodology is visible and improvable.
2. **Respect contributor time.** Bad signals are made visible fast - staleness gates, harsh-tone labels, low merge rates - so contributors don't waste hours on dead ends.
3. **Compounding discoverability.** Every badge embedded in a README, every shareable card, every SEO landing page is a new entry point that compounds without ongoing ad spend.
4. **Earn the first merge.** The product succeeds when a contributor gets merged, not just when they search. Success metrics eventually follow merge outcomes, not just page views.
5. **Ship in pieces, measure before investing.** The roadmap is explicit: each feature is time-boxed, experiments are gated behind measurement, and complexity is parked until scale justifies it.

## Accessibility & Inclusion

No product-specific accessibility standard confirmed. The product targets developers globally; the Indian payment stack (RevenueCat/UPI) signals an explicit non-US audience. Future design work should not assume a US-only context.
