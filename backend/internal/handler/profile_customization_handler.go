package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type UpdateProfileCustomizationRequest struct {
	Bio              string                       `json:"bio"`
	Headline         string                       `json:"headline"`
	ShowcaseProjects []repository.ShowcaseProject `json:"showcase_projects"`
	PinnedRepos      []string                     `json:"pinned_repos"`
}

// UpdateUserProfileCustomizationHandler handles PATCH /api/v1/user/profile
func UpdateUserProfileCustomizationHandler(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var req UpdateProfileCustomizationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		// Sanitize inputs
		if len(req.Bio) > 1000 {
			req.Bio = req.Bio[:1000]
		}
		if len(req.Headline) > 120 {
			req.Headline = req.Headline[:120]
		}

		// Cap showcase projects to max 12
		if len(req.ShowcaseProjects) > 12 {
			req.ShowcaseProjects = req.ShowcaseProjects[:12]
		}
		for i := range req.ShowcaseProjects {
			if req.ShowcaseProjects[i].ID == "" {
				req.ShowcaseProjects[i].ID = fmt.Sprintf("proj-%d-%d", time.Now().UnixNano(), i)
			}
			if len(req.ShowcaseProjects[i].Title) > 100 {
				req.ShowcaseProjects[i].Title = req.ShowcaseProjects[i].Title[:100]
			}
			if len(req.ShowcaseProjects[i].Description) > 500 {
				req.ShowcaseProjects[i].Description = req.ShowcaseProjects[i].Description[:500]
			}
		}

		showcaseJSON, err := json.Marshal(req.ShowcaseProjects)
		if err != nil {
			showcaseJSON = []byte("[]")
		}

		pinnedJSON, err := json.Marshal(req.PinnedRepos)
		if err != nil {
			pinnedJSON = []byte("[]")
		}

		if err := userRepo.UpdateUserBioAndShowcase(c.Request.Context(), userID, req.Bio, req.Headline, string(showcaseJSON), string(pinnedJSON)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":            "ok",
			"bio":               req.Bio,
			"headline":          req.Headline,
			"showcase_projects": req.ShowcaseProjects,
			"pinned_repos":      req.PinnedRepos,
		})
	}
}

// GetUserGitHubReposHandler handles GET /api/v1/user/github-repos
// Fetches the user's public repositories sorted by stars
func GetUserGitHubReposHandler(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		user, err := userRepo.FindByID(c.Request.Context(), userID)
		if err != nil || user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		// Fallback list from DNA or empty
		repos := []repository.UserPublicRepo{}

		// Try fetching from public GitHub API if user has a username/slug
		targetUsername := user.SlugOrUsername()
		if targetUsername != "" {
			req, err := http.NewRequestWithContext(c.Request.Context(), "GET", fmt.Sprintf("https://api.github.com/users/%s/repos?per_page=100&type=owner", targetUsername), nil)
			if err == nil {
				req.Header.Set("Accept", "application/vnd.github.v3+json")
				req.Header.Set("User-Agent", "GetMerged-App")
				client := &http.Client{Timeout: 5 * time.Second}
				resp, err := client.Do(req)
				if err == nil && resp.StatusCode == http.StatusOK {
					defer resp.Body.Close()
					var ghRepos []struct {
						FullName    string `json:"full_name"`
						Name        string `json:"name"`
						Description string `json:"description"`
						Language    string `json:"language"`
						Stargazers  int    `json:"stargazers_count"`
						Forks       int    `json:"forks_count"`
						HTMLURL     string `json:"html_url"`
						Fork        bool   `json:"fork"`
						Owner       struct {
							Login string `json:"login"`
						} `json:"owner"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&ghRepos); err == nil {
						for _, gr := range ghRepos {
							// Filter out forks - only own public repos
							if gr.Fork {
								continue
							}
							if gr.Owner.Login != "" && !strings.EqualFold(gr.Owner.Login, targetUsername) {
								continue
							}
							repos = append(repos, repository.UserPublicRepo{
								FullName:    gr.FullName,
								Name:        gr.Name,
								Description: gr.Description,
								Language:    gr.Language,
								Stars:       gr.Stargazers,
								Forks:       gr.Forks,
								HTMLURL:     gr.HTMLURL,
							})
						}
					}
				}
			}
		}

		// Sort non-fork repos by Stars descending, then by Name
		sort.Slice(repos, func(i, j int) bool {
			if repos[i].Stars != repos[j].Stars {
				return repos[i].Stars > repos[j].Stars
			}
			return repos[i].Name < repos[j].Name
		})

		// Check pinned repos
		pinnedSet := make(map[string]bool)
		if user.PinnedReposJSON != nil && *user.PinnedReposJSON != "" {
			var pinnedList []string
			if err := json.Unmarshal([]byte(*user.PinnedReposJSON), &pinnedList); err == nil {
				for _, p := range pinnedList {
					pinnedSet[strings.ToLower(p)] = true
				}
			}
		}

		for i := range repos {
			if pinnedSet[strings.ToLower(repos[i].FullName)] || pinnedSet[strings.ToLower(repos[i].Name)] {
				repos[i].IsPinned = true
			}
		}

		// Sort so pinned repos come first, then ranked by stars
		sort.SliceStable(repos, func(i, j int) bool {
			if repos[i].IsPinned != repos[j].IsPinned {
				return repos[i].IsPinned
			}
			return repos[i].Stars > repos[j].Stars
		})

		c.JSON(http.StatusOK, gin.H{
			"repos": repos,
		})
	}
}
