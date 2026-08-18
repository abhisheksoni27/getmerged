package github_test

import (
	"strings"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/github"
)

func TestTopicQueriesContainRepositoryTopics(t *testing.T) {
	queries := []struct {
		name  string
		query string
	}{
		{"SearchReposQuery", github.SearchReposQuery},
		{"SearchReposPageQuery", github.SearchReposPageQuery},
		{"RepoPRsQuery", github.RepoPRsQuery},
		{"RepoTopicsQuery", github.RepoTopicsQuery},
	}

	for _, q := range queries {
		t.Run(q.name, func(t *testing.T) {
			if !strings.Contains(q.query, "repositoryTopics") {
				t.Errorf("%s does not contain 'repositoryTopics'", q.name)
			}
			if !strings.Contains(q.query, "name") {
				t.Errorf("%s does not request topic name", q.name)
			}
		})
	}
}
