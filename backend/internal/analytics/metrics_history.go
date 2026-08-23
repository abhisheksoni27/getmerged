package analytics

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jmoiron/sqlx"
)

// MetricSnapshot represents a recorded metric point in daily_metrics.
type MetricSnapshot struct {
	ID        int64     `db:"id"`
	Category  string    `db:"category"`
	StatName  string    `db:"stat_name"`
	StatValue float64   `db:"stat_value"`
	StatDate  string    `db:"stat_date"`
	StatType  string    `db:"stat_type"`
	Metadata  string    `db:"metadata"`
	CreatedAt time.Time `db:"created_at"`
}

// AnomalyReport highlights significant deviations compared to historical moving averages.
type AnomalyReport struct {
	Category       string  `json:"category"`
	StatName       string  `json:"stat_name"`
	LatestValue    float64 `json:"latest_value"`
	Mean10Day      float64 `json:"mean_10_day"`
	StdDev10Day    float64 `json:"std_dev_10_day"`
	ZScore         float64 `json:"z_score"`
	PercentChange  float64 `json:"percent_change"`
	IsAnomaly      bool    `json:"is_anomaly"`
	AnomalyType    string  `json:"anomaly_type"` // "SPIKE", "DROP", "NORMAL"
	FormattedAlert string  `json:"formatted_alert"`
}

// RecordDailyMetric inserts or updates a metric for a specific date.
func RecordDailyMetric(ctx context.Context, db *sqlx.DB, category, statName string, value float64, date string, statType, metadata string) error {
	query := `
		INSERT INTO daily_metrics (category, stat_name, stat_value, stat_date, stat_type, metadata, created_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value), stat_type = VALUES(stat_type), metadata = VALUES(metadata)
	`
	// Fallback for SQLite in local tests
	if db.DriverName() == "sqlite" {
		query = `
			INSERT INTO daily_metrics (category, stat_name, stat_value, stat_date, stat_type, metadata, created_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(category, stat_name, stat_date) DO UPDATE SET
				stat_value = excluded.stat_value,
				stat_type = excluded.stat_type,
				metadata = excluded.metadata
		`
	}
	_, err := db.ExecContext(ctx, query, category, statName, value, date, statType, metadata)
	return err
}

// Get10DayStats calculates 10-day moving average and standard deviation for anomaly detection.
func AnalyzeMetricAnomaly(ctx context.Context, db *sqlx.DB, category, statName, date string, latestVal float64) (*AnomalyReport, error) {
	var historicalVals []float64
	query := `
		SELECT stat_value 
		FROM daily_metrics 
		WHERE category = ? AND stat_name = ? AND stat_date < ? 
		ORDER BY stat_date DESC 
		LIMIT 10
	`
	err := db.SelectContext(ctx, &historicalVals, query, category, statName, date)
	if err != nil {
		return nil, err
	}

	report := &AnomalyReport{
		Category:    category,
		StatName:    statName,
		LatestValue: latestVal,
		IsAnomaly:   false,
		AnomalyType: "NORMAL",
	}

	n := len(historicalVals)
	if n < 3 {
		// Not enough history for statistical significance, report baseline
		return report, nil
	}

	// Calculate Mean
	var sum float64
	for _, v := range historicalVals {
		sum += v
	}
	mean := sum / float64(n)
	report.Mean10Day = mean

	// Calculate Variance and StdDev
	var sumSquares float64
	for _, v := range historicalVals {
		sumSquares += math.Pow(v-mean, 2)
	}
	variance := sumSquares / float64(n)
	stdDev := math.Sqrt(variance)
	report.StdDev10Day = stdDev

	if mean > 0 {
		report.PercentChange = ((latestVal - mean) / mean) * 100.0
	}

	if stdDev > 0 {
		z := (latestVal - mean) / stdDev
		report.ZScore = z

		// Flag anomaly if |Z| >= 2.0 (95% confidence interval breach)
		if z >= 2.0 {
			report.IsAnomaly = true
			report.AnomalyType = "SPIKE"
			report.FormattedAlert = fmt.Sprintf("🚨 *%s (%s)*: +%.1f%% spike vs 10d DMA (Val: %.0f, Avg: %.1f, Z: +%.2f)", statName, category, report.PercentChange, latestVal, mean, z)
		} else if z <= -2.0 {
			report.IsAnomaly = true
			report.AnomalyType = "DROP"
			report.FormattedAlert = fmt.Sprintf("⚠️ *%s (%s)*: %.1f%% drop vs 10d DMA (Val: %.0f, Avg: %.1f, Z: %.2f)", statName, category, report.PercentChange, latestVal, mean, z)
		}
	}

	return report, nil
}
