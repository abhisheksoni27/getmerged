package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all required runtime configuration.
// Every field must be set in .env - the app will not start otherwise.
type Config struct {
	GithubToken               string
	DatabaseURL               string
	ValkeyURL                 string
	ValkeyUsername            string
	ValkeyPassword            string
	InternalAPIKey            string
	GithubClientID            string
	GithubClientSecret        string
	GoogleClientID            string
	GoogleClientSecret        string
	JWTSecret                 string
	EncryptionKey             string
	OpencodeAPIKey            string
	Port                      string
	GinMode                   string
	LogFile                   string
	LogLevel                  string
	TelegramBotToken          string
	TelegramChatID            string
	DodopaymentsWebhookSecret string
	DodopaymentsAPIKey        string
	JobSecret                 string
	SMTPHost                  string
	SMTPPort                  string
	SMTPUser                  string
	SMTPPassword              string
	SMTPFrom                  string
	SMTPPhysicalAddress       string
	AdminEmail                string
	AppBaseURL                string
	// AC7: purpose-scoped HMAC keys for GFI email tokens. The *_OLD vars
	// enable rotation: during the dual-key window both old and new verify.
	EmailTokenKey     string
	EmailTokenKeyOld  string
	UnsubscribeKey    string
	UnsubscribeKeyOld string
	GithubAppID                string
	GithubAppPrivateKey        string
	GithubAppWebhookSecret     string
	GithubAppDailyCommentBudget int
	DiscoveryIntervalMinutes  int
	DiscoveryMaxNewPerRun     int
	SnapshotRetentionDays     int
	CrawlerWorkers            int
	AlertDropThreshold        float64
}

// Load reads .env (if present) then validates all required variables are set.
// Fails fast - no defaults, no guessing.
func Load() (*Config, error) {
	_ = godotenv.Load()

	c := &Config{
		ValkeyUsername:            os.Getenv("VALKEY_USERNAME"),  // optional - defaults to "default" if empty
		ValkeyPassword:            os.Getenv("VALKEY_PASSWORD"),  // optional - empty OK for local dev
		LogFile:                   os.Getenv("LOG_FILE"),         // optional - defaults to opendoor.log if empty
		OpencodeAPIKey:            os.Getenv("OPENCODE_API_KEY"), // optional in dev if AI insights disabled
		TelegramBotToken:          os.Getenv("TELEGRAM_BOT_TOKEN"),
		TelegramChatID:            os.Getenv("TELEGRAM_CHAT_ID"),
		DodopaymentsWebhookSecret: os.Getenv("DODOPAYMENTS_WEBHOOK_SECRET"),
		DodopaymentsAPIKey:        os.Getenv("DODOPAYMENTS_API_KEY"), // optional - enables hourly pack-purchase reconcile
		GoogleClientID:            os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:        os.Getenv("GOOGLE_CLIENT_SECRET"),
		JobSecret:                 os.Getenv("JOB_SECRET"),
		SMTPHost:                  os.Getenv("SMTP_HOST"),
		SMTPPort:                  os.Getenv("SMTP_PORT"),
		SMTPUser:                  os.Getenv("SMTP_USER"),
		SMTPPassword:              os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:                  os.Getenv("SMTP_FROM"),
		SMTPPhysicalAddress:       os.Getenv("SMTP_PHYSICAL_ADDRESS"),
		AdminEmail:                os.Getenv("ADMIN_EMAIL"),
		AppBaseURL:                os.Getenv("APP_BASE_URL"),
		EmailTokenKey:             os.Getenv("EMAIL_TOKEN_HMAC_KEY"),
		EmailTokenKeyOld:          os.Getenv("EMAIL_TOKEN_HMAC_KEY_OLD"),
		UnsubscribeKey:            os.Getenv("UNSUBSCRIBE_HMAC_KEY"),
		UnsubscribeKeyOld:         os.Getenv("UNSUBSCRIBE_HMAC_KEY_OLD"),
		GithubAppID:               os.Getenv("GITHUB_APP_ID"),
		GithubAppPrivateKey:       os.Getenv("GITHUB_APP_PRIVATE_KEY"),
		GithubAppWebhookSecret:    os.Getenv("GITHUB_APP_WEBHOOK_SECRET"),
	}
	if c.LogFile == "" {
		c.LogFile = "opendoor.log"
	}
	c.GithubAppDailyCommentBudget, _ = strconv.Atoi(os.Getenv("GITHUB_APP_DAILY_COMMENT_BUDGET"))
	if c.GithubAppDailyCommentBudget <= 0 {
		c.GithubAppDailyCommentBudget = 50
	}
	if c.SMTPHost != "" && c.SMTPPort == "" {
		c.SMTPPort = "587"
	}
	if c.AppBaseURL == "" {
		c.AppBaseURL = "https://getmerged.abhishekco.de"
	}
	if c.EmailTokenKey == "" {
		c.EmailTokenKey = c.JobSecret
	}
	if c.UnsubscribeKey == "" {
		c.UnsubscribeKey = c.JobSecret
	}

	// Optional crawler tuning knobs. Falls back to conservative defaults
	// so the app still boots when the vars are not present.
	c.LogLevel = os.Getenv("LOG_LEVEL")
	if c.LogLevel == "" {
		c.LogLevel = "info"
	}

	c.DiscoveryIntervalMinutes, _ = strconv.Atoi(os.Getenv("DISCOVERY_INTERVAL_MINUTES"))
	if c.DiscoveryIntervalMinutes <= 0 {
		c.DiscoveryIntervalMinutes = 15
	}

	c.DiscoveryMaxNewPerRun, _ = strconv.Atoi(os.Getenv("DISCOVERY_MAX_NEW_PER_RUN"))
	if c.DiscoveryMaxNewPerRun <= 0 {
		c.DiscoveryMaxNewPerRun = 10
	}

	c.SnapshotRetentionDays, _ = strconv.Atoi(os.Getenv("SNAPSHOT_RETENTION_DAYS"))
	if c.SnapshotRetentionDays <= 0 {
		c.SnapshotRetentionDays = 90
	}

	c.CrawlerWorkers, _ = strconv.Atoi(os.Getenv("CRAWLER_WORKERS"))
	if c.CrawlerWorkers <= 0 {
		c.CrawlerWorkers = 10
	}

	// C-Rank watchlist alert tuning (AC3): single global env knob for the
	// alert policy — no per-user config. ALERT_TIER_DELTA is the ±score
	// delta in points that triggers an alert (default 5); any tier change
	// alerts regardless of delta. ALERT_DROP_THRESHOLD remains accepted as
	// a legacy alias.
	c.AlertDropThreshold, _ = strconv.ParseFloat(os.Getenv("ALERT_TIER_DELTA"), 64)
	if c.AlertDropThreshold <= 0 {
		c.AlertDropThreshold, _ = strconv.ParseFloat(os.Getenv("ALERT_DROP_THRESHOLD"), 64)
	}
	if c.AlertDropThreshold <= 0 {
		c.AlertDropThreshold = 5
	}

	required := map[string]*string{
		"GITHUB_TOKEN":         &c.GithubToken,
		"DATABASE_URL":         &c.DatabaseURL,
		"VALKEY_URL":           &c.ValkeyURL,
		"INTERNAL_API_KEY":     &c.InternalAPIKey,
		"GITHUB_CLIENT_ID":     &c.GithubClientID,
		"GITHUB_CLIENT_SECRET": &c.GithubClientSecret,
		"JWT_SECRET":           &c.JWTSecret,
		"ENCRYPTION_KEY":       &c.EncryptionKey,
		"PORT":                 &c.Port,
		"GIN_MODE":             &c.GinMode,
	}

	for key, dest := range required {
		val := os.Getenv(key)
		if val == "" {
			return nil, fmt.Errorf("required env var %q is not set", key)
		}
		*dest = val
	}

	if len(c.InternalAPIKey) < 256 {
		return nil, fmt.Errorf("INTERNAL_API_KEY must be at least 256 characters (generate with: openssl rand -base64 192)")
	}

	if len(c.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}

	return c, nil
}

// EmailTokenKeys returns the verify-token key chain (AC7): primary first,
// then the rotation old key while the dual-key window is open. Falls back to
// JobSecret when no purpose-scoped key is configured.
func (c *Config) EmailTokenKeys() []string {
	keys := []string{c.EmailTokenKey}
	if c.EmailTokenKeyOld != "" && c.EmailTokenKeyOld != c.EmailTokenKey {
		keys = append(keys, c.EmailTokenKeyOld)
	}
	if c.EmailTokenKey == c.JobSecret {
		return keys
	}
	return append(keys, c.JobSecret)
}

// UnsubscribeKeys returns the unsubscribe-token key chain (AC7), same
// rotation semantics as EmailTokenKeys.
func (c *Config) UnsubscribeKeys() []string {
	keys := []string{c.UnsubscribeKey}
	if c.UnsubscribeKeyOld != "" && c.UnsubscribeKeyOld != c.UnsubscribeKey {
		keys = append(keys, c.UnsubscribeKeyOld)
	}
	if c.UnsubscribeKey == c.JobSecret {
		return keys
	}
	return append(keys, c.JobSecret)
}
