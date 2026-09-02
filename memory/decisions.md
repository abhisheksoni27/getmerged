# Architecture Decision Records (ADRs)

## ADR-001: Auto-Memory System Integration
- **Date**: 2026-09-02
- **Status**: Accepted
- **Context**: Autonomous agents and developers need a persistent, evolving repository-level source of truth across sessions to prevent context drift and regressions.
- **Decision**: Adopt repo-level `memory/` storage with `memory-index.md` as the master index and modular topic files (`architecture.md`, `decisions.md`, etc.).
- **Consequences**: Agents check `memory/memory-index.md` to ground assumptions before planning and automatically record/update decisions as they happen.

## ADR-002: User Account Deletion (GDPR Right to Erasure)
- **Date**: 2026-09-02
- **Status**: Accepted
- **Context**: For global regulatory compliance (GDPR, CCPA), users need an explicit self-serve mechanism to delete their accounts.
- **Decision**: Added a triple-dots (`MoreVertical`) menu to the user profile view (`/u/[username]`) visible to the profile owner. Selecting "Delete Account" triggers [`DeleteAccountModal`](file:///home/deploy/src/opendoor/frontend/src/components/DeleteAccountModal.tsx), requiring typing "DELETE MY ACCOUNT" to confirm. The request invokes the existing backend endpoint `DELETE /api/v1/me/data` which anonymizes user PII, clears sessions, and purges tokens.
