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
	"unranked": "#0284c7",
}

// badgeTierVerdicts maps tiers to plain-English contributor-facing phrases.
var badgeTierVerdicts = map[string]string{
	"S":        "super welcoming",
	"A":        "very welcoming",
	"B":        "welcoming",
	"C":        "selective",
	"D":        "strict reviews",
	"unranked": "indexed",
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

// liveBadgeTemplate renders a clean, modern squircle badge with brand styling.
var liveBadgeTemplate = template.Must(template.New("liveBadge").Parse(
	`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{{.Total}}" height="24" viewBox="0 0 {{.Total}} 24" role="img" aria-label="{{.Label}}: {{.Message}}">
<title>{{.Label}}: {{.Message}}</title>
<defs>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
<stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
</linearGradient>
<clipPath id="squircle"><rect width="{{.Total}}" height="24" rx="6" fill="#ffffff"/></clipPath>
</defs>
{{if .Link}}<a xlink:href="{{.Link}}">{{end}}
<g clip-path="url(#squircle)">
<rect width="{{.LabelW}}" height="24" fill="#09090b"/>
<rect x="{{.LabelW}}" width="{{.MsgW}}" height="24" fill="{{.Color}}"/>
<rect width="{{.Total}}" height="24" fill="url(#gloss)"/>
<line x1="{{.LabelW}}" y1="0" x2="{{.LabelW}}" y2="24" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
<rect width="{{.Total}}" height="24" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
</g>
<!-- Real GetMerged Git Convergence Brand Logo (16x16) -->
<g transform="translate(6, 4)">
<rect width="16" height="16" rx="4" fill="#0a0f0d" stroke="rgba(16,185,129,0.3)" stroke-width="0.75" />
<rect x="2.5" y="4.5" width="3" height="1.5" rx="0.25" fill="#10b981" />
<rect x="6" y="5.5" width="2" height="1.5" rx="0.25" fill="#34d399" />
<rect x="2.5" y="10" width="3" height="1.5" rx="0.25" fill="#ef4444" />
<rect x="6" y="9" width="2" height="1.5" rx="0.25" fill="#f59e0b" />
<rect x="8.5" y="6.75" width="3.5" height="2.5" rx="0.4" fill="#10b981" />
<circle cx="12.5" cy="7.5" r="0.75" fill="#ffffff" />
<circle cx="9.5" cy="4.8" r="0.6" fill="#38bdf8" />
<circle cx="9.5" cy="10.8" r="0.6" fill="#f59e0b" />
</g>
<g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif" font-size="11" font-weight="700" text-rendering="geometricPrecision">
<text x="28" y="16" fill="#f4f4f5" letter-spacing="-0.2px">Get<tspan fill="#10b981">Merged</tspan></text>
<text x="{{.MsgX}}" y="16" fill="#ffffff" text-anchor="middle" font-weight="600" letter-spacing="-0.1px">{{.Message}}</text>
</g>
{{if .Link}}</a>{{end}}
</svg>`))

// renderLiveBadge executes liveBadgeTemplate. Widths are estimated at ~7.2px
// per character.
func renderLiveBadge(label, message, color, link string) (string, error) {
	labelW := 104
	msgW := int(float64(len([]rune(message)))*7.2) + 24
	if msgW < 80 {
		msgW = 80
	}
	var buf bytes.Buffer
	err := liveBadgeTemplate.Execute(&buf, liveBadgeData{
		Total:   labelW + msgW,
		LabelW:  labelW,
		MsgW:    msgW,
		LabelX:  28,
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

		writeBadgeSVG(c, http.StatusOK, "GetMerged", message, color, "")
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
