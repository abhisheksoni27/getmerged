package main

import (
	"database/sql"
	"flag"
	"fmt"
	"math"
	"os"
	"sort"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

type snapshot struct {
	RepoFullName    string    `db:"full_name"`
	RepoID          string    `db:"id"`
	Tier            string    `db:"c_rank_tier"`
	Score           float64   `db:"c_rank_score"`
	MergeRate       float64   `db:"external_pr_merge_rate"`
	TimeToFirstResp float64   `db:"time_to_first_response_hours"`
	TimeToMerge     float64   `db:"time_to_merge_hours"`
	FTSuccess       float64   `db:"first_timer_success_rate"`
	RepeatContrib   float64   `db:"repeat_contributor_rate"`
	GFI             int       `db:"good_first_issue_count"`
}

func main() {
	n := flag.Int("n", 10, "number of random repos to smoke test")
	dsn := flag.String("dsn", os.Getenv("DRY_DSN"), "mysql DSN")
	flag.Parse()

	if *dsn == "" {
		fmt.Fprintln(os.Stderr, "missing -dsn (or DRY_DSN)")
		os.Exit(2)
	}

	db, err := sqlx.Connect("mysql", *dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, "connect:", err)
		os.Exit(1)
	}
	defer db.Close()

	var snaps []snapshot
	err = db.Select(&snaps, `
		SELECT r.full_name, r.id, ls.c_rank_tier, ls.c_rank_score,
		       ls.external_pr_merge_rate, ls.time_to_first_response_hours,
		       ls.time_to_merge_hours, ls.first_timer_success_rate,
		       ls.repeat_contributor_rate, ls.good_first_issue_count
		FROM latest_snapshots ls
		JOIN repositories r ON r.id = ls.repository_id
		JOIN (
			SELECT DISTINCT repository_id FROM repo_pr_events
			WHERE event_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
			  AND action = 'opened'
		) ev ON ev.repository_id = ls.repository_id
		ORDER BY RAND()
		LIMIT ?
	`, *n)
	if err != nil {
		fmt.Fprintln(os.Stderr, "select snaps:", err)
		os.Exit(1)
	}
	if len(snaps) == 0 {
		fmt.Println("no repos matched; nothing to test")
		os.Exit(0)
	}

	fmt.Printf("%-42s %-4s %7s %8s %8s %8s   %s\n",
		"repo", "tier", "merge%", "ttf_resp", "ttf_mrg", "ft_ok", "verdict")
	fails := 0
	for _, s := range snaps {
		prs := readEvents(db, s.RepoID)
		var comments []time.Time
		_ = db.Select(&comments,
			`SELECT created_at FROM repo_raw_comments
			 WHERE repository_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)`, s.RepoID)
		sort.Slice(comments, func(i, j int) bool { return comments[i].Before(comments[j]) })
		attachFirstComment(prs, comments)

		var raw scoring.RawMetrics
		if len(prs) == 0 {
			// Shouldn't happen (query guarantees >=1 opened), guard anyway.
			fmt.Printf("%-42s %-4s  NO-EVENTS\n", s.RepoFullName, s.Tier)
			fails++
			continue
		}
		raw = scoring.ComputeMetrics(prs, false)
		raw.GoodFirstIssueCount = s.GFI

		mergeOK := approx(raw.ExternalPRMergeRate, s.MergeRate, 1.0)
		ftOK := approx(raw.FirstTimerSuccessRate, s.FTSuccess, 0.02)
		ttfOK := approx(raw.TimeToFirstResponseHours, s.TimeToFirstResp, max(2.0, 0.05*s.TimeToFirstResp))
		ttmOK := approx(raw.TimeToMergeHours, s.TimeToMerge, max(2.0, 0.05*s.TimeToMerge))

		verdict := "PASS"
		if !(mergeOK && ftOK && ttfOK && ttmOK) {
			verdict = "MISMATCH"
			fails++
		}
		fmt.Printf("%-42s %-4s %7.1f %8.1f %8.1f %8.1f   %s\n",
			s.RepoFullName, s.Tier,
			raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours,
			raw.TimeToMergeHours, raw.FirstTimerSuccessRate,
			verdict)
		if verdict == "MISMATCH" {
			fmt.Printf("    note: stored merge=%.1f ft=%.1f ttf_resp=%.1f ttf_mrg=%.1f\n",
				s.MergeRate, s.FTSuccess, s.TimeToFirstResp, s.TimeToMerge)
		}
	}

	fmt.Printf("\n%d/%d repos matched between crawler snapshot and DB-event recompute.\n",
		len(snaps)-fails, len(snaps))
	if fails > 0 {
		os.Exit(1)
	}
}

type prRow struct {
	OpenedAt sql.NullTime
	ClosedAt sql.NullTime
	Merged   int
	Login    string
}

// readEvents mirrors cmd/recalculate_history.fetchPRsForRepo exactly, so the
// recomputed raw metrics come from the same DB path the nightly re-anchor uses.
func readEvents(db *sqlx.DB, repoID string) []scoring.PR {
	rows, err := db.Query(`
		SELECT
			MIN(CASE WHEN e.action = 'opened' THEN e.event_at END) AS opened_at,
			MIN(CASE WHEN e.action IN ('closed','merged') THEN e.event_at END) AS closed_at,
			MAX(CASE WHEN e.action = 'merged' THEN 1 ELSE 0 END) AS was_merged,
			MIN(e.actor_login) AS actor_login
		FROM repo_pr_events e
		WHERE e.repository_id = ? AND e.event_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
		GROUP BY e.pr_number
		HAVING opened_at IS NOT NULL`, repoID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var prs []scoring.PR
	for rows.Next() {
		var r prRow
		if err := rows.Scan(&r.OpenedAt, &r.ClosedAt, &r.Merged, &r.Login); err != nil {
			continue
		}
		p := scoring.PR{AuthorLogin: r.Login, AuthorAssociation: "CONTRIBUTOR", CreatedAt: r.OpenedAt.Time}
		if r.Merged == 1 {
			p.State = "MERGED"
			if r.ClosedAt.Valid {
				mt := r.ClosedAt.Time
				p.MergedAt = &mt
			}
		} else if r.ClosedAt.Valid {
			p.State = "CLOSED"
		} else {
			p.State = "OPEN"
		}
		prs = append(prs, p)
	}
	return prs
}

func attachFirstComment(prs []scoring.PR, comments []time.Time) {
	for i := range prs {
		p := &prs[i]
		for _, t := range comments {
			if t.After(p.CreatedAt) {
				if t.Before(p.CreatedAt.AddDate(0, 0, 30)) {
					tt := t
					p.FirstCommentAt = &tt
				}
				break
			}
		}
	}
}

func approx(a, b, tol float64) bool {
	if a == 0 && b == 0 {
		return true
	}
	return math.Abs(a-b) <= tol
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}