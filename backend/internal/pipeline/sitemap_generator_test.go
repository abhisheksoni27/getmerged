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

	mainContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap", "main.xml"))
	if err != nil {
		t.Fatalf("failed to read main.xml: %v", err)
	}

	for _, want := range []string{
		"https://getmerged.abhishekco.de/topics",
		"https://getmerged.abhishekco.de/topics/rust",
		"https://getmerged.abhishekco.de/topics/machine-learning",
		"https://getmerged.abhishekco.de/topics/ai",
	} {
		if !strings.Contains(string(mainContent), want) {
			t.Fatalf("expected main.xml to reference %q, got:\n%s", want, string(mainContent))
		}
	}

	// A topic with zero indexed repositories must never be emitted (no 404 in sitemap)
	if strings.Contains(string(mainContent), "/topics/never-indexed") {
		t.Fatalf("main.xml must not reference /topics/never-indexed (no indexed repos):\n%s", string(mainContent))
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

	// Verify master sitemap.xml exists
	masterFile := filepath.Join(tempDir, "sitemap.xml")
	if _, err := os.Stat(masterFile); os.IsNotExist(err) {
		t.Fatalf("master sitemap.xml not generated")
	}

	// Verify typescript.xml and go.xml exist
	tsFile := filepath.Join(tempDir, "sitemap", "typescript.xml")
	if _, err := os.Stat(tsFile); os.IsNotExist(err) {
		t.Fatalf("typescript.xml sitemap partition not generated")
	}

	goFile := filepath.Join(tempDir, "sitemap", "go.xml")
	if _, err := os.Stat(goFile); os.IsNotExist(err) {
		t.Fatalf("go.xml sitemap partition not generated")
	}

	content, err := os.ReadFile(goFile)
	if err != nil || !strings.Contains(string(content), "https://getmerged.abhishekco.de/golang/go") {
		t.Fatalf("expected go.xml to contain 'https://getmerged.abhishekco.de/golang/go', got: %s", string(content))
	}

	// C# and C++ must be slugged to csharp.xml / cpp.xml, never c#.xml / c++.xml
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "csharp.xml")); err != nil {
		t.Fatalf("expected csharp.xml partition to be generated (C# must be slugged), got: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "cpp.xml")); err != nil {
		t.Fatalf("expected cpp.xml partition to be generated (C++ must be slugged), got: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "c#.xml")); err == nil {
		t.Fatalf("c#.xml must not exist (raw '#' breaks sitemap URLs)")
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "c++.xml")); err == nil {
		t.Fatalf("c++.xml must not exist (raw '+' collides with URL decoding)")
	}

	// Master index must reference the slugged filenames, URL-escaped
	masterContent, err := os.ReadFile(masterFile)
	if err != nil {
		t.Fatalf("failed to read master sitemap: %v", err)
	}
	for _, want := range []string{
		"https://getmerged.abhishekco.de/sitemap/csharp.xml",
		"https://getmerged.abhishekco.de/sitemap/cpp.xml",
	} {
		if !strings.Contains(string(masterContent), want) {
			t.Fatalf("expected master sitemap to reference %q, got:\n%s", want, string(masterContent))
		}
	}
	if strings.Contains(string(masterContent), "c#.xml") || strings.Contains(string(masterContent), "c++.xml") {
		t.Fatalf("master sitemap must not reference raw c#.xml/c++.xml:\n%s", string(masterContent))
	}

	// main.xml must reference the slugged /rankings and /good-first-issue URLs
	mainContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap", "main.xml"))
	if err != nil {
		t.Fatalf("failed to read main.xml: %v", err)
	}
	for _, want := range []string{
		"https://getmerged.abhishekco.de/rankings/csharp",
		"https://getmerged.abhishekco.de/rankings/cpp",
		"https://getmerged.abhishekco.de/good-first-issue/csharp",
		"https://getmerged.abhishekco.de/good-first-issue/cpp",
	} {
		if !strings.Contains(string(mainContent), want) {
			t.Fatalf("expected main.xml to reference %q, got:\n%s", want, string(mainContent))
		}
	}
	if strings.Contains(string(mainContent), "/rankings/c#") || strings.Contains(string(mainContent), "/rankings/c++") {
		t.Fatalf("main.xml must not reference raw c#/c++ language URLs:\n%s", string(mainContent))
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

	// 1. main.xml must contain /compare (the comparison tool landing page)
	mainContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap", "main.xml"))
	if err != nil {
		t.Fatalf("failed to read main.xml: %v", err)
	}
	if !strings.Contains(string(mainContent), "https://getmerged.abhishekco.de/compare") {
		t.Fatalf("expected main.xml to contain https://getmerged.abhishekco.de/compare, got:\n%s", string(mainContent))
	}

	// 2. compare.xml must NOT exist (synthetic pairwise combinations excluded to preserve crawl budget)
	compareFile := filepath.Join(tempDir, "sitemap", "compare.xml")
	if _, err := os.Stat(compareFile); err == nil {
		t.Fatalf("compare.xml should not exist (synthetic combinations excluded from sitemap)")
	}

	// 3. master sitemap.xml must NOT reference compare.xml
	masterContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap.xml"))
	if err != nil {
		t.Fatalf("failed to read master sitemap: %v", err)
	}
	if strings.Contains(string(masterContent), "compare.xml") {
		t.Fatalf("master sitemap should not reference compare.xml:\n%s", string(masterContent))
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

	// main-1.xml and main-2.xml should exist, monolithic main.xml should NOT exist
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "main-1.xml")); err != nil {
		t.Fatalf("expected main-1.xml to be generated, got err: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "main-2.xml")); err != nil {
		t.Fatalf("expected main-2.xml to be generated, got err: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tempDir, "sitemap", "main.xml")); err == nil {
		t.Fatalf("monolithic main.xml should not exist when chunked into main-1.xml and main-2.xml")
	}

	// master sitemap.xml must reference main-1.xml and main-2.xml
	masterContent, err := os.ReadFile(filepath.Join(tempDir, "sitemap.xml"))
	if err != nil {
		t.Fatalf("failed to read master sitemap: %v", err)
	}
	masterStr := string(masterContent)
	if !strings.Contains(masterStr, "https://getmerged.abhishekco.de/sitemap/main-1.xml") {
		t.Fatalf("master sitemap missing main-1.xml:\n%s", masterStr)
	}
	if !strings.Contains(masterStr, "https://getmerged.abhishekco.de/sitemap/main-2.xml") {
		t.Fatalf("master sitemap missing main-2.xml:\n%s", masterStr)
	}
}


