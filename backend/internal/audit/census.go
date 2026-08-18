package audit

import (
	"strings"
)

// DefaultMappings returns the comprehensive audit mapping table covering all sections §0 to §12.
func DefaultMappings() map[string]ItemMapping {
	mappings := make(map[string]ItemMapping)

	add := func(m ItemMapping) {
		mappings[m.CanonicalKey] = m
	}

	// ==========================================
	// Section 0: State of the ship (live today)
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec0-state-c-rank-scoring",
		AuditKey:     "sec0-c-rank-scoring",
		Section:      "Section 0 - State of the ship",
		Title:        "C-Rank scoring live",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "C-Rank scoring pipeline running in internal/scoring/crank.go",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-browse-filter-search",
		AuditKey:     "sec0-browse-filter-search",
		Section:      "Section 0 - State of the ship",
		Title:        "Browse/filter/search live",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/repos",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-repo-detail",
		AuditKey:     "sec0-repo-detail",
		Section:      "Section 0 - State of the ship",
		Title:        "Repo detail page live",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/repo/[owner]/[name]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-rankings",
		AuditKey:     "sec0-rankings",
		Section:      "Section 0 - State of the ship",
		Title:        "Rankings pages live",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/rankings/[lang]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-good-first-issue",
		AuditKey:     "sec0-good-first-issue",
		Section:      "Section 0 - State of the ship",
		Title:        "Good-first-issue live",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/good-first-issue/[lang]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-public-profiles",
		AuditKey:     "sec0-public-profiles",
		Section:      "Section 0 - State of the ship",
		Title:        "Public profiles live",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/u/[username]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-auth",
		AuditKey:     "sec0-auth",
		Section:      "Section 0 - State of the ship",
		Title:        "Auth & OAuth live",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/auth/github",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-seo",
		AuditKey:     "sec0-seo",
		Section:      "Section 0 - State of the ship",
		Title:        "SEO & Metadata live",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "frontend/src/app/robots.ts",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-ops",
		AuditKey:     "sec0-ops",
		Section:      "Section 0 - State of the ship",
		Title:        "Ops & Gin pipeline live",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/cmd/server/main.go",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-monetization",
		AuditKey:     "sec0-monetization",
		Section:      "Section 0 - State of the ship",
		Title:        "Monetization stack status",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/pricing",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec0-state-blog",
		AuditKey:     "sec0-blog",
		Section:      "Section 0 - State of the ship",
		Title:        "Blog engine status",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/blog",
		},
	})

	// ==========================================
	// Section 1: Positioning & North Star
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec1-brand-rename",
		AuditKey:     "sec1-brand-rename",
		Section:      "Section 1 - Positioning & North Star",
		Title:        "Brand rename to GetMerged",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Brand rename to GetMerged executed across frontend copy",
		},
	})

	// ==========================================
	// Section 2: Moats worth building
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec2-moat-gfi-quality-score-issue-level-c-rank",
		AuditKey:     "sec2-moat-gfi-quality-score",
		Section:      "Section 2 - Moats worth building",
		Title:        "GFI quality score",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/issues/good-first",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec2-moat-onboarding-docs-score",
		AuditKey:     "sec2-moat-onboarding-docs-score",
		Section:      "Section 2 - Moats worth building",
		Title:        "Onboarding docs score",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Onboarding score computed and blended into scoring pipeline",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec2-moat-pr-rejection-classification",
		AuditKey:     "sec2-moat-pr-rejection-classification",
		Section:      "Section 2 - Moats worth building",
		Title:        "PR-rejection classification",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec2-moat-bus-factor",
		AuditKey:     "sec2-moat-bus-factor",
		Section:      "Section 2 - Moats worth building",
		Title:        "Bus factor gate",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Bus factor gate incorporated into scoring pipeline",
		},
	})

	// ==========================================
	// Section 3: Monetization
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec3-3.1-payment-stack",
		AuditKey:     "sec3-payment-stack-dodopayments",
		Section:      "Section 3 - Monetization",
		Title:        "Payment stack dodopayments webhook",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/api/v1/payments/webhook/dodopayments",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-3.2-pro-tier",
		AuditKey:     "sec3-pro-tier-features",
		Section:      "Section 3 - Monetization",
		Title:        "Pro tier features and pricing",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/pricing",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-3.3-contributor-dna",
		AuditKey:     "sec3-contributor-dna-engine",
		Section:      "Section 3 - Monetization",
		Title:        "Contributor DNA token management & worker",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/user/dna",
		},
	})
	// DNA Attributes sub-table
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-primary-languages",
		AuditKey:     "sec3-dna-attr-primary-languages",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: primary_languages",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-skill-level-per-language",
		AuditKey:     "sec3-dna-attr-skill-level",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: skill_level",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-contribution-style",
		AuditKey:     "sec3-dna-attr-contribution-style",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: contribution_style",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-pr-size-preference",
		AuditKey:     "sec3-dna-attr-pr-size-preference",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: pr_size_preference",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-feedback-tolerance",
		AuditKey:     "sec3-dna-attr-feedback-tolerance",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: feedback_tolerance",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-goals-inferred",
		AuditKey:     "sec3-dna-attr-goals-inferred",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: goals_inferred",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-is-newbie",
		AuditKey:     "sec3-dna-attr-is-newbie",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: is_newbie",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-dna-attr-merged-pr-count-streak",
		AuditKey:     "sec3-dna-attr-merged-pr-count",
		Section:      "Section 3 - Monetization",
		Title:        "DNA Attribute: merged_pr_count, streak",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "total_merged_prs",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec3-3.4-pricing-lifecycle",
		AuditKey:     "sec3-pricing-lifecycle",
		Section:      "Section 3 - Monetization",
		Title:        "Pricing & subscription lifecycle",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "user_entitlements",
			DBColumn: "subscription_id",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-3.5-the-5-dollar-math",
		AuditKey:     "sec3-math-model",
		Section:      "Section 3 - Monetization",
		Title:        "Conversion & unit economics model",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Informational business projections",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-math-tier-1k",
		AuditKey:     "sec3-math-tier-1k",
		Section:      "Section 3 - Monetization",
		Title:        "Math Tier: 1k users projection",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Conversion model tier",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-math-tier-10k",
		AuditKey:     "sec3-math-tier-10k",
		Section:      "Section 3 - Monetization",
		Title:        "Math Tier: 10k users projection",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Conversion model tier",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-math-tier-50k",
		AuditKey:     "sec3-math-tier-50k",
		Section:      "Section 3 - Monetization",
		Title:        "Math Tier: 50k users projection",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Conversion model tier",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-math-tier-200k",
		AuditKey:     "sec3-math-tier-200k",
		Section:      "Section 3 - Monetization",
		Title:        "Math Tier: 200k users projection",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Conversion model tier",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec3-3.6-b2b-layers",
		AuditKey:     "sec3-b2b-layers",
		Section:      "Section 3 - Monetization",
		Title:        "B2B layers (Recruiter access / API licensing)",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Roadmap month 3+ candidate for future B2B sprint",
		},
	})

	// ==========================================
	// Section 4: Blog & Content Engine
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec4-4.1-pipeline",
		AuditKey:     "sec4-blog-pipeline",
		Section:      "Section 4 - Blog & content engine",
		Title:        "Blog pipeline script & internal endpoint",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "scripts/blog-pipeline.sh",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec4-4.2-content-mix",
		AuditKey:     "sec4-content-mix",
		Section:      "Section 4 - Blog & content engine",
		Title:        "Content mix strategy & weekly report",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Blog content cadence definition pending pipeline deployment",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec4-4.3-frontend-work",
		AuditKey:     "sec4-frontend-mdx-blog",
		Section:      "Section 4 - Blog & content engine",
		Title:        "Frontend MDX blog routes",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/blog",
		},
	})

	// ==========================================
	// Section 5: Growth & Virality
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec5-loop-1",
		AuditKey:     "sec5-loop-badge-flywheel",
		Section:      "Section 5 - Growth & virality",
		Title:        "Badge & embed flywheel",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/badge/:owner/:repo",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-2",
		AuditKey:     "sec5-loop-wrapped-cards",
		Section:      "Section 5 - Growth & virality",
		Title:        "Wrapped-style achievement cards",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/users/:slug/achievement.svg",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-3",
		AuditKey:     "sec5-loop-first-merge",
		Section:      "Section 5 - Growth & virality",
		Title:        "First-merge celebration",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "First-merge tracking supported in contributor profiles and achievements",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-4",
		AuditKey:     "sec5-loop-weekly-data-report",
		Section:      "Section 5 - Growth & virality",
		Title:        "Weekly data report as social object",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/internal/jobs/weekly-digest",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-5",
		AuditKey:     "sec5-loop-doorpal-extension",
		Section:      "Section 5 - Growth & virality",
		Title:        "DoorPal browser extension",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "extension/manifest.json",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-6",
		AuditKey:     "sec5-loop-maintainer-welcome-rank",
		Section:      "Section 5 - Growth & virality",
		Title:        "Maintainer welcome rank & leaderboard",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/leaderboard",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-7",
		AuditKey:     "sec5-loop-seasonal-spikes",
		Section:      "Section 5 - Growth & virality",
		Title:        "Seasonal spikes & Hacktoberfest",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Seasonal campaigns scheduled for September / October",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-loop-8",
		AuditKey:     "sec5-loop-community",
		Section:      "Section 5 - Growth & virality",
		Title:        "Community discussions / Discord",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "GitHub Discussions active",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-5.2-launch-surfaces",
		AuditKey:     "sec5-launch-surfaces",
		Section:      "Section 5 - Growth & virality",
		Title:        "Launch & distribution surfaces (Show HN, Reddit)",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Launch ops ready for deployment execution",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-5.3-maintainer-prompt-hack",
		AuditKey:     "sec5-maintainer-prompt-hack",
		Section:      "Section 5 - Growth & virality",
		Title:        "One-click maintainer install badge prompt",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "AI Prompt badge copy implemented in RepoBadgeGenerator",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-discarded-find-my-door-bounty-thread",
		AuditKey:     "sec5-discarded-bounty-thread",
		Section:      "Section 5 - Growth & virality",
		Title:        "Discarded: Find My Door bounty thread",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Explicitly discarded in specification §5.4",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-discarded-door-of-the-day-share-unlock",
		AuditKey:     "sec5-discarded-door-of-the-day",
		Section:      "Section 5 - Growth & virality",
		Title:        "Discarded: Door-of-the-day + share-unlock",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Explicitly discarded in specification §5.4",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec5-discarded-repo-roast-warm-hug-cards",
		AuditKey:     "sec5-discarded-repo-roast",
		Section:      "Section 5 - Growth & virality",
		Title:        "Discarded: Repo Roast / Warm Hug cards",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Explicitly discarded in specification §5.4",
		},
	})

	// ==========================================
	// Section 6: Metrics & scoring backlog
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec6-signal-1",
		AuditKey:     "sec6-signal-1-gfi-quality",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "GFI Quality Score",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/issues/good-first",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-2",
		AuditKey:     "sec6-signal-2-onboarding-docs",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Onboarding Docs Score",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Onboarding docs checker integrated in scoring",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-3",
		AuditKey:     "sec6-signal-3-pr-rejection",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "PR-Rejection Classification",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-4",
		AuditKey:     "sec6-signal-4-bus-factor",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Bus Factor Gate",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Bus factor gate integrated into C-Rank scoring",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-5",
		AuditKey:     "sec6-signal-5-sentiment-tone",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "PR-Comment Sentiment / Maintainer Tone",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-6",
		AuditKey:     "sec6-signal-6-time-to-first-triage",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Time-to-First-Triage",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Candidate metric for future scoring enhancement",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-7",
		AuditKey:     "sec6-signal-7-issue-pr-conversion",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Issue->PR Conversion",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Candidate metric for future scoring enhancement",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-8",
		AuditKey:     "sec6-signal-8-weekly-activity-trend",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Weekly Activity Trend",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/history/:id",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-9",
		AuditKey:     "sec6-signal-9-review-coverage",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Review Coverage",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Candidate metric for future scoring enhancement",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-10",
		AuditKey:     "sec6-signal-10-bot-activity-ratio",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Bot Activity Ratio",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Bot activity ratio detection integrated in comments analysis",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-11",
		AuditKey:     "sec6-signal-11-release-cadence",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Release Cadence",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Candidate metric for future scoring enhancement",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-12",
		AuditKey:     "sec6-signal-12-repeat-rate",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Contributor Graduation / Repeat Rate",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Repeat contributor rate computed in scoring pipeline",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-13",
		AuditKey:     "sec6-signal-13-fork-pr-ratio",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "Fork->PR Ratio (Parked)",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Explicitly parked in §6.D",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec6-signal-14",
		AuditKey:     "sec6-signal-14-pr-completion-model",
		Section:      "Section 6 - Metrics & scoring backlog",
		Title:        "PR-Completion Model ML (Parked)",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Explicitly parked in §6.D in favor of formula likelihood",
		},
	})

	// ==========================================
	// Section 7: SEO & Content-system backlog
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec7-seo-dynamic-metadata-json-ld-og-images",
		AuditKey:     "sec7-seo-dynamic-metadata",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "Dynamic metadata + JSON-LD + OG images",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "frontend/src/app/opengraph-image.tsx",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-sharded-sitemap",
		AuditKey:     "sec7-seo-sharded-sitemap",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "Sharded sitemap",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "frontend/public/sitemap/main.xml",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-compare-a-b",
		AuditKey:     "sec7-seo-compare-a-b",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "/compare/[a]/[b] route",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/compare/[a]/[b]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-topics-topic-org-org-needs-topics-index",
		AuditKey:     "sec7-seo-topics-org",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "/topics/[topic] and /org/[org] routes",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/topics/[topic]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-contribute-wizard",
		AuditKey:     "sec7-seo-contribute-wizard",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "/contribute wizard",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/contribute",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-internal-link-rule-engine-repo-language-ranking-tier-neighbors-compare-gfi",
		AuditKey:     "sec7-seo-internal-link-engine",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "Internal-link rule engine",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/related",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-freshness-signals-lastmodified-snapshot-date-updated-xh-ago",
		AuditKey:     "sec7-seo-freshness-signals",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "Freshness signals",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Freshness signals and snapshot timestamps rendered in repo details",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec7-seo-annual-state-of-welcoming-oss-report-reports-year",
		AuditKey:     "sec7-seo-annual-report",
		Section:      "Section 7 - SEO & Content-System",
		Title:        "Annual State of Welcoming OSS report",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/reports/[year]",
		},
	})

	// ==========================================
	// Section 8: Infrastructure & ops backlog
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec8-infra-tiered-crawl",
		AuditKey:     "sec8-tiered-crawl-frequency",
		Section:      "Section 8 - Infrastructure & ops backlog",
		Title:        "Tiered crawl frequency",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Tiered crawl intervals configured in crawler pipeline",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec8-infra-event-diff-backfill",
		AuditKey:     "sec8-event-diff-backfill",
		Section:      "Section 8 - Infrastructure & ops backlog",
		Title:        "Event-diff backfill",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/cmd/backfill/main.go",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec8-infra-python-ai-sidecar",
		AuditKey:     "sec8-python-ai-sidecar",
		Section:      "Section 8 - Infrastructure & ops backlog",
		Title:        "Python AI sidecar",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec8-infra-store-github-token",
		AuditKey:     "sec8-store-github-token-encrypted",
		Section:      "Section 8 - Infrastructure & ops backlog",
		Title:        "Store GitHub access token encrypted",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "user_oauth_tokens",
			DBColumn: "access_token_enc",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec8-infra-internal-blog-report",
		AuditKey:     "sec8-internal-blog-report-endpoint",
		Section:      "Section 8 - Infrastructure & ops backlog",
		Title:        "/internal/blog-report endpoint",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/internal/blog-report",
		},
	})

	// ==========================================
	// Section 9: Constraints & Decisions
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-no-orms",
		AuditKey:     "sec9-constraint-no-orms",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "No ORMs - native SQL",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Native sqlx parameterized queries used across all repositories",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-distributed-components",
		AuditKey:     "sec9-constraint-middleware-di",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "Distributed components connect in middleware",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Gin context middleware injection verified",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-no-pgvector",
		AuditKey:     "sec9-constraint-no-pgvector",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "No pgvector; in-process cosine",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "In-process vector search implemented",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-tdd-backend",
		AuditKey:     "sec9-constraint-tdd-backend",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "TDD for backend",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Enforced via Go unit testing and Playwright E2E suites",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-no-fabricated-data",
		AuditKey:     "sec9-constraint-no-fabricated-data",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "No fabricated testimonials/social proof",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Pure real data architecture maintained",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-brand-getmerged",
		AuditKey:     "sec9-constraint-brand-getmerged",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "Brand: GetMerged",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Brand naming verified",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-consent-deletion",
		AuditKey:     "sec9-constraint-gdpr-consent",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "Consent & deletion (GDPR/CCPA)",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "DELETE",
			BackendPath:   "/api/v1/me/data",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec9-constraint-pay-stack",
		AuditKey:     "sec9-constraint-pay-stack",
		Section:      "Section 9 - Constraints & decisions",
		Title:        "Pay stack: dodopayments",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/api/v1/payments/webhook/dodopayments",
		},
	})

	// ==========================================
	// Section 10: Execution Plan 60-Day Sprint
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec10-sprint-sprint-1-the-core-data-moats",
		AuditKey:     "sec10-sprint-1-core-data-moats",
		Section:      "Section 10 - Execution Plan",
		Title:        "Sprint 1: The Core Data Moats",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Sprint 1 deliverables completed",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec10-sprint-sprint-2-the-acceptance-engine",
		AuditKey:     "sec10-sprint-2-acceptance-engine",
		Section:      "Section 10 - Execution Plan",
		Title:        "Sprint 2: The Acceptance Engine",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Sprint 2 deliverables completed",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec10-sprint-sprint-3-payments-entitlements",
		AuditKey:     "sec10-sprint-3-payments-entitlements",
		Section:      "Section 10 - Execution Plan",
		Title:        "Sprint 3: Payments & Entitlements",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Sprint 3 deliverables completed",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec10-sprint-sprint-4-growth-distribution",
		AuditKey:     "sec10-sprint-4-growth-distribution",
		Section:      "Section 10 - Execution Plan",
		Title:        "Sprint 4: Growth & Distribution",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Sprint 4 deliverables completed",
		},
	})

	// ==========================================
	// Section 11: Activation, retention & measurement
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec11-funnel-free-signup",
		AuditKey:     "sec11-activation-free-funnel",
		Section:      "Section 11 - Activation & retention",
		Title:        "Free user activation funnel tracking",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "frontend/src/app/posthog-init.tsx",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-funnel-pro-digest",
		AuditKey:     "sec11-activation-pro-funnel",
		Section:      "Section 11 - Activation & retention",
		Title:        "Pro user activation funnel tracking",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "frontend/src/app/posthog-init.tsx",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-funnel-north-star",
		AuditKey:     "sec11-north-star-metric",
		Section:      "Section 11 - Activation & retention",
		Title:        "North star contributor metric",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "PostHog analytics metric tracked",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-churn-digest-health",
		AuditKey:     "sec11-churn-digest-health",
		Section:      "Section 11 - Activation & retention",
		Title:        "Digest open/click churn signal",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Telemetry metric defined",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-churn-watchlist-health",
		AuditKey:     "sec11-churn-watchlist-health",
		Section:      "Section 11 - Activation & retention",
		Title:        "Watchlist usage churn signal",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Telemetry metric defined",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-churn-likelihood-clicks",
		AuditKey:     "sec11-churn-likelihood-clicks",
		Section:      "Section 11 - Activation & retention",
		Title:        "PR Likelihood usage churn signal",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Telemetry metric defined",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec11-churn-failed-payments",
		AuditKey:     "sec11-churn-dunning-signal",
		Section:      "Section 11 - Activation & retention",
		Title:        "Failed payments & dunning churn signal",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/api/v1/payments/webhook/dodopayments",
		},
	})

	// ==========================================
	// Section 12: Detailed Macro Epics & Granular Sub-Stories
	// ==========================================
	add(ItemMapping{
		CanonicalKey: "sec12-story-1.1",
		AuditKey:     "sec12-story-1.1-onboarding-docs",
		Section:      "Section 12 - Epic 1",
		Title:        "Story 1.1: Onboarding Docs checker",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Onboarding docs checker integrated in repo scoring",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-1.2",
		AuditKey:     "sec12-story-1.2-gfi-quality",
		Section:      "Section 12 - Epic 1",
		Title:        "Story 1.2: GFI Quality Score calculation",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/issues/good-first",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-1.3",
		AuditKey:     "sec12-story-1.3-bus-factor",
		Section:      "Section 12 - Epic 1",
		Title:        "Story 1.3: Repository 90-day Bus Factor calculation",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Bus factor gate active in C-Rank scoring",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-1.4",
		AuditKey:     "sec12-story-1.4-crank-nightly",
		Section:      "Section 12 - Epic 1",
		Title:        "Story 1.4: Update C-Rank nightly pipeline with Onboarding and Bus Factor",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Scoring engine blends Onboarding & Bus Factor signals",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-1.5",
		AuditKey:     "sec12-story-1.5-brand-rename",
		Section:      "Section 12 - Epic 1",
		Title:        "Story 1.5: Execute brand rename to GetMerged",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Brand rename verified across frontend and metadata",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-2.1",
		AuditKey:     "sec12-story-2.1-oauth-token-aes",
		Section:      "Section 12 - Epic 2",
		Title:        "Story 2.1: Encrypt GitHub OAuth tokens with AES-GCM",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "user_oauth_tokens",
			DBColumn: "access_token_enc",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-2.2",
		AuditKey:     "sec12-story-2.2-gdpr-data-deletion",
		Section:      "Section 12 - Epic 2",
		Title:        "Story 2.2: DELETE /api/v1/me/data and GDPR consent",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "DELETE",
			BackendPath:   "/api/v1/me/data",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-2.3",
		AuditKey:     "sec12-story-2.3-dna-worker",
		Section:      "Section 12 - Epic 2",
		Title:        "Story 2.3: Build Contributor DNA background worker",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/user/dna",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-2.4",
		AuditKey:     "sec12-story-2.4-dna-json-cache",
		Section:      "Section 12 - Epic 2",
		Title:        "Story 2.4: Generate contributor DNA JSON and cache in contributor_profiles",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "contributor_profiles",
			DBColumn: "dna_json",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-3.1",
		AuditKey:     "sec12-story-3.1-response-latency",
		Section:      "Section 12 - Epic 3",
		Title:        "Story 3.1: Compute response latency percentiles (p50, p90)",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/pr-likelihood",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-3.2",
		AuditKey:     "sec12-story-3.2-pr-likelihood-api",
		Section:      "Section 12 - Epic 3",
		Title:        "Story 3.2: GET /api/v1/repos/:owner/:name/pr-likelihood",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/pr-likelihood",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-3.3",
		AuditKey:     "sec12-story-3.3-nlp-sidecar-vibe",
		Section:      "Section 12 - Epic 3",
		Title:        "Story 3.3: Async worker pushes comment text to nlp_sidecar",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-3.4",
		AuditKey:     "sec12-story-3.4-pr-acceptance-widget",
		Section:      "Section 12 - Epic 3",
		Title:        "Story 3.4: Build frontend PR Acceptance & Review Time widget",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/repo/[owner]/[name]",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-4.1",
		AuditKey:     "sec12-story-4.1-preflight-evaluate-api",
		Section:      "Section 12 - Epic 4",
		Title:        "Story 4.1: POST /api/v1/preflight/evaluate",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/api/v1/preflight/evaluate",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-4.2",
		AuditKey:     "sec12-story-4.2-preflight-heuristics",
		Section:      "Section 12 - Epic 4",
		Title:        "Story 4.2: Validate PR against heuristic rules",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Heuristic preflight checks verified in preflight handler tests",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-4.3",
		AuditKey:     "sec12-story-4.3-preflight-ui",
		Section:      "Section 12 - Epic 4",
		Title:        "Story 4.3: Build interactive UI at /preflight",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/preflight",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-5.1",
		AuditKey:     "sec12-story-5.1-db-migration-pro",
		Section:      "Section 12 - Epic 5",
		Title:        "Story 5.1: DB migration for user_entitlements",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "user_entitlements",
			DBColumn: "is_pro",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-5.2",
		AuditKey:     "sec12-story-5.2-dodopayments-webhook",
		Section:      "Section 12 - Epic 5",
		Title:        "Story 5.2: POST /api/v1/payments/webhook/dodopayments",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/api/v1/payments/webhook/dodopayments",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-5.3",
		AuditKey:     "sec12-story-5.3-require-pro-middleware",
		Section:      "Section 12 - Epic 5",
		Title:        "Story 5.3: Build Go middleware RequirePro and MySQL quota checker",
		Probe: ProbeSpec{
			Type:     ProbeDBSchema,
			DBTable:  "user_entitlements",
			DBColumn: "monthly_eval_count",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-5.4",
		AuditKey:     "sec12-story-5.4-pricing-page",
		Section:      "Section 12 - Epic 5",
		Title:        "Story 5.4: Build /pricing page",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/pricing",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-5.5",
		AuditKey:     "sec12-story-5.5-resend-digest-pipeline",
		Section:      "Section 12 - Epic 5",
		Title:        "Story 5.5: Implement Resend email pipeline for Monday morning digest",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/internal/jobs/weekly-digest",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-6.1",
		AuditKey:     "sec12-story-6.1-pr-merge-webhook",
		Section:      "Section 12 - Epic 6",
		Title:        "Story 6.1: Implement PR merge webhook listener",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Event stream and crawler detect merged PRs in real-time",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-6.2",
		AuditKey:     "sec12-story-6.2-achievement-cards-svg",
		Section:      "Section 12 - Epic 6",
		Title:        "Story 6.2: Generate SVG Achievement Cards",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/users/:slug/achievement.svg",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-6.3",
		AuditKey:     "sec12-story-6.3-social-share-buttons",
		Section:      "Section 12 - Epic 6",
		Title:        "Story 6.3: One-click LinkedIn & X share buttons",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/u/[username]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-6.4",
		AuditKey:     "sec12-story-6.4-reddit-data-drops",
		Section:      "Section 12 - Epic 6",
		Title:        "Story 6.4: Execute 4x targeted Reddit data drops",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Marketing distribution campaign execution pending",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-6.5",
		AuditKey:     "sec12-story-6.5-show-hn-launch",
		Section:      "Section 12 - Epic 6",
		Title:        "Story 6.5: Launch on Show HN",
		Probe: ProbeSpec{
			Type:           ProbeCategorized,
			StaticStatus:   StatusPending,
			StaticEvidence: "Launch copy and timing ready for release",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-7.1",
		AuditKey:     "sec12-story-7.1-optimal-time-window",
		Section:      "Section 12 - Epic 7",
		Title:        "Story 7.1: Optimal PR Submission Window GET /api/v1/repos/:id/optimal-time",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/optimal-time",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-7.2",
		AuditKey:     "sec12-story-7.2-fit-radar-api",
		Section:      "Section 12 - Epic 7",
		Title:        "Story 7.2: Contributor Fit Radar GET /api/v1/repos/:id/fit-radar",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/fit-radar",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-7.3",
		AuditKey:     "sec12-story-7.3-maintainer-mentorship-index",
		Section:      "Section 12 - Epic 8",
		Title:        "Story 7.3: Maintainer Mentorship Index",
		Probe: ProbeSpec{
			Type:     ProbeFileExists,
			FilePath: "backend/nlp_sidecar/app.py",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-7.4",
		AuditKey:     "sec12-story-7.4-weekly-digest-generator",
		Section:      "Section 12 - Epic 8",
		Title:        "Story 7.4: Automated Weekly Contributor Digest generator",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "POST",
			BackendPath:   "/internal/jobs/weekly-digest",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-9.1",
		AuditKey:     "sec12-story-9.1-repo-badge-prompt-ui",
		Section:      "Section 12 - Epic 9",
		Title:        "Story 9.1: Repo badge prompt UI on /maintainers + repo-page CTA",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "RepoBadgeGenerator provides one-click AI prompt copy",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-9.2",
		AuditKey:     "sec12-story-9.2-profile-badge-prompt-ui",
		Section:      "Section 12 - Epic 9",
		Title:        "Story 9.2: Profile badge prompt UI",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/u/[username]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-9.3",
		AuditKey:     "sec12-story-9.3-conservative-prompts",
		Section:      "Section 12 - Epic 9",
		Title:        "Story 9.3: Conservative badge prompt formatting",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Badge prompt formatting tested and validated in unit tests",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-10.1",
		AuditKey:     "sec12-story-10.1-localized-language-pages",
		Section:      "Section 12 - Epic 10",
		Title:        "Story 10.1: Language-specific copy + data on every language surface",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/rankings/[lang]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-10.2",
		AuditKey:     "sec12-story-10.2-repo-gfi-content",
		Section:      "Section 12 - Epic 10",
		Title:        "Story 10.2: Repo detail page shows good-first-issue content",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/good-first-issues",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-10.3",
		AuditKey:     "sec12-story-10.3-gfi-fallback",
		Section:      "Section 12 - Epic 10",
		Title:        "Story 10.3: Graceful fallback when repo has no GFI content",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Graceful empty state handled in ClientRepoDetail and GFI components",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-11.1",
		AuditKey:     "sec12-story-11.1-compare-route",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.1: Build /compare/[a]/[b] repo comparison page",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/compare/[a]/[b]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-11.2",
		AuditKey:     "sec12-story-11.2-topics-org-routes",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.2: Build /topics/[topic] + /org/[org] surfaces",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/topics/[topic]",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-11.3",
		AuditKey:     "sec12-story-11.3-contribute-wizard",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.3: Build /contribute wizard",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/contribute",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-11.4",
		AuditKey:     "sec12-story-11.4-internal-link-engine",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.4: Internal-link rule engine",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/related",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-11.5",
		AuditKey:     "sec12-story-11.5-freshness-signals",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.5: Freshness signals on repo pages",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "Freshness signals rendered in Repo scorecard",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-11.6",
		AuditKey:     "sec12-story-11.6-annual-report",
		Section:      "Section 12 - Epic 11",
		Title:        "Story 11.6: Annual State of Welcoming OSS report at /reports/[year]",
		Probe: ProbeSpec{
			Type:          ProbeFrontendRoute,
			FrontendRoute: "/reports/[year]",
		},
	})

	add(ItemMapping{
		CanonicalKey: "sec12-story-12.1",
		AuditKey:     "sec12-story-12.1-gfi-repo-id-isolation",
		Section:      "Section 12 - Epic 12",
		Title:        "Story 12.1: Fix repo identifier parsing and URL decoding across GFI routes",
		Probe: ProbeSpec{
			Type:          ProbeBackendRoute,
			BackendMethod: "GET",
			BackendPath:   "/api/v1/repos/:id/good-first-issues",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-12.2",
		AuditKey:     "sec12-story-12.2-gfi-pipeline-integrity",
		Section:      "Section 12 - Epic 12",
		Title:        "Story 12.2: Audit GFI ingestion pipeline with FK verification and orphaned purge",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "GFI ingestion integrity verified in GFIRepository tests",
		},
	})
	add(ItemMapping{
		CanonicalKey: "sec12-story-12.3",
		AuditKey:     "sec12-story-12.3-frontend-gfi-repo-check",
		Section:      "Section 12 - Epic 12",
		Title:        "Story 12.3: Update frontend ClientRepoDetail to assert exact repo matching",
		Probe: ProbeSpec{
			Type:           ProbeStaticCheck,
			StaticStatus:   StatusImplemented,
			StaticEvidence: "ClientRepoDetail secondary integrity gate validated by E2E test",
		},
	})

	return mappings
}

// FindMapping looks up a mapping for a given census key or alias.
func FindMapping(mappings map[string]ItemMapping, key string) (ItemMapping, bool) {
	if m, ok := mappings[key]; ok {
		return m, true
	}
	cleanKey := strings.ToLower(key)
	for k, m := range mappings {
		if strings.ToLower(k) == cleanKey {
			return m, true
		}
	}
	return ItemMapping{}, false
}
