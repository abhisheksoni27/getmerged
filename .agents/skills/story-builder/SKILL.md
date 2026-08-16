---
name: story-builder
description: Autonomous TDD builder for GetMerged. Executes one single story from OPENDOOR_NEXT_STEPS.md with strict Red-Green-Refactor discipline, unit testing, linting, and atomic git commits.
---

# story-builder Skill

Executes **exactly ONE story** from `OPENDOOR_NEXT_STEPS.md` sequentially.

## Discipline & Rules
1. **Red $\rightarrow$ Green $\rightarrow$ Refactor (Strict TDD)**:
   - Backend: Write failing `_test.go` first $\rightarrow$ verify failure $\rightarrow$ write minimum implementation code $\rightarrow$ verify `go test ./...` passes.
   - Frontend: Implement components/hooks $\rightarrow$ verify `npm run lint` passes cleanly.
2. **Native MySQL & Config Rules**:
   - Native SQL queries only (no ORMs).
   - Read configs via `.env` / `config.Load()`.
   - Any new anchor tags must have accessible `title` attributes.
3. **Atomic Commit**:
   - Once all tests and linters are 100% green, commit with conventional commit format: `feat(scope): story summary`.
4. **Handoff**:
   - Output exact commit hash, files changed, and test summary.
