package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func main() {
	var (
		batchSize = flag.Int("batch-size", 10000, "Number of rows per chunk")
		sleepMs   = flag.Int("sleep-ms", 25, "Milliseconds sleep between batches to avoid MySQL saturation")
		swap      = flag.Bool("swap", false, "Atomically rename tables after copy finishes")
	)
	flag.Parse()

	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "opendoor_user:opendoor_pass@tcp(127.0.0.1:3306)/opendoor?parseTime=true"
	}

	db, err := sql.Open("mysql", dbURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(5)

	ctx := context.Background()

	log.Println("==> Step 1: Creating target table `repo_pr_events_new` with optimal covering index...")
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS repo_pr_events_new (
		id INT AUTO_INCREMENT PRIMARY KEY,
		repository_id VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		pr_number INT NOT NULL,
		actor_login VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		action VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
		event_at DATETIME NOT NULL,
		UNIQUE KEY uq_pr_event (repository_id, pr_number, action),
		KEY idx_pr_events_maintainer (repository_id, action, event_at),
		KEY idx_pr_events_repo_at (repository_id, event_at),
		KEY idx_pr_events_repo_pr (repository_id, pr_number)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
	`
	if _, err := db.ExecContext(ctx, createTableSQL); err != nil {
		log.Fatalf("failed to create repo_pr_events_new: %v", err)
	}

	var maxID, minID int
	err = db.QueryRowContext(ctx, "SELECT COALESCE(MIN(id), 0), COALESCE(MAX(id), 0) FROM repo_pr_events").Scan(&minID, &maxID)
	if err != nil {
		log.Fatalf("failed to get min/max id: %v", err)
	}

	var currentTargetMax int
	_ = db.QueryRowContext(ctx, "SELECT COALESCE(MAX(id), 0) FROM repo_pr_events_new").Scan(&currentTargetMax)

	startID := minID
	if currentTargetMax > startID {
		startID = currentTargetMax + 1
		log.Printf("Resuming copy from ID %d (target already has records up to %d)", startID, currentTargetMax)
	}

	log.Printf("==> Step 2: Copying rows in batches of %d (ID %d to %d, sleep: %dms)...", *batchSize, startID, maxID, *sleepMs)

	totalCopied := 0
	startTime := time.Now()

	for cur := startID; cur <= maxID; cur += *batchSize {
		chunkEnd := cur + *batchSize - 1
		if chunkEnd > maxID {
			chunkEnd = maxID
		}

		insertSQL := `
		INSERT IGNORE INTO repo_pr_events_new (id, repository_id, pr_number, actor_login, action, event_at)
		SELECT id, repository_id, pr_number, actor_login, action, event_at
		FROM repo_pr_events
		WHERE id BETWEEN ? AND ?;
		`
		res, err := db.ExecContext(ctx, insertSQL, cur, chunkEnd)
		if err != nil {
			log.Printf("Error copying chunk [%d, %d]: %v. Retrying in 1s...", cur, chunkEnd, err)
			time.Sleep(1 * time.Second)
			res, err = db.ExecContext(ctx, insertSQL, cur, chunkEnd)
			if err != nil {
				log.Fatalf("Fatal error copying chunk [%d, %d]: %v", cur, chunkEnd, err)
			}
		}

		rows, _ := res.RowsAffected()
		totalCopied += int(rows)

		progress := float64(chunkEnd-minID+1) / float64(maxID-minID+1) * 100.0
		if progress > 100.0 {
			progress = 100.0
		}

		log.Printf("[%.1f%%] Chunk [%d - %d] -> %d rows inserted (Elapsed: %s)", progress, cur, chunkEnd, rows, time.Since(startTime).Truncate(time.Second))

		if *sleepMs > 0 {
			time.Sleep(time.Duration(*sleepMs) * time.Millisecond)
		}
	}

	log.Printf("==> Copy complete! Total rows copied: %d. Total time: %s\n", totalCopied, time.Since(startTime).Truncate(time.Second))

	if *swap {
		log.Println("==> Step 3: Executing zero-downtime atomic table swap...")
		swapSQL := `RENAME TABLE repo_pr_events TO repo_pr_events_old, repo_pr_events_new TO repo_pr_events;`
		if _, err := db.ExecContext(ctx, swapSQL); err != nil {
			log.Fatalf("failed to atomic swap tables: %v", err)
		}
		log.Println("==> Table swap SUCCESSFUL! `repo_pr_events` is now active with optimal indexing.")
	} else {
		log.Println("==> NOTE: Pass `--swap` when running to atomically swap `repo_pr_events_new` into `repo_pr_events`.")
		log.Println("==> Or run SQL: `RENAME TABLE repo_pr_events TO repo_pr_events_old, repo_pr_events_new TO repo_pr_events;`")
	}
}
