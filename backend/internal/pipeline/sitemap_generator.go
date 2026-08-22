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

// topicSlug sanitizes a repository topic for use in sitemap URLs. GitHub topic
// names are lowercase alphanumeric + hyphens, but defensive sanitization keeps
// raw '#'/'+' out of sitemap.xml the same way languageSlug does.
func topicSlug(topic string) string {
	normalized := strings.ToLower(strings.TrimSpace(topic))
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

// MinTopicRepoThreshold defines the minimum number of indexed repositories
// required before a topic landing page is published to Google sitemaps.
const MinTopicRepoThreshold = 1

// GenerateStaticSitemaps partitions the database into static sitemaps and writes to publicDir.
func GenerateStaticSitemaps(db *sqlx.DB, publicDir string) error {
	baseUrl := "https://getmerged.abhishekco.de"
	today := time.Now().UTC().Format("2006-01-02")
	sitemapDir := filepath.Join(publicDir, "sitemap")

	if err := os.MkdirAll(sitemapDir, 0755); err != nil {
		return fmt.Errorf("create sitemap dir: %w", err)
	}

	indexSitemaps := []Sitemap{}

	// 1. Fetch distinct languages
	type repoLang struct {
		FullName  string  `db:"full_name"`
		Language  string  `db:"language"`
		UpdatedAt *string `db:"updated_at"`
	}

	var repos []repoLang
	query := `
		SELECT full_name, COALESCE(language, 'other') as language, updated_at
		FROM repositories
		ORDER BY stars DESC
	`
	if err := db.Select(&repos, query); err != nil {
		return fmt.Errorf("fetch repos for sitemap: %w", err)
	}

	// Group repos by canonical language slug
	langMap := make(map[string][]repoLang)
	for _, r := range repos {
		slug := languageSlug(r.Language)
		if slug == "" {
			slug = "other"
		}
		langMap[slug] = append(langMap[slug], r)
	}

	// Generate main.xml for core landing pages and hubs
	mainUrls := []URL{
		{Loc: baseUrl, LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/repos", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/compare", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/how-c-rank-works", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/leaderboard", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/good-first-issue", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/hall-of-fame", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/topics", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/status", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.6"},
		{Loc: fmt.Sprintf("%s/privacy", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
		{Loc: fmt.Sprintf("%s/terms", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
	}

	// Add language rankings, GFI hubs, and matchmaker pages to main sitemap
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
			mainUrls = append(mainUrls, URL{
				Loc:        fmt.Sprintf("%s/contribute/%s?level=beginner", baseUrl, lang),
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "0.9",
			})
			mainUrls = append(mainUrls, URL{
				Loc:        fmt.Sprintf("%s/contribute/%s?level=experienced", baseUrl, lang),
				LastMod:    today,
				ChangeFreq: "weekly",
				Priority:   "0.8",
			})
		}
	}

	// Add topic landings (/topics/[topic]) to main sitemap - only for distinct
	// topics with >= MinTopicRepoThreshold indexed repositories so search engines never hit a 404 or thin content.
	var topics []string
	topicQuery := `
		SELECT topic
		FROM repository_topics
		GROUP BY topic
		HAVING COUNT(repository_id) >= ?
		ORDER BY COUNT(repository_id) DESC, topic ASC
	`
	if err := db.Select(&topics, topicQuery, MinTopicRepoThreshold); err != nil {
		slog.Warn("sitemap generator: could not fetch topics", "err", err)
	} else {
		for _, t := range topics {
			slug := topicSlug(t)
			if slug == "" {
				continue
			}
			mainUrls = append(mainUrls, URL{
				Loc:        fmt.Sprintf("%s/topics/%s", baseUrl, slug),
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "0.7",
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

	// 3. Generate compare.xml for bounded head-to-head repo comparisons (Top 10 Tier S/A per language vs 3 rank neighbors, max 1000)
	type rankedRepo struct {
		FullName string  `db:"full_name"`
		Language string  `db:"language"`
		RankTier string  `db:"c_rank_tier"`
		Score    float64 `db:"c_rank_score"`
	}

	var rankedRepos []rankedRepo
	rankedQuery := `
		SELECT
			r.full_name,
			COALESCE(r.language, 'other') as language,
			COALESCE(s.c_rank_tier, 'A') as c_rank_tier,
			COALESCE(s.c_rank_score, 0) as c_rank_score
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE COALESCE(s.c_rank_tier, 'A') IN ('S', 'A')
		ORDER BY COALESCE(s.c_rank_score, 0) DESC, r.stars DESC
	`
	if err := db.Select(&rankedRepos, rankedQuery); err != nil {
		slog.Warn("sitemap generator: could not fetch ranked repos for compare sitemap", "err", err)
	} else {
		langRanked := make(map[string][]rankedRepo)
		for _, rr := range rankedRepos {
			l := languageSlug(rr.Language)
			if l == "" {
				l = "other"
			}
			langRanked[l] = append(langRanked[l], rr)
		}

		var compareUrls []URL
		seenPairs := make(map[string]bool)

		for _, list := range langRanked {
			limit := len(list)
			if limit > 10 {
				limit = 10
			}
			for i := 0; i < limit; i++ {
				for j := i + 1; j <= i+3 && j < len(list); j++ {
					if len(compareUrls) >= 1000 {
						break
					}
					repoA := list[i].FullName
					repoB := list[j].FullName
					partsA := strings.Split(repoA, "/")
					partsB := strings.Split(repoB, "/")
					if len(partsA) != 2 || len(partsB) != 2 {
						continue
					}
					// Sort lexicographically to ensure canonical URL
					if strings.ToLower(repoA) > strings.ToLower(repoB) {
						repoA, repoB = repoB, repoA
					}
					pairKey := fmt.Sprintf("%s vs %s", strings.ToLower(repoA), strings.ToLower(repoB))
					if seenPairs[pairKey] {
						continue
					}
					seenPairs[pairKey] = true

					compareUrls = append(compareUrls, URL{
						Loc:        fmt.Sprintf("%s/compare/%s/vs/%s", baseUrl, repoA, repoB),
						LastMod:    today,
						ChangeFreq: "daily",
						Priority:   "0.7",
					})
				}
				if len(compareUrls) >= 1000 {
					break
				}
			}
			if len(compareUrls) >= 1000 {
				break
			}
		}

		if len(compareUrls) > 0 {
			compareUrlset := URLSet{URLs: compareUrls}
			compareOutput, err := xml.MarshalIndent(compareUrlset, "", "  ")
			if err == nil {
				compareFilePath := filepath.Join(sitemapDir, "compare.xml")
				xmlHeader := []byte(xml.Header)
				if err := os.WriteFile(compareFilePath, append(xmlHeader, compareOutput...), 0644); err == nil {
					indexSitemaps = append(indexSitemaps, Sitemap{
						Loc:     fmt.Sprintf("%s/sitemap/compare.xml", baseUrl),
						LastMod: today,
					})
				}
			}
		}
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
