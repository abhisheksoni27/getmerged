package scoring

import (
	"regexp"
	"strings"
)

var (
	htmlTagRegex    = regexp.MustCompile(`<[^>]*>`)
	mdLinkRegex     = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	mdCodeBlock     = regexp.MustCompile("(?s)```.*?```")
	mdInlineCode    = regexp.MustCompile("`([^`]+)`")
	multiSpaceRegex = regexp.MustCompile(`\s+`)
)

// StripMarkdownAndTruncate strips markdown formatting and returns a safe, clean plain-text snippet.
func StripMarkdownAndTruncate(raw string, maxLen int) string {
	if maxLen <= 0 {
		maxLen = 160
	}

	text := mdCodeBlock.ReplaceAllString(raw, " ")
	text = htmlTagRegex.ReplaceAllString(text, " ")
	text = mdLinkRegex.ReplaceAllString(text, "$1")
	text = mdInlineCode.ReplaceAllString(text, "$1")
	text = strings.ReplaceAll(text, "#", "")
	text = strings.ReplaceAll(text, "*", "")
	text = strings.ReplaceAll(text, "_", "")
	text = strings.ReplaceAll(text, ">", "")
	text = multiSpaceRegex.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	runes := []rune(text)
	if len(runes) <= maxLen {
		return text
	}

	return string(runes[:maxLen]) + "..."
}
