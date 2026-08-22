package main

import (
	"log"
	
	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql"
	_ "modernc.org/sqlite"
)

func main() {
	sqliteDB, err := sqlx.Connect("sqlite", "/opt/opendoor/opendoor.db")
	if err != nil {
		log.Fatal(err)
	}
	defer sqliteDB.Close()

	mysqlDB, err := sqlx.Connect("mysql", "opendoor_user:opendoor_pass@tcp(127.0.0.1:3306)/opendoor?parseTime=true")
	if err != nil {
		log.Fatal(err)
	}
	defer mysqlDB.Close()
	
	log.Println("Migrating repositories...")
	
	rows, err := sqliteDB.Queryx("SELECT * FROM repositories")
	if err != nil {
		log.Fatal(err)
	}
	count := 0
	for rows.Next() {
		results := make(map[string]interface{})
		err = rows.MapScan(results)
		if err != nil {
			continue
		}
		
		// MapScan returns []byte for strings in SQLite sometimes, but sqlx handles it
		// MySQL handles conversion natively from map[string]interface{}
		// We can just construct a bulk insert or prepared statement
		
		isTrending := 0
		if val, ok := results["is_trending"].(int64); ok && val > 0 {
			isTrending = 1
		} else if val, ok := results["is_trending"].(string); ok && val == "true" {
			isTrending = 1
		} else if val, ok := results["is_trending"].([]byte); ok && string(val) == "true" {
			isTrending = 1
		} else if val, ok := results["is_trending"].(bool); ok && val {
			isTrending = 1
		}
		
		_, err := mysqlDB.Exec(`
			INSERT IGNORE INTO repositories (id, full_name, owner, name, language, stars, description, github_url, is_trending, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, results["id"], results["full_name"], results["owner"], results["name"], results["language"], results["stars"], results["description"], results["github_url"], isTrending, results["created_at"], results["updated_at"])
		
		if err != nil {
			log.Println("Failed:", err)
		} else {
			count++
		}
	}
	log.Println("Migrated", count, "repositories.")
	
	log.Println("Migrating latest_snapshots...")
	sRows, err := sqliteDB.Queryx("SELECT * FROM latest_snapshots")
	if err != nil {
		log.Fatal(err)
	}
	sCount := 0
	for sRows.Next() {
		results := make(map[string]interface{})
		err = sRows.MapScan(results)
		if err != nil {
			continue
		}
		
		busFactor := interface{}(0)
		if v, ok := results["bus_factor"]; ok && v != nil {
			busFactor = v
		}

		_, err := mysqlDB.Exec(`
			INSERT IGNORE INTO latest_snapshots (repository_id, snapshot_date, external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours, first_timer_success_rate, repeat_contributor_rate, maintainer_responsiveness, last_activity_days, review_rounds, distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, good_first_issue_count, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, results["repository_id"], results["snapshot_date"], results["external_pr_merge_rate"], results["time_to_first_response_hours"], results["time_to_merge_hours"], results["first_timer_success_rate"], results["repeat_contributor_rate"], results["maintainer_responsiveness"], results["last_activity_days"], results["review_rounds"], results["distinct_maintainer_count"], busFactor, results["staleness_flag"], results["c_rank_score"], results["c_rank_tier"], results["good_first_issue_count"], results["updated_at"])
		
		if err != nil {
			log.Println("Failed snapshot:", err)
		} else {
			sCount++
		}
	}
	log.Println("Migrated", sCount, "snapshots.")
}
