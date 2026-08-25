package scoring

import (
	"sort"
)

// MaintainerChecklistItem represents a prioritized action item that would raise a repo's C-Rank.
type MaintainerChecklistItem struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	ImpactPts   float64 `json:"impact_pts"`
	Category    string  `json:"category"`
	FixGuidance string  `json:"fix_guidance"`
	LinkURL     string  `json:"link_url"`
	Completed   bool    `json:"completed"`
}

// GenerateMaintainerChecklist evaluates a repository's telemetry metrics and onboarding documentation,
// producing prioritized action items sorted descending by points impact (AC6).
func GenerateMaintainerChecklist(
	responseP50Hours float64,
	timeToFirstRespHours float64,
	externalMergeRate float64,
	firstTimerRate float64,
	hasContributing bool,
	hasPRTemplate bool,
	hasIssueTemplate bool,
	goodFirstIssues int,
	busFactor int,
) []MaintainerChecklistItem {
	var items []MaintainerChecklistItem

	// Effective triage / response latency
	effResp := responseP50Hours
	if effResp <= 0 {
		effResp = timeToFirstRespHours
	}

	// 1. Review Latency p50 > 48h (+8 pts)
	if effResp > 48.0 {
		items = append(items, MaintainerChecklistItem{
			ID:          "review_latency",
			Title:       "Reduce Initial Review Latency",
			Description: "Your median time to first response exceeds 48 hours. Faster first feedback significantly boosts contributor retention.",
			ImpactPts:   8.0,
			Category:    "responsiveness",
			FixGuidance: "Set up GitHub notifications or triage rotations to acknowledge new pull requests within 24–48 hours.",
			LinkURL:     "https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues",
			Completed:   false,
		})
	}

	// 2. Missing CONTRIBUTING.md (+5 pts)
	if !hasContributing {
		items = append(items, MaintainerChecklistItem{
			ID:          "contributing_md",
			Title:       "Add a CONTRIBUTING.md Guide",
			Description: "No contribution guidelines found. Clear setup instructions lower the barrier for external developers.",
			ImpactPts:   5.0,
			Category:    "documentation",
			FixGuidance: "Create a CONTRIBUTING.md in your repository root outlining branch policies, testing requirements, and local setup.",
			LinkURL:     "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors",
			Completed:   false,
		})
	}

	// 3. First-PR merge rate < 40% (+10 pts)
	if firstTimerRate < 40.0 {
		items = append(items, MaintainerChecklistItem{
			ID:          "first_pr_merge_rate",
			Title:       "Improve First-Timer PR Merge Rate",
			Description: "Your merge rate for first-time external contributors is below 40%.",
			ImpactPts:   10.0,
			Category:    "onboarding",
			FixGuidance: "Provide actionable review feedback and mentor first-time contributors through iterative revisions rather than closing PRs.",
			LinkURL:     "https://opensource.guide/building-community/",
			Completed:   false,
		})
	}

	// 4. Triage speed > 72h (+6 pts)
	if effResp > 72.0 {
		items = append(items, MaintainerChecklistItem{
			ID:          "triage_speed",
			Title:       "Accelerate Issue & PR Triage",
			Description: "Response delays exceed 72 hours, which severely hurts contributor momentum.",
			ImpactPts:   6.0,
			Category:    "triage",
			FixGuidance: "Use auto-assignment workflows or GitHub Project boards to ensure items are labeled and triaged within 3 days.",
			LinkURL:     "https://docs.github.com/en/actions/managing-issues-and-pull-requests",
			Completed:   false,
		})
	}

	// 5. Open Good First Issues (+5 pts if 0 good first issues)
	if goodFirstIssues <= 0 {
		items = append(items, MaintainerChecklistItem{
			ID:          "good_first_issues",
			Title:       "Curate 'good first issue' Tasks",
			Description: "No open good first issues detected. Labeled starter issues attract newcomers.",
			ImpactPts:   5.0,
			Category:    "onboarding",
			FixGuidance: "Tag small, well-scoped bugfixes or documentation updates with the standard 'good first issue' label.",
			LinkURL:     "https://docs.github.com/en/issues/tracking-your-work-with-issues/using-labels",
			Completed:   false,
		})
	}

	// 6. PR Template (+3 pts if missing)
	if !hasPRTemplate {
		items = append(items, MaintainerChecklistItem{
			ID:          "pull_request_template",
			Title:       "Add a Pull Request Template",
			Description: "Standardize PR descriptions with a .github/pull_request_template.md.",
			ImpactPts:   3.0,
			Category:    "documentation",
			FixGuidance: "Create .github/PULL_REQUEST_TEMPLATE.md to guide contributors on checklist items, testing steps, and issue links.",
			LinkURL:     "https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository",
			Completed:   false,
		})
	}

	// 7. Bus Factor Risk (+4 pts if bus factor <= 1)
	if busFactor <= 1 {
		items = append(items, MaintainerChecklistItem{
			ID:          "bus_factor_expansion",
			Title:       "Expand Reviewer / Maintainer Breadth",
			Description: "High maintainer concentration (Bus Factor <= 1). Distribute review responsibilities to avoid bottlenecks.",
			ImpactPts:   4.0,
			Category:    "sustainability",
			FixGuidance: "Invite active contributors as co-maintainers or code owners (CODEOWNERS) to review PRs.",
			LinkURL:     "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners",
			Completed:   false,
		})
	}

	// Sort descending by ImpactPts (AC6)
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].ImpactPts > items[j].ImpactPts
	})

	// Top 5 shown (AC6)
	if len(items) > 5 {
		items = items[:5]
	}

	return items
}
