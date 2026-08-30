package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/dna"
	"github.com/abhisheksoni27/opendoor/internal/karma"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
)

// GetKarmaHandler returns the contributor's verified Karma and reputation tier
func GetKarmaHandler(userRepo repository.UserRepository, profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := strings.TrimSpace(c.Param("username"))
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
			return
		}

		user, err := userRepo.FindBySlug(c.Request.Context(), username)
		if err != nil || user == nil {
			// Return default apprentice karma if user record not registered
			defaultKarma := karma.CalculateKarma(nil, 0, "")
			c.JSON(http.StatusOK, defaultKarma)
			return
		}

		profile, err := profileRepo.GetByUserID(c.Request.Context(), user.ID)
		if err != nil || profile == nil || profile.DNAJSON == nil {
			defaultKarma := karma.CalculateKarma(nil, 0, "")
			c.JSON(http.StatusOK, defaultKarma)
			return
		}

		var dnaResult dna.Result
		if err := json.Unmarshal([]byte(*profile.DNAJSON), &dnaResult); err != nil {
			defaultKarma := karma.CalculateKarma(nil, 0, "")
			c.JSON(http.StatusOK, defaultKarma)
			return
		}

		inputs := make([]karma.MergedPRInput, 0, len(dnaResult.TopRepos))
		for _, tr := range dnaResult.TopRepos {
			tier := "A"
			if tr.StargazerCount > 10000 {
				tier = "S"
			} else if tr.StargazerCount < 1000 {
				tier = "B"
			}
			lang := ""
			if tr.PrimaryLanguage != nil {
				lang = *tr.PrimaryLanguage
			}
			inputs = append(inputs, karma.MergedPRInput{
				RepoFullName: tr.NameWithOwner,
				CRankTier:    tier,
				Language:     lang,
			})
		}

		topLang := ""
		if len(dnaResult.PrimaryLanguages) > 0 {
			topLang = dnaResult.PrimaryLanguages[0]
		}

		userKarma := karma.CalculateKarma(inputs, 3, topLang)
		c.JSON(http.StatusOK, userKarma)
	}
}

// GetKarmaBadgeSVGHandler renders a live SVG badge for GitHub README embed
func GetKarmaBadgeSVGHandler(userRepo repository.UserRepository, profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := strings.TrimSpace(c.Param("username"))
		if username == "" {
			c.String(http.StatusBadRequest, "Username is required")
			return
		}

		defaultKarma := karma.CalculateKarma(nil, 0, "")
		user, err := userRepo.FindBySlug(c.Request.Context(), username)
		if err == nil && user != nil {
			profile, err := profileRepo.GetByUserID(c.Request.Context(), user.ID)
			if err == nil && profile != nil && profile.DNAJSON != nil {
				var dnaResult dna.Result
				if err := json.Unmarshal([]byte(*profile.DNAJSON), &dnaResult); err == nil {
					inputs := make([]karma.MergedPRInput, 0, len(dnaResult.TopRepos))
					for _, tr := range dnaResult.TopRepos {
						tier := "A"
						if tr.StargazerCount > 10000 {
							tier = "S"
						} else if tr.StargazerCount < 1000 {
							tier = "B"
						}
						lang := ""
						if tr.PrimaryLanguage != nil {
							lang = *tr.PrimaryLanguage
						}
						inputs = append(inputs, karma.MergedPRInput{
							RepoFullName: tr.NameWithOwner,
							CRankTier:    tier,
							Language:     lang,
						})
					}
					topLang := ""
					if len(dnaResult.PrimaryLanguages) > 0 {
						topLang = dnaResult.PrimaryLanguages[0]
					}
					defaultKarma = karma.CalculateKarma(inputs, 3, topLang)
				}
			}
		}

		svg := karma.RenderKarmaBadgeSVG(username, defaultKarma)
		c.Header("Content-Type", "image/svg+xml;charset=utf-8")
		c.Header("Cache-Control", "public, max-age=3600, s-maxage=3600")
		c.String(http.StatusOK, svg)
	}
}

// GetPRSizeSweetSpotHandler computes size-based velocity metrics and actionable advice for a repository
func GetPRSizeSweetSpotHandler(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Repository ID is required"})
			return
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), id)
		if err != nil || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Repository not found"})
			return
		}

		p50Hours := 24.0
		if repo.TimeToFirstResponseHours > 0 {
			p50Hours = repo.TimeToFirstResponseHours
		}
		mergeRate := repo.ExternalPRMergeRate
		if mergeRate <= 0 {
			mergeRate = 65.0
		}

		spot := scoring.ComputePRSizeSweetSpot(p50Hours, mergeRate)
		c.JSON(http.StatusOK, spot)
	}
}
