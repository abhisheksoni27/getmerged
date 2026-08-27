package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// Feed language allowlist (ISO-639-1 subset). Unknown values fall back to
// "no filter" instead of 400 (AC4).
var feedLangAllowlist = map[string]bool{
	"go": true, "python": true, "javascript": true, "typescript": true, "rust": true,
	"java": true, "c": true, "cpp": true, "csharp": true, "ruby": true, "php": true,
	"swift": true, "kotlin": true, "dart": true, "elixir": true, "haskell": true,
	"scala": true, "html": true, "css": true, "shell": true, "lua": true, "r": true,
	"julia": true, "vim": true, "ocaml": true, "clojure": true, "zig": true, "perl": true,
	"sql": true, "vue": true, "svelte": true, "objective-c": true, "assembly": true,
	"powershell": true, "makefile": true, "dockerfile": true, "yaml": true, "json": true,
}

var (
	feedRepoRegexp  = regexp.MustCompile(`^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$`)
	feedTopicRegexp = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,49}$`)
)

// validateFeedLang returns the normalized language if it is in the allowlist,
// otherwise an empty string (meaning "no filter", AC4).
func validateFeedLang(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" || len(s) > 40 {
		return ""
	}
	if feedLangAllowlist[s] {
		return s
	}
	return ""
}

// validateFeedTopic returns the topic if it matches the taxonomy format AND
// exists in the GFI topic taxonomy; otherwise an empty string (AC4 fallback).
func validateFeedTopic(c *gin.Context, repoStore repository.RepoRepository, s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" || !feedTopicRegexp.MatchString(s) {
		return ""
	}
	if repoStore == nil {
		return s
	}
	ok, err := repoStore.TopicExists(c.Request.Context(), s)
	if err != nil || !ok {
		return ""
	}
	return s
}

// validateFeedRepo returns the owner/name if it matches the allowlist regex,
// otherwise an empty string (AC4 fallback).
func validateFeedRepo(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || !feedRepoRegexp.MatchString(s) {
		return ""
	}
	return s
}

// parseFeedFilter extracts, validates, and XML-escapes (on serialize) the
// lang/topic/repo query params. Invalid params fall back to "no filter".
func parseFeedFilter(c *gin.Context, repoStore repository.RepoRepository) repository.GFIFeedFilter {
	return repository.GFIFeedFilter{
		Language:     validateFeedLang(c.Query("lang")),
		Topic:        validateFeedTopic(c, repoStore, c.Query("topic")),
		RepoFullName: validateFeedRepo(c.Query("repo")),
	}
}

func xmlEscape(s string) string {
	var b strings.Builder
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

func icsEscape(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\n", "\\n")
	s = strings.ReplaceAll(s, ",", "\\,")
	s = strings.ReplaceAll(s, ";", "\\;")
	return s
}

func icsDate(t time.Time) string {
	return t.UTC().Format("20060102T150405Z")
}

func feedSelfLink(c *gin.Context) string {
	if c.Request.Host == "" {
		return "https://opendoor.abhishekco.de"
	}
	scheme := c.Request.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host + c.Request.URL.RequestURI()
}

func buildFeedItems(c *gin.Context, gfiRepo repository.GFIRepository, repoStore repository.RepoRepository) ([]repository.GoodFirstIssueItem, error) {
	filter := parseFeedFilter(c, repoStore)
	items, err := gfiRepo.ListFeed(c.Request.Context(), filter, 100)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []repository.GoodFirstIssueItem{}
	}
	return items, nil
}

// GFIFeedRSS serves GET /api/feeds/gfi.rss (AC1).
func GFIFeedRSS(gfiRepo repository.GFIRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := buildFeedItems(c, gfiRepo, repoStore)
		if err != nil {
			c.XML(http.StatusInternalServerError, gin.H{"error": "failed to build feed"})
			return
		}
		c.Header("Content-Type", "application/rss+xml")
		c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
		c.String(http.StatusOK, renderRSS(c, items))
	}
}

// GFIFeedAtom serves GET /api/feeds/gfi.atom (AC1).
func GFIFeedAtom(gfiRepo repository.GFIRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := buildFeedItems(c, gfiRepo, repoStore)
		if err != nil {
			c.XML(http.StatusInternalServerError, gin.H{"error": "failed to build feed"})
			return
		}
		c.Header("Content-Type", "application/atom+xml")
		c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
		c.String(http.StatusOK, renderAtom(c, items))
	}
}

// GFIFeedICS serves GET /api/feeds/gfi.ics (AC1/AC2).
func GFIFeedICS(gfiRepo repository.GFIRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := buildFeedItems(c, gfiRepo, repoStore)
		if err != nil {
			c.XML(http.StatusInternalServerError, gin.H{"error": "failed to build feed"})
			return
		}
		c.Header("Content-Type", "text/calendar")
		c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
		c.String(http.StatusOK, renderICS(items))
	}
}

func renderRSS(c *gin.Context, items []repository.GoodFirstIssueItem) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<rss version="2.0">` + "\n")
	b.WriteString(`  <channel>` + "\n")
	b.WriteString("    <title>" + xmlEscape("OpenDoor Good First Issues") + "</title>\n")
	b.WriteString("    <link>" + xmlEscape(feedSelfLink(c)) + "</link>\n")
	b.WriteString("    <description>" + xmlEscape("Newly indexed Good First Issues for contributors") + "</description>\n")
	b.WriteString("    <lastBuildDate>" + time.Now().UTC().Format(time.RFC1123Z) + "</lastBuildDate>\n")
	for _, it := range items {
		uid := fmt.Sprintf("gfi-%d@opendoor.local", it.ID)
		b.WriteString("    <item>\n")
		b.WriteString("      <title>" + xmlEscape(it.Title) + "</title>\n")
		b.WriteString("      <link>" + xmlEscape(it.URL) + "</link>\n")
		b.WriteString("      <guid isPermaLink=\"false\">" + xmlEscape(uid) + "</guid>\n")
		b.WriteString("      <pubDate>" + it.CreatedAt.UTC().Format(time.RFC1123Z) + "</pubDate>\n")
		b.WriteString("      <category>" + xmlEscape(it.Language) + "</category>\n")
		desc := fmt.Sprintf("Repository: %s (%s) — %s", it.RepoFullName, it.Language, it.BodyText)
		b.WriteString("      <description>" + xmlEscape(desc) + "</description>\n")
		b.WriteString("    </item>\n")
	}
	b.WriteString("  </channel>\n")
	b.WriteString("</rss>\n")
	return b.String()
}

func renderAtom(c *gin.Context, items []repository.GoodFirstIssueItem) string {
	var b strings.Builder
	self := feedSelfLink(c)
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<feed xmlns="http://www.w3.org/2005/Atom">` + "\n")
	b.WriteString("  <title>" + xmlEscape("OpenDoor Good First Issues") + "</title>\n")
	b.WriteString("  <id>" + xmlEscape(self) + "</id>\n")
	b.WriteString("  <link href=\"" + xmlEscape(self) + "\"/>\n")
	b.WriteString("  <updated>" + time.Now().UTC().Format(time.RFC3339) + "</updated>\n")
	for _, it := range items {
		uid := fmt.Sprintf("gfi-%d@opendoor.local", it.ID)
		b.WriteString("  <entry>\n")
		b.WriteString("    <title>" + xmlEscape(it.Title) + "</title>\n")
		b.WriteString("    <link href=\"" + xmlEscape(it.URL) + "\"/>\n")
		b.WriteString("    <id>" + xmlEscape(uid) + "</id>\n")
		b.WriteString("    <updated>" + it.CreatedAt.UTC().Format(time.RFC3339) + "</updated>\n")
		b.WriteString("    <published>" + it.CreatedAt.UTC().Format(time.RFC3339) + "</published>\n")
		summary := fmt.Sprintf("Repository: %s (%s) — %s", it.RepoFullName, it.Language, it.BodyText)
		b.WriteString("    <summary>" + xmlEscape(summary) + "</summary>\n")
		b.WriteString("  </entry>\n")
	}
	b.WriteString("</feed>\n")
	return b.String()
}

func renderICS(items []repository.GoodFirstIssueItem) string {
	var b strings.Builder
	now := time.Now().UTC()
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//OpenDoor//Good First Issue Alerts//EN\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("METHOD:PUBLISH\r\n")
	for _, it := range items {
		// AC2: one VEVENT per issue, no RRULE. DTSTART = issue drop time,
		// DTEND = DTSTART + 30min so zero-duration clients keep it.
		start := it.CreatedAt.UTC()
		if start.IsZero() {
			start = now
		}
		end := start.Add(30 * time.Minute)
		uid := fmt.Sprintf("gfi-%d@opendoor.local", it.ID)
		b.WriteString("BEGIN:VEVENT\r\n")
		b.WriteString("UID:" + uid + "\r\n")
		b.WriteString("DTSTAMP:" + icsDate(now) + "\r\n")
		b.WriteString("DTSTART:" + icsDate(start) + "\r\n")
		b.WriteString("DTEND:" + icsDate(end) + "\r\n")
		b.WriteString("SUMMARY:" + icsEscape(it.Title) + "\r\n")
		b.WriteString("URL:" + icsEscape(it.URL) + "\r\n")
		desc := fmt.Sprintf("Good First Issue in %s (%s): %s", it.RepoFullName, it.Language, it.BodyText)
		b.WriteString("DESCRIPTION:" + icsEscape(desc) + "\r\n")
		b.WriteString("END:VEVENT\r\n")
	}
	b.WriteString("END:VCALENDAR\r\n")
	return b.String()
}
