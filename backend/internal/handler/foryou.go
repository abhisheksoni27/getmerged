package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// githubLangClient bounds each GitHub page fetch so OAuth login never stalls.
var githubLangClient = &http.Client{Timeout: 3 * time.Second}

// LangCount is one ranked entry of the user's language snapshot.
type LangCount struct {
	Lang  string `json:"lang"`
	Count int    `json:"count"`
}

const (
	freeLangLimit      = 3  // free tier sees top 3 (AC5)
	maxLangSnapshot    = 6  // snapshot stores up to 6 entries (AC1)
	forYouMaxRepos     = 10 // AC2
	forYouMaxIssues    = 10 // AC2
	snapshotStaleAfter = 30 * 24 * time.Hour
)

// SyncGithubLanguages fetches /user/repos?per_page=100&sort=pushed (up to 2
// pages), aggregates primary_language counts client-side (no per-repo calls),
// and stores a ranked {lang,count} snapshot (max 6 entries) on the user record.
func SyncGithubLanguages(ctx context.Context, accessToken string, userID int64, userRepo repository.UserRepository) error {
	var repos []struct {
		Language *string `json:"language"`
	}
	for page := 1; page <= 2; page++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet,
			"https://api.github.com/user/repos?per_page=100&sort=pushed&page="+strconv.Itoa(page), nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("User-Agent", "opendoor-app")
		req.Header.Set("Accept", "application/vnd.github+json")

		resp, err := githubLangClient.Do(req)
		if err != nil {
			return err
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		resp.Body.Close()
		if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
			return fmt.Errorf("github api rate limited (status %d)", resp.StatusCode)
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("github api status %d", resp.StatusCode)
		}
		var batch []struct {
			Language *string `json:"language"`
		}
		if err := json.Unmarshal(body, &batch); err != nil {
			return err
		}
		repos = append(repos, batch...)
		if len(batch) < 100 {
			break
		}
	}

	counts := map[string]int{}
	for _, r := range repos {
		lang := strings.ToLower(strings.TrimSpace(deref(r.Language)))
		if lang != "" {
			counts[lang]++
		}
	}
	if len(counts) == 0 {
		return nil
	}

	type langEntry struct {
		name  string
		count int
	}
	ordered := make([]langEntry, 0, len(counts))
	for name, count := range counts {
		ordered = append(ordered, langEntry{name, count})
	}
	sort.Slice(ordered, func(i, j int) bool {
		if ordered[i].count != ordered[j].count {
			return ordered[i].count > ordered[j].count
		}
		return ordered[i].name < ordered[j].name
	})
	if len(ordered) > maxLangSnapshot {
		ordered = ordered[:maxLangSnapshot]
	}

	snapshot := make([]LangCount, 0, len(ordered))
	for _, e := range ordered {
		snapshot = append(snapshot, LangCount{Lang: e.name, Count: e.count})
	}
	raw, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}
	if err := userRepo.UpdateLanguageSnapshot(ctx, userID, string(raw)); err != nil {
		return err
	}
	slog.Info("stored github language snapshot", "user_id", userID, "langs", len(snapshot))
	return nil
}

// GetForYouHandler handles GET /api/v1/user/for-you: personalized repo +
// good-first-issue matches from the user's GitHub language snapshot.
func GetForYouHandler(userRepo repository.UserRepository, repoStore repository.RepoRepository, gfiRepo repository.GFIRepository, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		userID := userIDVal.(int64)

		c.Header("Cache-Control", "private, no-cache, no-store, must-revalidate")

		user, err := userRepo.FindByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user"})
			return
		}

		isPro := false
		if entRepo != nil {
			if ent, entErr := entRepo.GetEntitlement(c.Request.Context(), userID); entErr == nil && ent != nil {
				isPro = ent.IsPro
			}
		}

		var snapshot []LangCount
		if user.LangSnapshot != nil && *user.LangSnapshot != "" {
			_ = json.Unmarshal([]byte(*user.LangSnapshot), &snapshot)
		}

		visible := snapshot
		locked := 0
		if !isPro && len(visible) > freeLangLimit {
			locked = len(visible) - freeLangLimit
			visible = visible[:freeLangLimit]
		}

		langs := make([]string, 0, len(visible))
		for _, l := range visible {
			langs = append(langs, l.Lang)
		}

		stale := user.LangSnapshotAt == nil || time.Since(*user.LangSnapshotAt) > snapshotStaleAfter

		response := gin.H{
			"is_pro":              isPro,
			"snapshot":            visible,
			"locked_languages":    locked,
			"snapshot_updated_at": user.LangSnapshotAt,
			"stale":               stale,
			"repos":               []repoResponse{},
			"issues":              []repository.GoodFirstIssueItem{},
		}

		// AC3: snapshot >30 days old without re-login falls back to the manual
		// filter UI client-side; empty snapshot yields the empty state.
		if len(langs) == 0 {
			c.JSON(http.StatusOK, response)
			return
		}

		repos, _, listErr := repoStore.List(c.Request.Context(), repository.RepoFilter{
			Languages: langs,
			MinTier:   "A", // S/A C-Rank only (AC2)
			SortBy:    "c_rank_score",
			Order:     "DESC",
			Limit:     50,
		})
		if listErr != nil {
			slog.Warn("for-you repo query failed", "user_id", userID, "err", listErr)
		} else {
			sort.SliceStable(repos, func(i, j int) bool {
				if repos[i].CRankScore != repos[j].CRankScore {
					return repos[i].CRankScore > repos[j].CRankScore
				}
				return repos[i].Stars > repos[j].Stars
			})
			if len(repos) > forYouMaxRepos {
				repos = repos[:forYouMaxRepos]
			}
			matches := make([]repoResponse, 0, len(repos))
			for _, r := range repos {
				matches = append(matches, toRepoResponse(r))
			}
			response["repos"] = matches
		}

		perLang := make([][]repository.GoodFirstIssueItem, len(langs))
		for i, lang := range langs {
			items, issueErr := gfiRepo.ListByLanguage(c.Request.Context(), lang, forYouMaxIssues)
			if issueErr != nil {
				slog.Warn("for-you issue query failed", "user_id", userID, "lang", lang, "err", issueErr)
				continue
			}
			perLang[i] = items
		}
		issues := make([]repository.GoodFirstIssueItem, 0, forYouMaxIssues)
		for round := 0; len(issues) < forYouMaxIssues; round++ {
			added := false
			for i := range perLang {
				if round < len(perLang[i]) && len(issues) < forYouMaxIssues {
					issues = append(issues, perLang[i][round])
					added = true
				}
			}
			if !added {
				break
			}
		}
		response["issues"] = issues

		c.JSON(http.StatusOK, response)
	}
}
