package github

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/valkey-io/valkey-go"
	"golang.org/x/time/rate"
)

const graphqlEndpoint = "https://api.github.com/graphql"
const cacheTTL = 1 * time.Hour

var prURLRegex = regexp.MustCompile(`^https?://(?:www\.)?github\.com/([\w.\-]+)/([\w.\-]+)/pull/(\d+)`)

// Client is a GitHub GraphQL client with built-in rate-limit handling and Valkey caching.
type Client struct {
	token      string
	httpClient *http.Client
	valkey     valkey.Client
	limiter    *rate.Limiter
	mu         sync.Mutex
	rlInfo     rateLimitInfo
}

// NewClient creates a Client using the given personal access token and optional Valkey client.
func NewClient(token string, vk valkey.Client) *Client {
	return &Client{
		token:      token,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		valkey:     vk,
		limiter:    rate.NewLimiter(rate.Every(100*time.Millisecond), 20), // max ~10 req/sec, burst 20
	}
}

// Valkey returns the underlying valkey.Client instance.
func (c *Client) Valkey() valkey.Client {
	if c == nil {
		return nil
	}
	return c.valkey
}

// --- Request / Response types ---

type graphqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

type rateLimitInfo struct {
	Remaining int    `json:"remaining"`
	ResetAt   string `json:"resetAt"`
	Cost      int    `json:"cost"`
}

// --- Domain types returned to callers ---

// Repo holds data fetched during the seed phase.
type Repo struct {
	NodeID      string
	FullName    string
	Owner       string
	Name        string
	Language    string
	Stars       int
	Description string
	URL         string
	Topics      []string
}

// RepoMeta holds metadata for a repository.
type RepoMeta struct {
	Stars            int
	Language         string
	Description      string
	IsArchived       bool
	HasIssuesEnabled bool
	HasContributing  bool
	HasPRTemplate    bool
	HasIssueTemplate bool
	HasCodeOfConduct bool
	Topics           []string
}

// PR holds pull-request data needed for metric computation.
type PR struct {
	Number            int
	State             string
	CreatedAt         time.Time
	MergedAt          *time.Time
	AuthorAssociation string
	AuthorLogin       string
	FirstCommentAt    *time.Time
	TotalComments     int
	CommentAuthors    []string
	CommentTexts      []string
	ReviewComments    []PRComment
}

type PRComment struct {
	PRNumber          int
	SourceType        string
	AuthorLogin       string
	AuthorAssociation string
	Body              string
	CreatedAt         time.Time
}

// --- Public API ---

// CheckToken tests if the token is valid by querying the viewer.
func (c *Client) CheckToken() (string, rateLimitInfo, error) {
	query := `
	query {
		viewer {
			login
		}
		rateLimit {
			remaining
			resetAt
			cost
		}
	}`

	var resp struct {
		Data struct {
			Viewer struct {
				Login string `json:"login"`
			} `json:"viewer"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	if _, err := c.do(query, nil, &resp); err != nil {
		return "", rateLimitInfo{}, err
	}

	return resp.Data.Viewer.Login, resp.Data.RateLimit, nil
}

// SearchRepos queries GitHub for active repos matching the given language sorted by recent activity.
func (c *Client) SearchRepos(language string, minStars, maxRepos int) ([]Repo, error) {
	query := fmt.Sprintf("language:%s stars:>=%d sort:updated-desc", language, minStars)
	var (
		repos  []Repo
		cursor *string
	)

	for {
		vars := map[string]any{"query": query}
		if cursor != nil {
			vars["cursor"] = *cursor
		}

		var resp struct {
			Data struct {
				Search struct {
					PageInfo struct {
						HasNextPage bool   `json:"hasNextPage"`
						EndCursor   string `json:"endCursor"`
					} `json:"pageInfo"`
					Nodes []struct {
						ID            string `json:"id"`
						NameWithOwner string `json:"nameWithOwner"`
						Owner         struct {
							Login string `json:"login"`
						} `json:"owner"`
						Name            string `json:"name"`
						PrimaryLanguage *struct {
							Name string `json:"name"`
						} `json:"primaryLanguage"`
						StargazerCount   int    `json:"stargazerCount"`
						Description      string `json:"description"`
						URL              string `json:"url"`
						RepositoryTopics struct {
							Nodes []struct {
								Topic struct {
									Name string `json:"name"`
								} `json:"topic"`
							} `json:"nodes"`
						} `json:"repositoryTopics"`
					} `json:"nodes"`
				} `json:"search"`
				RateLimit rateLimitInfo `json:"rateLimit"`
			} `json:"data"`
		}

		fromCache, err := c.do(SearchReposQuery, vars, &resp)
		if err != nil {
			return nil, fmt.Errorf("SearchRepos: %w", err)
		}

		if !fromCache {
			c.handleRateLimit(resp.Data.RateLimit)
		}

		for _, n := range resp.Data.Search.Nodes {
			lang := ""
			if n.PrimaryLanguage != nil {
				lang = n.PrimaryLanguage.Name
			}
			var topics []string
			for _, tn := range n.RepositoryTopics.Nodes {
				if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
					topics = append(topics, tName)
				}
			}
			repos = append(repos, Repo{
				NodeID:      n.ID,
				FullName:    n.NameWithOwner,
				Owner:       n.Owner.Login,
				Name:        n.Name,
				Language:    lang,
				Stars:       n.StargazerCount,
				Description: n.Description,
				URL:         n.URL,
				Topics:      topics,
			})
		}

		if !resp.Data.Search.PageInfo.HasNextPage || len(repos) >= maxRepos {
			break
		}
		c.cursor(&cursor, resp.Data.Search.PageInfo.EndCursor)
	}

	if len(repos) > maxRepos {
		repos = repos[:maxRepos]
	}
	return repos, nil
}

// FetchTrendingRepos queries GitHub for daily trending repositories pushed recently with star velocity.
func (c *Client) FetchTrendingRepos(limit int) ([]Repo, error) {
	threeDaysAgo := time.Now().UTC().Add(-72 * time.Hour).Format("2006-01-02")
	queryStr := fmt.Sprintf("pushed:>=%s stars:>=50 sort:stars-desc", threeDaysAgo)
	vars := map[string]any{"query": queryStr}

	var resp struct {
		Data struct {
			Search struct {
				Nodes []struct {
					ID            string `json:"id"`
					NameWithOwner string `json:"nameWithOwner"`
					Owner         struct {
						Login string `json:"login"`
					} `json:"owner"`
					Name            string `json:"name"`
					PrimaryLanguage *struct {
						Name string `json:"name"`
					} `json:"primaryLanguage"`
					StargazerCount   int    `json:"stargazerCount"`
					Description      string `json:"description"`
					URL              string `json:"url"`
					RepositoryTopics struct {
						Nodes []struct {
							Topic struct {
								Name string `json:"name"`
							} `json:"topic"`
						} `json:"nodes"`
					} `json:"repositoryTopics"`
				} `json:"nodes"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(SearchReposQuery, vars, &resp)
	if err != nil {
		return nil, fmt.Errorf("FetchTrendingRepos: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	var repos []Repo
	for _, n := range resp.Data.Search.Nodes {
		lang := ""
		if n.PrimaryLanguage != nil {
			lang = n.PrimaryLanguage.Name
		}
		var topics []string
		for _, tn := range n.RepositoryTopics.Nodes {
			if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
				topics = append(topics, tName)
			}
		}
		repos = append(repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
			Topics:      topics,
		})
	}

	if len(repos) > limit {
		repos = repos[:limit]
	}
	return repos, nil
}

// FetchCustomQueryRepos executes an arbitrary search query string against GitHub GraphQL API.
func (c *Client) FetchCustomQueryRepos(queryStr string, limit int) ([]Repo, error) {
	vars := map[string]any{"query": queryStr}

	var resp struct {
		Data struct {
			Search struct {
				Nodes []struct {
					ID            string `json:"id"`
					NameWithOwner string `json:"nameWithOwner"`
					Owner         struct {
						Login string `json:"login"`
					} `json:"owner"`
					Name            string `json:"name"`
					PrimaryLanguage *struct {
						Name string `json:"name"`
					} `json:"primaryLanguage"`
					StargazerCount   int    `json:"stargazerCount"`
					Description      string `json:"description"`
					URL              string `json:"url"`
					RepositoryTopics struct {
						Nodes []struct {
							Topic struct {
								Name string `json:"name"`
							} `json:"topic"`
						} `json:"nodes"`
					} `json:"repositoryTopics"`
				} `json:"nodes"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(SearchReposQuery, vars, &resp)
	if err != nil {
		return nil, fmt.Errorf("FetchCustomQueryRepos: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	var repos []Repo
	for _, n := range resp.Data.Search.Nodes {
		lang := ""
		if n.PrimaryLanguage != nil {
			lang = n.PrimaryLanguage.Name
		}
		var topics []string
		for _, tn := range n.RepositoryTopics.Nodes {
			if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
				topics = append(topics, tName)
			}
		}
		repos = append(repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
			Topics:      topics,
		})
	}

	if len(repos) > limit {
		repos = repos[:limit]
	}
	return repos, nil
}

// SearchReposPageResult holds one page of search results plus cursor info.
type SearchReposPageResult struct {
	Repos       []Repo
	HasNextPage bool
	EndCursor   string
}

// FetchCustomQueryReposPage executes an arbitrary search query with an explicit
// page size and cursor, returning one page of results at a time. The cache
// key is derived from the query+page+cursor, so deep scans of the same query
// only hit GitHub once per unique cursor.
func (c *Client) FetchCustomQueryReposPage(queryStr string, first int, after string) (SearchReposPageResult, error) {
	if first <= 0 {
		first = 100
	}
	vars := map[string]any{"query": queryStr, "first": first}
	if after != "" {
		vars["cursor"] = after
	}

	var resp struct {
		Data struct {
			Search struct {
				PageInfo struct {
					HasNextPage bool   `json:"hasNextPage"`
					EndCursor   string `json:"endCursor"`
				} `json:"pageInfo"`
				Nodes []struct {
					ID            string `json:"id"`
					NameWithOwner string `json:"nameWithOwner"`
					Owner         struct {
						Login string `json:"login"`
					} `json:"owner"`
					Name            string `json:"name"`
					PrimaryLanguage *struct {
						Name string `json:"name"`
					} `json:"primaryLanguage"`
					StargazerCount int    `json:"stargazerCount"`
					Description    string `json:"description"`
					URL            string `json:"url"`
					RepositoryTopics struct {
						Nodes []struct {
							Topic struct {
								Name string `json:"name"`
							} `json:"topic"`
						} `json:"nodes"`
					} `json:"repositoryTopics"`
				} `json:"nodes"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(SearchReposPageQuery, vars, &resp)
	if err != nil {
		return SearchReposPageResult{}, fmt.Errorf("FetchCustomQueryReposPage: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	result := SearchReposPageResult{
		HasNextPage: resp.Data.Search.PageInfo.HasNextPage,
		EndCursor:   resp.Data.Search.PageInfo.EndCursor,
	}

	for _, n := range resp.Data.Search.Nodes {
		lang := ""
		if n.PrimaryLanguage != nil {
			lang = n.PrimaryLanguage.Name
		}
		var topics []string
		for _, tn := range n.RepositoryTopics.Nodes {
			if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
				topics = append(topics, tName)
			}
		}
		result.Repos = append(result.Repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
			Topics:      topics,
		})
	}

	return result, nil
}

// FetchRepoTopics returns the normalized lowercase repository topics for a repo.
func (c *Client) FetchRepoTopics(owner, name string) ([]string, error) {
	vars := map[string]any{"owner": owner, "name": name}

	var resp struct {
		Data struct {
			Repository struct {
				RepositoryTopics struct {
					Nodes []struct {
						Topic struct {
							Name string `json:"name"`
						} `json:"topic"`
					} `json:"nodes"`
				} `json:"repositoryTopics"`
			} `json:"repository"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoTopicsQuery, vars, &resp)
	if err != nil {
		return nil, fmt.Errorf("FetchRepoTopics(%s/%s): %w", owner, name, err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	var topics []string
	for _, tn := range resp.Data.Repository.RepositoryTopics.Nodes {
		if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
			topics = append(topics, tName)
		}
	}
	return topics, nil
}

// FetchPRs returns all closed/merged PRs for a repo within the last windowDays days and repo metadata.
func (c *Client) FetchPRs(owner, name string, windowDays int) ([]PR, RepoMeta, error) {
	cutoff := time.Now().UTC().Add(-time.Duration(windowDays) * 24 * time.Hour)
	var (
		prs    []PR
		meta   RepoMeta
		cursor *string
		done   bool
	)

	for !done {
		vars := map[string]any{"owner": owner, "name": name}
		if cursor != nil {
			vars["cursor"] = *cursor
		}

		var resp struct {
			Data struct {
				Repository struct {
					StargazerCount  int    `json:"stargazerCount"`
					Description     string `json:"description"`
					IsArchived      bool   `json:"isArchived"`
					HasIssuesEnabled bool   `json:"hasIssuesEnabled"`
					PrimaryLanguage *struct {
						Name string `json:"name"`
					} `json:"primaryLanguage"`
					RepositoryTopics struct {
						Nodes []struct {
							Topic struct {
								Name string `json:"name"`
							} `json:"topic"`
						} `json:"nodes"`
					} `json:"repositoryTopics"`
					Contributing       *struct{ ID string `json:"id"` } `json:"contributing"`
					ContributingLower  *struct{ ID string `json:"id"` } `json:"contributingLower"`
					ContributingGithub *struct{ ID string `json:"id"` } `json:"contributingGithub"`
					ContributingDocs   *struct{ ID string `json:"id"` } `json:"contributingDocs"`
					CodeOfConduct      *struct{ ID string `json:"id"` } `json:"codeOfConduct"`
					CodeOfConductLower *struct{ ID string `json:"id"` } `json:"codeOfConductLower"`
					CodeOfConductGithub *struct{ ID string `json:"id"` } `json:"codeOfConductGithub"`
					IssueTemplateDir   *struct{ ID string `json:"id"` } `json:"issueTemplateDir"`
					IssueTemplateMd    *struct{ ID string `json:"id"` } `json:"issueTemplateMd"`
					PRTemplateMd       *struct{ ID string `json:"id"` } `json:"prTemplateMd"`
					PRTemplateDir      *struct{ ID string `json:"id"` } `json:"prTemplateDir"`
					PullRequests struct {
						PageInfo struct {
							HasNextPage bool   `json:"hasNextPage"`
							EndCursor   string `json:"endCursor"`
						} `json:"pageInfo"`
						Nodes []struct {
							Number            int    `json:"number"`
							State             string `json:"state"`
							CreatedAt         string `json:"createdAt"`
							MergedAt          string `json:"mergedAt"`
							AuthorAssociation string `json:"authorAssociation"`
							Author            *struct {
								Login string `json:"login"`
							} `json:"author"`
							Comments struct {
								TotalCount int `json:"totalCount"`
								Nodes      []struct {
									CreatedAt         string `json:"createdAt"`
									AuthorAssociation string `json:"authorAssociation"`
									Author            *struct {
										Login string `json:"login"`
									} `json:"author"`
									Body string `json:"body"`
								} `json:"nodes"`
							} `json:"comments"`
							Reviews struct {
								Nodes []struct {
									CreatedAt         string `json:"createdAt"`
									AuthorAssociation string `json:"authorAssociation"`
									Author            *struct {
										Login string `json:"login"`
									} `json:"author"`
									Body     string `json:"body"`
									Comments struct {
										Nodes []struct {
											CreatedAt         string `json:"createdAt"`
											AuthorAssociation string `json:"authorAssociation"`
											Author            *struct {
												Login string `json:"login"`
											} `json:"author"`
											Body string `json:"body"`
										} `json:"nodes"`
									} `json:"comments"`
								} `json:"nodes"`
							} `json:"reviews"`
						} `json:"nodes"`
					} `json:"pullRequests"`
				} `json:"repository"`
				RateLimit rateLimitInfo `json:"rateLimit"`
			} `json:"data"`
		}

		fromCache, err := c.do(RepoPRsQuery, vars, &resp)
		if err != nil {
			return nil, RepoMeta{}, fmt.Errorf("FetchPRs(%s/%s): %w", owner, name, err)
		}

		if !fromCache {
			c.handleRateLimit(resp.Data.RateLimit)
		}

		meta.Stars = resp.Data.Repository.StargazerCount
		meta.Description = resp.Data.Repository.Description
		meta.IsArchived = resp.Data.Repository.IsArchived
		meta.HasIssuesEnabled = resp.Data.Repository.HasIssuesEnabled
		if resp.Data.Repository.PrimaryLanguage != nil {
			meta.Language = resp.Data.Repository.PrimaryLanguage.Name
		}
		meta.HasIssueTemplate = resp.Data.Repository.IssueTemplateDir != nil || resp.Data.Repository.IssueTemplateMd != nil
		meta.HasPRTemplate = resp.Data.Repository.PRTemplateMd != nil || resp.Data.Repository.PRTemplateDir != nil
		meta.HasContributing = resp.Data.Repository.Contributing != nil ||
			resp.Data.Repository.ContributingLower != nil ||
			resp.Data.Repository.ContributingGithub != nil ||
			resp.Data.Repository.ContributingDocs != nil
		meta.HasCodeOfConduct = resp.Data.Repository.CodeOfConduct != nil ||
			resp.Data.Repository.CodeOfConductLower != nil ||
			resp.Data.Repository.CodeOfConductGithub != nil
		for _, tn := range resp.Data.Repository.RepositoryTopics.Nodes {
			if tName := strings.TrimSpace(strings.ToLower(tn.Topic.Name)); tName != "" {
				meta.Topics = append(meta.Topics, tName)
			}
		}

		nodes := resp.Data.Repository.PullRequests.Nodes
		slog.Debug("github: PR page fetched",
			"repo", owner+"/"+name,
			"nodes_in_page", len(nodes),
			"has_next_page", resp.Data.Repository.PullRequests.PageInfo.HasNextPage,
		)

		for idx, n := range nodes {
			slog.Debug("github: PR node",
				"repo", owner+"/"+name,
				"index", idx,
				"state", n.State,
				"author_association", n.AuthorAssociation,
				"created_at", n.CreatedAt,
				"merged_at", n.MergedAt,
				"first_comment_at", func() string {
					if len(n.Comments.Nodes) > 0 {
						return n.Comments.Nodes[0].CreatedAt
					}
					return "(none)"
				}(),
			)
			createdAt, err := time.Parse(time.RFC3339, n.CreatedAt)
			if err != nil {
				continue
			}
			if createdAt.Before(cutoff) {
				done = true
				break
			}

			pr := PR{
				Number:            n.Number,
				State:             n.State,
				CreatedAt:         createdAt,
				AuthorAssociation: n.AuthorAssociation,
				TotalComments:     n.Comments.TotalCount,
			}
			if n.Author != nil {
				pr.AuthorLogin = n.Author.Login
			}
			if n.MergedAt != "" {
				if t, err := time.Parse(time.RFC3339, n.MergedAt); err == nil {
					pr.MergedAt = &t
				}
			}
			if len(n.Comments.Nodes) > 0 {
				for _, c := range n.Comments.Nodes {
					if c.Author != nil && c.Author.Login != "" {
						if !IsBotLogin(c.Author.Login) && pr.FirstCommentAt == nil && c.CreatedAt != "" {
							if t, err := time.Parse(time.RFC3339, c.CreatedAt); err == nil {
								pr.FirstCommentAt = &t
							}
						}
						pr.CommentAuthors = append(pr.CommentAuthors, c.Author.Login)
						if strings.TrimSpace(c.Body) != "" {
							pr.CommentTexts = append(pr.CommentTexts, c.Body)
							if t, err := time.Parse(time.RFC3339, c.CreatedAt); err == nil {
								pr.ReviewComments = append(pr.ReviewComments, PRComment{
									PRNumber:          n.Number,
									SourceType:        "pr_comment",
									AuthorLogin:       c.Author.Login,
									AuthorAssociation: c.AuthorAssociation,
									Body:              c.Body,
									CreatedAt:         t,
								})
							}
						}
					}
				}
			}
			if len(n.Reviews.Nodes) > 0 {
				for _, r := range n.Reviews.Nodes {
					if r.Author != nil && r.Author.Login != "" {
						if !IsBotLogin(r.Author.Login) && pr.FirstCommentAt == nil && r.CreatedAt != "" {
							if t, err := time.Parse(time.RFC3339, r.CreatedAt); err == nil {
								pr.FirstCommentAt = &t
							}
						}
						pr.CommentAuthors = append(pr.CommentAuthors, r.Author.Login)
						if strings.TrimSpace(r.Body) != "" {
							pr.CommentTexts = append(pr.CommentTexts, r.Body)
							if t, err := time.Parse(time.RFC3339, r.CreatedAt); err == nil {
								pr.ReviewComments = append(pr.ReviewComments, PRComment{
									PRNumber:          n.Number,
									SourceType:        "review_body",
									AuthorLogin:       r.Author.Login,
									AuthorAssociation: r.AuthorAssociation,
									Body:              r.Body,
									CreatedAt:         t,
								})
							}
						}
						for _, rc := range r.Comments.Nodes {
							if rc.Author != nil && rc.Author.Login != "" {
								pr.CommentAuthors = append(pr.CommentAuthors, rc.Author.Login)
								if strings.TrimSpace(rc.Body) != "" {
									pr.CommentTexts = append(pr.CommentTexts, rc.Body)
									if t, err := time.Parse(time.RFC3339, rc.CreatedAt); err == nil {
										pr.ReviewComments = append(pr.ReviewComments, PRComment{
											PRNumber:          n.Number,
											SourceType:        "review_thread_comment",
											AuthorLogin:       rc.Author.Login,
											AuthorAssociation: rc.AuthorAssociation,
											Body:              rc.Body,
											CreatedAt:         t,
										})
									}
								}
							}
						}
					}
				}
			}
			prs = append(prs, pr)
		}

		if !resp.Data.Repository.PullRequests.PageInfo.HasNextPage {
			break
		}
		c.cursor(&cursor, resp.Data.Repository.PullRequests.PageInfo.EndCursor)
	}

	slog.Debug("fetched PRs", "repo", owner+"/"+name, "count", len(prs), "window_days", windowDays)
	return prs, meta, nil
}

// IsStalenessFlag returns true if no external PR was merged in the last 6 months.
func (c *Client) IsStalenessFlag(owner, name string) (bool, error) {
	sixMonthsAgo := time.Now().UTC().Add(-180 * 24 * time.Hour)

	var resp struct {
		Data struct {
			Repository struct {
				PullRequests struct {
					Nodes []struct {
						MergedAt          string `json:"mergedAt"`
						AuthorAssociation string `json:"authorAssociation"`
					} `json:"nodes"`
				} `json:"pullRequests"`
			} `json:"repository"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoStalenessQuery, map[string]any{"owner": owner, "name": name}, &resp)
	if err != nil {
		return false, err
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	externalAssoc := map[string]bool{"CONTRIBUTOR": true, "FIRST_TIME_CONTRIBUTOR": true, "NONE": true}
	for _, pr := range resp.Data.Repository.PullRequests.Nodes {
		if !externalAssoc[pr.AuthorAssociation] {
			continue
		}
		if t, err := time.Parse(time.RFC3339, pr.MergedAt); err == nil {
			if t.After(sixMonthsAgo) {
				return false, nil
			}
		}
	}

	slog.Debug("staleness check", "repo", owner+"/"+name, "stale", true)
	return true, nil
}

// --- Internal helpers ---

func (c *Client) do(query string, vars map[string]any, out any) (fromCache bool, err error) {
	reqBody, err := json.Marshal(graphqlRequest{Query: query, Variables: vars})
	if err != nil {
		return false, err
	}

	// Calculate cache key
	hash := md5.Sum(reqBody)
	cacheKey := "ghcache:" + hex.EncodeToString(hash[:])

	ctx := context.Background()

	// Check Valkey cache
	if c.valkey != nil {
		if cached, err := c.valkey.Do(ctx, c.valkey.B().Get().Key(cacheKey).Build()).ToString(); err == nil && cached != "" {
			slog.Debug("github: cache HIT", "key", cacheKey)
			return true, json.Unmarshal([]byte(cached), out)
		}
	}

	if c.limiter != nil {
		if err := c.limiter.Wait(ctx); err != nil {
			return false, err
		}
	}

	req, err := http.NewRequest(http.MethodPost, graphqlEndpoint, bytes.NewReader(reqBody))
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		slog.Error("github: http request failed", "err", err)
		return false, err
	}
	defer res.Body.Close()

	// Read the full body - we need it for both logging and decoding.
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return false, fmt.Errorf("read response body: %w", err)
	}

	// Preview bound: do not dump gigabytes of response bodies into production logs.
	const bodyPreviewLimit = 512
	preview := string(raw)
	if len(preview) > bodyPreviewLimit {
		preview = preview[:bodyPreviewLimit] + "...(truncated)"
	}
	slog.Debug("github: raw response", "status", res.StatusCode, "bytes", len(raw), "body", preview)

	if res.StatusCode != http.StatusOK {
		slog.Error("github: non-200 response", "status", res.StatusCode, "body", string(raw))
		return false, fmt.Errorf("GitHub API returned %d: %s", res.StatusCode, string(raw))
	}

	// GitHub GraphQL ALWAYS returns HTTP 200 - errors are in the body `errors` field.
	var envelope struct {
		Errors []struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"errors"`
	}
	if jsonErr := json.Unmarshal(raw, &envelope); jsonErr == nil && len(envelope.Errors) > 0 {
		for _, e := range envelope.Errors {
			slog.Error("github: graphql error", "message", e.Message, "type", e.Type)
			if e.Type == "RATE_LIMIT" || strings.Contains(strings.ToLower(e.Message), "rate limit") {
				// Fetch exact rate limit resetAt timestamp from REST endpoint
				resetSleep := 1 * time.Minute
				if reqRest, errRest := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/rate_limit", nil); errRest == nil {
					reqRest.Header.Set("Authorization", "Bearer "+c.token)
					if resRest, errDo := c.httpClient.Do(reqRest); errDo == nil {
						var restInfo struct {
							Resources struct {
								GraphQL struct {
									Reset int64 `json:"reset"`
								} `json:"graphql"`
							} `json:"resources"`
						}
						if errDec := json.NewDecoder(resRest.Body).Decode(&restInfo); errDec == nil && restInfo.Resources.GraphQL.Reset > 0 {
							resetTime := time.Unix(restInfo.Resources.GraphQL.Reset, 0).UTC()
							c.mu.Lock()
							c.rlInfo = rateLimitInfo{
								Remaining: 0,
								ResetAt:   resetTime.Format(time.RFC3339),
							}
							c.mu.Unlock()
							if time.Now().UTC().Before(resetTime) {
								resetSleep = time.Until(resetTime) + 5*time.Second
							}
						}
						resRest.Body.Close()
					}
				}
				slog.Warn("github: graphql rate limit hit - sleeping dynamically until resetAt", "sleep_duration", resetSleep.String())
				time.Sleep(resetSleep)
			}
		}
		return false, fmt.Errorf("graphql error: %s", envelope.Errors[0].Message)
	}

	// Store in Valkey cache if request succeeded
	if c.valkey != nil {
		slog.Debug("github: caching response in Valkey", "key", cacheKey, "ttl", cacheTTL.String())
		_ = c.valkey.Do(ctx, c.valkey.B().Set().Key(cacheKey).Value(string(raw)).Ex(cacheTTL).Build())
	}

	return false, json.Unmarshal(raw, out)
}

func (c *Client) handleRateLimit(rl rateLimitInfo) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.rlInfo = rl

	if rl.Remaining == 0 && rl.Cost == 0 {
		slog.Warn("github: rate limit info is all-zero - GitHub may have returned empty/null rateLimit (check repo name, token scope, or query errors)")
		return
	}

	slog.Debug("github rate limit", "remaining", rl.Remaining, "cost", rl.Cost)

	if rl.Remaining >= 10 {
		return
	}

	resetAt, err := time.Parse(time.RFC3339, rl.ResetAt)
	if err != nil || time.Now().UTC().After(resetAt) {
		return
	}

	wait := time.Until(resetAt) + 5*time.Second
	slog.Warn("github rate limit low - sleeping",
		"remaining", rl.Remaining,
		"reset_at", rl.ResetAt,
		"sleep", wait.String(),
	)
	time.Sleep(wait)
}

func (c *Client) GetRateLimitInfo() rateLimitInfo {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.rlInfo
}

func (c *Client) cursor(ptr **string, val string) {
	*ptr = &val
}

// IsBotLogin returns true if a GitHub username belongs to an automated bot or service account.
func IsBotLogin(login string) bool {
	l := strings.ToLower(login)
	if strings.HasSuffix(l, "[bot]") || strings.HasSuffix(l, "-bot") || strings.HasSuffix(l, "-robot") {
		return true
	}
	botAccounts := map[string]bool{
		"vercel": true, "github-actions": true, "codecov": true, "codecov-commenter": true,
		"dependabot": true, "stale": true, "sentry-io": true, "coderabbitai": true,
		"codspeed-hq": true, "copilot-swe-agent": true, "copilot-pull-request-reviewer": true,
		"dosubot": true, "knative-prow": true, "knative-prow-robot": true, "kodiakhq": true,
		"kubernetes-prow": true, "linux-foundation-easycla": true, "netlify": true,
		"openedx-webhooks": true, "openshift-ci": true, "openshift-ci-robot": true,
		"openshift-merge-bot": true, "openshift-merge-robot": true, "socket-security": true,
		"sonarqubecloud": true, "cla-assistant": true, "claude": true, "gemini-code-assist": true,
	}
	return botAccounts[l]
}

func formatGoodFirstIssueQuery(owner, name string) string {
	return formatGoodFirstIssueQueryWithTime(owner, name, time.Now().UTC())
}

func formatGoodFirstIssueQueryWithTime(owner, name string, now time.Time) string {
	cutoff := now.AddDate(0, -9, 0).Format("2006-01-02")
	return fmt.Sprintf(`repo:%s/%s is:issue is:open created:>=%s label:"good first issue",good-first-issue,good_first_issue,first-timers-only,first-timer,beginner,beginner-friendly,"beginner friendly",easy,easy-fix,"easy fix",low-hanging-fruit,"low hanging fruit","help wanted",help-wanted,starter,starter-issue,bitesize,new-contributor,up-for-grabs,e-easy,E-mentor`, owner, name, cutoff)
}

// GoodFirstIssue represents a beginner-friendly issue fetched from GitHub GraphQL search.
type GoodFirstIssue struct {
	Number                  int       `json:"number"`
	Title                   string    `json:"title"`
	BodyText                string    `json:"body_text"`
	URL                     string    `json:"url"`
	CreatedAt               time.Time `json:"created_at"`
	CommentsCount           int       `json:"comments_count"`
	LabelsJSON              string    `json:"labels_json"`
	AuthorAssociation       string    `json:"author_association"`
	IsMaintainerAuthored    bool      `json:"is_maintainer_authored"`
	MaintainerResponseHours float64   `json:"maintainer_response_hours"`
	HasMentorComment        bool      `json:"has_mentor_comment"`
	WordCount               int       `json:"word_count"`
	HasCodeSnippets         bool      `json:"has_code_snippets"`
	QualityScore            int       `json:"quality_score"`
	HasLinkedPR             bool      `json:"has_linked_pr"`
	LinkedPRNumber          *int      `json:"linked_pr_number,omitempty"`
}

// FetchGoodFirstIssueCount returns the number of open beginner-friendly issues for a repo.
// FetchIssuesCreatedCount returns the number of issues opened in the repository
// within the last `days` days, via a single GitHub search count query.
func (c *Client) FetchIssuesCreatedCount(owner, name string, days int) (int, error) {
	cutoff := time.Now().UTC().AddDate(0, 0, -days).Format("2006-01-02")
	queryStr := fmt.Sprintf("repo:%s/%s is:issue created:>=%s", owner, name, cutoff)
	vars := map[string]any{"query": queryStr}

	var resp struct {
		Data struct {
			Search struct {
				IssueCount int `json:"issueCount"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoGfiCountQuery, vars, &resp)
	if err != nil {
		return 0, fmt.Errorf("FetchIssuesCreatedCount: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	return resp.Data.Search.IssueCount, nil
}

func (c *Client) FetchGoodFirstIssueCount(owner, name string) (int, error) {
	queryStr := formatGoodFirstIssueQuery(owner, name)
	vars := map[string]any{"query": queryStr}

	var resp struct {
		Data struct {
			Search struct {
				IssueCount int `json:"issueCount"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoGfiCountQuery, vars, &resp)
	if err != nil {
		return 0, fmt.Errorf("FetchGoodFirstIssueCount: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	return resp.Data.Search.IssueCount, nil
}

// FetchIssueOpenUnassigned reports whether an issue is still open and has no
// assignees (AC4 send-time revalidation of queued alert items).
func (c *Client) FetchIssueOpenUnassigned(owner, name string, number int) (bool, bool, error) {
	vars := map[string]any{"owner": owner, "name": name, "number": number}
	var resp struct {
		Data struct {
			Repository struct {
				Issue struct {
					State     string `json:"state"`
					Assignees struct {
						TotalCount int `json:"totalCount"`
					} `json:"assignees"`
				} `json:"issue"`
			} `json:"repository"`
		} `json:"data"`
	}
	if _, err := c.do(IssueStateQuery, vars, &resp); err != nil {
		return false, false, fmt.Errorf("FetchIssueOpenUnassigned: %w", err)
	}
	iss := resp.Data.Repository.Issue
	return strings.EqualFold(iss.State, "open"), iss.Assignees.TotalCount == 0, nil
}

// FetchGoodFirstIssuesList fetches up to limit active Good First Issues for a repo including titles, bodyText, numbers, and labels.
func (c *Client) FetchGoodFirstIssuesList(owner, name string, limit int) ([]GoodFirstIssue, int, error) {
	if limit <= 0 {
		limit = 5
	}
	queryStr := formatGoodFirstIssueQuery(owner, name)
	vars := map[string]any{
		"query": queryStr,
		"first": limit,
	}

	var resp struct {
		Data struct {
			Search struct {
				IssueCount int `json:"issueCount"`
				Nodes      []struct {
					Number            int    `json:"number"`
					Title             string `json:"title"`
					BodyText          string `json:"bodyText"`
					URL               string `json:"url"`
					CreatedAt         string `json:"createdAt"`
					AuthorAssociation string `json:"authorAssociation"`
					Comments          struct {
						TotalCount int `json:"totalCount"`
						Nodes      []struct {
							CreatedAt         string `json:"createdAt"`
							AuthorAssociation string `json:"authorAssociation"`
						} `json:"nodes"`
					} `json:"comments"`
					Labels struct {
						Nodes []struct {
							Name  string `json:"name"`
							Color string `json:"color"`
						} `json:"nodes"`
					} `json:"labels"`
					TimelineItems struct {
						Nodes []struct {
							Source *struct {
								Number int    `json:"number"`
								State  string `json:"state"`
								URL    string `json:"url"`
							} `json:"source"`
							Subject *struct {
								Number int    `json:"number"`
								State  string `json:"state"`
								URL    string `json:"url"`
							} `json:"subject"`
						} `json:"nodes"`
					} `json:"timelineItems"`
				} `json:"nodes"`
			} `json:"search"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoGfiListQuery, vars, &resp)
	if err != nil {
		return nil, 0, fmt.Errorf("FetchGoodFirstIssuesList: %w", err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	now := time.Now().UTC()
	var issues []GoodFirstIssue
	for _, n := range resp.Data.Search.Nodes {
		var labels []map[string]string
		var labelNames []string
		for _, l := range n.Labels.Nodes {
			labels = append(labels, map[string]string{"name": l.Name, "color": l.Color})
			labelNames = append(labelNames, l.Name)
		}
		lblBytes, _ := json.Marshal(labels)

		var createdAt time.Time
		if t, parseErr := time.Parse(time.RFC3339, n.CreatedAt); parseErr == nil {
			createdAt = t
		}

		isMaintainerAuthored := n.AuthorAssociation == "OWNER" || n.AuthorAssociation == "MEMBER" || n.AuthorAssociation == "COLLABORATOR"
		var maintainerResponseHours float64
		var hasMentorComment bool

		for _, cm := range n.Comments.Nodes {
			isMentor := cm.AuthorAssociation == "OWNER" || cm.AuthorAssociation == "MEMBER" || cm.AuthorAssociation == "COLLABORATOR"
			if isMentor {
				hasMentorComment = true
				if maintainerResponseHours == 0 && cm.CreatedAt != "" {
					if ct, err := time.Parse(time.RFC3339, cm.CreatedAt); err == nil && !createdAt.IsZero() {
						maintainerResponseHours = ct.Sub(createdAt).Hours()
						if maintainerResponseHours < 0 {
							maintainerResponseHours = 0
						}
					}
				}
			}
		}

		wordCount, hasCodeSnippets, hasDocLabel, hasGfiLabel := scoring.InspectGFIQuality(n.BodyText, labelNames)
		qualityScore := scoring.CalculateGFIQualityScore(scoring.GFIQualityInput{
			IsMaintainerAuthored:     isMaintainerAuthored,
			MaintainerResponseHours: maintainerResponseHours,
			HasMentorComment:        hasMentorComment,
			WordCount:               wordCount,
			HasCodeSnippets:         hasCodeSnippets,
			HasDocLabel:             hasDocLabel,
			CreatedAt:               createdAt,
			HasGfiLabel:             hasGfiLabel,
		}, now)

		// Keep body preview to reasonable length (up to 1000 chars) for storage efficiency
		body := n.BodyText
		if len(body) > 1000 {
			body = body[:1000]
		}

		var hasLinkedPR bool
		var linkedPRNumber *int
		for _, item := range n.TimelineItems.Nodes {
			if item.Source != nil && strings.EqualFold(item.Source.State, "OPEN") && item.Source.Number > 0 {
				hasLinkedPR = true
				num := item.Source.Number
				linkedPRNumber = &num
				break
			}
			if item.Subject != nil && strings.EqualFold(item.Subject.State, "OPEN") && item.Subject.Number > 0 {
				hasLinkedPR = true
				num := item.Subject.Number
				linkedPRNumber = &num
				break
			}
		}

		issues = append(issues, GoodFirstIssue{
			Number:                  n.Number,
			Title:                   n.Title,
			BodyText:                body,
			URL:                     n.URL,
			CreatedAt:               createdAt,
			CommentsCount:           n.Comments.TotalCount,
			LabelsJSON:              string(lblBytes),
			AuthorAssociation:       n.AuthorAssociation,
			IsMaintainerAuthored:    isMaintainerAuthored,
			MaintainerResponseHours: maintainerResponseHours,
			HasMentorComment:        hasMentorComment,
			WordCount:               wordCount,
			HasCodeSnippets:         hasCodeSnippets,
			QualityScore:            qualityScore,
			HasLinkedPR:             hasLinkedPR,
			LinkedPRNumber:          linkedPRNumber,
		})
	}

	count := resp.Data.Search.IssueCount
	if len(resp.Data.Search.Nodes) == 0 && count > 0 {
		count = 0
	}
	return issues, count, nil
}

// PRDetails holds the auto-fetchable metadata of a single pull request.
type PRDetails struct {
	Title       string   `json:"title"`
	Body        string   `json:"body"`
	Additions   int      `json:"additions"`
	Deletions   int      `json:"deletions"`
	ChangedFiles []string `json:"changed_files"`
}

// FetchPRDetails fetches title, body, delta size, and changed-file paths for one PR.
func (c *Client) FetchPRDetails(owner, name string, number int) (*PRDetails, error) {
	vars := map[string]any{"owner": owner, "name": name, "number": number}

	var resp struct {
		Data struct {
			Repository struct {
				PullRequest *struct {
					Title     string `json:"title"`
					Body      string `json:"body"`
					Additions int    `json:"additions"`
					Deletions int    `json:"deletions"`
					Files     struct {
						Nodes []struct {
							Path string `json:"path"`
						} `json:"nodes"`
					} `json:"files"`
				} `json:"pullRequest"`
			} `json:"repository"`
			RateLimit rateLimitInfo `json:"rateLimit"`
		} `json:"data"`
	}

	fromCache, err := c.do(RepoPRDetailQuery, vars, &resp)
	if err != nil {
		return nil, fmt.Errorf("FetchPRDetails(%s/%s#%d): %w", owner, name, number, err)
	}

	if !fromCache {
		c.handleRateLimit(resp.Data.RateLimit)
	}

	pr := resp.Data.Repository.PullRequest
	if pr == nil {
		return nil, fmt.Errorf("FetchPRDetails(%s/%s#%d): pull request not found", owner, name, number)
	}

	details := &PRDetails{
		Title:        pr.Title,
		Body:         pr.Body,
		Additions:    pr.Additions,
		Deletions:    pr.Deletions,
		ChangedFiles: make([]string, 0, len(pr.Files.Nodes)),
	}
	for _, f := range pr.Files.Nodes {
		if f.Path != "" {
			details.ChangedFiles = append(details.ChangedFiles, f.Path)
		}
	}
	return details, nil
}

// restGet performs a GET against the GitHub REST API using the supplied
// access token, retrying on HTTP 403 (secondary rate limit / abuse) with a
// sleep + backoff so batched callers (e.g. the SLA re-compute cron) degrade
// gracefully instead of failing fast (AC4).
func restGetWithBackoff(token, url string) ([]byte, int, error) {
	var lastBody []byte
	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			return nil, 0, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github+json")
		res, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
		if err != nil {
			return nil, 0, err
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		lastBody = raw
		if res.StatusCode == http.StatusForbidden {
			// Secondary rate limit / abuse detection: sleep then retry.
			resetSleep := time.Duration(attempt+1) * 3 * time.Second
			slog.Warn("github: REST 403, backing off", "url", url, "sleep", resetSleep.String(), "attempt", attempt)
			time.Sleep(resetSleep)
			continue
		}
		return raw, res.StatusCode, nil
	}
	return lastBody, http.StatusForbidden, nil
}

// GetViewerLogin returns the GitHub login for the supplied access token.
func GetViewerLogin(accessToken string) (string, error) {
	raw, status, err := restGetWithBackoff(accessToken, "https://api.github.com/user")
	if err != nil {
		return "", err
	}
	if status != http.StatusOK {
		return "", fmt.Errorf("github user lookup returned %d", status)
	}
	var u struct {
		Login string `json:"login"`
	}
	if err := json.Unmarshal(raw, &u); err != nil {
		return "", err
	}
	if u.Login == "" {
		return "", fmt.Errorf("github user lookup returned empty login")
	}
	return u.Login, nil
}

// CheckCollaboratorPermission verifies a user's permission level on a repo via
// GET /repos/{owner}/{repo}/collaborators/{user}/permission. Returns the
// permission string (e.g. "admin"). Used for read-only ownership verification
// under the repo scope (AC1).
func CheckCollaboratorPermission(accessToken, owner, repo, user string) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/collaborators/%s/permission", owner, repo, user)
	raw, status, err := restGetWithBackoff(accessToken, url)
	if err != nil {
		return "", err
	}
	if status == http.StatusNotFound {
		// Not a collaborator at all.
		return "", nil
	}
	if status != http.StatusOK {
		return "", fmt.Errorf("github collaborator permission returned %d", status)
	}
	var p struct {
		Permission string `json:"permission"`
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		return "", err
	}
	return p.Permission, nil
}

// ParsePRURL extracts owner, repo name, and PR number from a GitHub pull request URL.
func ParsePRURL(prURL string) (owner, name string, number int, ok bool) {
	matches := prURLRegex.FindStringSubmatch(strings.TrimSpace(prURL))
	if matches == nil {
		return "", "", 0, false
	}
	n, err := strconv.Atoi(matches[3])
	if err != nil {
		return "", "", 0, false
	}
	return matches[1], matches[2], n, true
}
