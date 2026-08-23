package handler

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type LanguageTrend struct {
	Language    string   `json:"language"`
	RepoCount   int      `json:"repo_count"`
	ScoreStart  *float64 `json:"score_start"`
	ScoreEnd    *float64 `json:"score_end"`
	ScoreChange *float64 `json:"score_change"`
}

type snapshotRow struct {
	Language string  `db:"language"`
	Date     string  `db:"snapshot_date"`
	Score    float64 `db:"c_rank_score"`
}

// GetLanguageTrends handles GET /api/v1/languages/trends?weeks=4
// Compares average C-Rank score per language between the first and last
// week of the window, returning movers sorted by biggest gain first.
func GetLanguageTrends(database *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		weeks := 4
		if wStr := c.Query("weeks"); wStr != "" {
			if w, err := strconv.Atoi(wStr); err == nil && w > 0 && w <= 52 {
				weeks = w
			}
		}
		windowDays := weeks * 7

		var maxDate string
		if err := database.GetContext(c.Request.Context(), &maxDate,
			"SELECT COALESCE(MAX(snapshot_date), DATE('now')) FROM daily_snapshots"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute language trends"})
			return
		}

		windowStart := dateShift(maxDate, -(windowDays - 1))
		endWeekStart := dateShift(maxDate, -6)

		rows := []snapshotRow{}
		err := database.SelectContext(c.Request.Context(), &rows, `
			SELECT r.language AS language, s.snapshot_date AS snapshot_date, s.c_rank_score AS c_rank_score
			FROM daily_snapshots s
			JOIN repositories r ON r.id = s.repository_id
			WHERE s.c_rank_score > 0 AND (
			  s.snapshot_date >= ? AND s.snapshot_date = (
			      SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2
			      WHERE s2.repository_id = s.repository_id AND s2.snapshot_date >= ?)
			  OR s.snapshot_date < ? AND s.snapshot_date = (
			      SELECT MIN(s3.snapshot_date) FROM daily_snapshots s3
			      WHERE s3.repository_id = s.repository_id)
			)`, windowStart, windowStart, endWeekStart)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute language trends"})
			return
		}

		startSums := map[string]*agg{}
		endSums := map[string]*agg{}
		for _, row := range rows {
			if row.Date >= endWeekStart {
				addTo(endSums, row.Language, row.Score)
			} else {
				addTo(startSums, row.Language, row.Score)
			}
		}

		trends := []LanguageTrend{}
		for lang, e := range endSums {
			endAvg := e.avg()
			trend := LanguageTrend{
				Language:   lang,
				RepoCount:  e.repos,
				ScoreEnd:   &endAvg,
				ScoreStart: nil,
			}
			if s := startSums[lang]; s != nil && s.count > 0 {
				startAvg := s.avg()
				change := endAvg - startAvg
				trend.ScoreStart = &startAvg
				trend.ScoreChange = &change
			}
			trends = append(trends, trend)
		}

		sort.Slice(trends, func(i, j int) bool { return trendChange(trends[i]) > trendChange(trends[j]) })

		c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400")
		c.JSON(http.StatusOK, gin.H{"weeks": weeks, "trends": trends})
	}
}

type agg struct {
	sum   float64
	count int
	repos int
}

func (a *agg) avg() float64 {
	if a.count == 0 {
		return 0
	}
	return a.sum / float64(a.count)
}

func addTo(m map[string]*agg, lang string, score float64) {
	a := m[lang]
	if a == nil {
		a = &agg{}
		m[lang] = a
	}
	a.sum += score
	a.count++
	a.repos++
}

func trendChange(lt LanguageTrend) float64 {
	if lt.ScoreChange == nil {
		return -1e18 // no baseline -> sink to bottom
	}
	return *lt.ScoreChange
}

func dateShift(date string, days int) string {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return date
	}
	return t.AddDate(0, 0, days).Format("2006-01-02")
}
