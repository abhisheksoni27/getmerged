package pipeline

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SeedLanguages is the default set of languages to seed.
var SeedLanguages = []string{
	"Go", "Python", "JavaScript", "TypeScript", "Java", "PHP", "Rust",
	"Kotlin", "Shell", "C++", "Dart", "Swift", "Elixir", "Zig", "Scala",
	"Haskell", "C#", "Lua", "OCaml", "Julia",
}

const (
	seedMinStars = 100
	seedMaxRepos = 1000
)

// Seed fetches top repos per language, upserts them, and scores them.
// If force is false, repos with an existing snapshot for today are skipped.
func Seed(db *sqlx.DB, gh *github.Client, languages []string, force bool) error {
	if len(languages) == 0 {
		languages = SeedLanguages
	}

	slog.Info("seed started", "languages", languages, "force", force, "min_stars", seedMinStars, "max_per_lang", seedMaxRepos)

	today := time.Now().UTC().Format("2006-01-02")

	// Fetch existing DB metrics once at start for normalisation instead of N+1 queries
	cachedMetrics, err := fetchDBMetrics(db)
	if err != nil {
		slog.Warn("seed: could not fetch initial DB metrics for normalisation", "err", err)
		cachedMetrics = nil
	}

	for _, lang := range languages {
		slog.Info("seed: searching repos", "language", lang)

		repos, err := gh.SearchRepos(lang, seedMinStars, seedMaxRepos)
		if err != nil {
			slog.Error("seed: SearchRepos failed", "language", lang, "err", err)
			continue
		}

		slog.Info("seed: found repos", "language", lang, "count", len(repos))

		scored, skipped, failed := 0, 0, 0
		for _, r := range repos {
			repoID, err := upsertRepo(db, r)
			if err != nil {
				slog.Error("seed: repo upsert failed", "repo", r.FullName, "err", err)
				failed++
				continue
			}

			// Skip if snapshot for today exists and force is false
			if !force {
				var count int
				_ = db.Get(&count, "SELECT COUNT(1) FROM daily_snapshots WHERE repository_id = ? AND snapshot_date = ?", repoID, today)
				if count > 0 {
					slog.Debug("seed: snapshot exists for today - skipping", "repo", r.FullName, "date", today)
					skipped++
					continue
				}
			}

			// Score repository
			updatedMetrics, err := scoreAndSaveRepo(db, gh, repoID, r.Owner, r.Name, r.FullName, cachedMetrics)
			if err != nil {
				slog.Error("seed: score repo failed", "repo", r.FullName, "err", err)
				failed++
				continue
			}
			cachedMetrics = updatedMetrics

			scored++
		}

		slog.Info("seed: language complete", "language", lang, "scored", scored, "skipped", skipped, "failed", failed)
	}

	// Issue #11 Fix: Recalculate macro stats after seed data completes
	ctx := context.Background()
	if _, err := analytics.ComputeAndCacheMacroStats(ctx, db); err != nil {
		slog.Error("seed: failed to recalculate macro stats after seed", "err", err)
	} else {
		slog.Info("seed: macro stats updated successfully")
	}

	// Issue #10 Fix: Purge Valkey cache after seed finishes
	if vk := gh.Valkey(); vk != nil {
		if keys, err := vk.Do(ctx, vk.B().Smembers().Key("apicache:tag:get_repos").Build()).AsStrSlice(); err == nil {
			for _, k := range keys {
				_ = vk.Do(ctx, vk.B().Del().Key(k).Build())
			}
			_ = vk.Do(ctx, vk.B().Del().Key("apicache:tag:get_repos").Build())
			slog.Info("seed: purged cache by tag 'get_repos' successfully", "count", len(keys))
		}
	}

	slog.Info("seed completed successfully")
	return nil
}

func upsertRepo(db *sqlx.DB, r github.Repo) (string, error) {
	var id string
	err := db.QueryRow("SELECT id FROM repositories WHERE full_name = ?", r.FullName).Scan(&id)
	if err == sql.ErrNoRows {
		id = uuid.New().String()
		_, err = db.Exec(`
			INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, id, r.FullName, r.Owner, r.Name, r.Language, r.Stars, strings.TrimSpace(r.Description), r.URL, time.Now().UTC())
		if err != nil {
			return "", err
		}
	} else if err != nil {
		return "", err
	} else {
		_, err = db.Exec(`
			UPDATE repositories
			SET updated_at = ?, stars = ?, description = ?, language = ?
			WHERE id = ?
		`, time.Now().UTC(), r.Stars, strings.TrimSpace(r.Description), r.Language, id)
		if err != nil {
			return "", err
		}
	}

	// Persist repository_topics so topic landings resolve (IDEA-20260818-03).
	if len(r.Topics) > 0 {
		if err := repository.NewRepoRepository(db).UpsertTopics(context.Background(), id, r.Topics); err != nil {
			slog.Warn("upsertRepo: UpsertTopics failed", "repo", r.FullName, "err", err)
		}
	}

	return id, nil
}

func scoreAndSaveRepo(db *sqlx.DB, gh *github.Client, repoID, owner, name, fullName string, existingMetrics []scoring.RawMetrics) ([]scoring.RawMetrics, error) {
	if gh == nil {
		return existingMetrics, fmt.Errorf("gh client is nil")
	}
	prs, err := fetchPRsFromDB(db, repoID, 180)
	if err != nil {
		return existingMetrics, fmt.Errorf("fetchPRsFromDB: %w", err)
	}

	if len(prs) == 0 {
		// Fallback: If DB has no PR events yet, fetch them directly from GitHub GraphQL API
		ghPRs, meta, fetchErr := gh.FetchPRs(owner, name, 180)
		if fetchErr != nil {
			// Fail with error so caller/worker retries the repo instead of falsely completing it
			return existingMetrics, fmt.Errorf("gh.FetchPRs fallback failed: %w", fetchErr)
		}

		if len(ghPRs) > 0 {
			// Persist fetched PR events into repo_pr_events so subsequent queries and event stream match
			for _, p := range ghPRs {
				action := "opened"
				if p.State == "MERGED" {
					action = "merged"
				} else if p.State == "CLOSED" {
					action = "closed"
				}
				eventAt := p.CreatedAt
				if p.MergedAt != nil {
					eventAt = *p.MergedAt
				}
				if db.DriverName() == "sqlite" {
					_, _ = db.Exec(`
						INSERT OR IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
						VALUES (?, ?, ?, ?, ?)
					`, repoID, p.Number, p.AuthorLogin, action, eventAt)
				} else {
					_, _ = db.Exec(`
						INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
						VALUES (?, ?, ?, ?, ?)
					`, repoID, p.Number, p.AuthorLogin, action, eventAt)
				}
			}

			if len(meta.Topics) > 0 {
				_ = repository.NewRepoRepository(db).UpsertTopics(context.Background(), repoID, meta.Topics)
			}

			// Map to scoring.PR
			scoringPRs := make([]scoring.PR, len(ghPRs))
			for i, p := range ghPRs {
				scoringPRs[i] = scoring.PR{
					State:             p.State,
					CreatedAt:         p.CreatedAt,
					MergedAt:          p.MergedAt,
					AuthorAssociation: p.AuthorAssociation,
					AuthorLogin:       p.AuthorLogin,
					FirstCommentAt:    p.FirstCommentAt,
					TotalComments:     p.TotalComments,
					CommentAuthors:    p.CommentAuthors,
				}
			}
			prs = scoringPRs
		}
	}

	if len(prs) == 0 {
		// Truly zero PRs on GitHub (e.g. issues/PRs disabled or zero PRs in repo history)
		slog.Debug("scoreAndSaveRepo: zero PRs found on GitHub for repo", "repo", fullName)
	}

	gfiIssues, gfiCount, err := gh.FetchGoodFirstIssuesList(owner, name, 5)
	if err != nil {
		slog.Warn("scoreAndSaveRepo: FetchGoodFirstIssuesList failed - assuming none", "repo", fullName, "err", err)
	} else {
		gfiRepo := repository.NewGFIRepository(db)
		_ = gfiRepo.UpsertIssues(context.Background(), repoID, gfiIssues)
	}

	// Issue #120: Automatically detect and update repo External Access Status & AI Policy
	ctxTimeout, cancelTimeout := context.WithTimeout(context.Background(), 10*time.Second)
	_, _ = UpdateRepoAccessStatus(ctxTimeout, db, nil, "", repoID, owner, name)
	_, _ = UpdateRepoAIPolicy(ctxTimeout, db, nil, "", repoID, owner, name)
	cancelTimeout()

	scoringPRs := make([]scoring.PR, len(prs))
	for i, p := range prs {
		scoringPRs[i] = p
	}
	raw := scoring.ComputeMetrics(scoringPRs, false, scoring.BusFactorWindowDays())
	raw.GoodFirstIssueCount = gfiCount
	raw.PRsCreated6m = len(prs)
	if issueCount, err := gh.FetchIssuesCreatedCount(owner, name, 180); err != nil {
		slog.Warn("scoreAndSaveRepo: FetchIssuesCreatedCount failed - assuming none", "repo", fullName, "err", err)
	} else {
		raw.IssuesCreated6m = issueCount
	}

	// Normalise against the caller-provided population snapshot when available
	// (avoids re-fetching the entire latest_snapshots table per repo - the old
	// N+1 behaviour that throttled the crawler to ~620 repos/hr).
	// Issue #92 defect fix: a failed or empty peer fetch previously fell through
	// silently with a single-repo population, collapsing every percentile to the
	// neutral 50 prior (the mass of score=50 rows on rankings). Fail hard so the
	// repo is retried by the next crawl instead of persisting a junk score.
	dbMetrics := existingMetrics
	if len(dbMetrics) == 0 {
		m, err := fetchDBMetrics(db)
		if err != nil {
			return existingMetrics, fmt.Errorf("fetchDBMetrics: %w", err)
		}
		if len(m) == 0 {
			return existingMetrics, fmt.Errorf("fetchDBMetrics: empty normalisation population")
		}
		dbMetrics = m
	}
	peerCount := len(dbMetrics)
	scoreSource := scoring.ResolveScoreSource(peerCount)
	if scoreSource == scoring.ScoreSourceFallback {
		slog.Warn("scoreAndSaveRepo: degraded score provenance - marking fallback",
			"repo", fullName,
			"reason", "insufficient_normalisation_peers",
			"peers", peerCount,
			"required", scoring.MinNormalisationPeers,
		)
	}
	dbMetrics = append(dbMetrics, raw)

	normed := scoring.NormaliseAll(dbMetrics)
	thisNormed := normed[len(normed)-1]

	var prevTier string
	_ = db.Get(&prevTier, "SELECT c_rank_tier FROM latest_snapshots WHERE repository_id = ?", repoID)

	score, tier := scoring.ComputeCRankWithBusFactor(thisNormed, raw.StalenessFlag, raw.GoodFirstIssueCount, raw.BusFactor, raw.PRsCreated6m, prevTier)

	// PR comment text insertion is now entirely handled by the GHArchive stream worker

	// AI Insights are now generated asynchronously via cron.

	if err := saveSnapshot(db, repoID, raw, score, tier, scoreSource); err != nil {
		return existingMetrics, err
	}
	return append(existingMetrics, raw), nil
}

func saveSnapshot(db *sqlx.DB, repoID string, m scoring.RawMetrics, score float64, tier string, scoreSource string) error {
	staleness := 0
	if m.StalenessFlag {
		staleness = 1
	}
	if scoreSource != scoring.ScoreSourceFallback {
		scoreSource = scoring.ScoreSourceComputed
	}
	today := time.Now().UTC().Format("2006-01-02")

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, score_source, good_first_issue_count, onboarding_score,
			response_p50_hours
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			bus_factor                    = VALUES(bus_factor),
			staleness_flag                = VALUES(staleness_flag),
			c_rank_score                  = VALUES(c_rank_score),
			c_rank_tier                   = VALUES(c_rank_tier),
			score_source                  = VALUES(score_source),
			good_first_issue_count        = VALUES(good_first_issue_count),
			onboarding_score              = VALUES(onboarding_score),
			response_p50_hours            = VALUES(response_p50_hours)
	`,
		uuid.New().String(),
		repoID,
		today,
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		m.BusFactor,
		staleness,
		score,
		tier,
		scoreSource,
		m.GoodFirstIssueCount,
		m.OnboardingScore,
		m.ResponseP50Hours,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		INSERT INTO latest_snapshots (
			repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, onboarding_score,
			pr_count_6m, issue_count_6m, response_p50_hours, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
			onboarding_score              = VALUES(onboarding_score),
			pr_count_6m                   = VALUES(pr_count_6m),
			issue_count_6m                = VALUES(issue_count_6m),
			response_p50_hours            = VALUES(response_p50_hours),
			updated_at                    = CURRENT_TIMESTAMP
	`,
		repoID,
		today,
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		m.BusFactor,
		staleness,
		score,
		tier,
		m.GoodFirstIssueCount,
		m.OnboardingScore,
		m.PRsCreated6m,
		m.IssuesCreated6m,
		m.ResponseP50Hours,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func fetchPRsFromDB(db *sqlx.DB, repoID string, days int) ([]scoring.PR, error) {
	// Aggregate events per PR: opened event_at = CreatedAt, any 'closed'/'merged' = MergedAt
	cutoff := fmt.Sprintf("DATE_SUB(NOW(), INTERVAL %d DAY)", days)
	rows, err := db.Query(fmt.Sprintf(`
		SELECT
			e.pr_number,
			MIN(CASE WHEN e.action = 'opened' THEN e.event_at END) AS opened_at,
			MIN(CASE WHEN e.action IN ('closed','merged') THEN e.event_at END) AS closed_at,
			MAX(CASE WHEN e.action = 'merged' THEN 1 ELSE 0 END) AS was_merged,
			MIN(e.actor_login) AS actor_login
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
	var windows []struct{ open, close time.Time }
	for rows.Next() {
		var prNumber int
		var openedAt, closedAt sql.NullTime
		var wasMerged int
		var actorLogin string
		if err := rows.Scan(&prNumber, &openedAt, &closedAt, &wasMerged, &actorLogin); err != nil {
			return nil, err
		}

		pr := scoring.PR{
			AuthorLogin:       actorLogin,
			AuthorAssociation: "CONTRIBUTOR", // treat all GHArchive actors as external contributors
			CreatedAt:         openedAt.Time,
		}

		if wasMerged == 1 {
			pr.State = "MERGED"
			if closedAt.Valid {
				mergedAt := closedAt.Time
				pr.MergedAt = &mergedAt
			}
		} else if closedAt.Valid {
			pr.State = "CLOSED"
		} else {
			pr.State = "OPEN"
		}

		windows = append(windows, struct{ open, close time.Time }{openedAt.Time, closedAt.Time})
		prs = append(prs, pr)
	}

	// Distinct-maintainer signal: attribute commenters to PRs whose lifecycle
	// window contains the comment. repo_raw_comments carries no association,
	// so any non-author commenter counts (bots are filtered at ingestion).
	if len(windows) > 0 {
		cRows, err := db.Query(`
			SELECT c.created_at, c.author_login
			FROM repo_raw_comments c
			WHERE c.repository_id = ?
			  AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		`, repoID, days)
		if err != nil {
			return nil, err
		}
		defer cRows.Close()
		for cRows.Next() {
			var ca time.Time
			var login string
			if err := cRows.Scan(&ca, &login); err != nil {
				return nil, err
			}
			for i, w := range windows {
				inWindow := ca.After(w.open) && (!w.close.IsZero() && ca.Before(w.close) || w.close.IsZero() && !ca.After(time.Now().UTC()))
				if inWindow && login != prs[i].AuthorLogin {
					prs[i].CommentAuthors = append(prs[i].CommentAuthors, login)
				}
			}
		}
	}
	return prs, nil
}


func fetchDBMetrics(db *sqlx.DB) ([]scoring.RawMetrics, error) {
	rows, err := db.Query(`
		SELECT
			COALESCE(s.external_pr_merge_rate, 0),
			COALESCE(s.time_to_first_response_hours, 0),
			COALESCE(s.time_to_merge_hours, 0),
			COALESCE(s.first_timer_success_rate, 0),
			COALESCE(s.repeat_contributor_rate, 0),
			COALESCE(s.maintainer_responsiveness, 0),
			COALESCE(s.last_activity_days, 180),
			COALESCE(s.review_rounds, 0),
			COALESCE(s.distinct_maintainer_count, 0),
			COALESCE(s.staleness_flag, 0)
		FROM latest_snapshots s
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []scoring.RawMetrics
	for rows.Next() {
		var m scoring.RawMetrics
		var staleInt int
		if err := rows.Scan(
			&m.ExternalPRMergeRate,
			&m.TimeToFirstResponseHours,
			&m.TimeToMergeHours,
			&m.FirstTimerSuccessRate,
			&m.RepeatContributorRate,
			&m.MaintainerResponsiveness,
			&m.LastActivityDays,
			&m.ReviewRounds,
			&m.DistinctMaintainerCount,
			&staleInt,
		); err != nil {
			return nil, err
		}
		m.StalenessFlag = staleInt == 1
		result = append(result, m)
	}
	return result, nil
}
