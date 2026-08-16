---
name: autonomous-engineer
description: 24/7 autonomous continuous loop orchestrator for GetMerged. Continuously executes roadmap stories sequentially across all sprints without stopping or waiting for user prompts, sends Telegram milestone alerts, manages TDD builders, schedules dogfooding sessions, and maintains MORNING_BRIEF.md.
---

# autonomous-engineer Skill

The 24/7 autonomous loop orchestrator for GetMerged. Continuously executes stories across all sprints without stopping or pausing for human interaction unless a blocking external action (e.g. manual 3rd-party credentials) is strictly required.

## 🔁 Continuous Autonomous Loop (Never Stop at Sprint Boundaries)

```
LOOP (Continuous Execution - Sprints 1 through 6):
  1. Read OPENDOOR_NEXT_STEPS.md to find the next uncompleted story (Story N).
  2. Draft implementation plan -> Submit to Skeptic Subagent (`skeptic`).
  3. Iterate plan until Skeptic approves (Validates edge cases, rate limits, zero felonies).
  4. Execute TDD development cycle:
     - Backend: Write failing test (Red) -> Implement code -> Verify `go test ./...`
     - Frontend: Implement components -> Verify `npm run lint`
  5. If verification succeeds:
     - Run Makefile deployment target if applicable (`make deploy-server` / `make deploy-frontend-server`).
     - Commit and push to git (`git add ... && git commit && git push origin main`).
     - Send Telegram milestone alert immediately:
       ```bash
       source /opt/opendoor/.env && curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
         -d "chat_id=${TELEGRAM_CHAT_ID}" \
         -d "parse_mode=Markdown" \
         -d "text=🚀 *GetMerged Milestone*: Completed Story X.Y (Commit: \`HASH\`)"
       ```
     - Update MORNING_BRIEF.md with completed story log and next queued target.
  6. Every 3 completed stories:
     - Invoke product-dogfooder via Playwright-CLI to explore live UX.
     - Record findings in MORNING_BRIEF.md.
  7. DO NOT PAUSE OR WAIT FOR HUMAN PROMPTS:
     - Automatically increment to the next story (e.g. Story 1.4 -> Story 2.1 -> Story 2.2 ...).
     - Continue looping immediately.
  8. If human action required (e.g. 3rd-party API keys, payment keys):
     - Append to '🚨 Action Items Required' in MORNING_BRIEF.md.
     - Send urgent Telegram alert.
     - Proceed immediately to the next independent story in the roadmap.
```

## 🔒 Mandatory Security & Operational Guardrails
- **Zero Felonies / No Destructive Host Actions**: No host OS reconfiguration, no modifying SSH/firewalls, no dropping production DBs.
- **Zero Financial Transactions**: Never initiate charges, paid plan upgrades, or credit card authorizations autonomously.
- **Safe Task Deletions**: Deleting task-specific obsolete files/components is allowed only when part of the story's planned refactoring.
- **Max Retries**: 3 attempts per story. If tests fail 3 times, revert working tree and mark story BLOCKED.
- **Zero Broken Builds**: Never push failing tests or un-linted code to `origin/main`.
