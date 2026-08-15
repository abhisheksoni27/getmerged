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
	RepoID             string `json:"repo_id" binding:"required"`
	FullName           string `json:"full_name" binding:"required"`
	MaintainerRating   int    `json:"maintainer_rating" binding:"required,min=1,max=5"`
	ReviewSpeedRating  int    `json:"review_speed_rating" binding:"required,min=1,max=5"`
	BeginnerRating     int    `json:"beginner_rating" binding:"required,min=1,max=5"`
	Comment            string `json:"comment"`
}

type feedbackRecord struct {
	ID                  string    `db:"id" json:"id"`
	RepositoryID        string    `db:"repository_id" json:"repository_id"`
	UserID              string    `db:"user_id" json:"-"`
	Sentiment           string    `db:"sentiment" json:"sentiment"`
	Comment             string    `db:"comment" json:"comment"`
	VerifiedContributor bool      `db:"verified_contributor" json:"verified_contributor"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
}

// CreateFeedback handles POST /api/v1/user/feedback
// Issues #6 & #7: Validates GitHub contributor commits before setting verified_contributor flag.
func CreateFeedback(db *sqlx.DB, ghToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok || userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		username := c.GetString(middleware.UsernameKey)

		var req createFeedbackReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload: " + err.Error()})
			return
		}

		// Derive sentiment server-side from average rating
		avg := float64(req.MaintainerRating+req.ReviewSpeedRating+req.BeginnerRating) / 3.0
		sentiment := "unresponsive"
		if avg >= 4.0 {
			sentiment = "welcoming"
		} else if avg >= 3.0 {
			sentiment = "selective"
		}

		// Ensure feedback table exists
		_, _ = db.Exec(`
			CREATE TABLE IF NOT EXISTS contributor_feedbacks (
				id VARCHAR(36) PRIMARY KEY,
				repository_id VARCHAR(36) NOT NULL,
				user_id VARCHAR(36) NOT NULL,
				sentiment VARCHAR(50) NOT NULL,
				comment TEXT NOT NULL,
				maintainer_rating TINYINT UNSIGNED NOT NULL DEFAULT 0,
				review_speed_rating TINYINT UNSIGNED NOT NULL DEFAULT 0,
				beginner_rating TINYINT UNSIGNED NOT NULL DEFAULT 0,
				verified_contributor BOOLEAN NOT NULL DEFAULT 0,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE KEY uq_user_repo (user_id, repository_id)
			)
		`)

		// Verify contributor commit history on GitHub (Issue #7)
		isVerified := checkGitHubContributorStatus(req.FullName, username, ghToken)

		feedbackID := uuid.New().String()
		_, err := db.Exec(`
			INSERT INTO contributor_feedbacks
				(id, repository_id, user_id, sentiment, comment, maintainer_rating, review_speed_rating, beginner_rating, verified_contributor, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				sentiment = VALUES(sentiment),
				comment = VALUES(comment),
				maintainer_rating = VALUES(maintainer_rating),
				review_speed_rating = VALUES(review_speed_rating),
				beginner_rating = VALUES(beginner_rating),
				verified_contributor = VALUES(verified_contributor),
				created_at = VALUES(created_at)
		`, feedbackID, req.RepoID, userID, sentiment, strings.TrimSpace(req.Comment),
			req.MaintainerRating, req.ReviewSpeedRating, req.BeginnerRating,
			isVerified, time.Now().UTC())

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
			SELECT id, repository_id, user_id, sentiment, comment, verified_contributor, created_at
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

// DeleteFeedback handles DELETE /api/v1/user/feedback/:id
func DeleteFeedback(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok || userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		feedbackID := c.Param("id")
		if feedbackID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "feedback ID is required"})
			return
		}

		res, err := db.ExecContext(c.Request.Context(), "DELETE FROM contributor_feedback WHERE id = ? AND user_id = ?", feedbackID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete feedback"})
			return
		}

		rows, _ := res.RowsAffected()
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "feedback not found or unauthorized"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "feedback deleted successfully"})
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
