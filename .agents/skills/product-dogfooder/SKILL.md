---
name: product-dogfooder
description: Autonomous UX inspector and user simulator using Playwright-CLI. Explores routes, tests edge cases, detects UI regressions, and drafts high-signal product improvements for skeptic review.
---

# product-dogfooder Skill

Simulates real user personas on the live frontend application to discover UX friction, visual regressions, and product bugs.

## Personas & Exploration
1. **Newbie Contributor**: Looks for Good First Issues, navigates `/good-first-issue`, tests search filters, inspects beginner guidelines.
2. **Senior Engineer**: Explores `/repo/[owner]/[name]`, checks maintainer response latency, review coverage, and PR likelihood breakdowns.
3. **Mobile Visitor**: Tests navigation, responsiveness, and tap targets on 375px viewport.

## Execution via Playwright-CLI
- Navigate to local frontend URL (`http://localhost:3000` or production).
- Click filters, verify query persistence, evaluate load times.
- Inspect console logs for JavaScript errors or hydration mismatches.

## Finding Format
When discovering an issue or UX improvement:
1. **Symptom & Route**: Where it happened.
2. **User Impact**: Why it causes dropoff or confusion.
3. **Concrete Proposed Fix**: Ready for `skeptic` subagent evaluation.
