package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to db", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	targetDate := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	if len(os.Args) > 1 && os.Args[1] != "" {
		targetDate = os.Args[1]
	}

	slog.Info("running morning brief and metric analysis", "target_date", targetDate)

	// 1. Process Nginx Logs for Target Date (Latency profiling, top slow endpoints, bot breakdown)
	summary, err := analytics.ProcessNginxLogs("/var/log/nginx", targetDate)
	if err != nil {
		slog.Error("failed to process nginx logs", "err", err)
		summary = &analytics.PerformanceSummary{TargetDate: targetDate, BotCounts: make(map[string]int)}
	}

	// 2. Query Level 0 Database Metrics for Target Date
	totalRepos := 0
	_ = database.GetContext(ctx, &totalRepos, "SELECT COUNT(*) FROM repositories")

	sRankCount := 0
	_ = database.GetContext(ctx, &sRankCount, "SELECT COUNT(*) FROM latest_snapshots WHERE c_rank_tier = 'S'")

	totalUsers := 0
	_ = database.GetContext(ctx, &totalUsers, "SELECT COUNT(*) FROM users")

	totalReviews := 0
	_ = database.GetContext(ctx, &totalReviews, "SELECT COUNT(*) FROM contributor_feedback")

	// 3. Record all L0 and Performance metrics into daily_metrics table
	_ = analytics.RecordDailyMetric(ctx, database, "crawlers", "googlebot_requests", float64(summary.GooglebotHits), targetDate, "counter", "")
	_ = analytics.RecordDailyMetric(ctx, database, "traffic", "total_requests", float64(summary.TotalRequests), targetDate, "counter", "")
	_ = analytics.RecordDailyMetric(ctx, database, "traffic", "unique_visitors", float64(summary.UniqueIPs), targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "performance", "api_avg_latency_ms", summary.APILatency.AvgMs, targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "performance", "api_p95_latency_ms", summary.APILatency.P95Ms, targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "performance", "page_avg_latency_ms", summary.PageLatency.AvgMs, targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "performance", "page_p95_latency_ms", summary.PageLatency.P95Ms, targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "platform", "total_repositories", float64(totalRepos), targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "platform", "s_rank_repos", float64(sRankCount), targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "platform", "total_users", float64(totalUsers), targetDate, "gauge", "")
	_ = analytics.RecordDailyMetric(ctx, database, "platform", "contributor_reviews", float64(totalReviews), targetDate, "gauge", "")

	// 4. Run Statistical Anomaly Detection (10-Day Moving Average + StdDev Variance)
	anomalies := make([]string, 0)

	metricsToAudit := []struct {
		Category string
		Stat     string
		Val      float64
	}{
		{"crawlers", "googlebot_requests", float64(summary.GooglebotHits)},
		{"traffic", "total_requests", float64(summary.TotalRequests)},
		{"traffic", "unique_visitors", float64(summary.UniqueIPs)},
		{"performance", "api_avg_latency_ms", summary.APILatency.AvgMs},
		{"performance", "page_avg_latency_ms", summary.PageLatency.AvgMs},
		{"platform", "total_repositories", float64(totalRepos)},
		{"platform", "s_rank_repos", float64(sRankCount)},
	}

	for _, m := range metricsToAudit {
		if m.Val == 0 && (m.Category == "performance" || m.Category == "crawlers") {
			continue
		}
		report, err := analytics.AnalyzeMetricAnomaly(ctx, database, m.Category, m.Stat, targetDate, m.Val)
		if err == nil && report != nil && report.IsAnomaly {
			anomalies = append(anomalies, report.FormattedAlert)
		}
	}

	// 5. Compose Morning Brief Telegram Message
	briefMsg := analytics.FormatMorningPulseTelegram(summary, totalRepos, sRankCount, totalUsers, totalReviews, anomalies)

	fmt.Println(briefMsg)

	// 6. Send to Telegram
	notifier := notification.NewTelegramNotifier(cfg.TelegramBotToken, cfg.TelegramChatID)
	if notifier.IsConfigured() {
		if err := notifier.SendTextMessage(ctx, briefMsg); err != nil {
			slog.Error("failed to send telegram morning brief", "err", err)
		} else {
			slog.Info("telegram morning brief sent successfully")
		}
	} else {
		slog.Warn("telegram notifier not configured in .env")
	}
}
