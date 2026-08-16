package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/repository"
)

type ContributorDNAWorker interface {
	AnalyzeUser(ctx context.Context, userID int64) error
}

type contributorDNAWorker struct {
	userRepo    repository.UserRepository
	profileRepo repository.ContributorProfileRepository
	tokenMgr    auth.TokenManager
	globalToken string
	httpClient  *http.Client
	graphqlURL  string
}

func NewContributorDNAWorker(
	userRepo repository.UserRepository,
	profileRepo repository.ContributorProfileRepository,
	tokenMgr auth.TokenManager,
	globalToken string,
	httpClient *http.Client,
) ContributorDNAWorker {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &contributorDNAWorker{
		userRepo:    userRepo,
		profileRepo: profileRepo,
		tokenMgr:    tokenMgr,
		globalToken: globalToken,
		httpClient:  httpClient,
		graphqlURL:  "https://api.github.com/graphql",
	}
}

func NewContributorDNAWorkerWithURL(
	userRepo repository.UserRepository,
	profileRepo repository.ContributorProfileRepository,
	tokenMgr auth.TokenManager,
	globalToken string,
	httpClient *http.Client,
	graphqlURL string,
) ContributorDNAWorker {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &contributorDNAWorker{
		userRepo:    userRepo,
		profileRepo: profileRepo,
		tokenMgr:    tokenMgr,
		globalToken: globalToken,
		httpClient:  httpClient,
		graphqlURL:  graphqlURL,
	}
}

const ContributorDNAGraphQLQuery = `
query ContributorDNA($login: String!, $searchQuery: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    repositories(first: 1, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
    }
  }
  search(query: $searchQuery, type: ISSUE, first: 50) {
    issueCount
    nodes {
      ... on PullRequest {
        additions
        deletions
        changedFiles
        mergedAt
        createdAt
        repository {
          nameWithOwner
          primaryLanguage { name }
          stargazerCount
        }
        comments { totalCount }
        reviews { totalCount }
      }
    }
  }
}
`

type GraphQLDNAData struct {
	User struct {
		CreatedAt  string `json:"createdAt"`
		Followers  struct { TotalCount int `json:"totalCount"` } `json:"followers"`
		Repositories struct { TotalCount int `json:"totalCount"` } `json:"repositories"`
	} `json:"user"`
	Search struct {
		IssueCount int `json:"issueCount"`
		Nodes      []struct {
			Additions    int    `json:"additions"`
			Deletions    int    `json:"deletions"`
			ChangedFiles int    `json:"changedFiles"`
			MergedAt     string `json:"mergedAt"`
			CreatedAt    string `json:"createdAt"`
			Repository   struct {
				NameWithOwner   string `json:"nameWithOwner"`
				PrimaryLanguage *struct { Name string `json:"name"` } `json:"primaryLanguage"`
				StargazerCount  int `json:"stargazerCount"`
			} `json:"repository"`
			Comments struct { TotalCount int `json:"totalCount"` } `json:"comments"`
			Reviews  struct { TotalCount int `json:"totalCount"` } `json:"reviews"`
		} `json:"nodes"`
	} `json:"search"`
}

func (w *contributorDNAWorker) AnalyzeUser(ctx context.Context, userID int64) error {
	user, err := w.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return fmt.Errorf("user not found: %d", userID)
	}

	// 1. Consent Gate: Do not profile if user hasn't explicitly consented
	if !user.ProfilingConsent {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed_consent", "user profiling consent not granted")
		return errors.New("profiling consent not granted")
	}

	// 2. Claim pending job
	claimed, err := w.profileRepo.ClaimPendingJob(ctx, userID)
	if err != nil || !claimed {
		return nil // Already processing or not pending
	}

	// 3. Resolve GitHub token (User decrypted token -> Fallback to App Global Token)
	token, err := w.tokenMgr.GetValidGithubToken(ctx, userID)
	if err != nil || token == "" {
		token = w.globalToken
	}

	if token == "" {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed_auth", "no valid token available for profiling")
		return errors.New("no auth token available")
	}

	login := user.Username
	searchQuery := fmt.Sprintf("author:%s type:pr is:merged", login)

	reqPayload := map[string]interface{}{
		"query": ContributorDNAGraphQLQuery,
		"variables": map[string]interface{}{
			"login":       login,
			"searchQuery": searchQuery,
		},
	}

	bodyBytes, _ := json.Marshal(reqPayload)
	req, err := http.NewRequestWithContext(ctx, "POST", w.graphqlURL, bytes.NewReader(bodyBytes))
	if err != nil {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", err.Error())
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "opendoor-dna-worker")

	resp, err := w.httpClient.Do(req)
	if err != nil {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", err.Error())
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed_auth", "github oauth token unauthorized or expired")
		return errors.New("github 401 unauthorized")
	}

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", fmt.Sprintf("status %d: %s", resp.StatusCode, string(respBytes)))
		return fmt.Errorf("github api status %d", resp.StatusCode)
	}

	var gqlResp struct {
		Data   GraphQLDNAData `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&gqlResp); err != nil {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", err.Error())
		return err
	}

	if len(gqlResp.Errors) > 0 {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", gqlResp.Errors[0].Message)
		return fmt.Errorf("graphql error: %s", gqlResp.Errors[0].Message)
	}

	// 4. Synthesize Contributor DNA Model
	dna := computeContributorDNA(gqlResp.Data)
	dnaJSON, err := json.Marshal(dna)
	if err != nil {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", err.Error())
		return err
	}

	totalMerged := len(gqlResp.Data.Search.Nodes)
	if err := w.profileRepo.SaveSuccess(ctx, userID, string(dnaJSON), totalMerged); err != nil {
		slog.Error("failed to save contributor profile success", "user_id", userID, "err", err)
		return err
	}

	return nil
}

type ContributorDNAResult struct {
	TotalMergedPRs     int               `json:"total_merged_prs"`
	FollowersCount     int               `json:"followers_count"`
	RepositoriesCount  int               `json:"repositories_count"`
	LanguageBreakdown  map[string]int    `json:"language_breakdown"`
	AvgAdditions       float64           `json:"avg_additions"`
	AvgDeletions       float64           `json:"avg_deletions"`
	AvgChangedFiles    float64           `json:"avg_changed_files"`
	PrimaryLanguages   []string          `json:"primary_languages"`
	SkillLevel         string            `json:"skill_level"`
	PRSizePreference   string            `json:"pr_size_preference"`
	ReviewEngagement   string            `json:"review_engagement"`
}

func computeContributorDNA(data GraphQLDNAData) ContributorDNAResult {
	res := ContributorDNAResult{
		TotalMergedPRs:    len(data.Search.Nodes),
		FollowersCount:    data.User.Followers.TotalCount,
		RepositoriesCount: data.User.Repositories.TotalCount,
		LanguageBreakdown: make(map[string]int),
	}

	if res.TotalMergedPRs == 0 {
		res.SkillLevel = "Novice"
		res.PRSizePreference = "Compact"
		res.ReviewEngagement = "Light"
		return res
	}

	var totalAdds, totalDels, totalFiles, totalComments int
	for _, pr := range data.Search.Nodes {
		totalAdds += pr.Additions
		totalDels += pr.Deletions
		totalFiles += pr.ChangedFiles
		totalComments += pr.Comments.TotalCount + pr.Reviews.TotalCount

		if pr.Repository.PrimaryLanguage != nil && pr.Repository.PrimaryLanguage.Name != "" {
			res.LanguageBreakdown[pr.Repository.PrimaryLanguage.Name]++
		}
	}

	n := float64(res.TotalMergedPRs)
	res.AvgAdditions = float64(totalAdds) / n
	res.AvgDeletions = float64(totalDels) / n
	res.AvgChangedFiles = float64(totalFiles) / n

	// Skill Level Classification
	if res.TotalMergedPRs >= 25 {
		res.SkillLevel = "Veteran Contributor"
	} else if res.TotalMergedPRs >= 5 {
		res.SkillLevel = "Active Contributor"
	} else {
		res.SkillLevel = "Emerging Contributor"
	}

	// PR Size Preference
	avgDelta := res.AvgAdditions + res.AvgDeletions
	if avgDelta > 500 {
		res.PRSizePreference = "Large & Architectural"
	} else if avgDelta > 100 {
		res.PRSizePreference = "Medium Scope"
	} else {
		res.PRSizePreference = "Surgical / Focused"
	}

	// Review Engagement
	avgEngagement := float64(totalComments) / n
	if avgEngagement > 5 {
		res.ReviewEngagement = "Deeply Collaborative"
	} else if avgEngagement > 1 {
		res.ReviewEngagement = "Responsive"
	} else {
		res.ReviewEngagement = "Direct & Minimal"
	}

	for lang := range res.LanguageBreakdown {
		res.PrimaryLanguages = append(res.PrimaryLanguages, lang)
	}

	return res
}
