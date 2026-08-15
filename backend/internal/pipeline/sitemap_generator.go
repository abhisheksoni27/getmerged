package pipeline

import (
	"encoding/xml"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// languageSlug mirrors the frontend getLanguageSlug() so sitemap URLs always
// match the canonical routes (/rankings/csharp, /rankings/cpp). Sitemap files
// and URLs must never contain raw '#' or '+' characters: '#' starts a URL
// fragment (crawlers strip it) and '+' collides with path decoding.
func languageSlug(lang string) string {
	normalized := strings.ToLower(strings.TrimSpace(lang))
	switch normalized {
	case "c#":
		return "csharp"
	case "c++", "cplusplus":
		return "cpp"
	case "golang":
		return "go"
	}
	normalized = strings.ReplaceAll(normalized, " ", "-")
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, normalized)
}

type URL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod"`
	ChangeFreq string `xml:"changefreq"`
	Priority   string `xml:"priority"`
}

type URLSet struct {
	XMLName xml.Name `xml:"http://www.sitemaps.org/schemas/sitemap/0.9 urlset"`
	URLs    []URL    `xml:"url"`
}

type SitemapIndex struct {
	XMLName  xml.Name  `xml:"http://www.sitemaps.org/schemas/sitemap/0.9 sitemapindex"`
	Sitemaps []Sitemap `xml:"sitemap"`
}

type Sitemap struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod"`
}

// GenerateStaticSitemaps writes static XML sitemap index and language partition files to publicDir.
func GenerateStaticSitemaps(db *sqlx.DB, publicDir string) error {
	slog.Info("sitemap generator: starting static generation", "dir", publicDir)

	type repoInfo struct {
		FullName  string  `db:"full_name"`
		Language  string  `db:"language"`
		UpdatedAt *string `db:"updated_at"`
	}

	var repos []repoInfo
	query := `
		SELECT
			r.full_name,
			COALESCE(r.language, 'other') as language,
			COALESCE(s.snapshot_date, DATE(r.updated_at)) as updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
	`
	if err := db.Select(&repos, query); err != nil {
		return fmt.Errorf("fetch repos for sitemap: %w", err)
	}

	baseUrl := "https://getmerged.abhishekco.de"
	today := time.Now().UTC().Format(time.RFC3339)

	// Group repos by canonical slug (mirrors frontend getLanguageSlug so the
	// sitemap never emits raw '#'/'+' language segments).
	langMap := make(map[string][]repoInfo)
	for _, r := range repos {
		lang := languageSlug(r.Language)
		if lang == "" {
			lang = "other"
		}
		langMap[lang] = append(langMap[lang], r)
	}

	sitemapDir := filepath.Join(publicDir, "sitemap")
	if err := os.MkdirAll(sitemapDir, 0755); err != nil {
		return fmt.Errorf("create sitemap directory: %w", err)
	}

	var indexSitemaps []Sitemap

	// 1. Generate main.xml for homepage & core platform landing pages
	mainUrls := []URL{
		{Loc: baseUrl, LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/repos", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/how-c-rank-works", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/leaderboard", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/good-first-issue", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/hall-of-fame", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/status", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.6"},
		{Loc: fmt.Sprintf("%s/privacy", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
		{Loc: fmt.Sprintf("%s/terms", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
	}

	// Add language rankings and GFI hubs to main sitemap
	for lang := range langMap {
		if lang != "" && lang != "other" {
			mainUrls = append(mainUrls, URL{
				Loc:        fmt.Sprintf("%s/rankings/%s", baseUrl, lang),
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "0.9",
			})
			mainUrls = append(mainUrls, URL{
				Loc:        fmt.Sprintf("%s/good-first-issue/%s", baseUrl, lang),
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "0.9",
			})
		}
	}

	mainUrlset := URLSet{URLs: mainUrls}
	mainOutput, err := xml.MarshalIndent(mainUrlset, "", "  ")
	if err == nil {
		mainFilePath := filepath.Join(sitemapDir, "main.xml")
		xmlHeader := []byte(xml.Header)
		if err := os.WriteFile(mainFilePath, append(xmlHeader, mainOutput...), 0644); err == nil {
			indexSitemaps = append(indexSitemaps, Sitemap{
				Loc:     fmt.Sprintf("%s/sitemap/main.xml", baseUrl),
				LastMod: today,
			})
		}
	}

	// 2. Generate language partition sitemaps
	for lang, langRepos := range langMap {
		urlset := URLSet{
			URLs: []URL{},
		}

		for _, r := range langRepos {
			parts := strings.Split(r.FullName, "/")
			if len(parts) == 2 {
				lastMod := today
				if r.UpdatedAt != nil && *r.UpdatedAt != "" {
					lastMod = *r.UpdatedAt
				}
				urlset.URLs = append(urlset.URLs, URL{
					Loc:        fmt.Sprintf("%s/%s/%s", baseUrl, parts[0], parts[1]),
					LastMod:    lastMod,
					ChangeFreq: "daily",
					Priority:   "0.8",
				})
			}
		}

		// Marshal XML
		output, err := xml.MarshalIndent(urlset, "", "  ")
		if err != nil {
			slog.Error("sitemap generator: xml marshal failed", "lang", lang, "err", err)
			continue
		}

		fileName := fmt.Sprintf("%s.xml", lang)
		filePath := filepath.Join(sitemapDir, fileName)
		xmlHeader := []byte(xml.Header)
		if err := os.WriteFile(filePath, append(xmlHeader, output...), 0644); err != nil {
			slog.Error("sitemap generator: write file failed", "file", filePath, "err", err)
			continue
		}

		indexSitemaps = append(indexSitemaps, Sitemap{
			Loc:     fmt.Sprintf("%s/sitemap/%s", baseUrl, url.PathEscape(fileName)),
			LastMod: today,
		})
	}

	// Master sitemap.xml index
	masterIndex := SitemapIndex{
		Sitemaps: indexSitemaps,
	}
	indexOutput, err := xml.MarshalIndent(masterIndex, "", "  ")
	if err != nil {
		return fmt.Errorf("master sitemap index marshal: %w", err)
	}

	masterPath := filepath.Join(publicDir, "sitemap.xml")
	xmlHeader := []byte(xml.Header)
	if err := os.WriteFile(masterPath, append(xmlHeader, indexOutput...), 0644); err != nil {
		return fmt.Errorf("master sitemap write file: %w", err)
	}

	slog.Info("sitemap generator: static XMLs generated successfully", "master", masterPath, "partitions", len(indexSitemaps))
	return nil
}
