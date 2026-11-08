#!/usr/bin/env python3
"""
Automated GitHub Issue Logger for GetMerged
Uses GitHub CLI REST API to log structured issues.
"""

import json
import subprocess
import sys
import time

REPO = "abhisheksoni27/getmerged"

ISSUES = [
    {
        "title": "fix(ui): fix black-on-black text contrast on sticky header GitHub button",
        "body": """### Summary
When scrolling down the repository detail page (`/[owner]/[name]`), the floating sticky top bar slides into view. The "GitHub" button on the top right renders with black text on a black background, making the label completely invisible.

### Root Cause
In `frontend/src/components/RepoStickyBar.tsx`, the class is set to `bg-[var(--text-primary)] text-[var(--text-primary)]`.

### Expected Behavior
The button text must use `text-[var(--bg-canvas)]` so the white text is clearly visible against the dark button surface.
""",
        "labels": ["bug", "frontend", "ui/ux"]
    },
    {
        "title": "fix(ui): fix dark-mode contrast issue in Top PR Submission Do's and Don'ts cards",
        "body": """### Summary
In the repository detail page's maintainer insights section, the "Top PR Submission Do's" and "Top PR Friction Pitfalls (Don'ts)" cards have poor, muddy contrast on the light linen background.

### Root Cause
In `frontend/src/components/repo-detail/InsightsSection.tsx`, the cards use legacy dark-mode classes `bg-emerald-950/40 text-emerald-300` and `bg-rose-950/40 text-rose-300`.

### Expected Behavior
Convert to clean, accessible light tokens:
- **Do's**: `bg-emerald-50/80 border-emerald-200/80 text-[#0D9668]` with dark readable body text.
- **Don'ts**: `bg-rose-50/80 border-rose-200/80 text-[#C4463A]` with dark readable body text.
""",
        "labels": ["bug", "frontend", "ui/ux"]
    },
    {
        "title": "fix(badge): embed C-Rank badge displays wrong tier (shows Tier D instead of S)",
        "body": """### Summary
On repository detail pages such as `https://getmerged.abhishekco.de/tembo/voxl` (which has a verified S-Tier grade with a 91% merge rate), the "Embed C-Rank Badge" section and endpoint `/api/badge/tembo/voxl` renders an SVG showing "Tier D · 0% Merge".

### Root Cause
In `frontend/src/lib/badge-generator.ts`, `generateRepoBadgeSvg` queries `/api/v1/repos?name=owner/repo` which can return stale or unpopulated snapshot data (`c_rank_tier: "D"`) instead of the authoritative live snapshot.

### Expected Behavior
The badge endpoint and live embed preview must match the exact scorecard tier and merge rate shown on the main repository page.
""",
        "labels": ["bug", "backend", "badge"]
    },
    {
        "title": "refactor(ui): streamline PR Acceptance & Review Speed Forecast card to eliminate duplicate metrics",
        "body": """### Summary
The "PR Acceptance & Review Speed Forecast" card repeats the exact same repository metrics (Merge Rate, Response Time, C-Rank score) that are already prominently displayed in the top hero section.

### Expected Behavior
Streamline the card to remove redundant metric duplicates and focus strictly on unique predictive value:
- Predicted acceptance probability based on PR size and checklist compliance.
- Expected turnaround window for first human review.
""",
        "labels": ["enhancement", "frontend", "ui/ux"]
    },
    {
        "title": "feat(ui): redesign Optimal PR Submission Window to prioritize actionable text over dense charts",
        "body": """### Summary
The "Optimal PR Submission Window" section currently renders a dense 7x24 heatmap grid without immediate, clear written conclusions.

### Expected Behavior
- Display the punchy summary and actionable guidance front and center (e.g. "Best time to submit: Tuesdays between 2:00 PM – 5:00 PM UTC — maintainers review 3.2x faster during this window").
- Tuck the dense heatmap chart into a collapsed / optional "Deep Dive Heatmap" drawer for users who want to explore raw data.
""",
        "labels": ["enhancement", "frontend", "ui/ux"]
    },
    {
        "title": "refactor(ui): compact Best Pull Request Size widget to reduce whitespace and highlight sweet spot",
        "body": """### Summary
The "Best Pull Request Size" card occupies excessive vertical space and lines for minimal data.

### Expected Behavior
Go straight to the value addition with a compact, high-density presentation:
- **Sweet Spot**: `100–300 lines`
- **Merge Rate**: `91%`
- **Turnaround Speedup**: `2x faster review`
Remove unnecessary whitespace and filler lines.
""",
        "labels": ["enhancement", "frontend", "ui/ux"]
    },
    {
        "title": "fix(api): filter Similar Welcoming Repositories to only include welcoming tiers (S/A/B)",
        "body": """### Summary
On repository detail pages (e.g. `tembo/voxl`, an S-tier project), the section titled "Similar Welcoming Repositories" recommends repositories that are classified in Tier D (unresponsive / risky repos).

### Root Cause
The related repos query (`/api/v1/repos/:id/related`) matches repos by language and topics without enforcing that the recommended projects actually have welcoming C-Rank tiers.

### Expected Behavior
Strictly filter related repository recommendations to `c_rank_tier IN ('S', 'A', 'B')` so the section only suggests genuinely welcoming alternatives.
""",
        "labels": ["bug", "backend", "api"]
    },
    {
        "title": "fix(gfi): remove 'Paid' indicator from active Good First Issues listings",
        "body": """### Summary
Active Good First Issues cards on repository detail pages display a "Paid" tag or indicator where it is not applicable or unwanted.

### Expected Behavior
Remove the "Paid" tag from active GFI cards on repo detail pages so they only show authentic open-source beginner tags.
""",
        "labels": ["bug", "frontend", "gfi"]
    },
    {
        "title": "fix(ui): fix contrast in GetMerged C-Rank Indexing Standard section",
        "body": """### Summary
Note down: In the "GetMerged C-Rank™ Indexing Standard" section on the repository detail page, text and badge contrast issues persist on light mode.

### Expected Behavior
Audit and align all cards, badges, and body copy in this section with the MASTER design system tokens (`--text-primary`, `--text-secondary`, `--bg-surface`, `--border-subtle`).

*(Flagged for future review - do not work on yet)*
""",
        "labels": ["ui/ux", "frontend", "backlog"]
    },
    {
        "title": "refactor(ui): clarify Contributor Community Vibe Feedback purpose and copy",
        "body": """### Summary
Note down: The "Contributor Community Vibe Feedback" section is unclear in its purpose, value proposition, and user action.

### Expected Behavior
Redesign the copy, header, and explanatory layout so readers immediately understand what community feedback represents, how sentiment is computed, and how contributors benefit.

*(Flagged for future review - do not work on yet)*
""",
        "labels": ["ui/ux", "copy", "backlog"]
    }
]

def main():
    print(f"Logging {len(ISSUES)} issues to {REPO}...")
    created_issues = []

    for idx, issue in enumerate(ISSUES, 1):
        cmd = [
            "gh", "api", "-X", "POST", f"/repos/{REPO}/issues",
            "-f", f"title={issue['title']}",
            "-f", f"body={issue['body']}"
        ]
        # Add labels if available
        for label in issue.get("labels", []):
            cmd.extend(["-F", f"labels[]={label}"])

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            data = json.loads(res.stdout)
            issue_num = data.get("number")
            issue_url = data.get("html_url")
            print(f"[{idx}/10] Created #{issue_num}: {issue['title']}")
            print(f"       -> {issue_url}")
            created_issues.append({"number": issue_num, "url": issue_url, "title": issue["title"]})
        except subprocess.CalledProcessError as e:
            print(f"[{idx}/10] Failed to create: {issue['title']}", file=sys.stderr)
            print(e.stderr, file=sys.stderr)

        time.sleep(1) # Be gentle on GitHub rate limiter

    print("\n✓ Finished logging all issues!")
    with open("/tmp/created_issues.json", "w") as out:
        json.dump(created_issues, out, indent=2)

if __name__ == "__main__":
    main()
