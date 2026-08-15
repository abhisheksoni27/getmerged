package pipeline_test

import (
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
