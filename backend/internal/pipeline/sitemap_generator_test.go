package pipeline_test

import (
	"os"
	"path/filepath"
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
}
