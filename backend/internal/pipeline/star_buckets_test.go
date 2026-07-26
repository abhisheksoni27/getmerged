package pipeline_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/pipeline"
)

func TestCategorizeStarBucket(t *testing.T) {
	tests := []struct {
		stars    int
		expected string
	}{
		{400, "<500"},
		{500, "500-1k"},
		{999, "500-1k"},
		{1000, "1k-5k"},
		{4999, "1k-5k"},
		{5000, "5k-20k"},
		{19999, "5k-20k"},
		{20000, "20k-50k"},
		{49999, "20k-50k"},
		{50000, "50k+"},
		{100000, "50k+"},
	}

	for _, tt := range tests {
		got := pipeline.CategorizeStarBucket(tt.stars)
		if got != tt.expected {
			t.Errorf("CategorizeStarBucket(%d) = %q, expected %q", tt.stars, got, tt.expected)
		}
	}
}
