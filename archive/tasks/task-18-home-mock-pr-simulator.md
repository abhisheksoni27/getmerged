# Jira Story: Interactive Mock PR Review Pipeline Simulator

## Epic Link
EPIC-201: Homepage Revamp & User Retention

## Description
As a first-time contributor, I want to interact with a visual simulator showing how maintainer review pipelines work on S-tier vs. D-tier projects so that I can see the value of C-Rank scores visually.

## Why
Explaining metrics via raw text is boring. An interactive simulator showing a PR traveling through a pipeline (review, comment, merge) provides a fun visual explanation of maintainer behaviors.

## Specific Key Result
- **Aha! Moment Conversion**: Drive a 40% increase in clicks on repository cards after interacting with the simulator.
- **Bounce Rate**: Reduce mobile-device exit rates on initial page entry by 25%.

## How to Solve (Solution)
1. **Interactive Simulation Card**: Build a visual dashboard on the homepage showing a mock PR card.
2. **Two Pipeline Modes**:
   - **Mode A (S-Tier)**: User clicks "Submit PR". The PR card slides through steps (Triage -> Initial Feedback -> Approved -> Merged) within a simulated 4-hour window, with cute maintainer success animations.
   - **Mode B (D-Tier)**: User clicks "Submit PR". The card gets stuck at "Triage" with a spiderweb emoji and a counter counting up "3 months later...".
3. **Persuasive Summary**: Show a bold badge: "Don't guess which door is open. Let Opendoor guide you."
