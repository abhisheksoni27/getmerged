package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestPercentileRank_Empty(t *testing.T) {
	got := scoring.PercentileRank(50, nil)
	if got != 0 {
		t.Errorf("expected 0 for empty slice, got %.2f", got)
	}
}

func TestPercentileRank_SingleValue(t *testing.T) {
	got := scoring.PercentileRank(42, []float64{42})
	if got != 0 {
		// Only element, nothing below it → 0th percentile
		t.Errorf("expected 0, got %.2f", got)
	}
}

func TestPercentileRank_AllIdentical(t *testing.T) {
	all := []float64{5, 5, 5, 5}
	got := scoring.PercentileRank(5, all)
	if got != 0 {
		t.Errorf("expected 0 for all-identical values, got %.2f", got)
	}
}

func TestPercentileRank_Maximum(t *testing.T) {
	all := []float64{1, 2, 3, 4, 5}
	got := scoring.PercentileRank(5, all)
	// 4 values below 5 out of 5 total → 80%
	want := 80.0
	if got != want {
		t.Errorf("PercentileRank(5, [1..5]) = %.2f, want %.2f", got, want)
	}
}

func TestPercentileRank_Minimum(t *testing.T) {
	all := []float64{1, 2, 3, 4, 5}
	got := scoring.PercentileRank(1, all)
	// 0 values below 1 → 0%
	if got != 0 {
		t.Errorf("PercentileRank(1, [1..5]) = %.2f, want 0", got)
	}
}

func TestPercentileRank_Middle(t *testing.T) {
	all := []float64{0, 25, 50, 75, 100}
	got := scoring.PercentileRank(50, all)
	// 2 values below 50 out of 5 → 40%
	want := 40.0
	if got != want {
		t.Errorf("PercentileRank(50, ...) = %.2f, want %.2f", got, want)
	}
}

func TestNormaliseAll_InvertsTimemetrics(t *testing.T) {
	// Repo A: fast responder (2h), Repo B: slow responder (20h)
	// After inversion: A should have higher ResponseTime score than B
	all := []scoring.RawMetrics{
		{TimeToFirstResponseHours: 2},
		{TimeToFirstResponseHours: 20},
	}

	normed := scoring.NormaliseAll(all)

	if len(normed) != 2 {
		t.Fatalf("expected 2 results, got %d", len(normed))
	}
	if normed[0].ResponseTime <= normed[1].ResponseTime {
		t.Errorf("fast responder should score higher: A=%.2f, B=%.2f", normed[0].ResponseTime, normed[1].ResponseTime)
	}
}

func TestNormaliseAll_Empty(t *testing.T) {
	got := scoring.NormaliseAll(nil)
	if got != nil {
		t.Errorf("expected nil for empty input, got %v", got)
	}
}
