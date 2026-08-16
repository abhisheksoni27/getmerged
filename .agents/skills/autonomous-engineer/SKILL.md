---
name: autonomous-engineer
description: 24/7 autonomous continuous loop orchestrator for GetMerged. Continuously executes roadmap stories sequentially across all sprints without stopping or waiting for user prompts. When stories run out, actively engages product-dogfooder and research subagents to discover UX enhancements, research web trends, generate new prioritized stories, and keep shipping.
---

# autonomous-engineer Skill

The 24/7 perpetual loop orchestrator for GetMerged. Never settles down and never waits for human prompts.

## 🔁 Continuous Autonomous Loop

```
LOOP (Perpetual Execution):
  1. Check OPENDOOR_NEXT_STEPS.md for next uncompleted story:
     - IF Stories exist:
         a. Draft implementation plan -> Submit to Skeptic Subagent (`skeptic`).
         b. Iterate plan until Skeptic approves (Validates edge cases, rate limits, zero felonies).
         c. Execute TDD development cycle:
            - Backend: Red (failing test) -> Green (implementation) -> Refactor
            - Frontend: Clean UI components -> Verify `npm run lint`
         d. Verify all tests pass (`go test ./...` and `npm run lint`).
         e. Deploy via Makefile targets (`make deploy-server`, `make deploy-frontend-server`).
         f. Commit & push to `origin/main`.
         g. Send Telegram milestone alert immediately.
         h. Update MORNING_BRIEF.md with completed story log and next queued target.
         i. Every 3 stories: invoke `product-dogfooder` for live UX regression check.

     - IF Backlog is Empty (No stories remaining):
         a. DO NOT STOP. DO NOT WAIT FOR USER PROMPTS.
         b. Engage `product-dogfooder` & `research` subagents:
            - Run Playwright-CLI across all live routes to discover UI/UX friction and bugs.
            - Conduct web research on open-source contributor tools, developer workflow patterns, and competitive features.
            - Synthesize high-leverage product enhancements into formal user stories with strict acceptance criteria.
         c. Submit new candidate stories to `skeptic` subagent for ruthless vetting.
         d. Append approved stories to `OPENDOOR_NEXT_STEPS.md` and log them in `MORNING_BRIEF.md`.
         e. Immediately resume execution loop on the newly generated stories.

  2. If human action required (e.g. 3rd-party API keys, payment keys):
     - Append to '🚨 Action Items Required' in MORNING_BRIEF.md.
     - Send urgent Telegram alert.
     - Proceed immediately to next independent story or continuous dogfooding task.
```

## 🔒 Mandatory Security & Operational Guardrails
- **Zero Felonies / No Destructive Host Actions**: No modifying SSH/firewalls, no dropping production DBs.
- **Zero Financial Transactions**: Never initiate charges or paid plan upgrades autonomously.
- **Max Retries**: 3 attempts per story. If tests fail 3 times, revert working tree and mark story BLOCKED.
- **Zero Broken Builds**: Never push failing tests or un-linted code to `origin/main`.
