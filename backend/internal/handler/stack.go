package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/stack"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// StackHandler provides HTTP endpoints for tech stack stalking, repository dependency scanning, and health monitoring
type StackHandler struct {
	analyzer *stack.Analyzer
	tokenMgr auth.TokenManager
	userRepo repository.UserRepository
	db       *sqlx.DB
}

// NewStackHandler creates a new StackHandler
func NewStackHandler(analyzer *stack.Analyzer, tokenMgr auth.TokenManager, userRepo repository.UserRepository, db *sqlx.DB) *StackHandler {
	return &StackHandler{
		analyzer: analyzer,
		tokenMgr: tokenMgr,
		userRepo: userRepo,
		db:       db,
	}
}

func getUserIDFromCtx(c *gin.Context) (int64, bool) {
	val, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	switch v := val.(type) {
	case int64:
		return v, true
	case int:
		return int64(v), true
	case float64:
		return int64(v), true
	default:
		return 0, false
	}
}

// GetUserRepos handles GET /api/v1/stack/user-repos
// Fetches the authenticated user's GitHub repositories using their stored OAuth token
func (h *StackHandler) GetUserRepos(c *gin.Context) {
	userID, exists := getUserIDFromCtx(c)
	if !exists || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var token string
	if h.tokenMgr != nil {
		tok, err := h.tokenMgr.GetValidGithubToken(c.Request.Context(), userID)
		if err == nil && tok != "" {
			token = tok
		}
	}

	if token == "" {
		c.JSON(http.StatusPreconditionRequired, gin.H{
			"error": "GitHub OAuth token not found. Please reconnect your GitHub account.",
			"code":  "RECONNECT_GITHUB",
		})
		return
	}

	repos, err := h.analyzer.FetchUserRepos(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch repositories from GitHub", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"repositories": repos,
		"count":        len(repos),
	})
}

// ScanRepoRequest is the body for POST /api/v1/stack/scan-repo
type ScanRepoRequest struct {
	RepoFullName string `json:"repo_full_name" binding:"required"`
}

// ScanRepo handles POST /api/v1/stack/scan-repo
// Scans a specific GitHub repository, analyzes its dependency health, and saves it to the user's monitored stacks
func (h *StackHandler) ScanRepo(c *gin.Context) {
	var req ScanRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.RepoFullName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repo_full_name is required (e.g. 'vercel/next.js')"})
		return
	}

	var token string
	userID, exists := getUserIDFromCtx(c)
	if exists && userID > 0 && h.tokenMgr != nil {
		tok, err := h.tokenMgr.GetValidGithubToken(c.Request.Context(), userID)
		if err == nil {
			token = tok
		}
	}

	manifestType, content, err := h.analyzer.FetchRepoManifest(c.Request.Context(), token, req.RepoFullName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	analysis, err := h.analyzer.AnalyzeStack(manifestType, content, nil)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Failed to parse dependency manifest", "details": err.Error()})
		return
	}

	analysis.RepoFullName = req.RepoFullName

	// If authenticated, persist to user_monitored_stacks
	if exists && userID > 0 && h.db != nil {
		depsJSON, _ := json.Marshal(analysis.Dependencies)
		upsertQuery := `
			INSERT INTO user_monitored_stacks 
				(user_id, repo_full_name, manifest_type, dependency_count, health_grade, health_score, at_risk_count, dependencies_json, alert_enabled, updated_at)
			VALUES 
				(?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, repo_full_name) DO UPDATE SET
				manifest_type = excluded.manifest_type,
				dependency_count = excluded.dependency_count,
				health_grade = excluded.health_grade,
				health_score = excluded.health_score,
				at_risk_count = excluded.at_risk_count,
				dependencies_json = excluded.dependencies_json,
				updated_at = CURRENT_TIMESTAMP
		`
		if h.db.DriverName() == "mysql" {
			upsertQuery = `
				INSERT INTO user_monitored_stacks 
					(user_id, repo_full_name, manifest_type, dependency_count, health_grade, health_score, at_risk_count, dependencies_json, alert_enabled, updated_at)
				VALUES 
					(?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)
				ON DUPLICATE KEY UPDATE
					manifest_type = VALUES(manifest_type),
					dependency_count = VALUES(dependency_count),
					health_grade = VALUES(health_grade),
					health_score = VALUES(health_score),
					at_risk_count = VALUES(at_risk_count),
					dependencies_json = VALUES(dependencies_json),
					updated_at = CURRENT_TIMESTAMP
			`
		}
		_, _ = h.db.Exec(upsertQuery,
			userID,
			req.RepoFullName,
			string(manifestType),
			analysis.Summary.TotalDependencies,
			analysis.Summary.OverallHealthGrade,
			analysis.Summary.HealthScorePercentage,
			analysis.Summary.AtRiskCount,
			string(depsJSON),
		)
	}

	c.JSON(http.StatusOK, analysis)
}

// AnalyzeDirectRequest is the body for POST /api/v1/stack/analyze
type AnalyzeDirectRequest struct {
	ManifestType string   `json:"manifest_type"`
	Content      string   `json:"content"`
	Packages     []string `json:"packages"`
}

// AnalyzeDirect handles POST /api/v1/stack/analyze
// Parses pasted manifest or manual package list
func (h *StackHandler) AnalyzeDirect(c *gin.Context) {
	var req AnalyzeDirectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	analysis, err := h.analyzer.AnalyzeStack(stack.ManifestType(req.ManifestType), req.Content, req.Packages)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// GetSavedStacks handles GET /api/v1/stack/saved
// Returns all monitored stacks for the authenticated user
func (h *StackHandler) GetSavedStacks(c *gin.Context) {
	userID, exists := getUserIDFromCtx(c)
	if !exists || userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusOK, gin.H{"stacks": []any{}})
		return
	}

	var rows []struct {
		ID              int64   `db:"id" json:"id"`
		RepoFullName    string  `db:"repo_full_name" json:"repo_full_name"`
		ManifestType    string  `db:"manifest_type" json:"manifest_type"`
		DependencyCount int     `db:"dependency_count" json:"dependency_count"`
		HealthGrade     string  `db:"health_grade" json:"health_grade"`
		HealthScore     float64 `db:"health_score" json:"health_score"`
		AtRiskCount     int     `db:"at_risk_count" json:"at_risk_count"`
		AlertEnabled    bool    `db:"alert_enabled" json:"alert_enabled"`
		UpdatedAt       string  `db:"updated_at" json:"updated_at"`
	}

	query := `
		SELECT id, repo_full_name, manifest_type, dependency_count, health_grade, health_score, at_risk_count, alert_enabled, updated_at
		FROM user_monitored_stacks
		WHERE user_id = ?
		ORDER BY updated_at DESC
	`
	if err := h.db.Select(&rows, query, userID); err != nil {
		c.JSON(http.StatusOK, gin.H{"stacks": []any{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stacks": rows})
}
