package github

import (
	"testing"
)

func TestFetchGoodFirstIssueCountQueryFormatting(t *testing.T) {
	owner := "Significant-Gravitas"
	name := "AutoGPT"

	expectedQuery := `repo:Significant-Gravitas/AutoGPT is:issue is:open label:"good first issue",good-first-issue,good_first_issue,first-timers-only,first-timer,beginner,beginner-friendly,"beginner friendly",easy,easy-fix,"easy fix",low-hanging-fruit,"low hanging fruit","help wanted",help-wanted,starter,starter-issue,bitesize,new-contributor,up-for-grabs,e-easy,E-mentor`
	
	queryStr := formatGoodFirstIssueQuery(owner, name)
	if queryStr != expectedQuery {
		t.Errorf("expected query:\n%s\ngot:\n%s", expectedQuery, queryStr)
	}
}
