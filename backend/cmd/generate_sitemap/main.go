package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/joho/godotenv"
)

func main() {
	outDirFlag := flag.String("out", "", "Output directory for static XML sitemaps (defaults to ../frontend/public or public)")
	flag.Parse()

	// Load .env configuration
	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	publicDir := *outDirFlag
	if publicDir == "" {
		publicDir = "../frontend/public"
		if _, err := os.Stat(publicDir); os.IsNotExist(err) {
			publicDir = "public"
		}
	}

	log.Printf("Generating static sitemaps into %s...", publicDir)

	if err := pipeline.GenerateStaticSitemaps(database, publicDir); err != nil {
		log.Fatalf("Sitemap generation failed: %v", err)
	}

	masterPath := filepath.Join(publicDir, "sitemap.xml")
	fmt.Printf("✓ Static sitemaps generated successfully! Master index: %s\n", masterPath)
}
