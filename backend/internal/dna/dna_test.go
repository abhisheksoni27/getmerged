package dna

import (
	"testing"
	"time"
)

// These tests are the spec for the persona engine. They live in the
// dna package itself (not pipeline) so the test/import graph stays flat.

func TestCompute_PersonaFloor_EmptyInput(t *testing.T) {
	r := Compute(nil, 0, 0)
	if r.Persona != PersonaEmerging {
		t.Fatalf("expected floor %q, got %q", PersonaEmerging, r.Persona)
	}
	if r.Temporal.Label != TemporalSparse {
		t.Fatalf("expected sparse temporal, got %q", r.Temporal.Label)
	}
}

func TestCompute_NightOwl(t *testing.T) {
	var nodes []Node
	for i := 0; i < 10; i++ {
		hour := 14
		if i < 7 {
			hour = 23
		}
		nodes = append(nodes, Node{
			MergedAt: time.Date(2026, 1, 1+i, hour, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Lang:     "Go",
			Repo:     "foo/bar",
			Stars:    100,
		})
	}
	r := Compute(nodes, 0, 0)
	if r.Persona != PersonaNightOwl {
		t.Fatalf("expected %q, got %q", PersonaNightOwl, r.Persona)
	}
	if r.Temporal.Label != TemporalNightOwl {
		t.Fatalf("expected temporal %q, got %q", TemporalNightOwl, r.Temporal.Label)
	}
}

func TestCompute_Specialist(t *testing.T) {
	// 8/10 = 80% Go → Specialist (threshold 70%).
	var nodes []Node
	langs := []string{"Go", "Go", "Go", "Go", "Go", "Go", "Go", "Go", "Python", "Python"}
	for i, lang := range langs {
		nodes = append(nodes, Node{
			MergedAt: time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Lang:     lang,
			Repo:     "foo/bar",
			Stars:    100,
		})
	}
	r := Compute(nodes, 0, 0)
	if r.Persona != PersonaSpecialist {
		t.Fatalf("expected %q, got %q", PersonaSpecialist, r.Persona)
	}
}

func TestCompute_Polyglot(t *testing.T) {
	// 6 distinct repos, 6 langs (Go x2). Polyglot wins on (>=5 repos, >=4 langs).
	var nodes []Node
	langs := []string{"Go", "Python", "Rust", "TypeScript", "Ruby", "Go"}
	repos := []string{"a/x", "b/y", "c/z", "d/w", "e/v", "f/u"}
	for i := range langs {
		nodes = append(nodes, Node{
			MergedAt: time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Lang:     langs[i],
			Repo:     repos[i],
			Stars:    100,
		})
	}
	r := Compute(nodes, 0, 0)
	if r.Persona != PersonaPolyglot {
		t.Fatalf("expected %q, got %q", PersonaPolyglot, r.Persona)
	}
}

func TestCompute_Builder(t *testing.T) {
	// 5 PRs, 5 distinct repos, 2 langs only (Polyglot needs >=4 langs).
	// 3/5 Go is 60% (Specialist needs >=70%). avg star = 25k ≥ 5k threshold.
	var nodes []Node
	repos := []string{"big/a", "big/b", "big/c", "big/d", "big/e"}
	stars := []int{50000, 30000, 20000, 15000, 10000}
	langs := []string{"Go", "Go", "Go", "Python", "Rust"}
	for i := range repos {
		nodes = append(nodes, Node{
			MergedAt: time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Lang:     langs[i],
			Repo:     repos[i],
			Stars:    stars[i],
		})
	}
	r := Compute(nodes, 0, 0)
	if r.Persona != PersonaBuilder {
		t.Fatalf("expected %q, got %q (verdict: %s)", PersonaBuilder, r.Persona, r.PersonaVerdict)
	}
}

func TestCompute_StarsPulledInAndTopRepos(t *testing.T) {
	// 2 PRs to golang/go (120k), 1 to small/repo (100). User authored 100% in each.
	// stars_pulled_in = 120000 + 100 = 120100.
	// top_repos ordered by stars desc, golang/go first.
	var nodes []Node
	nodes = append(nodes, Node{MergedAt: time.Date(2026, 1, 1, 10, 0, 0, 0, time.UTC).Format(time.RFC3339), Lang: "Go", Repo: "golang/go", Stars: 120000})
	nodes = append(nodes, Node{MergedAt: time.Date(2026, 1, 2, 10, 0, 0, 0, time.UTC).Format(time.RFC3339), Lang: "Go", Repo: "golang/go", Stars: 120000})
	nodes = append(nodes, Node{MergedAt: time.Date(2026, 1, 3, 10, 0, 0, 0, time.UTC).Format(time.RFC3339), Lang: "Go", Repo: "small/repo", Stars: 100})
	r := Compute(nodes, 0, 0)
	if r.StarsPulledIn != 120100 {
		t.Fatalf("expected stars_pulled_in=120100, got %d", r.StarsPulledIn)
	}
	if len(r.TopRepos) != 2 {
		t.Fatalf("expected 2 distinct top repos, got %d", len(r.TopRepos))
	}
	if r.TopRepos[0].NameWithOwner != "golang/go" || r.TopRepos[0].StargazerCount != 120000 {
		t.Fatalf("expected golang/go first, got %+v", r.TopRepos[0])
	}
}
