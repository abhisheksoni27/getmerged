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
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/valkey-io/valkey-go"
	"golang.org/x/time/rate"
)

const graphqlEndpoint = "https://api.github.com/graphql"
const cacheTTL = 1 * time.Hour

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
						StargazerCount int    `json:"stargazerCount"`
						Description    string `json:"description"`
						URL            string `json:"url"`
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
			repos = append(repos, Repo{
				NodeID:      n.ID,
				FullName:    n.NameWithOwner,
				Owner:       n.Owner.Login,
				Name:        n.Name,
				Language:    lang,
				Stars:       n.StargazerCount,
				Description: n.Description,
				URL:         n.URL,
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
					StargazerCount int    `json:"stargazerCount"`
					Description    string `json:"description"`
					URL            string `json:"url"`
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
		repos = append(repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
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
					StargazerCount int    `json:"stargazerCount"`
					Description    string `json:"description"`
					URL            string `json:"url"`
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
		repos = append(repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
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
		result.Repos = append(result.Repos, Repo{
			NodeID:      n.ID,
			FullName:    n.NameWithOwner,
			Owner:       n.Owner.Login,
			Name:        n.Name,
			Language:    lang,
			Stars:       n.StargazerCount,
			Description: n.Description,
			URL:         n.URL,
		})
	}

	return result, nil
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
					IssueTemplates []struct {
						Name string `json:"name"`
					} `json:"issueTemplates"`
					PullRequestTemplates []struct {
						Filename string `json:"filename"`
					} `json:"pullRequestTemplates"`
					Contributing       *struct{ ID string `json:"id"` } `json:"contributing"`
					ContributingLower  *struct{ ID string `json:"id"` } `json:"contributingLower"`
					ContributingGithub *struct{ ID string `json:"id"` } `json:"contributingGithub"`
					ContributingDocs   *struct{ ID string `json:"id"` } `json:"contributingDocs"`
					CodeOfConduct      *struct{ ID string `json:"id"` } `json:"codeOfConduct"`
					CodeOfConductLower *struct{ ID string `json:"id"` } `json:"codeOfConductLower"`
					CodeOfConductGithub *struct{ ID string `json:"id"` } `json:"codeOfConductGithub"`
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
		meta.HasIssueTemplate = len(resp.Data.Repository.IssueTemplates) > 0
		meta.HasPRTemplate = len(resp.Data.Repository.PullRequestTemplates) > 0
		meta.HasContributing = resp.Data.Repository.Contributing != nil ||
			resp.Data.Repository.ContributingLower != nil ||
			resp.Data.Repository.ContributingGithub != nil ||
			resp.Data.Repository.ContributingDocs != nil
		meta.HasCodeOfConduct = resp.Data.Repository.CodeOfConduct != nil ||
			resp.Data.Repository.CodeOfConductLower != nil ||
			resp.Data.Repository.CodeOfConductGithub != nil

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

	if rl.Remaining >= 100 {
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
	return fmt.Sprintf(`repo:%s/%s is:issue is:open label:"good first issue",good-first-issue,good_first_issue,first-timers-only,first-timer,beginner,beginner-friendly,"beginner friendly",easy,easy-fix,"easy fix",low-hanging-fruit,"low hanging fruit","help wanted",help-wanted,starter,starter-issue,bitesize,new-contributor,up-for-grabs,e-easy,E-mentor`, owner, name)
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
}

// FetchGoodFirstIssueCount returns the number of open beginner-friendly issues for a repo.
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
		})
	}

	return issues, resp.Data.Search.IssueCount, nil
}
