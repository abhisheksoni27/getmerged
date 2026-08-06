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
		return id, err
	} else if err != nil {
		return "", err
	}

	_, err = db.Exec(`
		UPDATE repositories
		SET updated_at = ?, stars = ?, description = ?, language = ?
		WHERE id = ?
	`, time.Now().UTC(), r.Stars, strings.TrimSpace(r.Description), r.Language, id)
	return id, err
}

func scoreAndSaveRepo(db *sqlx.DB, gh *github.Client, repoID, owner, name, fullName string, existingMetrics []scoring.RawMetrics) ([]scoring.RawMetrics, error) {
	prs, _, err := gh.FetchPRs(owner, name, 180)
	if err != nil {
		return existingMetrics, fmt.Errorf("FetchPRs: %w", err)
	}

	stale, _ := gh.IsStalenessFlag(owner, name)

	gfiCount, err := gh.FetchGoodFirstIssueCount(owner, name)
	if err != nil {
		slog.Warn("scoreAndSaveRepo: FetchGoodFirstIssueCount failed - assuming none", "repo", fullName, "err", err)
	}

	scoringPRs := make([]scoring.PR, len(prs))
	for i, p := range prs {
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
	raw := scoring.ComputeMetrics(scoringPRs, stale)
	raw.GoodFirstIssueCount = gfiCount

	allRaw := append(existingMetrics, raw)

	normed := scoring.NormaliseAll(allRaw)
	thisNormed := normed[len(normed)-1]

	score, tier := scoring.ComputeCRank(thisNormed, raw.StalenessFlag, raw.GoodFirstIssueCount)

	// Save real raw PR comment texts for zero-cost sentiment and NLP model ingestion
	for _, p := range prs {
		for _, commentText := range p.CommentTexts {
			if strings.TrimSpace(commentText) != "" {
				_, _ = db.Exec(`
					INSERT INTO repo_raw_comments (repository_id, author_login, comment_text, created_at)
					VALUES (?, 'maintainer', ?, CURRENT_TIMESTAMP)
				`, repoID, commentText)
			}
		}
	}

	if err := saveSnapshot(db, repoID, raw, score, tier); err != nil {
		return existingMetrics, err
	}
	return allRaw, nil
}

func saveSnapshot(db *sqlx.DB, repoID string, m scoring.RawMetrics, score float64, tier string) error {
	staleness := 0
	if m.StalenessFlag {
		staleness = 1
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
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			maintainer_responsiveness     = excluded.maintainer_responsiveness,
			last_activity_days            = excluded.last_activity_days,
			review_rounds                 = excluded.review_rounds,
			distinct_maintainer_count     = excluded.distinct_maintainer_count,
			staleness_flag                = excluded.staleness_flag,
			c_rank_score                  = excluded.c_rank_score,
			c_rank_tier                   = excluded.c_rank_tier,
			good_first_issue_count        = excluded.good_first_issue_count
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
		staleness,
		score,
		tier,
		m.GoodFirstIssueCount,
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
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(repository_id) DO UPDATE SET
			snapshot_date                 = excluded.snapshot_date,
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			maintainer_responsiveness     = excluded.maintainer_responsiveness,
			last_activity_days            = excluded.last_activity_days,
			review_rounds                 = excluded.review_rounds,
			distinct_maintainer_count     = excluded.distinct_maintainer_count,
			staleness_flag                = excluded.staleness_flag,
			c_rank_score                  = excluded.c_rank_score,
			c_rank_tier                   = excluded.c_rank_tier,
			good_first_issue_count        = excluded.good_first_issue_count,
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
		staleness,
		score,
		tier,
		m.GoodFirstIssueCount,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
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
