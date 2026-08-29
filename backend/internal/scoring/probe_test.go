package scoring

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"
	_ "github.com/go-sql-driver/mysql"
)

func TestProbeExact(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("skipping integration probe test without INTEGRATION_TEST=1")
	}
	db, _ := sql.Open("mysql", "opendoor_user:opendoor_pass@tcp(127.0.0.1:3306)/opendoor?parseTime=true")
	defer db.Close()
	var rid string
	err := db.QueryRow("SELECT id FROM repositories WHERE full_name='Kotlin/kotlinx-schema'").Scan(&rid)
	if err != nil { t.Fatal(err) }
	fmt.Println("real repo id:", rid)

	cutoff := fmt.Sprintf("DATE_SUB(NOW(), INTERVAL %d DAY)", 180)
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
	`, cutoff), rid)
	if err != nil { t.Fatalf("query err: %v", err) }
	var prs []PR
	for rows.Next() {
		var num int; var openedAt, closedAt, fc sql.NullString; var wasM int; var login string
		if err := rows.Scan(&num, &openedAt, &closedAt, &wasM, &login, &fc); err != nil { t.Fatalf("scan err: %v", err) }
		created, _ := time.Parse("2006-01-02 15:04:05", openedAt.String)
		pr := PR{AuthorLogin: login, AuthorAssociation: "CONTRIBUTOR", CreatedAt: created}
		if wasM == 1 { pr.State = "MERGED"; if closedAt.Valid { tt, _ := time.Parse("2006-01-02 15:04:05", closedAt.String); pr.MergedAt = &tt } } else if closedAt.Valid { pr.State = "CLOSED" } else { pr.State = "OPEN" }
		if fc.Valid { tt, _ := time.Parse("2006-01-02 15:04:05", fc.String); pr.FirstCommentAt = &tt }
		prs = append(prs, pr)
	}
	fmt.Println("PRs found:", len(prs))
	for _, p := range prs { fmt.Printf("  #%s %s merged=%v\n", p.AuthorLogin, p.State, p.MergedAt != nil) }
	raw := ComputeMetrics(prs, false, 90)
	fmt.Printf("merge_rate=%.1f last_activity=%.1f ttm=%.1f first=%.1f\n", raw.ExternalPRMergeRate, raw.LastActivityDays, raw.TimeToMergeHours, raw.FirstTimerSuccessRate)
}
