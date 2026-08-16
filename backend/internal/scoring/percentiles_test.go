package scoring_test

import (
	"math"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestComputePercentiles(t *testing.T) {
	cases := []struct {
		name     string
		samples  []float64
		wantP50  float64
		wantP90  float64
	}{
		{
			name:    "empty slice returns 0, 0",
			samples: []float64{},
			wantP50: 0,
			wantP90: 0,
		},
		{
			name:    "single sample returns sample value",
			samples: []float64{12.5},
			wantP50: 12.5,
			wantP90: 12.5,
		},
		{
			name:    "standard latency distribution",
			samples: []float64{2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0},
			wantP50: 11.0,
			wantP90: 18.2,
		},
		{
			name:    "unordered samples",
			samples: []float64{20.0, 2.0, 14.0, 6.0, 10.0},
			wantP50: 10.0,
			wantP90: 17.6,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p50, p90 := scoring.ComputePercentiles(tc.samples)
			if math.Abs(p50-tc.wantP50) > 0.1 {
				t.Errorf("p50 mismatch: got %v, want %v", p50, tc.wantP50)
			}
			if math.Abs(p90-tc.wantP90) > 0.1 {
				t.Errorf("p90 mismatch: got %v, want %v", p90, tc.wantP90)
			}
		})
	}
}
