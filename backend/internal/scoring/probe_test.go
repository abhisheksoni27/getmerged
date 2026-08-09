package scoring

import (
	"database/sql"
	"testing"
	_ "github.com/go-sql-driver/mysql"
)

func TestProbeFind(t *testing.T) {
	db, _ := sql.Open("mysql", "opendoor_user:opendoor_pass@tcp(127.0.0.1:3306)/opendoor?parseTime=true")
	defer db.Close()

	var repoIDs []string
	rows, _ := db.Query("SELECT DISTINCT repository_id FROM repo_pr_events WHERE pr_number=346")
	for rows.Next() { var s string; rows.Scan(&s); repoIDs = append(repoIDs, s) }
	rows.Close()
	for _, s := range repoIDs {
		var n int
		db.QueryRow("SELECT COUNT(*) FROM repo_pr_events WHERE repository_id=?", s).Scan(&n)
		t.Logf("pr346 belongs to repo %s (%d rows)", s, n)
	}
	var cnt int
	db.QueryRow(`SELECT COUNT(*) FROM repo_pr_events WHERE repository_id LIKE '00024e44%'`).Scan(&cnt)
	t.Logf("LIKE 00024e44%% count=%d", cnt)
}
