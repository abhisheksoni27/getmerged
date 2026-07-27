package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type createFeedbackReq struct {
	RepoID    string `json:"repo_id" binding:"required"`
	FullName  string `json:"full_name" binding:"required"`
	Sentiment string `json:"sentiment" binding:"required"`
	Comment   string `json:"comment" binding:"required"`
}

type feedbackRecord struct {
	ID                  string    `db:"id" json:"id"`
	RepositoryID        string    `db:"repository_id" json:"repository_id"`
	UserID              string    `db:"user_id" json:"user_id"`
	Username            string    `db:"username" json:"username"`
	Sentiment           string    `db:"sentiment" json:"sentiment"`
	Comment             string    `db:"comment" json:"comment"`
	VerifiedContributor bool      `db:"verified_contributor" json:"verified_contributor"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
}

// CreateFeedback handles POST /api/v1/user/feedback
// Issues #6 & #7: Validates GitHub contributor commits before setting verified_contributor flag.
func CreateFeedback(db *sqlx.DB, ghToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString(middleware.UserIDKey)
		username := c.GetString(middleware.UsernameKey)
		if userID == "" || username == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		var req createFeedbackReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}

		// Ensure feedback table exists
		_, _ = db.Exec(`
			CREATE TABLE IF NOT EXISTS contributor_feedbacks (
				id VARCHAR(36) PRIMARY KEY,
				repository_id VARCHAR(36) NOT NULL,
				user_id VARCHAR(36) NOT NULL,
				username VARCHAR(255) NOT NULL,
				sentiment VARCHAR(50) NOT NULL,
				comment TEXT NOT NULL,
				verified_contributor BOOLEAN NOT NULL DEFAULT 0,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`)

		// Verify contributor commit history on GitHub (Issue #7)
		isVerified := checkGitHubContributorStatus(req.FullName, username, ghToken)

		feedbackID := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO contributor_feedbacks (id, repository_id, user_id, username, sentiment, comment, verified_contributor, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, feedbackID, req.RepoID, userID, username, req.Sentiment, strings.TrimSpace(req.Comment), isVerified, time.Now().UTC())

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save feedback"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":              "feedback submitted successfully",
			"feedback_id":          feedbackID,
			"verified_contributor": isVerified,
		})
	}
}

// ListFeedback handles GET /api/v1/repos/:id/feedback (Issue #6)
func ListFeedback(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		repoID := c.Param("id")

		var items []feedbackRecord = make([]feedbackRecord, 0)
		_ = db.Select(&items, `
			SELECT id, repository_id, user_id, username, sentiment, comment, verified_contributor, created_at
			FROM contributor_feedbacks
			WHERE repository_id = ?
			ORDER BY created_at DESC
			LIMIT 50
		`, repoID)

		c.JSON(http.StatusOK, gin.H{
			"feedback": items,
		})
	}
}

func checkGitHubContributorStatus(fullName, username, ghToken string) bool {
	if fullName == "" || username == "" {
		return false
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/commits?author=%s&per_page=1", fullName, username)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false
	}
	if ghToken != "" {
		req.Header.Set("Authorization", "token "+ghToken)
	}
	req.Header.Set("User-Agent", "opendoor-verifier")

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return false
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusOK {
		var commits []any
		if err := json.NewDecoder(res.Body).Decode(&commits); err == nil && len(commits) > 0 {
			return true
		}
	}
	return false
}
