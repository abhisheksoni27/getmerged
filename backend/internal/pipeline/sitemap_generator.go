package pipeline

import (
	"encoding/xml"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

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
		FullName string `db:"full_name"`
		Language string `db:"language"`
	}

	var repos []repoInfo
	query := `SELECT full_name, COALESCE(language, 'other') as language FROM repositories`
	if err := db.Select(&repos, query); err != nil {
		return fmt.Errorf("fetch repos for sitemap: %w", err)
	}

	baseUrl := "https://opendoor.abhishekco.de"
	today := time.Now().UTC().Format(time.RFC3339)

	// Group repos by normalized language
	langMap := make(map[string][]repoInfo)
	for _, r := range repos {
		lang := strings.ToLower(strings.TrimSpace(r.Language))
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
	mainUrlset := URLSet{
		URLs: []URL{
			{
				Loc:        baseUrl,
				LastMod:    today,
				ChangeFreq: "daily",
				Priority:   "1.0",
			},
		},
	}
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
				urlset.URLs = append(urlset.URLs, URL{
					Loc:        fmt.Sprintf("%s/repo/%s/%s", baseUrl, parts[0], parts[1]),
					LastMod:    today,
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
			Loc:     fmt.Sprintf("%s/sitemap/%s", baseUrl, fileName),
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
