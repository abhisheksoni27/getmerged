package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/spotlight"
)

func main() {
	var (
		targetDate = flag.String("date", time.Now().Format("2006-01-02"), "Date for spotlight (YYYY-MM-DD)")
		bulkCount  = flag.Int("bulk", 0, "Generate N tweets in bulk (e.g. 10, 100, 1000)")
		format     = flag.String("format", "text", "Output format: text, json, csv")
		sendTG     = flag.Bool("send-telegram", false, "Send spotlight directly to Telegram")
	)
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	tgToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	tgChat := os.Getenv("TELEGRAM_CHAT_ID")

	cfg, err := config.Load()
	if err == nil {
		if dbURL == "" {
			dbURL = cfg.DatabaseURL
		}
		if tgToken == "" {
			tgToken = cfg.TelegramBotToken
		}
		if tgChat == "" {
			tgChat = cfg.TelegramChatID
		}
	}

	if dbURL == "" {
		candidates := []string{"/opt/opendoor/opendoor.db", "/data/apps/opendoor/opendoor.db", "./opendoor.db"}
		for _, c := range candidates {
			if _, statErr := os.Stat(c); statErr == nil {
				dbURL = c
				break
			}
		}
	}

	if dbURL == "" {
		slog.Error("DATABASE_URL is not set and no default database found")
		os.Exit(1)
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		slog.Error("failed to connect to db", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Bulk mode for Buffer / Typefully batch scheduling
	if *bulkCount > 0 {
		spots, err := spotlight.GenerateBulkSpotlights(ctx, database, *bulkCount)
		if err != nil {
			slog.Error("failed to generate bulk spotlights", "err", err)
			os.Exit(1)
		}

		switch *format {
		case "json":
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			_ = enc.Encode(spots)
		case "csv":
			w := csv.NewWriter(os.Stdout)
			_ = w.Write([]string{"Repository", "Language", "Stars", "Tier", "TweetText", "IntentURL"})
			for _, s := range spots {
				_ = w.Write([]string{
					s.FullName,
					s.Language,
					fmt.Sprintf("%d", s.Stars),
					s.CRankTier,
					s.TweetText,
					s.IntentURL,
				})
			}
			w.Flush()
		default:
			for i, s := range spots {
				fmt.Printf("=== Tweet #%d: %s ===\n", i+1, s.FullName)
				fmt.Println(s.TweetText)
				fmt.Printf("👉 Post: %s\n\n", s.IntentURL)
			}
		}
		return
	}

	// Single daily spotlight mode
	spot, err := spotlight.GetOrCreateDailySpotlight(ctx, database, *targetDate)
	if err != nil {
		slog.Error("failed to get or create daily spotlight", "err", err)
		os.Exit(1)
	}

	switch *format {
	case "json":
		_ = json.NewEncoder(os.Stdout).Encode(spot)
	case "csv":
		w := csv.NewWriter(os.Stdout)
		_ = w.Write([]string{"Repository", "Language", "Stars", "Tier", "TweetText", "IntentURL"})
		_ = w.Write([]string{
			spot.FullName,
			spot.Language,
			fmt.Sprintf("%d", spot.Stars),
			spot.CRankTier,
			spot.TweetText,
			spot.IntentURL,
		})
		w.Flush()
	default:
		fmt.Println("🐦 Daily X (Twitter) Spotlight:")
		fmt.Printf("Repo: %s (%s · Tier %s)\n\n", spot.FullName, spot.Language, spot.CRankTier)
		fmt.Println(spot.TweetText)
		fmt.Printf("\n👉 1-Click Post Link:\n%s\n", spot.IntentURL)
	}

	if *sendTG {
		notifier := notification.NewTelegramNotifier(tgToken, tgChat)
		if notifier.IsConfigured() {
			tgMsg := spotlight.FormatTelegramSpotlightSection(spot)
			if err := notifier.SendTextMessage(ctx, tgMsg); err != nil {
				slog.Error("failed to send telegram alert", "err", err)
			} else {
				slog.Info("spotlight sent to telegram successfully")
			}
		} else {
			slog.Warn("telegram notifier not configured")
		}
	}
}
