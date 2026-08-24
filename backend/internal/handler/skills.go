package handler

import (
	"context"
	"encoding/json"
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

// githubSkillsClient is bounded tightly so a slow GitHub API never delays auth.
var githubSkillsClient = &http.Client{Timeout: 2 * time.Second}

// ImportGithubSkills fetches the user's public repos (up to 300) with the OAuth
// token, aggregates primary languages, and stores the top 5 on users.skills.
// Every failure path is best-effort: log a warning and return — never an error.
func ImportGithubSkills(ctx context.Context, accessToken string, userID int64, userRepo repository.UserRepository) {
	defer func() {
		if r := recover(); r != nil {
			slog.Warn("skills import panicked", "user_id", userID, "err", r)
		}
	}()

	var pages [][]byte
	for page := 1; page <= 3; page++ {
		req, err := http.NewRequestWithContext(ctx, "GET",
			"https://api.github.com/user/repos?per_page=100&sort=pushed&visibility=public&page="+strconv.Itoa(page), nil)
		if err != nil {
			slog.Warn("skills import skipped", "user_id", userID, "err", err)
			return
		}
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("User-Agent", "opendoor-app")
		req.Header.Set("Accept", "application/vnd.github+json")

		resp, err := githubSkillsClient.Do(req)
		if err != nil {
			slog.Warn("repo fetch failed during skills import", "user_id", userID, "page", page, "err", err)
			return
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			slog.Warn("repo fetch non-200 during skills import", "user_id", userID, "status", resp.StatusCode)
			return
		}
		pages = append(pages, body)
		var countCheck []json.RawMessage
		if json.Unmarshal(body, &countCheck) == nil && len(countCheck) < 100 {
			break
		}
	}

	var repos []struct {
		Language *string `json:"language"`
	}
	for _, body := range pages {
		var batch []struct {
			Language *string `json:"language"`
		}
		if err := json.Unmarshal(body, &batch); err != nil {
			slog.Warn("repo payload decode failed during skills import", "user_id", userID, "err", err)
			return
		}
		repos = append(repos, batch...)
	}

	counts := map[string]int{}
	for _, r := range repos {
		lang := strings.ToLower(strings.TrimSpace(deref(r.Language)))
		if lang == "" {
			continue
		}
		counts[lang]++
	}
	if len(counts) == 0 {
		return
	}

	type langCount struct {
		name  string
		count int
	}
	ordered := make([]langCount, 0, len(counts))
	for name, count := range counts {
		ordered = append(ordered, langCount{name, count})
	}
	sort.Slice(ordered, func(i, j int) bool {
		if ordered[i].count != ordered[j].count {
			return ordered[i].count > ordered[j].count
		}
		return ordered[i].name < ordered[j].name
	})
	if len(ordered) > 5 {
		ordered = ordered[:5]
	}

	seen := map[string]bool{}
	var parts []string
	total := 0
	for _, lc := range ordered {
		if seen[lc.name] || lc.name == "" {
			continue
		}
		if total+len(lc.name)+1 > 100 {
			break
		}
		seen[lc.name] = true
		parts = append(parts, lc.name)
		total += len(lc.name) + 1
	}
	skills := strings.Join(parts, ",")
	if skills == "" {
		return
	}

	if err := userRepo.UpdateUserSkills(ctx, userID, skills); err != nil {
		slog.Warn("failed to store imported skills", "user_id", userID, "err", err)
		return
	}
	slog.Info("imported github skills", "user_id", userID, "skills", skills)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GetTopMatchesHandler handles GET /api/v1/user/top-matches: runs the existing
// match engine server-side against the user's imported skills. Returns an empty
// list when the user has no skills or no matches so clients can hide the module.
func GetTopMatchesHandler(userRepo repository.UserRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
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

		languages := parseLanguages(deref(user.Skills))
		if len(languages) == 0 {
			c.JSON(http.StatusOK, gin.H{"data": []matchResponse{}, "skills": user.Skills})
			return
		}

		level := strings.TrimSpace(strings.ToLower(c.Query("level")))
		repos, _, err := repoStore.List(c.Request.Context(), repository.RepoFilter{
			Languages:         languages,
			SortBy:            "c_rank_score",
			Order:             "DESC",
			Limit:             9,
			ExcludeStale:      true,
			HasGoodFirstIssue: level != "experienced",
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}

		matches := rankMatches(repos, level)
		if len(matches) > 3 {
			matches = matches[:3]
		}
		if matches == nil {
			matches = []matchResponse{}
		}

		c.JSON(http.StatusOK, gin.H{"data": matches, "skills": user.Skills})
	}
}
