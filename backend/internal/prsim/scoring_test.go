package prsim

import "testing"

const sampleDiff = `diff --git a/main.go b/main.go
index 111..222 100644
--- a/main.go
+++ b/main.go
@@ -1,3 +1,4 @@
 package main
+func main() {}
-func old() {}
diff --git a/internal/prsim/prsim_test.go b/internal/prsim/prsim_test.go
new file mode 100644
--- /dev/null
+++ b/internal/prsim/prsim_test.go
@@ -0,0 +1,2 @@
+func TestX(t *testing.T) {}
`

func TestValidateDiff(t *testing.T) {
	if err := ValidateDiff(""); err == nil {
		t.Fatal("empty diff must be rejected")
	}
	if err := ValidateDiff("not a unified diff"); err == nil {
		t.Fatal("non-diff payload must be rejected")
	}
	if err := ValidateDiff("\n\n" + sampleDiff); err != nil {
		t.Fatalf("hunk-leading diff should pass: %v", err)
	}
	big := make([]byte, MaxDiffBytes+1)
	if err := ValidateDiff(string(big)); err == nil {
		t.Fatal("oversize diff must be rejected")
	}
}

func TestChangedDiffLines(t *testing.T) {
	if got := ChangedDiffLines(sampleDiff); got != 3 {
		t.Fatalf("want 3 changed lines (excl +++/--- headers), got %d", got)
	}
}

func TestScoreWeightsSum(t *testing.T) {
	w := DefaultWeights
	if w.Title+w.DiffSize+w.TestsTouched+w.DescriptionLength+w.ContributingMatch != 100 {
		t.Fatal("weights must sum to 100")
	}
}

func TestScoreFullMarks(t *testing.T) {
	res := Score("feat: add streaming ingest", sampleDiff, "Adds a new streaming ingest path with tests covering the parser.", 10, nil)
	if res.Score != 100 {
		t.Fatalf("want 100, got %+v", res.Breakdown)
	}
}

func TestScoreWeakSubmission(t *testing.T) {
	res := Score("", "not-a-diff", "", 0, []string{"check CONTRIBUTING.md"})
	if res.Score < 0 || res.Score >= DefaultWeights.Title+DefaultWeights.DiffSize {
		t.Fatalf("weak submission should earn near-zero points, got %d", res.Score)
	}
	if res.Breakdown.DiffSize != 0 {
		t.Fatalf("zero-change diff must earn no size points")
	}
	if len(res.Suggestions) == 0 {
		t.Fatal("weak submissions must produce suggestions")
	}
}

func TestScoreDiffSizeDecay(t *testing.T) {
	fullPts, _ := scoreDiffSize(400)
	if fullPts != DefaultWeights.DiffSize {
		t.Fatalf("400 lines should earn full points")
	}
	half, _ := scoreDiffSize(700)
	if half <= 0 || half >= DefaultWeights.DiffSize {
		t.Fatalf("mid-size diff should earn partial points, got %d", half)
	}
	zero, hint := scoreDiffSize(2000)
	if zero != 0 || len(hint) == 0 {
		t.Fatalf("huge diffs earn zero points plus hint")
	}
}

func TestTestsTouchedDetection(t *testing.T) {
	cases := map[string]bool{
		sampleDiff: true,
		"diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const x = 1;\n": false,
		"diff --git a/__tests__/a.test.js b/__tests__/a.test.js\n":                true,
	}
	for diff, want := range cases {
		if got := testsTouched(diff); got != want {
			t.Fatalf("testsTouched=%v want %v", got, want)
		}
	}
}

func TestMedianHoursEvenAndOdd(t *testing.T) {
	if got := MedianHours([]float64{10, 30}); got != 20 {
		t.Fatalf("even median, got %v", got)
	}
	if got := MedianHours([]float64{30, 10, 20}); got != 20 {
		t.Fatalf("odd median, got %v", got)
	}
}

func TestNormalizeRepo(t *testing.T) {
	for in, want := range map[string]string{
		"Owner/Repo":              "owner/repo",
		"https://github.com/o/r/": "o/r",
		"github.com/o/r":          "o/r",
		"  o/r ":                  "o/r",
	} {
		if got := NormalizeRepo(in); got != want {
			t.Fatalf("NormalizeRepo(%q)=%q want %q", in, got, want)
		}
	}
}
