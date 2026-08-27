package handler

import (
	"bytes"
	"database/sql"
	"fmt"
	"html/template"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// badgeTierColors maps C-Rank tiers to badge fill colors (hex).
var badgeTierColors = map[string]string{
	"S":        "#059669",
	"A":        "#16a34a",
	"B":        "#d97706",
	"C":        "#ea580c",
	"D":        "#dc2626",
	"unranked": "#9ca3af",
}

// badgeTierVerdicts maps tiers to plain-English contributor-facing phrases
// (the raw letter grade alone means nothing to someone who has never seen C-Rank).
var badgeTierVerdicts = map[string]string{
	"S":        "super welcoming",
	"A":        "very welcoming",
	"B":        "welcoming",
	"C":        "selective",
	"D":        "hard going",
	"unranked": "unranked",
}

// badgeSegmentRe validates owner/repo path segments before lookup (AC2).
// Dots are allowed (e.g. ".github"); anything else, including "/" from %2F,
// is rejected.
var badgeSegmentRe = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)

// liveBadgeData feeds liveBadgeTemplate. All free-text fields (Label,
// Message, Link) flow through template actions so html/template
// XML-escapes them automatically (AC1: no string concatenation of text).
type liveBadgeData struct {
	Total, LabelW, MsgW int
	LabelX, MsgX        float64
	Label, Message      string
	Color               string
	Link                string
}

// liveBadgeTemplate renders a clean, modern flat two-segment badge.
// Parsed once at init; html/template escapes all dynamic values (AC1).
var liveBadgeTemplate = template.Must(template.New("liveBadge").Parse(
	`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{{.Total}}" height="20" role="img" aria-label="{{.Label}}: {{.Message}}">
<title>{{.Label}}: {{.Message}}</title>
<defs>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-opacity=".05"/></linearGradient>
<clipPath id="r"><rect width="{{.Total}}" height="20" rx="4" fill="#fff"/></clipPath>
</defs>
{{if .Link}}<a xlink:href="{{.Link}}">{{end}}
<g clip-path="url(#r)">
<rect width="{{.Total}}" height="20" fill="#24292f"/>
<rect x="{{.LabelW}}" width="{{.MsgW}}" height="20" fill="{{.Color}}"/>
<rect width="{{.Total}}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" text-rendering="geometricPrecision">
<text x="{{.LabelX}}" y="14">{{.Label}}</text>
<text x="{{.MsgX}}" y="14">{{.Message}}</text>
</g>
{{if .Link}}</a>{{end}}
</svg>`))

// renderLiveBadge executes liveBadgeTemplate. Widths are estimated at ~7px
// per character.
func renderLiveBadge(label, message, color, link string) (string, error) {
	labelW := len([]rune(label))*7 + 16
	msgW := len([]rune(message))*7 + 16
	var buf bytes.Buffer
	err := liveBadgeTemplate.Execute(&buf, liveBadgeData{
		Total:   labelW + msgW,
		LabelW:  labelW,
		MsgW:    msgW,
		LabelX:  float64(labelW) / 2,
		MsgX:    float64(labelW) + float64(msgW)/2,
		Label:   label,
		Message: message,
		Color:   color,
		Link:    link,
	})
	return buf.String(), err
}

// writeBadgeSVG writes the rendered SVG with the exact AC3 headers.
func writeBadgeSVG(c *gin.Context, status int, label, message, color, link string) {
	svg, err := renderLiveBadge(label, message, color, link)
	if err != nil {
		// Template execution must never surface a 500 (AC4): fall back to a
		// minimal static neutral SVG.
		svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="20" role="img" aria-label="C-Rank™: unranked"><title>C-Rank™: unranked</title><rect width="132" height="20" rx="4" fill="#9ca3af"/><text x="66" y="14" fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="600">C-Rank™: unranked</text></svg>`
	}
	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "public, max-age=300, s-maxage=300")
	c.String(status, "%s", svg)
}

// formatBadgeHours formats median PR response hours for badge display
// (e.g. "42m", "4.2h", "3d"). Returns "" when there is no data.
func formatBadgeHours(hours float64) string {
	switch {
	case hours <= 0:
		return ""
	case hours < 1:
		return fmt.Sprintf("%dm", int(hours*60+0.5))
	case hours < 48:
		return fmt.Sprintf("%.1fh", hours)
	default:
		return fmt.Sprintf("%.1fd", hours/24)
	}
}

// GetLiveBadgeSVG handles GET /api/badge/:owner/:repo (AC1): serves a live
// shields-style SVG showing the verified C-Rank verdict and score directly.
func GetLiveBadgeSVG(repoStore repository.RepoRepository, appBaseURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner, name := c.Param("owner"), c.Param("repo")
		if !badgeSegmentRe.MatchString(owner) || !badgeSegmentRe.MatchString(name) {
			writeBadgeSVG(c, http.StatusNotFound, "GetMerged", "unranked", badgeTierColors["unranked"], "")
			return
		}
		fullName := strings.ToLower(owner) + "/" + strings.ToLower(name)

		tier := ""
		score := 0.0
		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == nil && repo != nil && repo.IsScored && repo.CRankTier != "" {
			tier = repo.CRankTier
			score = repo.CRankScore
			fullName = repo.FullName // canonical case for the report link
		}

		message := "unranked"
		color := badgeTierColors["unranked"]
		if tier != "" {
			if tc, ok := badgeTierColors[tier]; ok {
				color = tc
			}
			verdict := badgeTierVerdicts[tier]
			if verdict == "" {
				verdict = tier
			}
			if score > 0 {
				message = fmt.Sprintf("%s (%.0f)", verdict, score)
			} else {
				message = verdict
			}
		}

		reportURL := strings.TrimSuffix(appBaseURL, "/") + "/" + fullName
		if tier != "" {
			reportURL += "#raise-your-rank"
		}
		writeBadgeSVG(c, http.StatusOK, "GetMerged", message, color, reportURL)
	}
}

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
