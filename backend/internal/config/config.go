package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

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
	DodopaymentsEnvironment   string // test_mode or live_mode
	DodopaymentsProductPro            string
	DodopaymentsProductProYearly      string
	DodopaymentsProductPack10         string
	DodopaymentsProductAudit          string
	DodopaymentsProductBoost7         string
	DodopaymentsProductRecruiterPass  string
	DodopaymentsProductRecruiterPassYearly string
	DodopaymentsProductMaintainerSLA  string
	// Stripe (Repo Boost — paid featured placement, AC1-AC8).
	StripeSecretKey        string
	StripeWebhookSecret    string
	StripePublishableKey   string
	StripeBaseURL          string
	RepoBoostPriceCents    int64
	RepoBoostWindowDays    int
	RepoBoostMaxActive     int
	RepoBoostDailySpendCap int64
	JobSecret              string
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
	// AC4: server-side CAPTCHA verification (Cloudflare Turnstile-style).
	// When CaptchaSecret is empty the check is disabled (dev/test). A
	// CaptchaTestToken, when set, is always accepted so automated sanity
	// flows can pass without a real provider challenge.
	CaptchaSecret    string
	CaptchaSiteKey   string
	CaptchaVerifyURL string
	CaptchaTestToken string
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
	for _, envPath := range []string{".env", "../.env", "/opt/opendoor/.env"} {
		_ = godotenv.Load(envPath)
	}

	c := &Config{
		ValkeyUsername:            os.Getenv("VALKEY_USERNAME"),  // optional - defaults to "default" if empty
		ValkeyPassword:            os.Getenv("VALKEY_PASSWORD"),  // optional - empty OK for local dev
		LogFile:                   os.Getenv("LOG_FILE"),         // optional - defaults to opendoor.log if empty
		OpencodeAPIKey:            os.Getenv("OPENCODE_API_KEY"), // optional in dev if AI insights disabled
		TelegramBotToken:          os.Getenv("TELEGRAM_BOT_TOKEN"),
		TelegramChatID:            os.Getenv("TELEGRAM_CHAT_ID"),
		DodopaymentsWebhookSecret: os.Getenv("DODOPAYMENTS_WEBHOOK_SECRET"),
		DodopaymentsAPIKey:        os.Getenv("DODOPAYMENTS_API_KEY"), // optional - enables hourly pack-purchase reconcile
		DodopaymentsProductPro:     os.Getenv("DODOPAYMENTS_PRODUCT_PRO"),
		DodopaymentsProductPack10:  os.Getenv("DODOPAYMENTS_PRODUCT_PACK10"),
		DodopaymentsProductAudit:   os.Getenv("DODOPAYMENTS_PRODUCT_AUDIT"),
		DodopaymentsProductBoost7:  os.Getenv("DODOPAYMENTS_PRODUCT_BOOST7"),
		DodopaymentsProductRecruiterPass: os.Getenv("DODOPAYMENTS_PRODUCT_RECRUITER_PASS"),
		DodopaymentsProductMaintainerSLA: os.Getenv("DODOPAYMENTS_PRODUCT_MAINTAINER_SLA"),
		StripeSecretKey:           os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:       os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePublishableKey:      os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		StripeBaseURL:             os.Getenv("STRIPE_BASE_URL"),
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
		CaptchaSecret:             os.Getenv("CAPTCHA_SECRET"),
		CaptchaSiteKey:            os.Getenv("CAPTCHA_SITE_KEY"),
		CaptchaVerifyURL:          os.Getenv("CAPTCHA_VERIFY_URL"),
		CaptchaTestToken:          os.Getenv("CAPTCHA_TEST_TOKEN"),
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

	if c.DodopaymentsProductPro == "" {
		c.DodopaymentsProductPro = "pdt_0Nmb34qDKDQU7BIeRzHUZ"
	}
	if c.DodopaymentsProductProYearly == "" {
		c.DodopaymentsProductProYearly = "pdt_0Nmb34qlI3XGXRYvor2xg"
	}
	if c.DodopaymentsProductPack10 == "" {
		c.DodopaymentsProductPack10 = "pdt_0Nmb34rTrFZuI3Ft8ak0G"
	}
	if c.DodopaymentsProductAudit == "" {
		c.DodopaymentsProductAudit = "pdt_0Nmb34t0HxGR01OBwxwMU"
	}
	if c.DodopaymentsProductBoost7 == "" {
		c.DodopaymentsProductBoost7 = "pdt_0Nmb34tc5ywffZ9vzfQ07"
	}
	if c.DodopaymentsProductRecruiterPass == "" {
		c.DodopaymentsProductRecruiterPass = "pdt_0Nmb34u42gATqhr9H5ssc"
	}
	if c.DodopaymentsProductRecruiterPassYearly == "" {
		c.DodopaymentsProductRecruiterPassYearly = "pdt_0Nmb34ukLPZTUra83X8LP"
	}
	if c.DodopaymentsProductMaintainerSLA == "" {
		c.DodopaymentsProductMaintainerSLA = "pdt_0Nmb34vLLQ8DBLbnrCXY5"
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

	// Repo Boost monetization defaults (AC5/AC8): $9 one-time for 7 days of
	// featured placement, max 3 concurrent active boosts, $30/day spend cap.
	c.StripeBaseURL = strings.TrimRight(c.StripeBaseURL, "/")
	if c.StripeBaseURL == "" {
		c.StripeBaseURL = "https://api.stripe.com"
	}
	c.RepoBoostPriceCents, _ = strconv.ParseInt(os.Getenv("REPO_BOOST_PRICE_CENTS"), 10, 64)
	if c.RepoBoostPriceCents <= 0 {
		c.RepoBoostPriceCents = 900
	}
	c.RepoBoostWindowDays, _ = strconv.Atoi(os.Getenv("REPO_BOOST_WINDOW_DAYS"))
	if c.RepoBoostWindowDays <= 0 {
		c.RepoBoostWindowDays = 7
	}
	c.RepoBoostMaxActive, _ = strconv.Atoi(os.Getenv("REPO_BOOST_MAX_ACTIVE"))
	if c.RepoBoostMaxActive <= 0 {
		c.RepoBoostMaxActive = 3
	}
	c.RepoBoostDailySpendCap, _ = strconv.ParseInt(os.Getenv("REPO_BOOST_DAILY_SPEND_CAP_CENTS"), 10, 64)
	if c.RepoBoostDailySpendCap <= 0 {
		c.RepoBoostDailySpendCap = 3000
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
