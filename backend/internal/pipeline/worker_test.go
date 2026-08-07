package pipeline

import (
	"context"
	"os"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestAdaptiveRescan_Schedule(t *testing.T) {
	s1 := scoring.CalculateAdaptiveRescan("S", scoring.RawMetrics{ExternalPRMergeRate: 90, LastActivityDays: 2}, 0)
	if s1.IntervalDays != 1 || s1.ConsecutiveStagnant != 0 {
		t.Errorf("S tier expected 1 day, got %d (stagnant=%d)", s1.IntervalDays, s1.ConsecutiveStagnant)
	}

	s2 := scoring.CalculateAdaptiveRescan("B", scoring.RawMetrics{ExternalPRMergeRate: 50, LastActivityDays: 5}, 0)
	if s2.IntervalDays != 7 || s2.ConsecutiveStagnant != 0 {
		t.Errorf("B tier expected 7 days, got %d (stagnant=%d)", s2.IntervalDays, s2.ConsecutiveStagnant)
	}

	s3 := scoring.CalculateAdaptiveRescan("D", scoring.RawMetrics{StalenessFlag: true}, 1)
	if s3.IntervalDays != 30 || s3.ConsecutiveStagnant != 2 {
		t.Errorf("2nd stagnant expected 30 days decay, got %d (stagnant=%d)", s3.IntervalDays, s3.ConsecutiveStagnant)
	}
}

func TestStarBuckets_Ranges(t *testing.T) {
	if len(DiscoveryStarBuckets) == 0 {
		t.Fatal("DiscoveryStarBuckets should not be empty")
	}
	for i, b := range DiscoveryStarBuckets {
		if b.MinStars >= b.MaxStars {
			t.Errorf("bucket %d invalid range: min %d >= max %d", i, b.MinStars, b.MaxStars)
		}
	}
}

func TestEnqueueDueRepos_ExcludesD_And_ReEnqueuesCompleted(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "test_opendoor_*.db")
	if err != nil {
		t.Fatalf("failed to create temp db file: %v", err)
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	dbConn, err := db.Connect(tmpPath)
	if err != nil {
		t.Fatalf("failed to connect to temp db: %v", err)
	}
	defer dbConn.Close()

	crawler := NewBackgroundCrawler(dbConn, nil, nil)

	// Seed repositories: 1 overdue S-tier, 1 overdue D-tier, 1 recent S-tier
	_, err = dbConn.Exec(`
		INSERT INTO repositories (id, full_name, owner, name, github_url, created_at, updated_at) VALUES
		('repo-1', 'owner/repo-s-overdue', 'owner', 'repo-s-overdue', 'https://github.com/owner/repo-s-overdue', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),
		('repo-2', 'owner/repo-d-overdue', 'owner', 'repo-d-overdue', 'https://github.com/owner/repo-d-overdue', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),
		('repo-3', 'owner/repo-s-recent', 'owner', 'repo-s-recent', 'https://github.com/owner/repo-s-recent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`)
	if err != nil {
		t.Fatalf("insert repos failed: %v", err)
	}

	_, err = dbConn.Exec(`
		INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier) VALUES
		('repo-1', '2026-08-01', 'S'),
		('repo-2', '2026-08-01', 'D'),
		('repo-3', '2026-08-03', 'S')
	`)
	if err != nil {
		t.Fatalf("insert snapshots failed: %v", err)
	}

	// First Enqueue run: only repo-1 (overdue S-tier) should be enqueued. repo-2 (D-tier) and repo-3 (recent) should be skipped.
	crawler.EnqueueDueRepos()

	var pendingCount int
	if err := dbConn.Get(&pendingCount, "SELECT COUNT(1) FROM indexing_queue WHERE status = 'pending'"); err != nil {
		t.Fatalf("query pending count failed: %v", err)
	}
	if pendingCount != 1 {
		t.Errorf("expected 1 pending item in queue, got %d", pendingCount)
	}

	var fullName string
	if err := dbConn.Get(&fullName, "SELECT full_name FROM indexing_queue WHERE status = 'pending'"); err != nil {
		t.Fatalf("query full_name failed: %v", err)
	}
	if fullName != "owner/repo-s-overdue" {
		t.Errorf("expected owner/repo-s-overdue in queue, got %s", fullName)
	}

	// Simulate completed processing of repo-1
	if _, err := dbConn.Exec("UPDATE indexing_queue SET status = 'completed' WHERE full_name = 'owner/repo-s-overdue'"); err != nil {
		t.Fatalf("update completed failed: %v", err)
	}

	// Second Enqueue run: repo-1 is still overdue (>24h), so ON CONFLICT must reset its status to 'pending'
	crawler.EnqueueDueRepos()

	var status string
	if err := dbConn.Get(&status, "SELECT status FROM indexing_queue WHERE full_name = 'owner/repo-s-overdue'"); err != nil {
		t.Fatalf("query status failed: %v", err)
	}
	if status != "pending" {
		t.Errorf("expected status to be reset to 'pending' on re-enqueue, got %s", status)
	}
}

func TestScoreAndSaveRepo_GeneratesAIInsights(t *testing.T) {
	tmpFile, err := os.CreateTemp("", "test_opendoor_ai_*.db")
	if err != nil {
		t.Fatalf("failed to create temp db file: %v", err)
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	dbConn, err := db.Connect(tmpPath)
	if err != nil {
		t.Fatalf("failed to connect to temp db: %v", err)
	}
	defer dbConn.Close()

	repoID, err := upsertRepoRow(dbConn, "gin-gonic", "gin", "gin-gonic/gin")
	if err != nil {
		t.Fatalf("failed to upsert repo: %v", err)
	}

	// Verify repo_ai_insights starts empty
	var countBefore int
	_ = dbConn.Get(&countBefore, "SELECT COUNT(1) FROM repo_ai_insights WHERE repo_id = ?", repoID)
	if countBefore != 0 {
		t.Fatalf("expected 0 AI insights before scoring, got %d", countBefore)
	}

	// Simulate AI insights generation pipeline flow directly
	aiClient := ai.NewAIClient("")
	aiRepo := repository.NewAIRepository(dbConn)
	comments := []string{"LGTM! Thanks for your contribution.", "Please add unit test."}

	insightsResp, aiErr := aiClient.GenerateRepoInsights(context.Background(), "gin-gonic/gin", comments)
	if aiErr != nil || insightsResp == nil {
		t.Fatalf("GenerateRepoInsights failed: %v", aiErr)
	}

	err = aiRepo.SaveInsights(context.Background(), &repository.AIInsights{
		RepoID:            repoID,
		MaintainerVibe:    insightsResp.MaintainerVibe,
		PRGuidelines:      "[\"Include unit tests\"]",
		IssueQualityScore: insightsResp.IssueQualityScore,
		RawSummary:        insightsResp.RawSummary,
	})
	if err != nil {
		t.Fatalf("SaveInsights failed: %v", err)
	}

	var aiCount int
	_ = dbConn.Get(&aiCount, "SELECT COUNT(1) FROM repo_ai_insights WHERE repo_id = ?", repoID)
	if aiCount != 1 {
		t.Errorf("expected 1 repo_ai_insights record in DB, got %d", aiCount)
	}
}


