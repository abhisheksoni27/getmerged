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
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/dna"
	"github.com/abhisheksoni27/opendoor/internal/repository"
)

// Re-export the DNA result type under the pipeline namespace so existing
// callers (and tests) keep working without a code change at the call site.
// The canonical home is internal/dna.
type ContributorDNAResult = dna.Result
type TemporalSig = dna.Temporal
type TopRepo = dna.TopRepo

const (
	PersonaEmerging     = dna.PersonaEmerging
	PersonaNightOwl     = dna.PersonaNightOwl
	PersonaSpecialist   = dna.PersonaSpecialist
	PersonaPolyglot     = dna.PersonaPolyglot
	PersonaBuilder      = dna.PersonaBuilder
	PersonaQuietShipper = dna.PersonaQuietShipper
)

const (
	TemporalNightOwl   = dna.TemporalNightOwl
	TemporalLunch      = dna.TemporalLunch
	TemporalNineToFive = dna.TemporalNineToFive
	TemporalSparse     = dna.TemporalSparse
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

// Named types for the GraphQL response. Extracted from inline anonymous
// structs so the persona/temporal/stars helpers (and their tests) can pass
// values around without redeclaring the literal. JSON wire format unchanged.
type DNAUser struct {
	CreatedAt     string `json:"createdAt"`
	Followers     struct{ TotalCount int `json:"totalCount"` } `json:"followers"`
	Repositories struct{ TotalCount int `json:"totalCount"` } `json:"repositories"`
}

type DNARepo struct {
	NameWithOwner   string `json:"nameWithOwner"`
	PrimaryLanguage *struct{ Name string `json:"name"` } `json:"primaryLanguage"`
	StargazerCount  int    `json:"stargazerCount"`
}

type DNANode struct {
	Additions    int    `json:"additions"`
	Deletions    int    `json:"deletions"`
	ChangedFiles int    `json:"changedFiles"`
	MergedAt     string `json:"mergedAt"`
	CreatedAt    string `json:"createdAt"`
	Repository   DNARepo    `json:"repository"`
	Comments     struct{ TotalCount int `json:"totalCount"` } `json:"comments"`
	Reviews      struct{ TotalCount int `json:"totalCount"` } `json:"reviews"`
}

type GraphQLDNAData struct {
	User   DNAUser `json:"user"`
	Search struct {
		IssueCount int      `json:"issueCount"`
		Nodes      []DNANode `json:"nodes"`
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

	// 2. Claim pending job (or mark processing if invoked directly)
	claimed, err := w.profileRepo.ClaimPendingJob(ctx, userID)
	if err != nil {
		return err
	}
	if !claimed {
		// If not pending, request/initialize a run
		_, _ = w.profileRepo.RequestRefresh(ctx, userID)
		claimed, _ = w.profileRepo.ClaimPendingJob(ctx, userID)
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
	// Resolve GitHub login handle if user token is valid
	if token != "" {
		ghUserReq, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/user", nil)
		if err == nil {
			ghUserReq.Header.Set("Authorization", "Bearer "+token)
			ghUserReq.Header.Set("User-Agent", "opendoor-dna-worker")
			ghUserResp, err := w.httpClient.Do(ghUserReq)
			if err == nil && ghUserResp.StatusCode == http.StatusOK {
				var uData struct {
					Login string `json:"login"`
				}
				if json.NewDecoder(ghUserResp.Body).Decode(&uData) == nil && uData.Login != "" {
					login = uData.Login
				}
				ghUserResp.Body.Close()
			}
		}
	}
	if login == "" || strings.Contains(login, " ") {
		if user.Slug != nil && *user.Slug != "" {
			login = *user.Slug
		}
	}

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
	dnodes := make([]dna.Node, 0, len(gqlResp.Data.Search.Nodes))
	for _, pr := range gqlResp.Data.Search.Nodes {
		lang := ""
		if pr.Repository.PrimaryLanguage != nil {
			lang = pr.Repository.PrimaryLanguage.Name
		}
		dnodes = append(dnodes, dna.Node{
			MergedAt:  pr.MergedAt,
			Lang:      lang,
			Repo:      pr.Repository.NameWithOwner,
			Stars:     pr.Repository.StargazerCount,
			Additions: pr.Additions,
			Deletions: pr.Deletions,
			Files:     pr.ChangedFiles,
			Comments:  pr.Comments.TotalCount,
			Reviews:   pr.Reviews.TotalCount,
		})
	}
	result := dna.Compute(dnodes, gqlResp.Data.User.Followers.TotalCount, gqlResp.Data.User.Repositories.TotalCount)
	dnaJSON, err := json.Marshal(result)
	if err != nil {
		_ = w.profileRepo.SaveFailure(ctx, userID, "failed", err.Error())
		return err
	}

	totalMerged := len(gqlResp.Data.Search.Nodes)
	if err := w.profileRepo.SaveSuccessWithPersona(ctx, userID, string(dnaJSON), totalMerged, result.Persona, result.StarsPulledIn); err != nil {
		slog.Error("failed to save contributor profile success", "user_id", userID, "err", err)
		return err
	}

	// AC8: every contributor_profiles mutation refreshes the recruiter-search
	// index (primary_languages/skill_level/contribution_style/verified_sa_merges)
	// so opt-in profiles stay searchable within the freshness budget.
	if err := w.profileRepo.ReindexRecruiterColumns(ctx, userID); err != nil {
		slog.Warn("recruiter reindex after DNA save failed", "user_id", userID, "err", err)
	}

	return nil
}
