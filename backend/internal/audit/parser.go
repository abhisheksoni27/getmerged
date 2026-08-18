package audit

import (
	"bufio"
	"regexp"
	"strings"
)

var (
	reH2       = regexp.MustCompile(`^##\s+([0-9]+)\.?\s*(.*)`)
	reH3       = regexp.MustCompile(`^###\s+(.*)`)
	reH4       = regexp.MustCompile(`^####\s+(.*)`)
	reStory    = regexp.MustCompile(`^-\s+\*\*Story\s+([0-9\.]+)\*\*:\s*(.*)`)
	reTableRow = regexp.MustCompile(`^\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|(?:\s*([^\|]+)\s*\|)?(?:\s*([^\|]+)\s*\|)?`)
	reBullet   = regexp.MustCompile(`^-\s+(.*)`)
	reNumbered = regexp.MustCompile(`^\*\*([0-9]+)\.\s+([^\*]+)\*\*`)
)

// ParseCensus parses markdown content and extracts all roadmap deliverables across all sections.
func ParseCensus(content string) (*Census, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var items []CensusItem

	currentSectionNum := -1
	currentSectionName := ""
	currentSubSection := ""
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		// Detect H2 Section header (e.g. ## 0. State of the ship)
		if matches := reH2.FindStringSubmatch(line); len(matches) > 0 {
			secNumStr := matches[1]
			currentSectionName = strings.TrimSpace(matches[2])
			currentSectionNum = parseSectionNumber(secNumStr)
			currentSubSection = ""
			continue
		}

		// Detect H3 SubSection header (e.g. ### 3.1 Payment stack)
		if matches := reH3.FindStringSubmatch(line); len(matches) > 0 {
			currentSubSection = strings.TrimSpace(matches[1])
			// If subsection is a standalone deliverable like "3.1 Payment stack" or "✅ 1.1 Brand..."
			subKey := extractSubSectionKey(currentSectionNum, currentSubSection)
			if subKey != "" {
				items = append(items, CensusItem{
					Section:    formatSection(currentSectionNum, currentSectionName),
					Key:        subKey,
					Title:      currentSubSection,
					RawContent: line,
					LineNumber: lineNum,
					ItemType:   "subsection",
				})
			}
			continue
		}

		if currentSectionNum < 0 {
			continue
		}

		// Section 12: Granular Stories (- **Story X.Y**: ...)
		if matches := reStory.FindStringSubmatch(line); len(matches) > 0 {
			storyID := matches[1]
			storyDesc := strings.TrimSpace(matches[2])
			items = append(items, CensusItem{
				Section:    formatSection(currentSectionNum, currentSectionName),
				Key:        "sec12-story-" + storyID,
				Title:      "Story " + storyID + ": " + storyDesc,
				RawContent: line,
				LineNumber: lineNum,
				ItemType:   "story",
			})
			continue
		}

		// Section 6: Numbered metric signals (**1. GFI Quality Score...**)
		if currentSectionNum == 6 {
			if matches := reNumbered.FindStringSubmatch(line); len(matches) > 0 {
				num := matches[1]
				name := strings.TrimSpace(matches[2])
				items = append(items, CensusItem{
					Section:    formatSection(currentSectionNum, currentSectionName),
					Key:        "sec6-signal-" + num,
					Title:      name,
					RawContent: line,
					LineNumber: lineNum,
					ItemType:   "numbered_signal",
				})
				continue
			}
		}

		// Tables in sections 0, 2, 5.1, 5.4, 7, 10
		if strings.HasPrefix(line, "|") {
			if strings.Contains(line, "---") || strings.Contains(line, "Status") || strings.Contains(line, "Build") || strings.Contains(line, "Focus") || strings.Contains(line, "Why dropped") {
				continue
			}
			matches := reTableRow.FindStringSubmatch(line)
			if len(matches) > 2 {
				col1 := strings.TrimSpace(matches[1])
				col2 := strings.TrimSpace(matches[2])
				if col1 == "Area" || col1 == "Moat" || col1 == "#" || col1 == "Item" || col1 == "Sprint" || col1 == "Users" || col1 == "Attribute" {
					continue
				}
				key := generateTableItemKey(currentSectionNum, currentSubSection, col1)
				if key != "" {
					items = append(items, CensusItem{
						Section:    formatSection(currentSectionNum, currentSectionName),
						Key:        key,
						Title:      col1 + " -> " + col2,
						RawContent: line,
						LineNumber: lineNum,
						ItemType:   "table_row",
					})
				}
			}
			continue
		}

		// Top-level bulleted items in sections 3, 4, 8, 9, 11
		if matches := reBullet.FindStringSubmatch(line); len(matches) > 0 {
			bulletText := strings.TrimSpace(matches[1])
			if shouldCaptureBullet(currentSectionNum, currentSubSection, bulletText) {
				key := generateBulletKey(currentSectionNum, currentSubSection, bulletText)
				items = append(items, CensusItem{
					Section:    formatSection(currentSectionNum, currentSectionName),
					Key:        key,
					Title:      bulletText,
					RawContent: line,
					LineNumber: lineNum,
					ItemType:   "bullet",
				})
			}
		}
	}

	return &Census{Items: items}, nil
}

func parseSectionNumber(s string) int {
	var num int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			num = num*10 + int(c-'0')
		}
	}
	return num
}

func formatSection(num int, name string) string {
	if num < 0 {
		return "General"
	}
	secPrefix := "sec" + string(rune('0'+num))
	if num >= 10 {
		secPrefix = "sec" + string(rune('0'+num/10)) + string(rune('0'+num%10))
	}
	return secPrefix + " - " + name
}

func extractSubSectionKey(secNum int, title string) string {
	lower := strings.ToLower(title)
	if secNum == 1 && strings.Contains(lower, "brand") {
		return "sec1-brand-rename"
	}
	if secNum == 3 {
		if strings.Contains(lower, "3.1") {
			return "sec3-3.1-payment-stack"
		}
		if strings.Contains(lower, "3.2") {
			return "sec3-3.2-pro-tier"
		}
		if strings.Contains(lower, "3.3") {
			return "sec3-3.3-contributor-dna"
		}
		if strings.Contains(lower, "3.4") {
			return "sec3-3.4-pricing-lifecycle"
		}
		if strings.Contains(lower, "3.5") {
			return "sec3-3.5-the-5-dollar-math"
		}
		if strings.Contains(lower, "3.6") {
			return "sec3-3.6-b2b-layers"
		}
	}
	if secNum == 4 {
		if strings.Contains(lower, "4.1") {
			return "sec4-4.1-pipeline"
		}
		if strings.Contains(lower, "4.2") {
			return "sec4-4.2-content-mix"
		}
		if strings.Contains(lower, "4.3") {
			return "sec4-4.3-frontend-work"
		}
	}
	if secNum == 5 {
		if strings.Contains(lower, "5.2") {
			return "sec5-5.2-launch-surfaces"
		}
		if strings.Contains(lower, "5.3") {
			return "sec5-5.3-maintainer-prompt-hack"
		}
	}
	return ""
}

func generateTableItemKey(secNum int, subSec, col1 string) string {
	cleanCol := sanitizeKey(col1)
	if secNum == 0 {
		return "sec0-state-" + cleanCol
	}
	if secNum == 2 {
		return "sec2-moat-" + cleanCol
	}
	if secNum == 5 {
		if strings.Contains(strings.ToLower(subSec), "discarded") || strings.Contains(strings.ToLower(subSec), "5.4") {
			return "sec5-discarded-" + cleanCol
		}
		return "sec5-loop-" + cleanCol
	}
	if secNum == 7 {
		return "sec7-seo-" + cleanCol
	}
	if secNum == 10 {
		return "sec10-sprint-" + cleanCol
	}
	if secNum == 3 {
		if strings.Contains(strings.ToLower(subSec), "dna") || strings.Contains(strings.ToLower(subSec), "3.3") {
			return "sec3-dna-attr-" + cleanCol
		}
		if strings.Contains(strings.ToLower(subSec), "math") || strings.Contains(strings.ToLower(subSec), "3.5") {
			return "sec3-math-tier-" + cleanCol
		}
		return "sec3-table-" + cleanCol
	}
	secPrefix := "sec" + string(rune('0'+secNum))
	if secNum >= 10 {
		secPrefix = "sec" + string(rune('0'+secNum/10)) + string(rune('0'+secNum%10))
	}
	return secPrefix + "-item-" + cleanCol
}

func shouldCaptureBullet(secNum int, subSec, text string) bool {
	if strings.HasPrefix(text, "**Story") {
		return false // Handled separately
	}
	lower := strings.ToLower(text)
	if secNum == 8 {
		// Section 8: Infrastructure items
		return strings.HasPrefix(lower, "tiered crawl") ||
			strings.Contains(lower, "event-diff backfill") ||
			strings.Contains(lower, "python ai sidecar") ||
			strings.Contains(lower, "store github access token") ||
			strings.Contains(lower, "/internal/blog-report")
	}
	if secNum == 9 {
		// Section 9: Constraints & architectural decisions
		return strings.Contains(lower, "no orms") ||
			strings.Contains(lower, "distributed components connect") ||
			strings.Contains(lower, "no pgvector") ||
			strings.Contains(lower, "tdd for backend") ||
			strings.Contains(lower, "no fabricated testimonials") ||
			strings.Contains(lower, "brand:") ||
			strings.Contains(lower, "consent & deletion") ||
			strings.Contains(lower, "pay stack:")
	}
	if secNum == 11 {
		// Section 11: Activation / Churn metrics
		return strings.HasPrefix(text, "Free:") ||
			strings.HasPrefix(text, "Pro:") ||
			strings.HasPrefix(text, "North-star") ||
			strings.Contains(lower, "digest open") ||
			strings.Contains(lower, "watchlist") ||
			strings.Contains(lower, "likelihood") ||
			strings.Contains(lower, "failed payments")
	}
	return false
}

func generateBulletKey(secNum int, subSec, text string) string {
	lower := strings.ToLower(text)
	if secNum == 8 {
		if strings.Contains(lower, "tiered crawl") {
			return "sec8-infra-tiered-crawl"
		}
		if strings.Contains(lower, "event-diff backfill") {
			return "sec8-infra-event-diff-backfill"
		}
		if strings.Contains(lower, "python ai sidecar") {
			return "sec8-infra-python-ai-sidecar"
		}
		if strings.Contains(lower, "store github access token") {
			return "sec8-infra-store-github-token"
		}
		if strings.Contains(lower, "internal/blog-report") {
			return "sec8-infra-internal-blog-report"
		}
	}
	if secNum == 9 {
		if strings.Contains(lower, "no orms") {
			return "sec9-constraint-no-orms"
		}
		if strings.Contains(lower, "distributed components") {
			return "sec9-constraint-distributed-components"
		}
		if strings.Contains(lower, "no pgvector") {
			return "sec9-constraint-no-pgvector"
		}
		if strings.Contains(lower, "tdd for backend") {
			return "sec9-constraint-tdd-backend"
		}
		if strings.Contains(lower, "no fabricated") {
			return "sec9-constraint-no-fabricated-data"
		}
		if strings.Contains(lower, "brand:") {
			return "sec9-constraint-brand-getmerged"
		}
		if strings.Contains(lower, "consent & deletion") {
			return "sec9-constraint-consent-deletion"
		}
		if strings.Contains(lower, "pay stack:") {
			return "sec9-constraint-pay-stack"
		}
	}
	if secNum == 11 {
		if strings.HasPrefix(text, "Free:") {
			return "sec11-funnel-free-signup"
		}
		if strings.HasPrefix(text, "Pro:") {
			return "sec11-funnel-pro-digest"
		}
		if strings.HasPrefix(text, "North-star") {
			return "sec11-funnel-north-star"
		}
		if strings.Contains(lower, "digest open") {
			return "sec11-churn-digest-health"
		}
		if strings.Contains(lower, "watchlist") {
			return "sec11-churn-watchlist-health"
		}
		if strings.Contains(lower, "likelihood") {
			return "sec11-churn-likelihood-clicks"
		}
		if strings.Contains(lower, "failed payments") {
			return "sec11-churn-failed-payments"
		}
	}

	clean := sanitizeKey(text)
	if len(clean) > 40 {
		clean = clean[:40]
	}
	clean = strings.TrimRight(clean, "-")
	secPrefix := "sec" + string(rune('0'+secNum))
	if secNum >= 10 {
		secPrefix = "sec" + string(rune('0'+secNum/10)) + string(rune('0'+secNum%10))
	}
	return secPrefix + "-bullet-" + clean
}

func sanitizeKey(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "**", "")
	s = strings.ReplaceAll(s, "`", "")
	s = strings.ReplaceAll(s, "[", "")
	s = strings.ReplaceAll(s, "]", "")
	s = strings.ReplaceAll(s, "(", "")
	s = strings.ReplaceAll(s, ")", "")
	s = strings.ReplaceAll(s, "/", "-")
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, "™", "")
	s = strings.ReplaceAll(s, "✅", "")
	s = strings.ReplaceAll(s, "❌", "")

	// Remove multiple dashes
	var sb strings.Builder
	lastDash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			sb.WriteRune(r)
			lastDash = false
		} else if r == '-' {
			if !lastDash && sb.Len() > 0 {
				sb.WriteRune('-')
				lastDash = true
			}
		}
	}
	res := strings.Trim(sb.String(), "-")
	return res
}
