package scoring

import "sort"

// ComputePercentiles calculates the 50th (median) and 90th percentile values from a slice of floats.
// Returns (0, 0) gracefully if the slice is empty, preventing panics or NaNs.
func ComputePercentiles(samples []float64) (p50, p90 float64) {
	n := len(samples)
	if n == 0 {
		return 0, 0
	}
	if n == 1 {
		return samples[0], samples[0]
	}

	sorted := make([]float64, n)
	copy(sorted, samples)
	sort.Float64s(sorted)

	// p50 (median)
	p50 = calculatePercentile(sorted, 0.50)
	// p90
	p90 = calculatePercentile(sorted, 0.90)

	return p50, p90
}

func calculatePercentile(sorted []float64, p float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n == 1 {
		return sorted[0]
	}

	index := p * float64(n-1)
	lower := int(index)
	upper := lower + 1
	weight := index - float64(lower)

	if upper >= n {
		return sorted[n-1]
	}

	return sorted[lower]*(1.0-weight) + sorted[upper]*weight
}
