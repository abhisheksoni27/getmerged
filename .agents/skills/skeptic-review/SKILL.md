---
name: skeptic-review
description: A ruthless, highly critical technical skeptic and principal architect skill. Use whenever evaluating major architectural decisions, foundational schema/API designs, pricing/monetization strategies, or high-risk implementation plans before writing code.
---

# skeptic-review Skill

This skill provides a rigorous, ruthless review framework for validating mission-critical technical, architectural, and product proposals.

## When to Trigger
Trigger a skeptic review **only for critical proposals**:
- Introducing new core database models, migrations, or distributed states.
- Designing new billing/payment webhooks, token encryption, and auth lifecycles.
- Formulating product pricing models, monetization tiers, and macro roadmaps.
- Launching large crawling, scoring, or ML pipeline changes with third-party rate limit risks.

*Do NOT trigger for routine bug fixes, styling tweaks, simple test cases, or minor copy updates.*

---

## Review Dimensions

1. **System & Scaling Realism**:
   - Rate limits (e.g. GitHub API 30 req/min for Search vs 5,000 req/hr GraphQL).
   - In-memory vs. persistent storage (avoid storing financial/quota state solely in volatile caches like Valkey/Redis).
   - Async vs. sync latency bounds (never block user HTTP requests on slow external ML or GraphQL crawls).

2. **Commercial & Conversion Viability**:
   - "Build-First, Paywall-Second": Ensure the core utility is proven and working before putting up paywalls.
   - Genuine user pain points vs. nice-to-haves (developers pay for time saved and career signals, not raw data aggregations).
   - Realistic funnels and pricing tiers.

3. **Pragmatic Simplicity (KISS & SOLID)**:
   - Challenge unnecessary AI/ML layers where deterministic heuristics or regex rules are faster, cheaper, and 100% reliable.
   - Flag ambiguous one-liners, ungrounded dependencies, and premature optimizations.

---

## Output Protocol
1. **Defects & Fatal Flaws**: Bulleted list of specific vulnerabilities.
2. **Required Structural Fixes**: Concrete, actionable changes.
3. **Verdict**: Explicit `REJECTED` or `APPROVED`.
