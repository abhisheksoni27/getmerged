// Package dna owns the Contributor DNA result type and its pure
// synthesis functions. Lives in its own package so both pipeline (the
// GitHub-fetcher worker) and repository (the public-profile read path)
// can depend on it without an import cycle.
package dna

import (
	"sort"
	"strconv"
	"time"
)

type Result struct {
	TotalMergedPRs     int               `json:"total_merged_prs"`
	FollowersCount     int               `json:"followers_count"`
	RepositoriesCount  int               `json:"repositories_count"`
	LanguageBreakdown  map[string]int    `json:"language_breakdown"`
	AvgAdditions       float64           `json:"avg_additions"`
	AvgDeletions       float64           `json:"avg_deletions"`
	AvgChangedFiles    float64           `json:"avg_changed_files"`
	PrimaryLanguages   []string          `json:"primary_languages"`
	SkillLevel         string            `json:"skill_level"`
	PRSizePreference   string            `json:"pr_size_preference"`
	ReviewEngagement   string            `json:"review_engagement"`
	// Identity-card fields (2026-Q3). omitempty so old stored payloads
	// (written before these fields existed) still parse on read.
	Persona        string     `json:"persona,omitempty"`
	PersonaVerdict string     `json:"persona_verdict,omitempty"`
	PersonaSignals []string   `json:"persona_signals,omitempty"`
	Temporal       Temporal    `json:"temporal"`
	StarsPulledIn  int         `json:"stars_pulled_in"`
	TopRepos       []TopRepo   `json:"top_repos"`
	OwnedRepos     []OwnedRepo `json:"owned_repos,omitempty"`
}

type Temporal struct {
	PeakHourUTC int    `json:"peak_hour_utc"`
	Label       string `json:"label"`
}

type TopRepo struct {
	NameWithOwner   string  `json:"name_with_owner"`
	StargazerCount  int     `json:"stargazer_count"`
	PrimaryLanguage *string `json:"primary_language,omitempty"`
}

type OwnedRepo struct {
	NameWithOwner   string  `json:"name_with_owner"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	StargazerCount  int     `json:"stargazer_count"`
	ForkCount       int     `json:"fork_count"`
	URL             string  `json:"url"`
	IsFork          bool    `json:"is_fork"`
	PrimaryLanguage *string `json:"primary_language,omitempty"`
}

// Persona archetypes. Never negative — Emerging is the floor.
const (
	PersonaEmerging     = "Emerging Contributor"
	PersonaNightOwl     = "Night Owl Maintainer"
	PersonaSpecialist   = "Specialist"
	PersonaPolyglot     = "Polyglot Architect"
	PersonaBuilder      = "Builder"
	PersonaQuietShipper = "Quiet Shipper"
)

const (
	TemporalNightOwl   = "Night Owl"
	TemporalLunch      = "Lunch Burner"
	TemporalNineToFive = "9-to-5"
	TemporalSparse     = "Sparse"
)

// Node is the lean per-PR shape we accept as input. The pipeline
// package's GraphQL response maps onto it; the public page can also
// accept it directly when synthesising from a cache.
type Node struct {
	MergedAt   string
	Lang       string // primary language; "" if unknown
	Repo       string // nameWithOwner
	Stars      int
	Additions  int
	Deletions  int
	Files      int
	Comments   int
	Reviews    int
}

// Compute runs the full synthesis. The same inputs always produce
// the same output. Pure function — no I/O.
func Compute(nodes []Node, followers, totalRepos int) Result {
	res := Result{
		TotalMergedPRs:    len(nodes),
		FollowersCount:    followers,
		RepositoriesCount: totalRepos,
		LanguageBreakdown: make(map[string]int),
		TopRepos:          []TopRepo{},
	}

	if len(nodes) == 0 {
		res.SkillLevel = "Novice"
		res.PRSizePreference = "Compact"
		res.ReviewEngagement = "Light"
		res.Persona = PersonaEmerging
		res.PersonaVerdict = "Just getting started. Ship a few PRs and the picture fills in."
		res.PersonaSignals = []string{"no merged PRs yet"}
		res.Temporal = Temporal{Label: TemporalSparse}
		return res
	}

	var totalAdds, totalDels, totalFiles, totalComments int
	for _, pr := range nodes {
		totalAdds += pr.Additions
		totalDels += pr.Deletions
		totalFiles += pr.Files
		totalComments += pr.Comments + pr.Reviews
		if pr.Lang != "" {
			res.LanguageBreakdown[pr.Lang]++
		}
	}

	n := float64(len(nodes))
	res.AvgAdditions = float64(totalAdds) / n
	res.AvgDeletions = float64(totalDels) / n
	res.AvgChangedFiles = float64(totalFiles) / n

	if len(nodes) >= 25 {
		res.SkillLevel = "Veteran Contributor"
	} else if len(nodes) >= 5 {
		res.SkillLevel = "Active Contributor"
	} else {
		res.SkillLevel = "Emerging Contributor"
	}

	avgDelta := res.AvgAdditions + res.AvgDeletions
	switch {
	case avgDelta > 500:
		res.PRSizePreference = "Large & Architectural"
	case avgDelta > 100:
		res.PRSizePreference = "Medium Scope"
	default:
		res.PRSizePreference = "Surgical / Focused"
	}

	avgEngagement := float64(totalComments) / n
	switch {
	case avgEngagement > 5:
		res.ReviewEngagement = "Deeply Collaborative"
	case avgEngagement > 1:
		res.ReviewEngagement = "Responsive"
	default:
		res.ReviewEngagement = "Direct & Minimal"
	}

	for lang := range res.LanguageBreakdown {
		res.PrimaryLanguages = append(res.PrimaryLanguages, lang)
	}

	res.Persona, res.PersonaVerdict, res.PersonaSignals, res.Temporal = computePersona(nodes)
	res.StarsPulledIn, res.TopRepos = computeStarsAndTopRepos(nodes)

	return res
}

func computePersona(nodes []Node) (persona, verdict string, signals []string, temporal Temporal) {
	if len(nodes) == 0 {
		return PersonaEmerging,
			"Just getting started. Ship a few PRs and the picture fills in.",
			[]string{"no merged PRs yet"},
			Temporal{Label: TemporalSparse}
	}

	temporal = computeTemporal(nodes)
	signals = append(signals, "temporal: "+temporal.Label)

	langCount := map[string]int{}
	for _, pr := range nodes {
		if pr.Lang != "" {
			langCount[pr.Lang]++
		}
	}
	topLang, topLangShare := "", 0
	for lang, c := range langCount {
		if c > topLangShare {
			topLang, topLangShare = lang, c
		}
	}
	topLangShareF := float64(topLangShare) / float64(len(nodes))

	repos := map[string]struct{}{}
	for _, pr := range nodes {
		repos[pr.Repo] = struct{}{}
	}
	distinctRepos := len(repos)

	starTotal := 0
	for _, pr := range nodes {
		starTotal += pr.Stars
	}
	avgStar := float64(starTotal) / float64(len(nodes))

	switch {
	case temporal.Label == TemporalNightOwl && len(nodes) >= 5:
		persona = PersonaNightOwl
		verdict = "Ships when the world is asleep. Most merges land after midnight UTC."
		signals = append(signals, "night-owl merges")
	case topLangShareF >= 0.7 && len(nodes) >= 5:
		persona = PersonaSpecialist
		verdict = formatSpecialistVerdict(topLang, topLangShareF)
		signals = append(signals, formatSpecialistSignal(topLang, topLangShareF))
	case distinctRepos >= 5 && len(langCount) >= 4:
		persona = PersonaPolyglot
		verdict = formatPolyglotVerdict(distinctRepos, len(langCount))
		signals = append(signals,
			strconv.Itoa(distinctRepos)+" repos",
			strconv.Itoa(len(langCount))+" languages")
	case avgStar >= 5000 && len(nodes) >= 3:
		persona = PersonaBuilder
		verdict = formatBuilderVerdict(avgStar)
		signals = append(signals, "avg repo: "+formatStarCount(int(avgStar))+"★")
	default:
		persona = PersonaEmerging
		verdict = "An emerging contributor. Keep shipping — the picture fills in fast."
		signals = append(signals, strconv.Itoa(len(nodes))+" merged PRs")
	}

	if len(signals) > 3 {
		signals = signals[:3]
	}
	return
}

func computeTemporal(nodes []Node) Temporal {
	if len(nodes) == 0 {
		return Temporal{Label: TemporalSparse}
	}
	buckets := [24]int{}
	for _, pr := range nodes {
		t, err := time.Parse(time.RFC3339, pr.MergedAt)
		if err != nil {
			continue
		}
		buckets[t.UTC().Hour()]++
	}
	peak, peakCount := 0, 0
	for h, c := range buckets {
		if c > peakCount {
			peak, peakCount = h, c
		}
	}
	share := float64(peakCount) / float64(len(nodes))
	switch {
	case peak >= 22 || peak < 4:
		if share >= 0.5 {
			return Temporal{PeakHourUTC: peak, Label: TemporalNightOwl}
		}
	case peak >= 11 && peak <= 14:
		if share >= 0.4 {
			return Temporal{PeakHourUTC: peak, Label: TemporalLunch}
		}
	default:
		if share >= 0.4 {
			return Temporal{PeakHourUTC: peak, Label: TemporalNineToFive}
		}
	}
	return Temporal{PeakHourUTC: peak, Label: TemporalSparse}
}

func computeStarsAndTopRepos(nodes []Node) (int, []TopRepo) {
	if len(nodes) == 0 {
		return 0, []TopRepo{}
	}
	type agg struct {
		stars int
		lang  *string
	}
	perRepo := map[string]*agg{}
	for _, pr := range nodes {
		if _, ok := perRepo[pr.Repo]; ok {
			continue
		}
		a := &agg{stars: pr.Stars}
		if pr.Lang != "" {
			l := pr.Lang
			a.lang = &l
		}
		perRepo[pr.Repo] = a
	}
	starsPulled := 0
	for _, a := range perRepo {
		starsPulled += a.stars
	}

	type row struct {
		name  string
		stars int
		lang  *string
	}
	all := make([]row, 0, len(perRepo))
	for name, a := range perRepo {
		all = append(all, row{name, a.stars, a.lang})
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].stars != all[j].stars {
			return all[i].stars > all[j].stars
		}
		return all[i].name < all[j].name
	})
	top := make([]TopRepo, 0, 6)
	for i, r := range all {
		if i >= 6 {
			break
		}
		top = append(top, TopRepo{NameWithOwner: r.name, StargazerCount: r.stars, PrimaryLanguage: r.lang})
	}
	return starsPulled, top
}

func formatStarCount(n int) string {
	switch {
	case n >= 1_000_000:
		return strconv.Itoa(n/1_000_000) + "M"
	case n >= 1_000:
		return strconv.Itoa(n/1_000) + "k"
	default:
		return strconv.Itoa(n)
	}
}

func formatSpecialistVerdict(lang string, share float64) string {
	return "Goes deep. " + lang + " is home — " +
		strconv.Itoa(int(share*100)) + "% of merged work."
}

func formatSpecialistSignal(lang string, share float64) string {
	return lang + ": " + strconv.Itoa(int(share*100)) + "%"
}

func formatPolyglotVerdict(repos, langs int) string {
	return "Comfortable in many worlds. Merged across " +
		strconv.Itoa(repos) + " repos and " + strconv.Itoa(langs) + " languages."
}

func formatBuilderVerdict(avgStar float64) string {
	return "Builds where the builders are. Ships into repos averaging " +
		formatStarCount(int(avgStar)) + " stars."
}
