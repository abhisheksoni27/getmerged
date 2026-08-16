package handler

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// RenderAchievementCardHandler handles GET /api/v1/users/:slug/achievement.svg (Story 6.2)
func RenderAchievementCardHandler(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		if slug == "" {
			c.String(http.StatusBadRequest, "Missing user slug")
			return
		}

		profile, err := userRepo.FindByUsername(c.Request.Context(), slug)
		if err != nil || profile == nil {
			c.String(http.StatusNotFound, "User not found")
			return
		}

		mergedCount := 0
		primaryLang := "Open Source"
		skillLevel := "Active Contributor"

		if profile.DNA != nil {
			mergedCount = profile.DNA.TotalMergedPRs
			if len(profile.DNA.PrimaryLanguages) > 0 {
				primaryLang = profile.DNA.PrimaryLanguages[0]
			}
			if profile.DNA.SkillLevel != "" {
				skillLevel = profile.DNA.SkillLevel
			}
		}

		escapedUsername := escapeXML(profile.Username)
		escapedLang := escapeXML(primaryLang)
		escapedSkill := escapeXML(skillLevel)

		svg := fmt.Sprintf(`<svg width="500" height="260" viewBox="0 0 500 260" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="500" y2="260" gradientUnits="userSpaceOnUse">
      <stop stop-color="#18181B"/>
      <stop offset="1" stop-color="#09090B"/>
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0" y1="0" x2="100" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10B981"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <!-- Border & Background -->
  <rect x="2" y="2" width="496" height="256" rx="16" fill="url(#cardGrad)" stroke="#27272A" stroke-width="2"/>
  <rect x="20" y="20" width="460" height="220" rx="12" fill="#18181B" fill-opacity="0.4" stroke="#3F3F46" stroke-width="1" stroke-dasharray="4 4"/>

  <!-- Logo Brand -->
  <text x="40" y="52" fill="#10B981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" letter-spacing="1">GETMERGED</text>
  <text x="132" y="52" fill="#71717A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">VERIFIED CONTRIBUTOR</text>

  <!-- User Handle -->
  <text x="40" y="96" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">@%s</text>
  <text x="40" y="120" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500">%s • %s</text>

  <!-- Stats Grid -->
  <rect x="40" y="145" width="135" height="65" rx="8" fill="#27272A" fill-opacity="0.7"/>
  <text x="52" y="168" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-transform="uppercase">Merged Pull Requests</text>
  <text x="52" y="196" fill="#10B981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800">%d</text>

  <rect x="190" y="145" width="135" height="65" rx="8" fill="#27272A" fill-opacity="0.7"/>
  <text x="202" y="168" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-transform="uppercase">Primary Ecosystem</text>
  <text x="202" y="196" fill="#60A5FA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">%s</text>

  <rect x="340" y="145" width="120" height="65" rx="8" fill="#27272A" fill-opacity="0.7"/>
  <text x="352" y="168" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-transform="uppercase">Contributor Status</text>
  <text x="352" y="196" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800">Verified</text>

  <!-- URL watermark -->
  <text x="40" y="232" fill="#52525B" font-family="monospace" font-size="10">getmerged.abhishekco.de/u/%s</text>
</svg>`,
			escapedUsername, escapedSkill, escapedLang,
			mergedCount, escapedLang, escapedUsername,
		)

		c.Header("Content-Type", "image/svg+xml")
		c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
		c.String(http.StatusOK, svg)
	}
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}
