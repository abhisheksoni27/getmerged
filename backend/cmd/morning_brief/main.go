package main

import (
	"bufio"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
)

type NginxLogEntry struct {
	Time            string  `json:"time"`
	Status          int     `json:"status"`
	Method          string  `json:"method"`
	URI             string  `json:"uri"`
	RequestTime     float64 `json:"request_time"`
	Bytes           int64   `json:"bytes"`
	UserAgent       string  `json:"ua"`
	CFConnectingIP  string  `json:"cf_connecting_ip"`
	CFIpCountry     string  `json:"cf_ipcountry"`
}

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

	// 1. Process Nginx Logs for Target Date
	googlebotCount, totalRequests, uniqueIPs, status200, status4xx, status5xx := parseNginxLogsForDate("/var/log/nginx", targetDate)

	// 2. Query Level 0 Database Metrics for Target Date
	totalRepos := 0
	_ = database.GetContext(ctx, &totalRepos, "SELECT COUNT(*) FROM repositories")

	sRankCount := 0
	_ = database.GetContext(ctx, &sRankCount, "SELECT COUNT(*) FROM latest_snapshots WHERE c_rank_tier = 'S'")

	totalUsers := 0
	_ = database.GetContext(ctx, &totalUsers, "SELECT COUNT(*) FROM users")

	totalReviews := 0
	_ = database.GetContext(ctx, &totalReviews, "SELECT COUNT(*) FROM contributor_feedback")

	// 3. Record all L0 metrics into daily_metrics table
	_ = analytics.RecordDailyMetric(ctx, database, "crawlers", "googlebot_requests", float64(googlebotCount), targetDate, "counter", "")
	_ = analytics.RecordDailyMetric(ctx, database, "traffic", "total_requests", float64(totalRequests), targetDate, "counter", "")
	_ = analytics.RecordDailyMetric(ctx, database, "traffic", "unique_visitors", float64(uniqueIPs), targetDate, "gauge", "")
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
		{"crawlers", "googlebot_requests", float64(googlebotCount)},
		{"traffic", "total_requests", float64(totalRequests)},
		{"traffic", "unique_visitors", float64(uniqueIPs)},
		{"platform", "total_repositories", float64(totalRepos)},
		{"platform", "s_rank_repos", float64(sRankCount)},
	}

	for _, m := range metricsToAudit {
		report, err := analytics.AnalyzeMetricAnomaly(ctx, database, m.Category, m.Stat, targetDate, m.Val)
		if err == nil && report != nil && report.IsAnomaly {
			anomalies = append(anomalies, report.FormattedAlert)
		}
	}

	// 5. Compose Morning Brief Telegram Message
	briefMsg := formatTelegramBrief(targetDate, googlebotCount, totalRequests, uniqueIPs, status200, status4xx, status5xx, totalRepos, sRankCount, totalUsers, totalReviews, anomalies)

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

func parseNginxLogsForDate(logDir string, targetDate string) (googlebot int, totalReq int, uniqueIPs int, s200 int, s4xx int, s5xx int) {
	files, err := filepath.Glob(filepath.Join(logDir, "access.log*"))
	if err != nil {
		return
	}

	ipMap := make(map[string]bool)

	for _, file := range files {
		f, err := os.Open(file)
		if err != nil {
			continue
		}

		var scanner *bufio.Scanner
		if strings.HasSuffix(file, ".gz") {
			gz, err := gzip.NewReader(f)
			if err != nil {
				f.Close()
				continue
			}
			scanner = bufio.NewScanner(gz)
		} else {
			scanner = bufio.NewScanner(f)
		}

		// Buffer up to 1MB lines
		buf := make([]byte, 1024*1024)
		scanner.Buffer(buf, 1024*1024)

		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "{") {
				continue
			}

			var entry NginxLogEntry
			if err := json.Unmarshal([]byte(line), &entry); err != nil {
				continue
			}

			if len(entry.Time) >= 10 && entry.Time[:10] == targetDate {
				// Exclude internal Next.js SSR loopback and healthchecks
				if entry.CFConnectingIP == "80.225.224.144" || entry.CFConnectingIP == "127.0.0.1" || entry.UserAgent == "node" || entry.UserAgent == "Next.js Middleware" || strings.Contains(entry.UserAgent, "Go-http-client") {
					continue
				}

				totalReq++

				if entry.CFConnectingIP != "" {
					ipMap[entry.CFConnectingIP] = true
				}

				uaLower := strings.ToLower(entry.UserAgent)
				if strings.Contains(uaLower, "googlebot") {
					googlebot++
				}

				if entry.Status >= 200 && entry.Status < 300 {
					s200++
				} else if entry.Status >= 400 && entry.Status < 500 {
					s4xx++
				} else if entry.Status >= 500 {
					s5xx++
				}
			}
		}
		f.Close()
	}

	uniqueIPs = len(ipMap)
	return
}

func formatTelegramBrief(date string, googlebot, totalReq, uniqueIPs, s200, s4xx, s5xx, totalRepos, sRankCount, users, reviews int, anomalies []string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("🌅 *GetMerged Morning Pulse — %s*\n\n", date))

	sb.WriteString("🔍 *SEO & Search Engine Indexing:*\n")
	sb.WriteString(fmt.Sprintf("• *Googlebot Hits:* `%d requests`\n", googlebot))
	sb.WriteString(fmt.Sprintf("• *Total Traffic:* `%d requests` (%d unique IPs)\n", totalReq, uniqueIPs))
	sb.WriteString(fmt.Sprintf("• *Status Health:* %d OK (2xx) · %d (4xx) · %d (5xx)\n\n", s200, s4xx, s5xx))

	sb.WriteString("📊 *Level 0 Platform Telemetry:*\n")
	sb.WriteString(fmt.Sprintf("• *Indexed Repos:* `%d` codebases\n", totalRepos))
	sb.WriteString(fmt.Sprintf("• *S-Tier Open Doors:* `%d` elite repos\n", sRankCount))
	sb.WriteString(fmt.Sprintf("• *Registered Users:* `%d` accounts\n", users))
	sb.WriteString(fmt.Sprintf("• *Contributor Reviews:* `%d` ratings\n\n", reviews))

	if len(anomalies) > 0 {
		sb.WriteString("⚠️ *Statistical Anomalies Detected (10d DMA):*\n")
		for _, a := range anomalies {
			sb.WriteString(fmt.Sprintf("• %s\n", a))
		}
	} else {
		sb.WriteString("✅ *System Status:* All Level 0 metrics within 10-day normal variance.")
	}

	return sb.String()
}
