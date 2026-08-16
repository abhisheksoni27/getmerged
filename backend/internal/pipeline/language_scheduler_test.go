package pipeline

import (
	"testing"
)

func TestBuildWeightedLanguageSchedule(t *testing.T) {
	counts := map[string]int{
		"TypeScript": 15000,
		"Python":     12000,
		"Go":         6000,
		"Zig":        50,
		"Rust":       3000,
	}

	baseLangs := []string{"TypeScript", "Python", "Go", "Zig", "Rust", "C", "Ruby"}

	schedule := BuildWeightedLanguageSchedule(counts, baseLangs)
	if len(schedule) == 0 {
		t.Fatal("expected non-empty schedule")
	}

	// High count languages should appear more often than low count languages
	freq := make(map[string]int)
	for _, l := range schedule {
		freq[l]++
	}

	if freq["TypeScript"] <= freq["Zig"] {
		t.Errorf("expected TypeScript freq (%d) > Zig freq (%d)", freq["TypeScript"], freq["Zig"])
	}

	if freq["C"] == 0 || freq["Ruby"] == 0 {
		t.Errorf("expected base languages with 0 count to still be present in schedule")
	}
}
