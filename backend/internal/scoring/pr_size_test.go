package scoring

import (
	"strings"
	"testing"
)

func TestComputePRSizeSweetSpot(t *testing.T) {
	spot := ComputePRSizeSweetSpot(24.0, 70.0)

	if spot.SmallPR.MedianMergeHours >= spot.LargePR.MedianMergeHours {
		t.Fatalf("expected small PRs to merge faster than large PRs, got small: %.1f, large: %.1f", spot.SmallPR.MedianMergeHours, spot.LargePR.MedianMergeHours)
	}

	if spot.SmallPR.MergeRate <= spot.LargePR.MergeRate {
		t.Fatalf("expected small PRs to have higher merge rate than large PRs")
	}

	if !strings.Contains(spot.ActionableAdvice, "under 150 lines") {
		t.Fatalf("expected actionable advice to mention sweet spot threshold, got: %s", spot.ActionableAdvice)
	}
}
