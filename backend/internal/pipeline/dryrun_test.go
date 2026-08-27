package pipeline

import (
	"database/sql"
	"fmt"
	"os"
	"sort"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

type dryRepoInfo struct {
	id      string
	oldTier string
	gfi     int
	scored  bool
	newTier string
}

func TestDryRunRescore(t *testing.T) {
	if os.Getenv("OPENDOOR_RUN_DRYRUN_TEST") == "" {
		t.Skip("skipping heavy MySQL production dry-run test (set OPENDOOR_RUN_DRYRUN_TEST=1 to run)")
	}
	db, err := sqlx.Connect("mysql", "opendoor_user:opendoor_pass@tcp(127.0.0.1:3306)/opendoor?parseTime=true")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// load repos + current snapshots
	rows, err := db.Query(`
		SELECT r.id, COALESCE(ls.c_rank_tier,'D'), COALESCE(ls.good_first_issue_count,0)
		FROM repositories r LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id`)
	if err != nil {
		t.Fatal(err)
	}
	var repos []*dryRepoInfo
	oldDist := map[string]int{}
	for rows.Next() {
		var r dryRepoInfo
		if err := rows.Scan(&r.id, &r.oldTier, &r.gfi); err != nil {
			continue
		}
		repos = append(repos, &r)
		oldDist[r.oldTier]++
	}
	rows.Close()
	fmt.Printf("load %d repos. CURRENT: S=%d A=%d B=%d C=%d D=%d\n",
		len(repos), oldDist["S"], oldDist["A"], oldDist["B"], oldDist["C"], oldDist["D"])

	// fetch all PR groups in the 180-day window (single query, GROUP BY repo,pr)
	prRows, err := db.Query(`
		SELECT
			e.repository_id,
			MIN(CASE WHEN e.action='opened' THEN e.event_at END),
			MIN(CASE WHEN e.action IN ('closed','merged') THEN e.event_at END),
			MAX(CASE WHEN e.action='merged' THEN 1 ELSE 0 END),
			MIN(e.actor_login)
		FROM repo_pr_events e
		WHERE e.event_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
		GROUP BY e.repository_id, e.pr_number
		HAVING MIN(CASE WHEN e.action='opened' THEN e.event_at END) IS NOT NULL`)
	if err != nil {
		t.Fatal(err)
	}
	type ev struct {
		repoID string
		pr     scoring.PR
	}
	var evs []ev
	for prRows.Next() {
		var rid string
		var openedAt, closedAt sql.NullTime
		var wasM int
		var login string
		if err := prRows.Scan(&rid, &openedAt, &closedAt, &wasM, &login); err != nil {
			continue
		}
		p := scoring.PR{AuthorLogin: login, AuthorAssociation: "CONTRIBUTOR", CreatedAt: openedAt.Time}
		if wasM == 1 {
			p.State = "MERGED"
			if closedAt.Valid {
				mt := closedAt.Time
				p.MergedAt = &mt
			}
		} else if closedAt.Valid {
			p.State = "CLOSED"
		} else {
			p.State = "OPEN"
		}
		evs = append(evs, ev{rid, p})
	}
	prRows.Close()
	fmt.Printf("total PR-events grouped: %d\n", len(evs))

	// load all comments in window, per repo, sorted
	cRows, err := db.Query(`
		SELECT repository_id, created_at FROM repo_raw_comments
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 200 DAY)`)
	if err != nil {
		t.Fatal(err)
	}
	comments := map[string][]time.Time{}
	for cRows.Next() {
		var rid string
		var t time.Time
		if err := cRows.Scan(&rid, &t); err != nil {
			continue
		}
		comments[rid] = append(comments[rid], t)
	}
	cRows.Close()
	nC := 0
	for _, v := range comments {
		sort.Slice(v, func(i, j int) bool { return v[i].Before(v[j]) })
		nC += len(v)
	}
	fmt.Printf("comments loaded: %d\n", nC)

	// attach first comment at per PR
	byRepo := map[string][]scoring.PR{}
	for _, e := range evs {
		times := comments[e.repoID]
		if len(times) > 0 {
			opened := e.pr.CreatedAt
			cut := opened.AddDate(0, 0, 30)
			for _, t := range times {
				if t.After(opened) && t.Before(cut) {
					tt := t
					e.pr.FirstCommentAt = &tt
					break
				}
			}
		}
		byRepo[e.repoID] = append(byRepo[e.repoID], e.pr)
	}

	// compute raw metrics
	scaled := map[string]scoring.RawMetrics{}
	for id, prs := range byRepo {
		raw := scoring.ComputeMetrics(prs, false, 90)
		scaled[id] = raw
	}

	var raws []scoring.RawMetrics
	for _, r := range repos {
		raw, ok := scaled[r.id]
		if !ok {
			continue
		}
		raw.GoodFirstIssueCount = r.gfi
		raws = append(raws, raw)
		r.scored = true
		// stash raw for later pairing
		lastIndex[r.id] = len(raws) - 1
	}
	fmt.Printf("repos scored from events: %d\n", len(scaled))

	normed := scoring.NormaliseAll(raws)
	for _, r := range repos {
		if !r.scored {
			continue
		}
		idx := lastIndex[r.id]
		_, tier := scoring.ComputeCRank(normed[idx], raws[idx].StalenessFlag, raws[idx].GoodFirstIssueCount)
		r.newTier = tier
	}

	final := map[string]int{}
	none := 0
	for _, r := range repos {
		if !r.scored {
			r.newTier = r.oldTier
			none++
		}
		final[r.newTier]++
	}

	fmt.Println("\nCURRENT (all repos):")
	keys := []string{"S", "A", "B", "C", "D"}
	for _, k := range keys {
		fmt.Printf("  %-2s: %d\n", k, oldDist[k])
	}
	fmt.Println("\nDRY-RUN FINAL (post re-score, all repos):")
	for _, k := range keys {
		fmt.Printf("  %-2s: %d\n", k, final[k])
	}
	fmt.Println("\nrepos re-scored:", len(scaled), " kept (no/insufficient data):", none)

	trans := map[string]map[string]int{}
	for _, r := range repos {
		if !r.scored {
			continue
		}
		if trans[r.oldTier] == nil {
			trans[r.oldTier] = map[string]int{}
		}
		trans[r.oldTier][r.newTier]++
	}
	fmt.Println("\nOLD -> NEW transition (scored repos only):")
	for _, o := range keys {
		tot := 0
		line := "  " + o + " ->"
		for _, n := range keys {
			c := trans[o][n]
			tot += c
			line += fmt.Sprintf(" %s=%d", n, c)
		}
		fmt.Println(line, "(n=", tot, ")")
	}

	up := 0
	down := 0
	for _, r := range repos {
		if !r.scored {
			continue
		}
		if r.oldTier == "D" && (r.newTier == "A" || r.newTier == "B" || r.newTier == "C" || r.newTier == "S") {
			up++
		}
		if (r.oldTier == "S" || r.oldTier == "A") && (r.newTier == "D" || r.newTier == "C") {
			down++
		}
	}
	fmt.Printf("\nsanity: D->higher %d, S/A->D/C %d\n", up, down)
}

var lastIndex = map[string]int{}