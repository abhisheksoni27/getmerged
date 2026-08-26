package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const (
	quizMaxLanguages    = 10 // AC2: reject oversized lists
	quizMaxRepos        = 5  // AC1: top N=5 S/A repos
	quizMaxIssuesPerRep = 3  // open GFIs shown per matched repo
	quizCacheTTL        = 5 * time.Minute
	quizRateMax         = 10 // AC2: 10 req/IP/min
	quizRateWindowSec   = 60
)

// slugAliases canonicalizes frontend language slugs to GitHub-style names.
var quizSlugAliases = map[string]string{
	"golang":      "go",
	"cpp":         "c++",
	"cplusplus":   "c++",
	"c2b2b":       "c++",
	"csharp":      "c#",
	"c-sharp":     "c#",
	"fsharp":      "f#",
	"objective-c": "objective-c",
}

var quizLangChars = regexp.MustCompile(`^[a-z0-9+#.\- ]{1,32}$`)

// HasInvalidQuizLangToken reports whether raw contains a non-empty entry that
// fails language-name validation (AC2: invalid lists rejected).
func HasInvalidQuizLangToken(raw string) bool {
	for _, part := range strings.Split(raw, ",") {
		l := strings.ToLower(strings.TrimSpace(part))
		if l == "" {
			continue
		}
		if _, isAlias := quizSlugAliases[l]; !isAlias && !quizLangChars.MatchString(l) {
			return true
		}
	}
	return false
}

// NormalizeQuizLanguages splits a comma-separated language param into a
// deduped, lowercase, alias-canonicalized list (max max entries).
func NormalizeQuizLanguages(raw string, max int) []string {
	seen := make(map[string]struct{}, max)
	out := make([]string, 0, max)
	for _, part := range strings.Split(raw, ",") {
		l := strings.ToLower(strings.TrimSpace(part))
		if l == "" {
			continue
		}
		if alias, ok := quizSlugAliases[l]; ok {
			l = alias
		}
		if !quizLangChars.MatchString(l) {
			continue
		}
		if _, dup := seen[l]; dup {
			continue
		}
		seen[l] = struct{}{}
		out = append(out, l)
		if len(out) >= max {
			break
		}
	}
	return out
}

// In-memory fixed-window rate limiter (AC2): works even when Valkey is down.
var (
	quizRLMu     sync.Mutex
	quizRLCounts = make(map[string]int64)
)

func quizAllowIP(ip string) bool {
	window := time.Now().Unix() / quizRateWindowSec
	key := ip + "|" + strconv.FormatInt(window, 10)
	quizRLMu.Lock()
	defer quizRLMu.Unlock()
	if len(quizRLCounts) > 1<<16 {
		quizRLCounts = make(map[string]int64) // shed stale windows
	}
	quizRLCounts[key]++
	return quizRLCounts[key] <= int64(quizRateMax)
}

// Known-language set loaded from the repositories table; refreshed at most
// once per cache TTL. nil means the check could not run (fail open).
var (
	quizKnownMu    sync.Mutex
	quizKnownLangs map[string]struct{}
	quizKnownAt    time.Time
)

func quizKnownLanguageSet(db *sqlx.DB) map[string]struct{} {
	quizKnownMu.Lock()
	defer quizKnownMu.Unlock()
	if quizKnownLangs != nil && time.Since(quizKnownAt) < quizCacheTTL {
		return quizKnownLangs
	}
	var langs []string
	if err := db.Select(&langs,
		`SELECT DISTINCT language FROM repositories WHERE language IS NOT NULL AND TRIM(language) != ''`); err != nil {
		slog.Warn("quiz-match: known-language query failed", "err", err)
		return quizKnownLangs
	}
	set := make(map[string]struct{}, len(langs))
	for _, l := range langs {
		set[strings.ToLower(strings.TrimSpace(l))] = struct{}{}
	}
	if len(set) == 0 {
		return quizKnownLangs
	}
	quizKnownLangs = set
	quizKnownAt = time.Now()
	return set
}

type quizMatchEntry struct {
	repoResponse
	Issues []repository.GoodFirstIssueItem `json:"issues"`
}

type quizMatchResponse struct {
	Matches []quizMatchEntry `json:"matches"`
	Message string           `json:"message,omitempty"`
}

type quizCacheStamp struct {
	body []byte
	at   time.Time
}

// 5-minute response cache keyed on normalized params (AC2).
var (
	quizCacheMu     sync.Mutex
	quizCacheStamps = make(map[string]quizCacheStamp)
)

func quizCacheGet(key string) ([]byte, bool) {
	quizCacheMu.Lock()
	defer quizCacheMu.Unlock()
	stamp, ok := quizCacheStamps[key]
	if !ok || time.Since(stamp.at) > quizCacheTTL {
		return nil, false
	}
	return stamp.body, true
}

func quizCachePut(key string, body []byte) {
	quizCacheMu.Lock()
	defer quizCacheMu.Unlock()
	if len(quizCacheStamps) > 1<<12 {
		now := time.Now()
		for k, v := range quizCacheStamps {
			if now.Sub(v.at) > quizCacheTTL {
				delete(quizCacheStamps, k)
			}
		}
	}
	quizCacheStamps[key] = quizCacheStamp{body: body, at: time.Now()}
}

// QuizMatchHandler handles GET /api/public/quiz-match?languages=a,b&level=x:
// anonymous onboarding matching that reuses the existing C-Rank scoring and
// GFI matching behind ForYou — no new scoring code (AC1).
func QuizMatchHandler(repoStore repository.RepoRepository, gfiRepo repository.GFIRepository, db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !quizAllowIP(c.ClientIP()) {
			c.Header("Retry-After", strconv.Itoa(quizRateWindowSec))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		rawLangs := c.Query("languages")
		if HasInvalidQuizLangToken(rawLangs) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid language entry"})
			return
		}
		langs := NormalizeQuizLanguages(rawLangs, quizMaxLanguages+1)
		if len(langs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or empty languages parameter"})
			return
		}
		if len(langs) > quizMaxLanguages {
			c.JSON(http.StatusBadRequest, gin.H{"error": "too many languages (max 10)"})
			return
		}
		level := strings.ToLower(strings.TrimSpace(c.Query("level")))
		switch level {
		case "", "beginner", "intermediate", "advanced":
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid level parameter"})
			return
		}

		if db != nil {
			known := quizKnownLanguageSet(db)
			for _, l := range langs {
				if _, ok := known[l]; !ok {
					c.JSON(http.StatusBadRequest, gin.H{"error": "unknown language: " + l})
					return
				}
			}
		}

		cacheKey := strings.Join(langs, ",") + "|level=" + level
		if body, ok := quizCacheGet(cacheKey); ok {
			c.Header("X-Cache", "HIT")
			c.Header("Cache-Control", "public, max-age=300")
			c.Data(http.StatusOK, "application/json; charset=utf-8", body)
			return
		}

		matches := make([]quizMatchEntry, 0, quizMaxRepos)
		repos, _, listErr := repoStore.List(c.Request.Context(), repository.RepoFilter{
			Languages: langs,
			MinTier:   "A", // S/A C-Rank only
			SortBy:    "c_rank_score",
			Order:     "DESC",
			Limit:     25,
		})
		if listErr != nil {
			slog.Warn("quiz-match repo query failed", "err", listErr)
		} else {
			sort.SliceStable(repos, func(i, j int) bool {
				if repos[i].CRankScore != repos[j].CRankScore {
					return repos[i].CRankScore > repos[j].CRankScore
				}
				return repos[i].Stars > repos[j].Stars
			})
			if len(repos) > quizMaxRepos {
				repos = repos[:quizMaxRepos]
			}
			for _, r := range repos {
				entry := quizMatchEntry{repoResponse: toRepoResponse(r)}
				items, issueErr := gfiRepo.ListByRepoID(c.Request.Context(), r.ID, quizMaxIssuesPerRep)
				if issueErr != nil {
					slog.Warn("quiz-match issue query failed", "repo_id", r.ID, "err", issueErr)
					items = []repository.GoodFirstIssueItem{}
				}
				entry.Issues = items
				matches = append(matches, entry)
			}
		}

		resp := quizMatchResponse{Matches: matches}
		if len(matches) == 0 {
			// AC3: explicit empty-result contract.
			resp.Message = "No strong matches yet \u2014 connect GitHub for full matching"
		}
		body, err := json.Marshal(resp)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode response"})
			return
		}
		quizCachePut(cacheKey, body)
		c.Header("X-Cache", "MISS")
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", body)
	}
}

// SeedQuizSnapshotFromRequest writes the quiz-chosen languages as the user's
// snapshot synchronously and reports whether the quiz cookie was present.
// Quiz preferences OVERWRITE any existing snapshot languages (idempotent
// upsert); rank data and all other user fields are untouched.
func SeedQuizSnapshotFromRequest(c *gin.Context, userRepo repository.UserRepository, userID int64) bool {
	raw, err := c.Cookie("opendoor_quiz_langs")
	if err != nil || raw == "" {
		return false
	}
	langs := NormalizeQuizLanguages(raw, maxLangSnapshot)
	if len(langs) == 0 {
		return false
	}
	snapshot := make([]LangCount, 0, len(langs))
	for i, l := range langs {
		snapshot = append(snapshot, LangCount{Lang: l, Count: len(langs) - i})
	}
	encoded, err := json.Marshal(snapshot)
	if err == nil {
		if err := userRepo.UpdateLanguageSnapshot(c.Request.Context(), userID, string(encoded)); err == nil {
			slog.Info("seeded quiz language snapshot", "user_id", userID, "langs", len(snapshot))
			secure := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
			http.SetCookie(c.Writer, &http.Cookie{
				Name:     "opendoor_quiz_langs",
				Value:    "",
				Path:     "/",
				MaxAge:   -1,
				HttpOnly: true,
				Secure:   secure,
				SameSite: http.SameSiteLaxMode,
			})
			return true
		} else {
			slog.Warn("quiz snapshot write failed", "user_id", userID, "err", err)
		}
	}
	return false
}
