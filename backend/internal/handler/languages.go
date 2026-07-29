package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// ListLanguages handles GET /api/v1/languages
// Returns a distinct list of programming languages available in the indexed repositories dataset,
// ordered by repository count descending.
func ListLanguages(database *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database
		if db == nil {
			db = middleware.MustDB(c)
		}
		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database unavailable"})
			return
		}

		var langs []string
		query := `
			SELECT language
			FROM repositories
			WHERE language IS NOT NULL AND TRIM(language) != ''
			GROUP BY language
			ORDER BY COUNT(*) DESC, language ASC
		`
		if err := db.SelectContext(c.Request.Context(), &langs, query); err != nil {
			slog.Error("list-languages: query failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch languages"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"languages": langs,
		})
	}
}
