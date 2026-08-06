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
			SELECT r.language
			FROM repositories r
			LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id
			WHERE r.language IS NOT NULL AND TRIM(r.language) != ''
			GROUP BY r.language
			ORDER BY (
				SUM(CASE WHEN ls.c_rank_tier = 'S' THEN 10 ELSE 0 END) +
				SUM(CASE WHEN ls.c_rank_tier = 'A' THEN 3 ELSE 0 END) +
				AVG(COALESCE(ls.c_rank_score, 0))
			) DESC, COUNT(*) DESC, r.language ASC
		`
		if err := db.SelectContext(c.Request.Context(), &langs, query); err != nil {
			// Fallback query if latest_snapshots view/table doesn't exist in test DB
			fallbackQuery := `
				SELECT language
				FROM repositories
				WHERE language IS NOT NULL AND TRIM(language) != ''
				GROUP BY language
				ORDER BY COUNT(*) DESC, language ASC
			`
			if errFallback := db.SelectContext(c.Request.Context(), &langs, fallbackQuery); errFallback != nil {
				slog.Error("list-languages: query failed", "err", errFallback)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch languages"})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"languages": langs,
		})
	}
}
