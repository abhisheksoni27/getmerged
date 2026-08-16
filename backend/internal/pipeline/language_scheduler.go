package pipeline

import (
	"log/slog"
	"sort"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// ExpandedDefaultLanguages provides base fallback programming languages.
var ExpandedDefaultLanguages = []string{
	"Go", "Python", "JavaScript", "TypeScript", "Java", "PHP", "Rust",
	"Kotlin", "Shell", "C++", "C", "Dart", "Swift", "Ruby", "Elixir",
	"Zig", "Scala", "Haskell", "C#", "Lua", "OCaml", "Julia", "Clojure",
	"R", "Nim", "Svelte", "Vue",
}

// BuildWeightedLanguageSchedule produces an interleaved round-robin sequence based on counts.
func BuildWeightedLanguageSchedule(counts map[string]int, baseLangs []string) []string {
	// Merge all unique languages
	allLangs := make(map[string]int)
	for _, l := range baseLangs {
		allLangs[l] = 0
	}
	for l, c := range counts {
		if l != "" {
			allLangs[l] = c
		}
	}

	// Calculate weights (1 to 5) based on logarithmic scaling
	type langWeight struct {
		name   string
		weight int
	}
	var weights []langWeight
	for l, count := range allLangs {
		w := 1
		if count > 5000 {
			w = 4
		} else if count > 1000 {
			w = 3
		} else if count > 200 {
			w = 2
		}
		weights = append(weights, langWeight{name: l, weight: w})
	}

	// Sort for deterministic interleaving
	sort.Slice(weights, func(i, j int) bool {
		if weights[i].weight == weights[j].weight {
			return weights[i].name < weights[j].name
		}
		return weights[i].weight > weights[j].weight
	})

	// Interleave into schedule
	var schedule []string
	maxWeight := 4
	for round := 0; round < maxWeight; round++ {
		for _, lw := range weights {
			if lw.weight > round {
				schedule = append(schedule, lw.name)
			}
		}
	}

	if len(schedule) == 0 {
		return baseLangs
	}
	return schedule
}

// LanguageScheduler maintains dynamic weighted round-robin scheduling for crawler discovery.
type LanguageScheduler struct {
	db          *sqlx.DB
	schedule    []string
	idx         int
	mu          sync.Mutex
	lastRefresh time.Time
}

// NewLanguageScheduler creates a new LanguageScheduler.
func NewLanguageScheduler(db *sqlx.DB) *LanguageScheduler {
	ls := &LanguageScheduler{db: db}
	ls.Refresh()
	return ls
}

// Refresh reloads language repo counts from DB and recalculates the weighted schedule.
func (ls *LanguageScheduler) Refresh() {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	counts := make(map[string]int)
	if ls.db != nil {
		type countRow struct {
			Language string `db:"language"`
			Count    int    `db:"cnt"`
		}
		var rows []countRow
		err := ls.db.Select(&rows, `
			SELECT COALESCE(language, '') AS language, COUNT(*) AS cnt 
			FROM repositories 
			WHERE language IS NOT NULL AND language != '' 
			GROUP BY language
		`)
		if err != nil {
			slog.Warn("language_scheduler: failed to fetch language counts", "err", err)
		} else {
			for _, r := range rows {
				counts[r.Language] = r.Count
			}
		}
	}

	ls.schedule = BuildWeightedLanguageSchedule(counts, ExpandedDefaultLanguages)
	ls.lastRefresh = time.Now()
	if ls.idx >= len(ls.schedule) {
		ls.idx = 0
	}
}

// Next returns the next language in the weighted round-robin schedule.
func (ls *LanguageScheduler) Next() string {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	// Auto-refresh once every 6 hours
	if time.Since(ls.lastRefresh) > 6*time.Hour {
		go ls.Refresh()
	}

	if len(ls.schedule) == 0 {
		return "Go"
	}

	lang := ls.schedule[ls.idx%len(ls.schedule)]
	ls.idx = (ls.idx + 1) % len(ls.schedule)
	return lang
}
