# Project Memory Index

> Master table of contents and index for project memory, persistent knowledge, and key decisions.

| File | Topic / Scope | Last Updated | Status |
|---|---|---|---|
| [architecture.md](./architecture.md) | Core system architecture, SSR rules, database schemas, and stack constraints | 2026-09-02 | Active |
| [decisions.md](./decisions.md) | Architecture Decision Records (ADRs) & major technical choices | 2026-11-07 | Active |

## Key Directives Summary
- **SSR-First**: All public SEO routes must fetch data during server-side render in `page.tsx`.
- **Zero Mock UI**: Every interactive feature must be backed by working backend APIs and DB tables before UI is rendered.
- **Auto-Memory**: Always ground assumptions on `memory/memory-index.md` and keep sub-files updated.
- **Product Inventory**: Always check `product-inventory.md` before starting a task; update it whenever major features land, change, or are removed.

