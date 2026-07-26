package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/joho/godotenv"
)

func main() {
	// Explicitly try loading production .env paths if present
	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to Turso/SQLite database: %v", err)
	}
	defer database.Close()

	ctx := context.Background()

	log.Println("Starting Turso historical snapshot C-Rank tier recalculation...")

	// 1. Recalculate daily_snapshots tiers in Turso
	res, err := database.ExecContext(ctx, `
		UPDATE daily_snapshots
		SET c_rank_tier = CASE
			WHEN c_rank_score >= 70 THEN 'S'
			WHEN c_rank_score >= 55 THEN 'A'
			WHEN c_rank_score >= 40 THEN 'B'
			WHEN c_rank_score >= 25 THEN 'C'
			ELSE 'D'
		END
		WHERE c_rank_score IS NOT NULL
	`)
	if err != nil {
		log.Fatalf("Failed to update daily_snapshots: %v", err)
	}

	updatedSnapshots, _ := res.RowsAffected()
	fmt.Printf("✓ Recalculated tiers for %d daily_snapshots rows in Turso.\n", updatedSnapshots)

	// 2. Query updated distribution from Turso
	type rankRow struct {
		ClassRank string `db:"c_rank_tier"`
		Cnt       int    `db:"cnt"`
	}
	var rankRows []rankRow
	_ = database.SelectContext(ctx, &rankRows, `
		SELECT s.c_rank_tier, COUNT(*) as cnt
		FROM daily_snapshots s
		INNER JOIN (
			SELECT repository_id, MAX(snapshot_date) as max_date
			FROM daily_snapshots GROUP BY repository_id
		) latest ON s.repository_id = latest.repository_id AND s.snapshot_date = latest.max_date
		GROUP BY s.c_rank_tier
	`)

	rankCounts := make(map[string]int)
	for _, r := range rankRows {
		rankCounts[r.ClassRank] = r.Cnt
	}

	fmt.Println("\nUpdated Turso Global Tier Distribution:")
	fmt.Printf("  S-Class Doors : %d\n", rankCounts["S"])
	fmt.Printf("  A-Class Doors : %d\n", rankCounts["A"])
	fmt.Printf("  B-Class Doors : %d\n", rankCounts["B"])
	fmt.Printf("  C-Class Doors : %d\n", rankCounts["C"])
	fmt.Printf("  D-Class Doors : %d\n", rankCounts["D"])

	log.Println("Turso migration complete!")
	os.Exit(0)
}
