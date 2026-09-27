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
// We set this to 3 so search engines only index rich topic hubs, not thin 1-repo tags.
const MinTopicRepoThreshold = 3

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

	indexSitemaps := []Sitemap{}

	// 1. Fetch distinct languages
	type repoLang struct {
		FullName  string  `db:"full_name"`
		Language  string  `db:"language"`
		UpdatedAt *string `db:"updated_at"`
	}

	var repos []repoLang
	// Directory of Awesomeness: Only index high-quality, vibrant, and scored open-source repositories.
	// Filter out stale/dead graveyard repos (staleness_flag = 1) and unscored low-star repositories.
	query := `
		SELECT 
			r.full_name, 
			COALESCE(r.language, 'other') as language, 
			COALESCE(ls.updated_at, r.updated_at) as updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id
		WHERE (
			(ls.c_rank_score > 0 AND ls.staleness_flag = 0 AND (ls.c_rank_tier IN ('S', 'A', 'B') OR ls.c_rank_tier IS NULL))
			OR (ls.good_first_issue_count IS NOT NULL AND ls.good_first_issue_count > 0 AND ls.staleness_flag = 0)
			OR (r.stars >= 1000 AND (ls.staleness_flag = 0 OR ls.repository_id IS NULL) AND (ls.c_rank_score IS NULL OR ls.c_rank_score > 0))
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

	// Generate main partition for core landing pages, hubs, and topics
	mainUrls := []URL{
		{Loc: baseUrl, LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/repos", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "1.0"},
		{Loc: fmt.Sprintf("%s/rankings", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
		{Loc: fmt.Sprintf("%s/compare", baseUrl), LastMod: today, ChangeFreq: "daily", Priority: "0.9"},
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
				Loc:        fmt.Sprintf("%s/contribute/%s", baseUrl, lang),
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "0.9",
			})
		}
	}

	// Add topic landings (/topics/[topic]) to main sitemap - only for distinct
	// topics with >= MinTopicRepoThreshold indexed repositories so search engines never hit a 404 or thin content.
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

	mainSitemaps, err := writeSitemapPartition(sitemapDir, "main", mainUrls, baseUrl, today)
	if err != nil {
		slog.Error("sitemap generator: main sitemap generation failed", "err", err)
	} else {
		indexSitemaps = append(indexSitemaps, mainSitemaps...)
		if len(mainUrls) > MaxURLsPerSitemap {
			// Remove legacy oversized main.xml if chunked partitions were generated
			_ = os.Remove(filepath.Join(sitemapDir, "main.xml"))
		}
	}

	// 2. Generate language partition sitemaps
	for lang, langRepos := range langMap {
		var langUrls []URL
		for _, r := range langRepos {
			parts := strings.Split(r.FullName, "/")
			if len(parts) == 2 {
				lastMod := today
				if r.UpdatedAt != nil && *r.UpdatedAt != "" {
					lastMod = *r.UpdatedAt
				}
				langUrls = append(langUrls, URL{
					Loc:        fmt.Sprintf("%s/%s/%s", baseUrl, parts[0], parts[1]),
					LastMod:    lastMod,
					ChangeFreq: "daily",
					Priority:   "0.8",
				})
			}
		}

		langSitemaps, err := writeSitemapPartition(sitemapDir, lang, langUrls, baseUrl, today)
		if err != nil {
			slog.Error("sitemap generator: lang sitemap generation failed", "lang", lang, "err", err)
			continue
		}
		indexSitemaps = append(indexSitemaps, langSitemaps...)
	}

	// 3. Generate compare partition sitemaps
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
			compSitemaps, err := writeSitemapPartition(sitemapDir, "compare", compareUrls, baseUrl, today)
			if err != nil {
				slog.Error("sitemap generator: compare sitemap generation failed", "err", err)
			} else {
				indexSitemaps = append(indexSitemaps, compSitemaps...)
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
