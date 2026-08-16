---
name: autonomous-engineer
description: 24/7 autonomous loop orchestrator for GetMerged. Drives roadmap stories sequentially, manages TDD builders, schedules dogfooding sessions, sends Telegram milestones, and maintains MORNING_BRIEF.md.
---

# autonomous-engineer Skill

Orchestrates continuous, single-story execution cycles for GetMerged.

## Execution Flow

## Execution Flow

```
1. Read current roadmap status in OPENDOOR_NEXT_STEPS.md
2. Select next pending story (Story N)
3. Story Builder drafts implementation plan -> Submits to Skeptic Subagent
4. Iterate plan until Skeptic approves (Validates edge cases, rate limits, zero felonies)
5. Execute TDD development cycle:
   - Backend: Write failing test -> Implement code -> Verify go test ./...
   - Frontend: Implement components -> Verify npm run lint
6. If verification succeeds:
   - Commit & push to git
   - Notify Telegram with milestone update
   - Append completion entry to MORNING_BRIEF.md
7. Every 3 completed stories:
   - Invoke product-dogfooder via Playwright-CLI to explore live UX
   - Route any proposed improvements through skeptic-review before backlog insertion
8. If human action required (e.g. API keys, account signups):
   - Append to '🚨 Action Items Required' in MORNING_BRIEF.md
   - Send Telegram urgent action ping
   - Proceed to next independent story
```

## 🔒 Mandatory Security & Operational Guardrails
- **Zero Felonies / No Destructive Host Actions**: No host OS reconfiguration, no modifying SSH/firewalls, no dropping production DBs.
- **Zero Financial Transactions**: Never initiate charges, paid plan upgrades, or credit card authorizations autonomously.
- **Safe Task Deletions**: Deleting task-specific obsolete files/components is allowed only when part of the story's planned refactoring.
- **Max Retries**: 3 attempts per story. If tests fail 3 times, revert working tree and mark story BLOCKED.
- **Zero Broken Builds**: Never push failing tests or un-linted code to `origin/main`.
