---
name: autonomous-engineer
description: 24/7 autonomous loop orchestrator for GetMerged. Drives roadmap stories sequentially, manages TDD builders, schedules dogfooding sessions, sends Telegram milestones, and maintains MORNING_BRIEF.md.
---

# autonomous-engineer Skill

Orchestrates continuous, single-story execution cycles for GetMerged.

## Execution Flow

```
1. Read current roadmap status in OPENDOOR_NEXT_STEPS.md
2. Select next pending story (Story N)
3. Execute TDD development cycle (via story-builder)
4. Run verification suite:
   - Backend: go test ./...
   - Frontend: npm run lint
5. If verification succeeds:
   - Commit & push to git
   - Notify Telegram with milestone update
   - Append completion entry to MORNING_BRIEF.md
6. Every 3 completed stories:
   - Invoke product-dogfooder via Playwright-CLI
   - Route any proposed improvements through skeptic-review
7. If human action required (e.g. API keys):
   - Append to '🚨 Action Items Required' in MORNING_BRIEF.md
   - Send Telegram urgent action ping
   - Proceed to next independent story
```

## Error Recovery & Safety
- **Max Retries**: 3 attempts per story. If tests fail 3 times, revert working tree and mark story BLOCKED.
- **Zero Broken Builds**: Never push failing tests or un-linted code to `origin/main`.
- **Telegram Pings**: Uses `/opt/opendoor/.env` tokens for real-time progress updates.
