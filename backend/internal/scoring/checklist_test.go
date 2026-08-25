package scoring

import (
	"testing"
)

func TestGenerateMaintainerChecklist(t *testing.T) {
	// Scenario: Bad response latency (>72h), no CONTRIBUTING.md, first timer rate < 40%
	items := GenerateMaintainerChecklist(
		80.0, // p50 > 72h
		80.0,
		50.0,
		30.0,  // first timer < 40%
		false, // no contributing
		false, // no pr template
		false,
		0, // 0 gfi
		1, // bus factor 1
	)

	if len(items) == 0 {
		t.Fatalf("expected items, got 0")
	}

	if len(items) > 5 {
		t.Fatalf("expected at most 5 items, got %d", len(items))
	}

	// Verify sorting descending by impact points
	for i := 0; i < len(items)-1; i++ {
		if items[i].ImpactPts < items[i+1].ImpactPts {
			t.Errorf("items not sorted descending: %f < %f", items[i].ImpactPts, items[i+1].ImpactPts)
		}
	}

	// First item should have impact 10 (first_pr_merge_rate)
	if items[0].ImpactPts != 10.0 {
		t.Errorf("expected top item to be 10.0 pts, got %f", items[0].ImpactPts)
	}
}
