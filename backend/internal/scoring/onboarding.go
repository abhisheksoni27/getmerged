package scoring

// OnboardingDocs holds boolean presence of repository newcomer documentation.
type OnboardingDocs struct {
	HasContributing  bool
	HasPRTemplate    bool
	HasIssueTemplate bool
	HasCodeOfConduct bool
	HasIssuesEnabled bool
}

// CalculateOnboardingScore returns a 0–100 score reflecting repository documentation readiness.
func CalculateOnboardingScore(docs OnboardingDocs) int {
	var rawScore int
	var maxPossible int = 100

	if docs.HasContributing {
		rawScore += 40
	}
	if docs.HasPRTemplate {
		rawScore += 25
	}
	if docs.HasCodeOfConduct {
		rawScore += 15
	}

	if docs.HasIssuesEnabled {
		if docs.HasIssueTemplate {
			rawScore += 20
		}
	} else {
		// When issues are disabled, score is out of 80; scale to 100
		maxPossible = 80
	}

	if maxPossible == 0 {
		return 0
	}

	normalized := (rawScore * 100) / maxPossible
	if normalized > 100 {
		return 100
	}
	return normalized
}
