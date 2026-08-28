# opendoor
Find repos that welcome contributors

#### Description
**opendoor** is a web platform that helps open‑source contributors find repositories where their pull requests are actually welcomed and merged.

It scores public GitHub repositories using a proprietary **C‑Rank™** system (S to D) based on objective metrics: merge rates, response times, and first‑timer success.

Think of it as *Glassdoor for open‑source repos*: don't guess which door is open. Opendoor shows you.

#### Tech Stack
1. Backend - golang, gin-gonic
2. Frontend - Next.js, Tailwindcss, shadcdn ui
3. External - GitHub GraphQL API

# Rules to always adhere to
0. Tell crisply, using minimum tokens.
1. Plan + approval only for multi-file, schema, or API changes. Single-file fixes and copy edits: just do it and push.
2. TDD (Red -> Green -> Refactor) only on golden paths: repo list/rank display, PR scoring engine, DB writes/migrations. Everything else: code first, add a test after if it touches a golden path.
3. Write clear, concise simple code that reads like prose. Make the least possible change to get the task done — no drive-by refactors, no speculative abstractions, no fluffy or jargonic comments. Comment only the non-obvious.
4. Do not re-invent the wheel, use libs made by others.
5. Ask at most 1 blocking question per task; default to the reversible choice and state your assumption in the commit message.
6. Divide stuff into files, follow SRP and KISS.
7. No ORMs. Native mysql Queries.
8. Config driven by .env, no hacks, no wrappers, no defaults.
9. Connections to distributed components should be made in middleware and passed on to the below layers as part of gin's context.
10. Verification rule: ALWAYS run `make check` (runs frontend `npm run lint` + `npm run typecheck`, and backend `go vet`) before any commit/submission. Never skip.
11. Type-safety and Linting rule: All new code must pass `make check` with 0 errors before push.
12. Never hardcode fake/fallback mock data. Always fetch real data from APIs or handle loading/empty states cleanly.
13. All anchor tags (`<a>` and `<Link>`) must have descriptive, accessible `title` attributes. Never omit title attributes on links.
14. For deployments, NEVER run manual `go build` or ad-hoc binaries. ALWAYS use Makefile targets only (e.g. `make deploy-server`, `make deploy-frontend-server`).
15. Skeptic Gate ONLY for: destructive DB migrations, auth/payment changes, deleting data. Architecture experiments are exempt — we are supposed to experiment.
16. UI Design: All UI tasks must strictly follow the neo-brutalist design system defined in [`design.md`](design.md), especially emphasizing bottom-line borders on components/elements. Never skip.

# Speed & blast-radius (80/20)
A. Before coding, tag the change `core` (top user flows: browse repos, view ranks, search — the 80/90% surface) or `edge`. Core = lint + golden-path tests pass before push. Edge = lint only, ship.
B. Prefer changes revertible with one commit. Feature-flag anything risky; no big-bang migrations — add columns, never rename/drop in the same deploy.
C. SEO/user floor — never break: homepage render, repo pages, sitemap, meta tags, page titles. If touched, fetch one repo page post-deploy to verify before reporting done.
D. Ship > perfect: working-and-ugly beats beautiful-but-unshipped. Refactor only when it unblocks a feature, never standalone.

# Always push & conditional deploy
17. NEVER switch or create branches (`git checkout`/`switch`/`checkout -b` forbidden). Always code, commit, and push directly on `main`.
18. Deploy depends on what changed:
    - Paths under `autonomous_sdlc/api`, `db`, `engine`, or `services` → restart BE via `scripts/manage.sh restart`.
    - Paths under `autonomous_sdlc/ui` → rebuild/restart FE.
    - Both changed → do both.
    - Docs-only changes → no deploy.
19. If push or any deploy step fails: retry ONCE, then stop and report the error in the task output. Never silently continue.

# Output style, and communication
Do not output fluff. Be to the point, omit fluff words, or sentences that do not add any value. Never repeat yourself. Try returning at least 50% less tokens/words than usual based on these. Whenever you think of responding, think again. Can you make it half, without losing the information? If yes, do it. Rinse and repeat until you have reached an absolute point where no more reduction can happen. That is when you respond back. THIS IS A NO-BRAINER NO-TOLERANCE rule. NEVER SKIP THIS.  

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
