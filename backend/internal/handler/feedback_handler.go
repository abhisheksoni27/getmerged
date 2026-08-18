package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type createFeedbackReq struct {
	RepoID            string `json:"repo_id" binding:"required"`
	FullName          string `json:"full_name" binding:"required"`
	MaintainerRating  int    `json:"maintainer_rating" binding:"required,min=1,max=5"`
	ReviewSpeedRating int    `json:"review_speed_rating" binding:"required,min=1,max=5"`
	BeginnerRating    int    `json:"beginner_rating" binding:"required,min=1,max=5"`
	Comment           string `json:"comment"`
}

type feedbackRecord struct {
	ID                  int64     `json:"id"`
	RepositoryID        string    `json:"repository_id"`
	Sentiment           string    `json:"sentiment"`
	Comment             string    `json:"comment"`
	MaintainerRating    int       `json:"maintainer_rating"`
	ReviewSpeedRating   int       `json:"review_speed_rating"`
	BeginnerRating      int       `json:"beginner_rating"`
	VerifiedContributor bool      `json:"verified_contributor"`
	CreatedAt           time.Time `json:"created_at"`
}

type rawFeedbackRow struct {
	ID                     int64     `db:"id"`
	RepositoryID           string    `db:"repository_id"`
	UserID                 int64     `db:"user_id"`
	MaintainerRating       int       `db:"maintainer_rating"`
	ReviewSpeedRating      int       `db:"review_speed_rating"`
	BeginnerFriendlyRating int       `db:"beginner_friendly_rating"`
	Comment                *string   `db:"comment"`
	VerifiedPrAuthor       bool      `db:"verified_pr_author"`
	CreatedAt              time.Time `db:"created_at"`
}

// CreateFeedback handles POST /api/v1/user/feedback
// Issues #6 & #7: Validates GitHub contributor commits before setting verified_pr_author flag.
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

		// Verify contributor commit history on GitHub (Issue #7)
		isVerified := checkGitHubContributorStatus(req.FullName, username, ghToken)

		var insertQuery string
		if db.DriverName() == "sqlite" {
			insertQuery = `
				INSERT INTO contributor_feedback
					(repository_id, user_id, maintainer_rating, review_speed_rating, beginner_friendly_rating, comment, verified_pr_author, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(user_id, repository_id) DO UPDATE SET
					maintainer_rating = excluded.maintainer_rating,
					review_speed_rating = excluded.review_speed_rating,
					beginner_friendly_rating = excluded.beginner_friendly_rating,
					comment = excluded.comment,
					verified_pr_author = excluded.verified_pr_author,
					created_at = excluded.created_at
			`
		} else {
			insertQuery = `
				INSERT INTO contributor_feedback
					(repository_id, user_id, maintainer_rating, review_speed_rating, beginner_friendly_rating, comment, verified_pr_author, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					maintainer_rating = VALUES(maintainer_rating),
					review_speed_rating = VALUES(review_speed_rating),
					beginner_friendly_rating = VALUES(beginner_friendly_rating),
					comment = VALUES(comment),
					verified_pr_author = VALUES(verified_pr_author),
					created_at = VALUES(created_at)
			`
		}

		res, err := db.ExecContext(c.Request.Context(), insertQuery,
			req.RepoID, userID, req.MaintainerRating, req.ReviewSpeedRating, req.BeginnerRating,
			strings.TrimSpace(req.Comment), isVerified, time.Now().UTC(),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save feedback"})
			return
		}

		var feedbackID int64
		if lastID, err := res.LastInsertId(); err == nil && lastID > 0 {
			feedbackID = lastID
		} else {
			_ = db.GetContext(c.Request.Context(), &feedbackID, "SELECT id FROM contributor_feedback WHERE user_id = ? AND repository_id = ?", userID, req.RepoID)
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

		var rows []rawFeedbackRow
		err := db.SelectContext(c.Request.Context(), &rows, `
			SELECT id, repository_id, user_id, maintainer_rating, review_speed_rating, beginner_friendly_rating, comment, verified_pr_author, created_at
			FROM contributor_feedback
			WHERE repository_id = ?
			ORDER BY created_at DESC
			LIMIT 50
		`, repoID)
		if err != nil {
			rows = []rawFeedbackRow{}
		}

		items := make([]feedbackRecord, 0, len(rows))
		for _, r := range rows {
			avg := float64(r.MaintainerRating+r.ReviewSpeedRating+r.BeginnerFriendlyRating) / 3.0
			sentiment := "challenging"
			if avg >= 4.0 {
				sentiment = "welcoming"
			} else if avg >= 3.0 {
				sentiment = "selective"
			}

			commentStr := ""
			if r.Comment != nil {
				commentStr = *r.Comment
			}

			items = append(items, feedbackRecord{
				ID:                  r.ID,
				RepositoryID:        r.RepositoryID,
				Sentiment:           sentiment,
				Comment:             commentStr,
				MaintainerRating:    r.MaintainerRating,
				ReviewSpeedRating:   r.ReviewSpeedRating,
				BeginnerRating:      r.BeginnerFriendlyRating,
				VerifiedContributor: r.VerifiedPrAuthor,
				CreatedAt:           r.CreatedAt,
			})
		}

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
