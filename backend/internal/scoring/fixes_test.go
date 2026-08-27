package scoring

import (
	"strings"
	"testing"
)

// failingChecks covers every check key the evaluator can mark failed/warn.
var failingChecks = []PreflightCheckItem{
	{Key: "conventional_title", Passed: false},
	{Key: "test_coverage", Passed: false},
	{Key: "pr_size", Passed: false},
	{Key: "description_depth", Passed: false},
	{Key: "issue_linkage", Passed: false},
	{Key: "unknown_check", Passed: false}, // defensive fallback path
}

func TestFixForCheckReturnsAtLeastOneFix(t *testing.T) {
	input := PreflightInput{
		RepoFullName:  "acme/widgets",
		PRTitle:       "fix the bug",
		PRDescription: "Resolves a crash on startup.",
		ChangedFiles:  []string{"internal/server.go"},
		PRURL:         "https://github.com/acme/widgets/pull/42",
	}
	for _, c := range failingChecks {
		fixes := FixForCheck(c, input)
		if len(fixes) < 1 {
			t.Fatalf("check %q returned 0 fixes", c.Key)
		}
		for _, f := range fixes {
			if f.Type == "" || f.Label == "" || f.Payload == "" || f.ApplyMethod == "" {
				t.Fatalf("check %q fix missing required field: %+v", c.Key, f)
			}
		}
	}
}

// TestFixForCheckNeverPanicsOnBadInput guarantees AC5: valid, null, empty and
// malformed PR payloads all return a safe fallback fix instead of throwing.
func TestFixForCheckNeverPanicsOnBadInput(t *testing.T) {
	cases := []PreflightInput{
		{},                                       // empty / null-ish
		{PRTitle: ""},                            // empty title
		{PRTitle: strings.Repeat("x", 5000)},     // oversized title
		{PRURL: "not-a-url"},                     // malformed PR URL
		{PRURL: "https://github.com/acme/widgets/pull/NaN"}, // non-numeric PR number
		{RepoFullName: "broken repo/%%%"},        // malformed repo slug
		{ChangedFiles: nil, PRTitle: "fix: x"},
	}

	for _, c := range cases {
		for _, chk := range failingChecks {
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Fatalf("FixForCheck panicked on %+v: %v", c, r)
					}
				}()
				fixes := FixForCheck(chk, c)
				if len(fixes) < 1 {
					t.Fatalf("no fallback fix for %+v", c)
				}
			}()
		}
	}
}

// TestFixApplyURLCapped enforces AC3: deep-link URLs never exceed 2000 chars;
// when they would, applyMethod falls back to clipboard and ApplyURL is blank.
func TestFixApplyURLCapped(t *testing.T) {
	big := strings.Repeat("z", 5000)
	input := PreflightInput{
		RepoFullName:  "acme/widgets",
		PRTitle:       big,
		PRDescription: big,
		PRURL:         "https://github.com/acme/widgets/pull/42",
	}
	for _, chk := range failingChecks {
		for _, f := range FixForCheck(chk, input) {
			if len(f.ApplyURL) > maxApplyURLLen {
				t.Fatalf("apply_url exceeded 2000 chars: %d", len(f.ApplyURL))
			}
			if len(f.ApplyURL) == maxApplyURLLen {
				t.Fatalf("apply_url hit exact cap which means not bounded")
			}
		}
	}
}

// TestFixTypes exercises each supported type appears for the right check.
func TestFixTypes(t *testing.T) {
	input := PreflightInput{
		RepoFullName:  "acme/widgets",
		PRTitle:       "fix the bug",
		PRDescription: "Resolves a crash.",
		ChangedFiles:  []string{"internal/server.go"},
		PRURL:         "https://github.com/acme/widgets/pull/42",
	}
	want := map[string]string{
		"conventional_title": "conventional_commit",
		"test_coverage":      "missing_tests",
		"issue_linkage":      "issue_link",
	}
	for key, wantType := range want {
		chk := PreflightCheckItem{Key: key, Passed: false}
		fixes := FixForCheck(chk, input)
		found := false
		for _, f := range fixes {
			if f.Type == wantType {
				found = true
			}
		}
		if !found {
			t.Fatalf("check %q missing expected fix type %q", key, wantType)
		}
	}
}
