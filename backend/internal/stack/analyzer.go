package stack

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// ManifestType represents supported dependency manifest formats
type ManifestType string

const (
	ManifestPackageJSON     ManifestType = "package.json"
	ManifestGoMod           ManifestType = "go.mod"
	ManifestCargoToml       ManifestType = "Cargo.toml"
	ManifestRequirementsTxt ManifestType = "requirements.txt"
)

// PackageDependency represents an extracted dependency
type PackageDependency struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// StackRepoInfo contains C-Rank and maintainer telemetry for a detected package repo
type StackRepoInfo struct {
	PackageName          string       `json:"package_name"`
	RepoFullName         string       `json:"repo_full_name,omitempty"`
	CRankTier            string       `json:"c_rank_tier"` // S, A, B, C, D or "UNKNOWN"
	ExternalPRMergeRate  float64      `json:"external_pr_merge_rate"`
	TimeToFirstResponse  float64      `json:"time_to_first_response_hours"`
	BusFactor            int          `json:"bus_factor"`
	IsStale              bool         `json:"is_stale"`
	GoodFirstIssuesCount int          `json:"good_first_issues_count"`
	GoodFirstIssues      []StackIssue `json:"good_first_issues,omitempty"`
	MaintainerStatus     string       `json:"maintainer_status"` // "welcoming", "active", "fragile", "abandoned", "unknown"
}

// StackIssue represents a beginner issue in the dependency
type StackIssue struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Comments  int    `json:"comments"`
	CreatedAt string `json:"created_at"`
}

// StackAnalysisSummary represents aggregate metrics for the uploaded stack
type StackAnalysisSummary struct {
	TotalDependencies     int     `json:"total_dependencies"`
	IndexedDependencies   int     `json:"indexed_dependencies"`
	HealthyCount          int     `json:"healthy_count"`  // Tier S or A
	ModerateCount         int     `json:"moderate_count"` // Tier B
	AtRiskCount           int     `json:"at_risk_count"`  // Tier C or D or BusFactor == 1
	TotalGoodFirstIssues  int     `json:"total_good_first_issues"`
	OverallHealthGrade    string  `json:"overall_health_grade"` // S, A, B, C, D
	HealthScorePercentage float64 `json:"health_score_percentage"`
}

// StackAnalysisResult is the full response for /api/v1/stack/analyze
type StackAnalysisResult struct {
	RepoFullName string               `json:"repo_full_name,omitempty"`
	ManifestType ManifestType         `json:"manifest_type"`
	Summary      StackAnalysisSummary `json:"summary"`
	Dependencies []StackRepoInfo      `json:"dependencies"`
}

// UserRepoItem represents a user's GitHub repository
type UserRepoItem struct {
	FullName      string `json:"full_name"`
	Name          string `json:"name"`
	Description   string `json:"description,omitempty"`
	Language      string `json:"language,omitempty"`
	Stars         int    `json:"stars"`
	IsPrivate     bool   `json:"is_private"`
	DefaultBranch string `json:"default_branch"`
	UpdatedAt     string `json:"updated_at"`
}

// ParseManifest extracts package names from manifest file content
func ParseManifest(manifestType ManifestType, content string) ([]PackageDependency, error) {
	switch strings.ToLower(string(manifestType)) {
	case "package.json":
		return parsePackageJSON(content)
	case "go.mod":
		return parseGoMod(content)
	case "cargo.toml":
		return parseCargoToml(content)
	case "requirements.txt":
		return parseRequirementsTxt(content)
	default:
		if strings.Contains(content, `"dependencies"`) || strings.Contains(content, `"devDependencies"`) {
			return parsePackageJSON(content)
		} else if strings.Contains(content, "module ") || strings.Contains(content, "require (") {
			return parseGoMod(content)
		} else if strings.Contains(content, "[dependencies]") {
			return parseCargoToml(content)
		}
		return parseRequirementsTxt(content)
	}
}

func parsePackageJSON(content string) ([]PackageDependency, error) {
	var pkg struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal([]byte(content), &pkg); err != nil {
		return nil, fmt.Errorf("invalid package.json: %w", err)
	}

	var results []PackageDependency
	seen := make(map[string]bool)

	add := func(deps map[string]string) {
		for name, ver := range deps {
			if !seen[name] && name != "" {
				seen[name] = true
				results = append(results, PackageDependency{Name: name, Version: ver})
			}
		}
	}

	add(pkg.Dependencies)
	add(pkg.DevDependencies)
	return results, nil
}

func parseGoMod(content string) ([]PackageDependency, error) {
	var results []PackageDependency
	seen := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(content))
	inRequireBlock := false

	requireSingleRe := regexp.MustCompile(`^\s*require\s+([^\s]+)\s+([^\s]+)`)
	requireLineRe := regexp.MustCompile(`^\s*([^\s]+)\s+([^\s]+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "//") {
			continue
		}

		if line == "require (" {
			inRequireBlock = true
			continue
		}
		if inRequireBlock {
			if line == ")" {
				inRequireBlock = false
				continue
			}
			matches := requireLineRe.FindStringSubmatch(line)
			if len(matches) >= 2 {
				pkgName := matches[1]
				ver := ""
				if len(matches) >= 3 {
					ver = matches[2]
				}
				if !seen[pkgName] {
					seen[pkgName] = true
					results = append(results, PackageDependency{Name: pkgName, Version: ver})
				}
			}
			continue
		}

		matches := requireSingleRe.FindStringSubmatch(line)
		if len(matches) >= 2 {
			pkgName := matches[1]
			ver := ""
			if len(matches) >= 3 {
				ver = matches[2]
			}
			if !seen[pkgName] {
				seen[pkgName] = true
				results = append(results, PackageDependency{Name: pkgName, Version: ver})
			}
		}
	}

	return results, nil
}

func parseCargoToml(content string) ([]PackageDependency, error) {
	var results []PackageDependency
	seen := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(content))
	inDepBlock := false

	depRe := regexp.MustCompile(`^([a-zA-Z0-9_-]+)\s*=`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "[") {
			lower := strings.ToLower(line)
			inDepBlock = strings.Contains(lower, "dependencies")
			continue
		}
		if inDepBlock && line != "" && !strings.HasPrefix(line, "#") {
			matches := depRe.FindStringSubmatch(line)
			if len(matches) >= 2 {
				pkgName := matches[1]
				if !seen[pkgName] {
					seen[pkgName] = true
					results = append(results, PackageDependency{Name: pkgName})
				}
			}
		}
	}
	return results, nil
}

func parseRequirementsTxt(content string) ([]PackageDependency, error) {
	var results []PackageDependency
	seen := make(map[string]bool)
	scanner := bufio.NewScanner(strings.NewReader(content))
	reqRe := regexp.MustCompile(`^([a-zA-Z0-9_.-]+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "-") {
			continue
		}
		matches := reqRe.FindStringSubmatch(line)
		if len(matches) >= 2 {
			pkgName := matches[1]
			if !seen[pkgName] {
				seen[pkgName] = true
				results = append(results, PackageDependency{Name: pkgName})
			}
		}
	}
	return results, nil
}

// Analyzer queries the database to evaluate repository health and contribution opportunities for a stack
type Analyzer struct {
	db         *sqlx.DB
	httpClient *http.Client
}

// NewAnalyzer creates a new Stack Analyzer
func NewAnalyzer(db *sqlx.DB) *Analyzer {
	return &Analyzer{
		db: db,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// FetchUserRepos lists repositories the authenticated user has access to
func (a *Analyzer) FetchUserRepos(ctx context.Context, token string) ([]UserRepoItem, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.github.com/user/repos?sort=updated&per_page=50", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("User-Agent", "getmerged-stack-stalker")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	var ghRepos []struct {
		FullName      string `json:"full_name"`
		Name          string `json:"name"`
		Description   string `json:"description"`
		Language      string `json:"language"`
		Stargazers    int    `json:"stargazers_count"`
		Private       bool   `json:"private"`
		DefaultBranch string `json:"default_branch"`
		UpdatedAt     string `json:"updated_at"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ghRepos); err != nil {
		return nil, err
	}

	var list []UserRepoItem
	for _, r := range ghRepos {
		list = append(list, UserRepoItem{
			FullName:      r.FullName,
			Name:          r.Name,
			Description:   r.Description,
			Language:      r.Language,
			Stars:         r.Stargazers,
			IsPrivate:     r.Private,
			DefaultBranch: r.DefaultBranch,
			UpdatedAt:     r.UpdatedAt,
		})
	}
	return list, nil
}

// FetchRepoManifest retrieves and decodes dependency manifest from GitHub repo
func (a *Analyzer) FetchRepoManifest(ctx context.Context, token, repoFullName string) (ManifestType, string, error) {
	manifestCandidates := []ManifestType{
		ManifestPackageJSON,
		ManifestGoMod,
		ManifestCargoToml,
		ManifestRequirementsTxt,
	}

	for _, m := range manifestCandidates {
		url := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s", repoFullName, string(m))
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			continue
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("User-Agent", "getmerged-stack-stalker")
		req.Header.Set("Accept", "application/vnd.github.v3+json")

		resp, err := a.httpClient.Do(req)
		if err != nil {
			continue
		}

		if resp.StatusCode == http.StatusOK {
			var fileResp struct {
				Content  string `json:"content"`
				Encoding string `json:"encoding"`
			}
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err := json.Unmarshal(body, &fileResp); err == nil && fileResp.Content != "" {
				cleaned := strings.ReplaceAll(fileResp.Content, "\n", "")
				decoded, err := base64.StdEncoding.DecodeString(cleaned)
				if err == nil {
					return m, string(decoded), nil
				}
			}
		} else {
			resp.Body.Close()
		}
	}

	return "", "", fmt.Errorf("no supported dependency manifest found in %s (checked package.json, go.mod, Cargo.toml, requirements.txt)", repoFullName)
}

// AnalyzeStack processes package dependencies and returns comprehensive health and opportunity telemetry
func (a *Analyzer) AnalyzeStack(manifestType ManifestType, content string, manualPackages []string) (*StackAnalysisResult, error) {
	var packages []PackageDependency
	if len(manualPackages) > 0 {
		for _, p := range manualPackages {
			p = strings.TrimSpace(p)
			if p != "" {
				packages = append(packages, PackageDependency{Name: p})
			}
		}
	} else {
		var err error
		packages, err = ParseManifest(manifestType, content)
		if err != nil {
			return nil, err
		}
	}

	result := &StackAnalysisResult{
		ManifestType: manifestType,
		Dependencies: make([]StackRepoInfo, 0, len(packages)),
	}

	if len(packages) == 0 {
		return result, nil
	}

	for _, pkg := range packages {
		info := a.resolvePackageRepo(pkg.Name)
		result.Dependencies = append(result.Dependencies, info)
	}

	// Compute summary
	total := len(result.Dependencies)
	indexed := 0
	healthy := 0
	moderate := 0
	atRisk := 0
	totalGFIs := 0
	scoreAccumulator := 0.0

	for _, dep := range result.Dependencies {
		totalGFIs += dep.GoodFirstIssuesCount
		if dep.CRankTier != "UNKNOWN" {
			indexed++
			switch dep.CRankTier {
			case "S":
				healthy++
				scoreAccumulator += 100
			case "A":
				healthy++
				scoreAccumulator += 85
			case "B":
				moderate++
				scoreAccumulator += 70
			case "C":
				atRisk++
				scoreAccumulator += 50
			case "D":
				atRisk++
				scoreAccumulator += 25
			}
		} else {
			scoreAccumulator += 60 // neutral baseline
		}

		if dep.BusFactor == 1 && dep.CRankTier != "D" && dep.CRankTier != "C" {
			atRisk++
		}
	}

	var healthPct float64
	if total > 0 {
		healthPct = scoreAccumulator / float64(total)
	}

	overallGrade := "B"
	if healthPct >= 85 {
		overallGrade = "S"
	} else if healthPct >= 75 {
		overallGrade = "A"
	} else if healthPct >= 65 {
		overallGrade = "B"
	} else if healthPct >= 50 {
		overallGrade = "C"
	} else {
		overallGrade = "D"
	}

	result.Summary = StackAnalysisSummary{
		TotalDependencies:     total,
		IndexedDependencies:   indexed,
		HealthyCount:          healthy,
		ModerateCount:         moderate,
		AtRiskCount:           atRisk,
		TotalGoodFirstIssues:  totalGFIs,
		OverallHealthGrade:    overallGrade,
		HealthScorePercentage: healthPct,
	}

	return result, nil
}

func (a *Analyzer) resolvePackageRepo(pkgName string) StackRepoInfo {
	info := StackRepoInfo{
		PackageName:      pkgName,
		CRankTier:        "UNKNOWN",
		MaintainerStatus: "unknown",
	}

	if a.db == nil {
		return info
	}

	cleanName := strings.TrimPrefix(pkgName, "@")
	parts := strings.Split(cleanName, "/")
	shortName := parts[len(parts)-1]

	// Query repositories table matching name or short name
	var repo struct {
		ID                  string  `db:"id"`
		FullName            string  `db:"full_name"`
		CRankTier           string  `db:"c_rank_tier"`
		ExternalPRMergeRate float64 `db:"external_pr_merge_rate"`
		TimeToFirstResponse float64 `db:"time_to_first_response_hours"`
		LastActivityDays    float64 `db:"last_activity_days"`
		BusFactor           int     `db:"distinct_maintainer_count"`
	}

	query := `
		SELECT id, full_name, c_rank_tier, external_pr_merge_rate, 
		       time_to_first_response_hours, last_activity_days, 
		       COALESCE(distinct_maintainer_count, 1) as distinct_maintainer_count
		FROM repositories
		WHERE full_name LIKE ? OR name = ? OR full_name LIKE ?
		ORDER BY stars DESC LIMIT 1
	`
	err := a.db.Get(&repo, query, "%/"+shortName, shortName, "%"+cleanName+"%")
	if err != nil {
		return info
	}

	info.RepoFullName = repo.FullName
	info.CRankTier = repo.CRankTier
	info.ExternalPRMergeRate = repo.ExternalPRMergeRate
	info.TimeToFirstResponse = repo.TimeToFirstResponse
	info.BusFactor = repo.BusFactor
	info.IsStale = repo.LastActivityDays > 120

	// Determine maintainer status
	if info.IsStale || info.CRankTier == "D" {
		info.MaintainerStatus = "abandoned"
	} else if info.BusFactor <= 1 {
		info.MaintainerStatus = "fragile"
	} else if info.CRankTier == "S" || info.CRankTier == "A" {
		info.MaintainerStatus = "welcoming"
	} else {
		info.MaintainerStatus = "active"
	}

	// Fetch open Good First Issues for this repo
	var issues []struct {
		ID        int64  `db:"id"`
		Title     string `db:"title"`
		URL       string `db:"url"`
		Comments  int    `db:"comments_count"`
		CreatedAt string `db:"created_at"`
	}

	issueQuery := `
		SELECT id, title, url, COALESCE(comments_count, 0) as comments_count, created_at
		FROM repo_good_first_issues
		WHERE repository_id = ? AND state = 'OPEN'
		ORDER BY created_at DESC LIMIT 3
	`
	_ = a.db.Select(&issues, issueQuery, repo.ID)

	info.GoodFirstIssuesCount = len(issues)
	for _, iss := range issues {
		info.GoodFirstIssues = append(info.GoodFirstIssues, StackIssue{
			ID:        iss.ID,
			Title:     iss.Title,
			URL:       iss.URL,
			Comments:  iss.Comments,
			CreatedAt: iss.CreatedAt,
		})
	}

	return info
}
