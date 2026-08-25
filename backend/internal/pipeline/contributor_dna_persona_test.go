package pipeline

import (
	"testing"
	"time"
)

func n(repo, lang string, stars int, mergedAt time.Time) DNANode {
	out := DNANode{
		MergedAt:   mergedAt.Format(time.RFC3339),
		Repository: DNARepo{NameWithOwner: repo, StargazerCount: stars},
	}
	if lang != "" {
		l := lang
		out.Repository.PrimaryLanguage = &struct{ Name string `json:"name"` }{Name: l}
	}
	return out
}

func TestComputePersona_NightOwl(t *testing.T) {
	var nodes []DNANode
	for i := 0; i < 10; i++ {
		hour := 14
		if i < 7 {
			hour = 23
		}
		nodes = append(nodes, n("foo/bar", "Go", 100,
			time.Date(2026, 1, 1+i, hour, 0, 0, 0, time.UTC)))
	}
	persona, _, _, temporal := computePersona(GraphQLDNAData{Search: struct {
		IssueCount int       `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
	}{Nodes: nodes}})
	if persona != PersonaNightOwl {
		t.Fatalf("expected %q, got %q", PersonaNightOwl, persona)
	}
	if temporal.Label != TemporalNightOwl {
		t.Fatalf("expected temporal %q, got %q", TemporalNightOwl, temporal.Label)
	}
}

func TestComputePersona_Specialist(t *testing.T) {
	var nodes []DNANode
	langs := []string{"Go", "Go", "Go", "Go", "Go", "Go", "Go", "Go", "Python", "Python"}
	for i, lang := range langs {
		nodes = append(nodes, n("foo/bar", lang, 100,
			time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC)))
	}
	persona, _, _, _ := computePersona(GraphQLDNAData{Search: struct {
		IssueCount int       `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
	}{Nodes: nodes}})
	if persona != PersonaSpecialist {
		t.Fatalf("expected %q, got %q", PersonaSpecialist, persona)
	}
}

func TestComputePersona_PolyglotArchitect(t *testing.T) {
	var nodes []DNANode
	langs := []string{"Go", "Python", "Rust", "TypeScript", "Ruby", "Go"}
	repos := []string{"a/x", "b/y", "c/z", "d/w", "e/v", "f/u"}
	for i := range langs {
		nodes = append(nodes, n(repos[i], langs[i], 100,
			time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC)))
	}
	persona, _, _, _ := computePersona(GraphQLDNAData{Search: struct {
		IssueCount int       `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
	}{Nodes: nodes}})
	if persona != PersonaPolyglot {
		t.Fatalf("expected %q, got %q", PersonaPolyglot, persona)
	}
}

func TestComputePersona_Builder(t *testing.T) {
	var nodes []DNANode
	repos := []string{"big/a", "big/b", "big/c", "big/d", "big/e"}
	stars := []int{50000, 30000, 20000, 15000, 10000}
	for i := range repos {
		nodes = append(nodes, n(repos[i], "Go", stars[i],
			time.Date(2026, 1, 1+i, 10, 0, 0, 0, time.UTC)))
	}
	persona, _, _, _ := computePersona(GraphQLDNAData{Search: struct {
		IssueCount int       `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
	}{Nodes: nodes}})
	if persona != PersonaBuilder {
		t.Fatalf("expected %q, got %q", PersonaBuilder, persona)
	}
}

func TestComputePersona_FloorIsEmerging(t *testing.T) {
	persona, _, _, _ := computePersona(GraphQLDNAData{})
	if persona != PersonaEmerging {
		t.Fatalf("expected floor %q, got %q", PersonaEmerging, persona)
	}
}

func TestStarsPulledIn(t *testing.T) {
	// 2 PRs to golang/go (120k stars), 1 PR to small/repo (100 stars).
	// User authored 100% of PRs in each repo in this window → share=1.0 each.
	// stars_pulled_in = 120000 + 100 = 120100.
	var nodes []DNANode
	nodes = append(nodes, n("golang/go", "Go", 120000, time.Date(2026, 1, 1, 10, 0, 0, 0, time.UTC)))
	nodes = append(nodes, n("golang/go", "Go", 120000, time.Date(2026, 1, 2, 10, 0, 0, 0, time.UTC)))
	nodes = append(nodes, n("small/repo", "Go", 100, time.Date(2026, 1, 3, 10, 0, 0, 0, time.UTC)))
	stars, topRepos := computeStarsAndTopRepos(GraphQLDNAData{Search: struct {
		IssueCount int       `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
	}{Nodes: nodes}})
	want := 120000 + 100
	if stars != want {
		t.Fatalf("expected stars_pulled_in=%d, got %d", want, stars)
	}
	if len(topRepos) != 2 {
		t.Fatalf("expected 2 distinct top repos, got %d", len(topRepos))
	}
	if topRepos[0].NameWithOwner != "golang/go" || topRepos[0].StargazerCount != 120000 {
		t.Fatalf("expected golang/go first, got %+v", topRepos[0])
	}
}
