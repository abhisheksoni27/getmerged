package scoring

import (
	"testing"
)

func ptrF64(v float64) *float64 { return &v }
func ptrInt(v int) *int         { return &v }

// AC7 fixture: empty telemetry — every metric unavailable must yield an
// 'insufficient data' row, never a crash or a fabricated median.
func TestGenerateRankGapChecklist_EmptyTelemetry(t *testing.T) {
	items := GenerateRankGapChecklist(PlaybookTelemetry{})
	if len(items) != 4 {
		t.Fatalf("expected 4 rows for empty telemetry, got %d", len(items))
	}
	for _, it := range items {
		if it.Status != GapStatusInsufficient {
			t.Errorf("%s: expected insufficient_data on empty telemetry, got %q", it.ID, it.Status)
		}
	}
}

// AC7 fixture: partial telemetry — only available metrics produce real gap
// math; unavailable ones stay 'insufficient data'.
func TestGenerateRankGapChecklist_PartialTelemetry(t *testing.T) {
	p50 := 96.0 // well above the 24h S-tier ceiling
	items := GenerateRankGapChecklist(PlaybookTelemetry{
		ResponseP50Hours: &p50,
		BusFactor:        ptrInt(1),
	})

	var firstReview, breadth, triage, gfi *RankGapItem
	for i := range items {
		switch items[i].ID {
		case "first_review_time":
			firstReview = &items[i]
		case "reviewer_breadth":
			breadth = &items[i]
		case "triage_velocity":
			triage = &items[i]
		case "good_first_issues":
			gfi = &items[i]
		}
	}

	if firstReview == nil || firstReview.Status != GapStatusOpen {
		t.Fatalf("first_review_time should be a quantified gap, got %+v", firstReview)
	}
	// AC4 baseline: the gap string carries current-vs-target numbers.
	if want := "median 96.0h vs S-tier <=24h — trim 72.0h"; firstReview.Gap != want {
		t.Fatalf("first_review gap numbers wrong: got %q want %q", firstReview.Gap, want)
	}
	if breadth == nil || breadth.Status != GapStatusOpen {
		t.Fatalf("reviewer_breadth (bus factor 1) should be a gap, got %+v", breadth)
	}
	if want := "1 distinct reviewers vs S-tier >=3 — add 2 more"; breadth.Gap != want {
		t.Fatalf("breadth gap numbers wrong: got %q want %q", breadth.Gap, want)
	}
	if triage == nil || triage.Status != GapStatusInsufficient {
		t.Fatalf("triage_velocity missing metric should be insufficient_data, got %+v", triage)
	}
	if gfi == nil || gfi.Status != GapStatusInsufficient {
		t.Fatalf("good_first_issues missing scan should be insufficient_data, got %+v", gfi)
	}
}

// AC1: no reviews observed => explicit copy instead of median math.
func TestGenerateRankGapChecklist_NoReviewsYet(t *testing.T) {
	p50 := 5.0 // would be a great median but there are zero reviews
	items := GenerateRankGapChecklist(PlaybookTelemetry{
		ResponseP50Hours:     &p50,
		ReviewsObservedCount: ptrInt(0),
	})
	got := ""
	for _, it := range items {
		if it.ID == "first_review_time" {
			got = it.Gap
		}
	}
	if got != "No reviews yet — add reviewers" {
		t.Fatalf("expected no-reviews copy, got %q", got)
	}
}

// AC1: zero issues => the triage gap row is skipped entirely.
func TestGenerateRankGapChecklist_ZeroIssuesSkipsTriage(t *testing.T) {
	triageHours := 200.0
	issues := 0
	items := GenerateRankGapChecklist(PlaybookTelemetry{
		TriageHours:     &triageHours,
		IssuesCreated6m: &issues,
	})
	for _, it := range items {
		if it.ID == "triage_velocity" {
			t.Fatalf("triage row must be skipped when issues==0, got %+v", it)
		}
	}
	if len(items) != 3 {
		t.Fatalf("expected 3 rows after skipping triage, got %d", len(items))
	}
}

// AC7 fixture: improved case classifies strictly-increasing scores.
func TestCompareRescoreOutcome_Improved(t *testing.T) {
	if got := CompareRescoreOutcome(41.2, 58.9); got != OutcomeImproved {
		t.Fatalf("expected improved, got %q", got)
	}
}

// AC7 fixture: regressed and flat cases never report improvement.
func TestCompareRescoreOutcome_RegressedAndFlat(t *testing.T) {
	if got := CompareRescoreOutcome(58.9, 41.2); got != OutcomeRegressed {
		t.Fatalf("expected regressed, got %q", got)
	}
	if got := CompareRescoreOutcome(55.0, 55.0); got != OutcomeNoChange {
		t.Fatalf("expected no_change, got %q", got)
	}
	if got := CompareRescoreOutcome(55.0, 55.0000001); got != OutcomeNoChange {
		t.Fatalf("epsilon noise should stay no_change, got %q", got)
	}
}
