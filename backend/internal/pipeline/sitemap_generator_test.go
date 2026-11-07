package pipeline_test

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestGenerateStaticSitemaps_TopicURLs(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	now := time.Now()
	for i := 1; i <= 10; i++ {
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, 'tokio-rs', ?, 'Rust', 25000, ?)`, fmt.Sprintf("rust-%d", i), fmt.Sprintf("tokio-rs/tokio-%d", i), fmt.Sprintf("tokio-%d", i), now)
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, 'huggingface', ?, 'Python', 130000, ?)`, fmt.Sprintf("ml-%d", i), fmt.Sprintf("huggingface/transformers-%d", i), fmt.Sprintf("transformers-%d", i), now)
		database.MustExec(`INSERT INTO repository_topics (topic, repository_id) VALUES ('rust', ?)`, fmt.Sprintf("rust-%d", i))
		database.MustExec(`INSERT INTO repository_topics (topic, repository_id) VALUES ('machine-learning', ?)`, fmt.Sprintf("ml-%d", i))
		database.MustExec(`INSERT INTO repository_topics (topic, repository_id) VALUES ('ai', ?)`, fmt.Sprintf("ml-%d", i))
	}

	tempDir, err := os.MkdirTemp("", "sitemap_topic_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	if err := pipeline.GenerateStaticSitemaps(database, tempDir); err != nil {
		t.Fatalf("expected GenerateStaticSitemaps to succeed, got: %v", err)
	}

	sitemapContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap.xml"))
	if err != nil {
		t.Fatalf("failed to read sitemap.xml: %v", err)
	}

	for _, want := range []string{
		"https://getmerged.abhishekco.de/topics",
		"https://getmerged.abhishekco.de/topics/rust",
		"https://getmerged.abhishekco.de/topics/machine-learning",
		"https://getmerged.abhishekco.de/topics/ai",
	} {
		if !strings.Contains(string(sitemapContent), want) {
			t.Fatalf("expected sitemap.xml to reference %q, got:\n%s", want, string(sitemapContent))
		}
	}

	// A topic with zero indexed repositories must never be emitted (no 404 in sitemap)
	if strings.Contains(string(sitemapContent), "/topics/never-indexed") {
		t.Fatalf("sitemap.xml must not reference /topics/never-indexed (no indexed repos):\n%s", string(sitemapContent))
	}
}

func TestGenerateStaticSitemaps(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	_ = db.AutoMigrate(database)

	database.MustExec(`
	CREATE TABLE IF NOT EXISTS repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		language TEXT,
		stars INTEGER DEFAULT 0,
		description TEXT,
		github_url TEXT,
		updated_at DATETIME NOT NULL
	);
	`)

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'freeCodeCamp/freeCodeCamp', 'freeCodeCamp', 'freeCodeCamp', 'TypeScript', 450000, ?)`, now)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'golang/go', 'golang', 'go', 'Go', 120000, ?)`, now)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('3', 'dotnet/runtime', 'dotnet', 'runtime', 'C#', 15000, ?)`, now)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('4', 'electron/electron', 'electron', 'electron', 'C++', 120000, ?)`, now)

	tempDir, err := os.MkdirTemp("", "sitemap_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	if err := pipeline.GenerateStaticSitemaps(database, tempDir); err != nil {
		t.Fatalf("expected GenerateStaticSitemaps to succeed, got: %v", err)
	}

	// Verify master sitemap.xml exists as unified single file
	masterFile := filepath.Join(tempDir, "sitemap.xml")
	if _, err := os.Stat(masterFile); os.IsNotExist(err) {
		t.Fatalf("master sitemap.xml not generated")
	}

	content, err := os.ReadFile(masterFile)
	if err != nil {
		t.Fatalf("failed to read master sitemap: %v", err)
	}
	contentStr := string(content)

	// Verify repositories are included in the single unified sitemap
	for _, want := range []string{
		"https://getmerged.abhishekco.de/freeCodeCamp/freeCodeCamp",
		"https://getmerged.abhishekco.de/golang/go",
		"https://getmerged.abhishekco.de/dotnet/runtime",
		"https://getmerged.abhishekco.de/electron/electron",
	} {
		if !strings.Contains(contentStr, want) {
			t.Fatalf("expected unified sitemap.xml to contain %q, got:\n%s", want, contentStr)
		}
	}

	// C# and C++ must be slugged to /rankings/csharp and /rankings/cpp, never raw c#/c++
	for _, want := range []string{
		"https://getmerged.abhishekco.de/rankings/csharp",
		"https://getmerged.abhishekco.de/rankings/cpp",
		"https://getmerged.abhishekco.de/good-first-issue/csharp",
		"https://getmerged.abhishekco.de/good-first-issue/cpp",
	} {
		if !strings.Contains(contentStr, want) {
			t.Fatalf("expected unified sitemap.xml to reference %q, got:\n%s", want, contentStr)
		}
	}
	if strings.Contains(contentStr, "/rankings/c#") || strings.Contains(contentStr, "/rankings/c++") {
		t.Fatalf("unified sitemap.xml must not reference raw c#/c++ language URLs:\n%s", contentStr)
	}
}

func TestGenerateStaticSitemaps_CompareSitemap(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	now := time.Now()
	// Insert repos in Go and Rust with Tier S/A
	for i := 1; i <= 15; i++ {
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, ?, ?, 'Go', ?, ?)`,
			fmt.Sprintf("go-%d", i), fmt.Sprintf("org-go/repo-%02d", i), "org-go", fmt.Sprintf("repo-%02d", i), 10000-i*100, now)
		database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_score, c_rank_tier) VALUES (?, ?, ?, 'S')`,
			fmt.Sprintf("go-%d", i), "2026-08-18", 95.0-float64(i))
	}

	tempDir, err := os.MkdirTemp("", "sitemap_compare_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	if err := pipeline.GenerateStaticSitemaps(database, tempDir); err != nil {
		t.Fatalf("expected GenerateStaticSitemaps to succeed, got: %v", err)
	}

	// 1. unified sitemap.xml must contain /compare (the comparison tool landing page)
	masterContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap.xml"))
	if err != nil {
		t.Fatalf("failed to read sitemap.xml: %v", err)
	}
	masterStr := string(masterContent)
	if !strings.Contains(masterStr, "https://getmerged.abhishekco.de/compare<") && !strings.Contains(masterStr, "https://getmerged.abhishekco.de/compare\n") {
		t.Fatalf("expected sitemap.xml to contain https://getmerged.abhishekco.de/compare, got:\n%s", masterStr)
	}

	// 2. pairwise showdowns must NOT be in sitemap.xml
	if strings.Contains(masterStr, "/compare/") {
		t.Fatalf("sitemap.xml should not contain /compare/ subpath showdowns:\n%s", masterStr)
	}
}

func TestGenerateStaticSitemaps_Chunking(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	now := time.Now()
	for i := 1; i <= 10; i++ {
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, 'org', ?, 'Go', 10000, ?)`, fmt.Sprintf("%d", i), fmt.Sprintf("org/repo-%d", i), fmt.Sprintf("repo-%d", i), now)
	}

	// Insert 46,000 topics to exceed MaxURLsPerSitemap (45,000)
	tx, err := database.Begin()
	if err != nil {
		t.Fatalf("failed to begin tx: %v", err)
	}
	stmt, err := tx.Prepare(`INSERT INTO repository_topics (topic, repository_id) VALUES (?, ?)`)
	if err != nil {
		t.Fatalf("failed to prepare stmt: %v", err)
	}
	for i := 0; i < 46000; i++ {
		topic := fmt.Sprintf("topic-%06d", i)
		for r := 1; r <= 10; r++ {
			_, _ = stmt.Exec(topic, fmt.Sprintf("%d", r))
		}
	}
	stmt.Close()
	_ = tx.Commit()

	tempDir, err := os.MkdirTemp("", "sitemap_chunk_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	if err := pipeline.GenerateStaticSitemaps(database, tempDir); err != nil {
		t.Fatalf("expected GenerateStaticSitemaps to succeed, got: %v", err)
	}

	// chunk-1.xml and chunk-2.xml should exist when chunked
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "chunk-1.xml")); err != nil {
		t.Fatalf("expected chunk-1.xml to be generated, got err: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "chunk-2.xml")); err != nil {
		t.Fatalf("expected chunk-2.xml to be generated, got err: %v", err)
	}

	// master sitemap.xml must reference chunk-1.xml and chunk-2.xml
	masterContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap.xml"))
	if err != nil {
		t.Fatalf("failed to read master sitemap: %v", err)
	}
	masterStr := string(masterContent)
	if !strings.Contains(masterStr, "https://getmerged.abhishekco.de/sitemap/chunk-1.xml") {
		t.Fatalf("master sitemap missing chunk-1.xml:\n%s", masterStr)
	}
	if !strings.Contains(masterStr, "https://getmerged.abhishekco.de/sitemap/chunk-2.xml") {
		t.Fatalf("master sitemap missing chunk-2.xml:\n%s", masterStr)
	}
}


