package handler

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/url"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type ShieldsBadgeResponse struct {
	SchemaVersion int    `json:"schemaVersion"`
	Label         string `json:"label"`
	Message       string `json:"message"`
	Color         string `json:"color"`
}

// GetRepoBadgeJSON handles GET /api/v1/badges/:owner/:name/badge.json (Shields.io custom endpoint)
func GetRepoBadgeJSON(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name

		c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusOK, ShieldsBadgeResponse{
				SchemaVersion: 1,
				Label:         "C-Rank™",
				Message:       "unranked",
				Color:         "lightgrey",
			})
			return
		}

		color := "lightgrey"
		tier := repo.CRankTier
		if tier == "" {
			tier = "Unranked"
		}

		switch tier {
		case "S", "A":
			color = "brightgreen"
		case "B":
			color = "yellowgreen"
		case "C":
			color = "orange"
		case "D":
			color = "red"
		}

		message := fmt.Sprintf("%s Tier (%.0f%%)", tier, repo.CRankScore)
		if repo.CRankScore <= 0 {
			message = fmt.Sprintf("%s Tier", tier)
		}

		c.JSON(http.StatusOK, ShieldsBadgeResponse{
			SchemaVersion: 1,
			Label:         "C-Rank™",
			Message:       message,
			Color:         color,
		})
	}
}

// GetRepoBadgeSVG handles GET /api/v1/badges/:owner/:name/badge.svg (302 Redirect to Shields.io)
func GetRepoBadgeSVG(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name

		c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == sql.ErrNoRows || repo == nil {
			c.Redirect(http.StatusFound, "https://img.shields.io/badge/C--Rank™-unranked-lightgrey")
			return
		}

		color := "lightgrey"
		tier := repo.CRankTier
		if tier == "" {
			tier = "Unranked"
		}

		switch tier {
		case "S", "A":
			color = "brightgreen"
		case "B":
			color = "yellowgreen"
		case "C":
			color = "orange"
		case "D":
			color = "red"
		}

		badgeText := fmt.Sprintf("%s Tier (%.0f%%)", tier, repo.CRankScore)
		if repo.CRankScore <= 0 {
			badgeText = fmt.Sprintf("%s Tier", tier)
		}

		redirectURL := fmt.Sprintf("https://img.shields.io/badge/C--Rank™-%s-%s", url.PathEscape(badgeText), color)
		c.Redirect(http.StatusFound, redirectURL)
	}
}
