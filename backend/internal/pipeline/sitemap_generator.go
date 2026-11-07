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
// We set this to 50 so search engines only index rich topic hubs with high content density.
var MinTopicRepoThreshold = 50

// MinLanguageRepoThreshold defines the minimum number of indexed repositories
// required before a language rankings/GFI/contribute hub is published to sitemaps.
// We set this to 20 so search engines are not flooded with single-repo language pages.
var MinLanguageRepoThreshold = 20

// MaxURLsPerSitemap defines the maximum number of URLs allowed per individual XML sitemap file.
// Google Search Console strictly caps single sitemap files at 50,000 URLs / 50MB.
// We partition at 45,000 to remain safely below the limit.
const MaxURLsPerSitemap = 45000

// writeSitemapPartition writes a slice of URLs to one or more partitioned XML files (<= MaxURLsPerSitemap each).
func writeSitemapPartition(sitemapDir string, prefix string, urls []URL, baseUrl string, today string) ([]Sitemap, error) {
	if len(urls) == 0 {
		return nil, nil
	}

	xmlHeader := []byte(xml.Header)
	var generated []Sitemap

	if len(urls) <= MaxURLsPerSitemap {
		urlset := URLSet{URLs: urls}
		output, err := xml.MarshalIndent(urlset, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("marshal %s.xml: %w", prefix, err)
		}
		fileName := fmt.Sprintf("%s.xml", prefix)
		filePath := filepath.Join(sitemapDir, fileName)
		if err := os.WriteFile(filePath, append(xmlHeader, output...), 0644); err != nil {
			return nil, fmt.Errorf("write %s: %w", filePath, err)
		}
		generated = append(generated, Sitemap{
			Loc:     fmt.Sprintf("%s/sitemap/%s", baseUrl, url.PathEscape(fileName)),
			LastMod: today,
		})
		return generated, nil
	}

	// Partition into chunks of <= MaxURLsPerSitemap (e.g. main-1.xml, main-2.xml)
	numChunks := (len(urls) + MaxURLsPerSitemap - 1) / MaxURLsPerSitemap
	for i := 0; i < numChunks; i++ {
		start := i * MaxURLsPerSitemap
		end := start + MaxURLsPerSitemap
		if end > len(urls) {
			end = len(urls)
		}

		chunkUrls := urls[start:end]
		urlset := URLSet{URLs: chunkUrls}
		output, err := xml.MarshalIndent(urlset, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("marshal %s-%d.xml: %w", prefix, i+1, err)
		}
		fileName := fmt.Sprintf("%s-%d.xml", prefix, i+1)
		filePath := filepath.Join(sitemapDir, fileName)
		if err := os.WriteFile(filePath, append(xmlHeader, output...), 0644); err != nil {
			return nil, fmt.Errorf("write %s: %w", filePath, err)
		}
		generated = append(generated, Sitemap{
			Loc:     fmt.Sprintf("%s/sitemap/%s", baseUrl, url.PathEscape(fileName)),
			LastMod: today,
		})
	}

	return generated, nil
}

// GenerateStaticSitemaps partitions the database into static sitemaps and writes to publicDir.
func GenerateStaticSitemaps(db *sqlx.DB, publicDir string) error {
	baseUrl := "https://getmerged.abhishekco.de"
	today := time.Now().UTC().Format("2006-01-02")
	sitemapDir := filepath.Join(publicDir, "sitemap")

	if err := os.MkdirAll(sitemapDir, 0755); err != nil {
		return fmt.Errorf("create sitemap dir: %w", err)
	}

	// Clean up stale sitemap files in sitemapDir before generating fresh partitions
	if entries, err := os.ReadDir(sitemapDir); err == nil {
		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".xml") {
				_ = os.Remove(filepath.Join(sitemapDir, entry.Name()))
			}
		}
	}

	indexSitemaps := []Sitemap{}

	// 1. Fetch distinct languages
	type repoLang struct {
		FullName  string  `db:"full_name"`
		Language  string  `db:"language"`
		UpdatedAt *string `db:"updated_at"`
	}

	var repos []repoLang
	// Directory of Awesomeness: Prioritize the top highest-value repositories.
	// We heavily weight high search volume (stars >= 2500), user watchlists, S-tier responsiveness,
	// and active Good First Issues, while cutting out stale or low-signal repos.
	query := `
		SELECT 
			r.full_name, 
			COALESCE(r.language, 'other') as language, 
			COALESCE(ls.updated_at, r.updated_at) as updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id
		LEFT JOIN (SELECT DISTINCT repo_id FROM user_watchlists) uw ON r.id = uw.repo_id
		WHERE (ls.staleness_flag = 0 OR ls.repository_id IS NULL)
		  AND (ls.c_rank_score IS NULL OR ls.c_rank_score > 0)
		  AND (
			uw.repo_id IS NOT NULL
			OR (ls.c_rank_tier = 'S' AND r.stars >= 300)
			OR (ls.good_first_issue_count IS NOT NULL AND ls.good_first_issue_count > 0 AND r.stars >= 600)
			OR r.stars >= 2500
		  )
		ORDER BY r.stars DESC
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

	// Consolidate small languages into "other" in production (len(repos) >= 50)
	// so search engines aren't bombarded with 120+ single-repo XML files.
	consolidatedLangMap := make(map[string][]repoLang)
	for slug, list := range langMap {
		if len(repos) >= 50 && slug != "other" && len(list) < MinLanguageRepoThreshold {
			consolidatedLangMap["other"] = append(consolidatedLangMap["other"], list...)
		} else {
			consolidatedLangMap[slug] = list
		}
	}

	// Generate main partition for core landing pages, hubs, and topics
	mainUrls := []URL{
		{Loc: baseUrl, LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/repos", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/rankings", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/compare", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/pricing", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/maintainers", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/community-powerhouses", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/how-c-rank-works", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/guides", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/guides/how-to-find-repos-that-merge-prs", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/guides/best-github-repos-for-beginners", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/guides/zombie-prs-why-contributions-get-ignored", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/guides/how-to-know-if-maintainer-will-review", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/guides/first-pull-request-checklist", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/about", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/leaderboard", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/good-first-issue", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/hall-of-fame", baseUrl), LastMod: today, ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/topics", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.8"},
		{Loc: fmt.Sprintf("%s/status", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.6"},
		{Loc: fmt.Sprintf("%s/privacy", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
		{Loc: fmt.Sprintf("%s/terms", baseUrl), LastMod: today, ChangeFreq: "monthly", Priority: "0.3"},
	}

	// Add language rankings, GFI hubs, and matchmaker pages to main sitemap
	// Only for languages with >= MinLanguageRepoThreshold repos (or small test DBs)
	for lang, list := range langMap {
		if lang != "" && lang != "other" {
			if len(repos) < 50 || len(list) >= MinLanguageRepoThreshold {
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
					Loc:        fmt.Sprintf("%s/contribute/%s", baseUrl, lang),
					LastMod:    today,
					ChangeFreq: "daily",
					Priority:   "0.9",
				})
			}
		}
	}

	// Add topic landings (/topics/[topic]) to main sitemap - only for distinct
	// topics with >= MinTopicRepoThreshold indexed repositories so search engines never hit a 404 or thin content.
	topicThreshold := MinTopicRepoThreshold
	if len(repos) < 50 && topicThreshold > 5 {
		topicThreshold = 5
	}
	var topics []string
	topicQuery := `
		SELECT rt.topic
		FROM repository_topics rt
		INNER JOIN repositories r ON rt.repository_id = r.id
		LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id
		WHERE (
			(ls.c_rank_score > 0 AND ls.staleness_flag = 0 AND (ls.c_rank_tier IN ('S', 'A', 'B') OR ls.c_rank_tier IS NULL))
			OR (ls.good_first_issue_count IS NOT NULL AND ls.good_first_issue_count > 0 AND ls.staleness_flag = 0)
			OR (r.stars >= 1000 AND (ls.staleness_flag = 0 OR ls.repository_id IS NULL) AND (ls.c_rank_score IS NULL OR ls.c_rank_score > 0))
		)
		GROUP BY rt.topic
		HAVING COUNT(rt.repository_id) >= ?
		ORDER BY COUNT(rt.repository_id) DESC, rt.topic ASC
	`
	if err := db.Select(&topics, topicQuery, topicThreshold); err != nil {
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

	// 2. Collect repository URLs for the top high-signal repositories
	var repoUrls []URL
	for _, r := range repos {
		parts := strings.Split(r.FullName, "/")
		if len(parts) == 2 {
			lastMod := today
			if r.UpdatedAt != nil && *r.UpdatedAt != "" {
				lastMod = *r.UpdatedAt
			}
			repoUrls = append(repoUrls, URL{
				Loc:        fmt.Sprintf("%s/%s/%s", baseUrl, parts[0], parts[1]),
				LastMod:    lastMod,
				ChangeFreq: "daily",
				Priority:   "0.8",
			})
		}
	}

	// 3. Combine all eligible URLs: core pages, top languages, rich topics, and top repositories
	var allUrls []URL
	allUrls = append(allUrls, mainUrls...)
	allUrls = append(allUrls, repoUrls...)

	masterPath := filepath.Join(publicDir, "sitemap.xml")
	xmlHeader := []byte(xml.Header)

	// Single monolithic sitemap.xml: Google strictly allows up to 50,000 URLs AND 50MB per sitemap file.
	// When under 45,000 URLs, serving ONE unified sitemap.xml eliminates 100% of sitemap index / sub-file request overhead.
	if len(allUrls) <= MaxURLsPerSitemap {
		urlset := URLSet{URLs: allUrls}
		output, err := xml.MarshalIndent(urlset, "", "  ")
		if err != nil {
			return fmt.Errorf("master sitemap marshal: %w", err)
		}
		if err := os.WriteFile(masterPath, append(xmlHeader, output...), 0644); err != nil {
			return fmt.Errorf("master sitemap write file: %w", err)
		}
		// Clean up sub-sitemap directory so no stale/fragmented child XMLs linger
		_ = os.RemoveAll(sitemapDir)

		slog.Info("sitemap generator: unified single sitemap.xml generated successfully", "master", masterPath, "urls", len(allUrls))
		return nil
	}

	// Fallback to partitioned sitemaps ONLY if URLs ever exceed MaxURLsPerSitemap (45,000)
	if err := os.MkdirAll(sitemapDir, 0755); err != nil {
		return fmt.Errorf("create sitemap dir: %w", err)
	}
	indexSitemaps, err := writeSitemapPartition(sitemapDir, "chunk", allUrls, baseUrl, today)
	if err != nil {
		return fmt.Errorf("partition sitemap: %w", err)
	}
	masterIndex := SitemapIndex{
		Sitemaps: indexSitemaps,
	}
	indexOutput, err := xml.MarshalIndent(masterIndex, "", "  ")
	if err != nil {
		return fmt.Errorf("master sitemap index marshal: %w", err)
	}
	if err := os.WriteFile(masterPath, append(xmlHeader, indexOutput...), 0644); err != nil {
		return fmt.Errorf("master sitemap write file: %w", err)
	}

	slog.Info("sitemap generator: partitioned sitemap index generated", "master", masterPath, "partitions", len(indexSitemaps))
	return nil
}
