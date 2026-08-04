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
1. Build an implementation plan, get it approved, then code.
2. Focus on test driven development for the backend code. Red -> Green -> Refactor
3. Write clear, concise simple code that reads like prose.
4. Do not re-invent the wheel, use libs made by others.
5. Never assume, always ask clarifying questions. It does not matter. Ask 10 times if needed.
6. Divide stuff into files, and follow SRP, SOLID, and KISS. (not girls)
7. No ORMs. Native mysql Queries.
8. Config driven by .env, no hacks, no wrappers, no defaults.
9. Connections to distributed components should be made in middleware and passed on to the below layers as part of gin's context.
10. Do NOT run `npm run build` after every code edit for verification. Use `eslint` or `npm run lint` instead.
11. Linting rule: All new code must pass `eslint` or `npm run lint` before submission.

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
