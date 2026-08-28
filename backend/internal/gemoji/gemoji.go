package gemoji

import "regexp"

// shortcodeRe matches GitHub gemoji shortcodes like :fire: or :tada:.
var shortcodeRe = regexp.MustCompile(`:([a-z0-9_+-]+):`)

// Resolve converts GitHub gemoji shortcodes in s to their unicode emoji.
// Shortcodes with a known unicode form (e.g. :fire:) are replaced; all others
// (custom GitHub-only emoji like :octocat:, or unknown codes) are left as-is.
func Resolve(s string) string {
	if s == "" {
		return s
	}
	if !shortcodeRe.MatchString(s) {
		return s
	}
	return shortcodeRe.ReplaceAllStringFunc(s, func(match string) string {
		name := shortcodeRe.FindStringSubmatch(match)[1]
		if emoji, ok := ShortcodeToEmoji[name]; ok {
			return emoji
		}
		return match // skip: leave the raw shortcode untouched
	})
}
