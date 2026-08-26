package main

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

type RepoMeta struct {
	ID                  string  `db:"id"`
	GoodFirstIssueCount int     `db:"good_first_issue_count"`
	CRankTier           string  `db:"c_rank_tier"`
	CRankScore          float64 `db:"c_rank_score"`
}

type RawPREvent struct {
	RepositoryID string    `db:"repository_id"`
	PRNumber     int       `db:"pr_number"`
	ActorLogin   string    `db:"actor_login"`
	Action       string    `db:"action"`
	EventAt      time.Time `db:"event_at"`
}

type RawCommentEvent struct {
	RepositoryID string    `db:"repository_id"`
	AuthorLogin  string    `db:"author_login"`
	CreatedAt    time.Time `db:"created_at"`
}

type commentMeta struct {
	login     string
	createdAt time.Time
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

	// Ensure connection pool utilizes available concurrency
	database.SetMaxOpenConns(64)
	database.SetMaxIdleConns(32)

	log.Println("Starting ultra-fast concurrent re-scoring of repositories...")
	startTotal := time.Now()

	// Step 1: Load all repository metadata
	var repos []RepoMeta
	err = database.Select(&repos, `
		SELECT r.id, COALESCE(s.good_first_issue_count, 0) as good_first_issue_count, COALESCE(s.c_rank_tier, '') as c_rank_tier, COALESCE(s.c_rank_score, 0) as c_rank_score
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
	`)
	if err != nil {
		log.Fatalf("Failed to fetch repositories: %v", err)
	}
	log.Printf("Loaded %d repositories in %v", len(repos), time.Since(startTotal))

	repoMap := make(map[string]RepoMeta, len(repos))
	for _, r := range repos {
		repoMap[r.ID] = r
	}

	// Step 2: Fetch all relevant PR events in bulk (index-backed, no subqueries)
	log.Println("Fetching all 180-day PR events in bulk via indexed range scan...")
	fetchStart := time.Now()

	var prEvents []RawPREvent
	err = database.Select(&prEvents, `
		SELECT repository_id, pr_number, actor_login, action, event_at
		FROM repo_pr_events
		WHERE event_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
	`)
	if err != nil {
		log.Fatalf("Failed to load PR events: %v", err)
	}
	log.Printf("Loaded %d PR events in %v", len(prEvents), time.Since(fetchStart))

	// Step 3: Fetch all raw comments in bulk for response turnaround
	log.Println("Fetching all 180-day comment events in bulk via indexed range scan...")
	commentStart := time.Now()

	var commentEvents []RawCommentEvent
	err = database.Select(&commentEvents, `
		SELECT repository_id, author_login, created_at
		FROM repo_raw_comments
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
	`)
	if err != nil {
		log.Printf("Warning: repo_raw_comments load failed: %v", err)
	}
	log.Printf("Loaded %d comment events in %v", len(commentEvents), time.Since(commentStart))

	// Step 4: Index comments in Go memory by repository_id
	repoComments := make(map[string][]commentMeta, len(repos))
	for _, c := range commentEvents {
		repoComments[c.RepositoryID] = append(repoComments[c.RepositoryID], commentMeta{login: c.AuthorLogin, createdAt: c.CreatedAt})
	}

	// Step 5: Group PR events by repo -> PR in Go memory
	type prAgg struct {
		actorLogin string
		openedAt   time.Time
		closedAt   *time.Time
		wasMerged  bool
	}

	repoPRAgg := make(map[string]map[int]*prAgg, len(repos))
	for _, ev := range prEvents {
		prs, ok := repoPRAgg[ev.RepositoryID]
		if !ok {
			prs = make(map[int]*prAgg)
			repoPRAgg[ev.RepositoryID] = prs
		}

		pa, ok := prs[ev.PRNumber]
		if !ok {
			pa = &prAgg{}
			prs[ev.PRNumber] = pa
		}

		if ev.ActorLogin != "" && pa.actorLogin == "" {
			pa.actorLogin = ev.ActorLogin
		}

		if ev.Action == "opened" {
			pa.openedAt = ev.EventAt
		} else if ev.Action == "merged" {
			pa.wasMerged = true
			t := ev.EventAt
			pa.closedAt = &t
		} else if ev.Action == "closed" {
			t := ev.EventAt
			pa.closedAt = &t
		}
	}

	// Step 6: Convert aggregated PRs into scoring.PR slices per repo concurrently
	log.Println("Computing raw metrics across multi-core worker pool...")
	computeStart := time.Now()

	numWorkers := runtime.NumCPU() * 2
	if numWorkers < 8 {
		numWorkers = 8
	}

	type computeResult struct {
		repo RepoMeta
		raw  scoring.RawMetrics
	}

	workCh := make(chan RepoMeta, len(repos))
	resCh := make(chan computeResult, len(repos))

	var wg sync.WaitGroup
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range workCh {
				prsMap, exists := repoPRAgg[r.ID]
				if !exists || len(prsMap) == 0 {
					continue
				}

				comments := repoComments[r.ID]

				scoringPRs := make([]scoring.PR, 0, len(prsMap))
				for _, pa := range prsMap {
					if pa.openedAt.IsZero() {
						continue
					}

					pr := scoring.PR{
						AuthorLogin:       pa.actorLogin,
						AuthorAssociation: "CONTRIBUTOR",
						CreatedAt:         pa.openedAt,
					}

					if pa.wasMerged {
						pr.State = "MERGED"
						pr.MergedAt = pa.closedAt
					} else if pa.closedAt != nil {
						pr.State = "CLOSED"
					} else {
						pr.State = "OPEN"
					}

					// Find earliest comment within 30 days of PR open + collect comment authors
					var firstComment *time.Time
					limit30d := pa.openedAt.Add(30 * 24 * time.Hour)
					for _, cm := range comments {
						if cm.createdAt.After(pa.openedAt) && cm.createdAt.Before(limit30d) {
							if firstComment == nil || cm.createdAt.Before(*firstComment) {
								tCopy := cm.createdAt
								firstComment = &tCopy
							}
						}
						inWindow := cm.createdAt.After(pa.openedAt) && (pa.closedAt == nil || cm.createdAt.Before(*pa.closedAt))
						if inWindow && cm.login != pa.actorLogin && cm.login != "" {
							pr.CommentAuthors = append(pr.CommentAuthors, cm.login)
						}
					}
					pr.FirstCommentAt = firstComment
					scoringPRs = append(scoringPRs, pr)
				}

				if len(scoringPRs) == 0 {
					continue
				}

				raw := scoring.ComputeMetrics(scoringPRs, false, scoring.BusFactorWindowDays())
				raw.GoodFirstIssueCount = r.GoodFirstIssueCount

				resCh <- computeResult{repo: r, raw: raw}
			}
		}()
	}

	for _, r := range repos {
		workCh <- r
	}
	close(workCh)

	go func() {
		wg.Wait()
		close(resCh)
	}()

	validRepos := make([]RepoMeta, 0, len(repos))
	rawMetricsList := make([]scoring.RawMetrics, 0, len(repos))

	for res := range resCh {
		validRepos = append(validRepos, res.repo)
		rawMetricsList = append(rawMetricsList, res.raw)
	}

	log.Printf("Computed raw metrics for %d valid repos in %v", len(validRepos), time.Since(computeStart))

	if len(rawMetricsList) == 0 {
		log.Println("No repository metrics computed. Exiting.")
		return
	}

	// Step 7: Global Normalisation
	log.Println("Normalising metrics globally...")
	normStart := time.Now()
	normedMetrics := scoring.NormaliseAll(rawMetricsList)
	log.Printf("Global normalisation complete in %v", time.Since(normStart))

	// Step 8: Bulk Batch Upsert into MySQL (500 rows per statement)
	log.Println("Bulk upserting snapshots into database...")
	upsertStart := time.Now()
	today := time.Now().UTC().Format("2006-01-02")

	const batchSize = 500
	totalUpdated := 0

	// AC3: score-changed events collected during a successful recalc; emitted
	// only after the upsert loop completes so failures never emit.
	var scoreEvents []pipeline.ScoreChangedEvent

	for i := 0; i < len(validRepos); i += batchSize {
		end := i + batchSize
		if end > len(validRepos) {
			end = len(validRepos)
		}

		batchRepos := validRepos[i:end]
		batchRaw := rawMetricsList[i:end]
		batchNormed := normedMetrics[i:end]

		var queryBuilder strings.Builder
		queryBuilder.WriteString(`
			INSERT INTO latest_snapshots (
				repository_id, snapshot_date,
				external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
				first_timer_success_rate, repeat_contributor_rate,
				maintainer_responsiveness, last_activity_days, review_rounds,
				distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, updated_at
			) VALUES `)

		var args []interface{}
		for j, r := range batchRepos {
			raw := batchRaw[j]
			normed := batchNormed[j]

			// For global recalculation re-anchor, evaluate clean baseline thresholds (S >= 70.0)
			score, tier := scoring.ComputeCRank(normed, raw.StalenessFlag, raw.GoodFirstIssueCount)
			if raw.ExternalPRCount > 0 && !raw.StalenessFlag {
				score = scoring.ComputeConfidenceScore(score, raw.ExternalPRCount)
			}

			staleness := 0
			if raw.StalenessFlag {
				staleness = 1
			}

			if scoring.CompareRescoreOutcome(r.CRankScore, score) != scoring.OutcomeNoChange {
				scoreEvents = append(scoreEvents, pipeline.ScoreChangedEvent{
					RepoID:   r.ID,
					OldScore: r.CRankScore,
					NewScore: score,
					OldTier:  r.CRankTier,
					NewTier:  tier,
				})
			}

			if j > 0 {
				queryBuilder.WriteString(", ")
			}
			queryBuilder.WriteString("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)")
			args = append(args,
				r.ID, today,
				raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours, raw.TimeToMergeHours,
				raw.FirstTimerSuccessRate, raw.RepeatContributorRate, raw.MaintainerResponsiveness,
				raw.LastActivityDays, raw.ReviewRounds, raw.DistinctMaintainerCount,
				raw.BusFactor, staleness, score, tier, raw.GoodFirstIssueCount,
			)
		}

		queryBuilder.WriteString(`
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
				bus_factor                    = VALUES(bus_factor),
				staleness_flag                = VALUES(staleness_flag),
				c_rank_score                  = VALUES(c_rank_score),
				c_rank_tier                   = VALUES(c_rank_tier),
				good_first_issue_count        = VALUES(good_first_issue_count),
				updated_at                    = CURRENT_TIMESTAMP
		`)

		if _, err := database.Exec(queryBuilder.String(), args...); err != nil {
			log.Printf("Batch bulk upsert failed for batch %d..%d: %v", i, end, err)
			continue
		}

		totalUpdated += len(batchRepos)
	}

	log.Printf("Bulk upsert completed in %v. Total updated: %d", time.Since(upsertStart), totalUpdated)

	// AC3: the recalc succeeded — emit score-changed events so playbook
	// payloads and before/after cards refresh from this event (no polling).
	if totalUpdated > 0 && len(scoreEvents) > 0 {
		if err := pipeline.EmitScoreChangedEvents(context.Background(), database, scoreEvents); err != nil {
			log.Printf("Warning: score-changed event emission failed: %v", err)
		}
	}

	// Step 9: Report final distribution
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

	fmt.Println("\n✓ Updated Global Tier Distribution:")
	fmt.Printf("  S-Class Doors : %d\n", rankCounts["S"])
	fmt.Printf("  A-Class Doors : %d\n", rankCounts["A"])
	fmt.Printf("  B-Class Doors : %d\n", rankCounts["B"])
	fmt.Printf("  C-Class Doors : %d\n", rankCounts["C"])
	fmt.Printf("  D-Class Doors : %d\n", rankCounts["D"])
	fmt.Printf("\nTotal re-scoring execution time: %v\n", time.Since(startTotal))
}

func unusedUUID() string {
	return uuid.New().String()
}
