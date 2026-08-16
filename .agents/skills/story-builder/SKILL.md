---
name: story-builder
description: Autonomous TDD builder for GetMerged. Executes one single story from OPENDOOR_NEXT_STEPS.md with strict Red-Green-Refactor discipline, unit testing, linting, and atomic git commits.
---

# story-builder Skill

Executes **exactly ONE story** from `OPENDOOR_NEXT_STEPS.md` sequentially.

## 🔒 Mandatory Security & Safety Boundaries (Zero Exceptions)
1. **No Financial / Paid Transactions**: Never initiate actual payments, charged API usage, or financial commitments autonomously.
2. **No Felonies / Destructive System Actions**: Never run destructive host commands (`rm -rf /`, dropping production DBs, modifying ssh keys, altering firewall/auth configs).
3. **Safe Task-Scoped Refactoring**: Deleting obsolete task-specific code files or unused components is permitted ONLY when directly part of the story refactoring and verified safe.
4. **When in Doubt $\rightarrow$ Block & Log**: If any action poses risk, log it as an Action Item in `MORNING_BRIEF.md` and proceed to a safe, decoupled story.

## 🛡️ The Skeptic Gate (Plan First $\rightarrow$ Review $\rightarrow$ Code)
1. **Draft Implementation Plan**:
   - Before writing any code, draft a crisp plan: files to create/modify, schema migrations, API endpoints, tests to write, and edge cases considered.
2. **Submit Plan to Skeptic**:
   - Run plan through the `skeptic` subagent / `skeptic-review` skill.
   - Skeptic evaluates edge cases, concurrency locks, rate limits, and failure modes.
3. **Iterate Until Approved**:
   - If Skeptic requests fixes, refine the plan until Skeptic issues **APPROVED**.
4. **Red $\rightarrow$ Green $\rightarrow$ Refactor (Strict TDD)**:
   - Backend: Write failing `_test.go` first $\rightarrow$ verify failure $\rightarrow$ write code $\rightarrow$ verify `go test ./...` passes.
   - Frontend: Implement components/hooks $\rightarrow$ verify `npm run lint` passes cleanly.
5. **Atomic Commit**:
   - Commit with conventional format: `feat(scope): story summary`. Output commit hash and brief updates.
