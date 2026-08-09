package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

type RepoRecord struct {
	ID                  string `db:"id"`
	GoodFirstIssueCount int    `db:"good_first_issue_count"`
}

func main() {
	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	log.Println("Starting full re-scoring of repositories from DB event history...")

	var repos []RepoRecord
	err = database.Select(&repos, `
		SELECT r.id, COALESCE(s.good_first_issue_count, 0) as good_first_issue_count
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
	`)
	if err != nil {
		log.Fatalf("Failed to fetch repositories: %v", err)
	}

	log.Printf("Loaded %d repositories for re-scoring", len(repos))

	rawMetricsList := make([]scoring.RawMetrics, 0, len(repos))
	validRepos := make([]RepoRecord, 0, len(repos))

	// Step 1: Compute Raw Metrics from repo_pr_events + repo_raw_comments for each repo
	for i, r := range repos {
		if (i+1)%5000 == 0 || i+1 == len(repos) {
			log.Printf("Progress: computed raw metrics for %d/%d repos...", i+1, len(repos))
		}

		prs, err := fetchPRsForRepo(database, r.ID, 180)
		if err != nil {
			log.Printf("Warning: failed to fetch PRs for repo %s: %v", r.ID, err)
			continue
		}

		// Skip repos with no PR event data — don't corrupt their existing scores
		if len(prs) == 0 {
			continue
		}

		raw := scoring.ComputeMetrics(prs, false)
		raw.GoodFirstIssueCount = r.GoodFirstIssueCount

		rawMetricsList = append(rawMetricsList, raw)
		validRepos = append(validRepos, r)
	}

	if len(rawMetricsList) == 0 {
		log.Println("No repository metrics computed. Exiting.")
		os.Exit(0)
	}

	// Step 2: Normalise metrics across all repos globally
	log.Println("Normalising metrics across all repositories...")
	normedMetrics := scoring.NormaliseAll(rawMetricsList)

	// Step 3: Compute C-Rank score and tier, then save snapshots to DB
	log.Println("Updating snapshots in database...")
	today := time.Now().UTC().Format("2006-01-02")
	updatedCount := 0

	for i, r := range validRepos {
		raw := rawMetricsList[i]
		normed := normedMetrics[i]

		score, tier := scoring.ComputeCRank(normed, raw.StalenessFlag, raw.GoodFirstIssueCount)

		staleness := 0
		if raw.StalenessFlag {
			staleness = 1
		}

		_, err := database.Exec(`
			INSERT INTO daily_snapshots (
				id, repository_id, snapshot_date,
				external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
				first_timer_success_rate, repeat_contributor_rate,
				maintainer_responsiveness, last_activity_days, review_rounds,
				distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				external_pr_merge_rate        = VALUES(external_pr_merge_rate),
				time_to_first_response_hours  = VALUES(time_to_first_response_hours),
				time_to_merge_hours           = VALUES(time_to_merge_hours),
				first_timer_success_rate      = VALUES(first_timer_success_rate),
				repeat_contributor_rate       = VALUES(repeat_contributor_rate),
				maintainer_responsiveness     = VALUES(maintainer_responsiveness),
				last_activity_days            = VALUES(last_activity_days),
				review_rounds                 = VALUES(review_rounds),
				distinct_maintainer_count     = VALUES(distinct_maintainer_count),
				staleness_flag                = VALUES(staleness_flag),
				c_rank_score                  = VALUES(c_rank_score),
				c_rank_tier                   = VALUES(c_rank_tier),
				good_first_issue_count        = VALUES(good_first_issue_count)
		`,
			uuid.New().String(), r.ID, today,
			raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours, raw.TimeToMergeHours,
			raw.FirstTimerSuccessRate, raw.RepeatContributorRate, raw.MaintainerResponsiveness,
			raw.LastActivityDays, raw.ReviewRounds, raw.DistinctMaintainerCount,
			staleness, score, tier, raw.GoodFirstIssueCount,
		)
		if err != nil {
			log.Printf("Failed daily_snapshot update for %s: %v", r.ID, err)
		}

		_, err = database.Exec(`
			INSERT INTO latest_snapshots (
				repository_id, snapshot_date,
				external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
				first_timer_success_rate, repeat_contributor_rate,
				maintainer_responsiveness, last_activity_days, review_rounds,
				distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE
				snapshot_date                 = VALUES(snapshot_date),
				external_pr_merge_rate        = VALUES(external_pr_merge_rate),
				time_to_first_response_hours  = VALUES(time_to_first_response_hours),
				time_to_merge_hours           = VALUES(time_to_merge_hours),
				first_timer_success_rate      = VALUES(first_timer_success_rate),
				repeat_contributor_rate       = VALUES(repeat_contributor_rate),
				maintainer_responsiveness     = VALUES(maintainer_responsiveness),
				last_activity_days            = VALUES(last_activity_days),
				review_rounds                 = VALUES(review_rounds),
				distinct_maintainer_count     = VALUES(distinct_maintainer_count),
				staleness_flag                = VALUES(staleness_flag),
				c_rank_score                  = VALUES(c_rank_score),
				c_rank_tier                   = VALUES(c_rank_tier),
				good_first_issue_count        = VALUES(good_first_issue_count),
				updated_at                    = CURRENT_TIMESTAMP
		`,
			r.ID, today,
			raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours, raw.TimeToMergeHours,
			raw.FirstTimerSuccessRate, raw.RepeatContributorRate, raw.MaintainerResponsiveness,
			raw.LastActivityDays, raw.ReviewRounds, raw.DistinctMaintainerCount,
			staleness, score, tier, raw.GoodFirstIssueCount,
		)
		if err != nil {
			log.Printf("Failed latest_snapshot update for %s: %v", r.ID, err)
			continue
		}

		updatedCount++
	}

	fmt.Printf("\n✓ Successfully re-scored %d repositories.\n", updatedCount)

	type rankRow struct {
		ClassRank string `db:"c_rank_tier"`
		Cnt       int    `db:"cnt"`
	}
	var rankRows []rankRow
	_ = database.Select(&rankRows, `
		SELECT c_rank_tier, COUNT(*) as cnt
		FROM latest_snapshots
		GROUP BY c_rank_tier
	`)

	rankCounts := make(map[string]int)
	for _, r := range rankRows {
		rankCounts[r.ClassRank] = r.Cnt
	}

	fmt.Println("\nUpdated Global Tier Distribution:")
	fmt.Printf("  S-Class Doors : %d\n", rankCounts["S"])
	fmt.Printf("  A-Class Doors : %d\n", rankCounts["A"])
	fmt.Printf("  B-Class Doors : %d\n", rankCounts["B"])
	fmt.Printf("  C-Class Doors : %d\n", rankCounts["C"])
	fmt.Printf("  D-Class Doors : %d\n", rankCounts["D"])

	log.Println("Full re-scoring complete!")
}

func fetchPRsForRepo(db *sqlx.DB, repoID string, days int) ([]scoring.PR, error) {
	cutoff := fmt.Sprintf("DATE_SUB(NOW(), INTERVAL %d DAY)", days)
	rows, err := db.Query(fmt.Sprintf(`
		SELECT
			e.pr_number,
			MIN(CASE WHEN e.action = 'opened' THEN e.event_at END) AS opened_at,
			MIN(CASE WHEN e.action IN ('closed','merged') THEN e.event_at END) AS closed_at,
			MAX(CASE WHEN e.action = 'merged' THEN 1 ELSE 0 END) AS was_merged,
			MIN(e.actor_login) AS actor_login,
			(
				SELECT MIN(c.created_at)
				FROM repo_raw_comments c
				WHERE c.repository_id = e.repository_id
				  AND c.created_at > MIN(CASE WHEN e.action = 'opened' THEN e.event_at END)
				  AND c.created_at < DATE_ADD(MIN(CASE WHEN e.action = 'opened' THEN e.event_at END), INTERVAL 30 DAY)
				LIMIT 1
			) AS first_comment_at
		FROM repo_pr_events e
		WHERE e.repository_id = ?
		  AND e.event_at >= %s
		GROUP BY e.repository_id, e.pr_number
		HAVING opened_at IS NOT NULL
	`, cutoff), repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prs []scoring.PR
	for rows.Next() {
		var prNumber int
		var openedAt, closedAt, firstCommentAt sql.NullString
		var wasMerged int
		var actorLogin string
		if err := rows.Scan(&prNumber, &openedAt, &closedAt, &wasMerged, &actorLogin, &firstCommentAt); err != nil {
			return nil, err
		}

		created, _ := time.Parse("2006-01-02 15:04:05", openedAt.String)

		pr := scoring.PR{
			AuthorLogin:       actorLogin,
			AuthorAssociation: "CONTRIBUTOR",
			CreatedAt:         created,
		}

		if wasMerged == 1 {
			pr.State = "MERGED"
			if closedAt.Valid {
				t, _ := time.Parse("2006-01-02 15:04:05", closedAt.String)
				pr.MergedAt = &t
			}
		} else if closedAt.Valid {
			pr.State = "CLOSED"
		} else {
			pr.State = "OPEN"
		}

		if firstCommentAt.Valid {
			t, _ := time.Parse("2006-01-02 15:04:05", firstCommentAt.String)
			pr.FirstCommentAt = &t
		}

		prs = append(prs, pr)
	}
	return prs, nil
}
