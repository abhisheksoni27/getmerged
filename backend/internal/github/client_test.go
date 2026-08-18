package github

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestFetchGoodFirstIssueCountQueryFormatting(t *testing.T) {
	owner := "Significant-Gravitas"
	name := "AutoGPT"

	cutoffDate := time.Now().UTC().AddDate(0, -9, 0).Format("2006-01-02")
	expectedQuery := fmt.Sprintf(`repo:Significant-Gravitas/AutoGPT is:issue is:open created:>=%s label:"good first issue",good-first-issue,good_first_issue,first-timers-only,first-timer,beginner,beginner-friendly,"beginner friendly",easy,easy-fix,"easy fix",low-hanging-fruit,"low hanging fruit","help wanted",help-wanted,starter,starter-issue,bitesize,new-contributor,up-for-grabs,e-easy,E-mentor`, cutoffDate)

	queryStr := formatGoodFirstIssueQuery(owner, name)
	if queryStr != expectedQuery {
		t.Errorf("expected query:\n%s\ngot:\n%s", expectedQuery, queryStr)
	}

	if !strings.Contains(queryStr, fmt.Sprintf("created:>=%s", cutoffDate)) {
		t.Errorf("expected query to contain created date qualifier 'created:>=%s', got: %s", cutoffDate, queryStr)
	}
}

func TestFormatGoodFirstIssueQuery_CutoffDate(t *testing.T) {
	fixedTime := time.Date(2026, 8, 18, 12, 0, 0, 0, time.UTC)
	expectedCutoff := "2025-11-18" // 9 months prior to 2026-08-18

	queryStr := formatGoodFirstIssueQueryWithTime("owner", "repo", fixedTime)
	expectedSub := fmt.Sprintf("created:>=%s", expectedCutoff)
	if !strings.Contains(queryStr, expectedSub) {
		t.Fatalf("expected query to contain %q, got: %s", expectedSub, queryStr)
	}
}
