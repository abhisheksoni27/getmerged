package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all required runtime configuration.
// Every field must be set in .env — the app will not start otherwise.
type Config struct {
	GithubToken        string
	DatabaseURL        string
	ValkeyURL          string
	ValkeyUsername     string
	ValkeyPassword     string
	InternalAPIKey     string
	GithubClientID     string
	GithubClientSecret string
	JWTSecret          string
	EncryptionKey      string
	OpencodeAPIKey     string
	Port               string
	GinMode            string
	LogFile            string
	TelegramBotToken   string
	TelegramChatID     string
}

// Load reads .env (if present) then validates all required variables are set.
// Fails fast — no defaults, no guessing.
func Load() (*Config, error) {
	_ = godotenv.Load()

	c := &Config{
		ValkeyUsername: os.Getenv("VALKEY_USERNAME"), // optional — defaults to "default" if empty
		ValkeyPassword: os.Getenv("VALKEY_PASSWORD"), // optional — empty OK for local dev
		LogFile:        os.Getenv("LOG_FILE"),        // optional — defaults to opendoor.log if empty
		OpencodeAPIKey: os.Getenv("OPENCODE_API_KEY"), // optional in dev if AI insights disabled
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
		TelegramChatID:   os.Getenv("TELEGRAM_CHAT_ID"),
	}
	if c.LogFile == "" {
		c.LogFile = "opendoor.log"
	}

	required := map[string]*string{
		"GITHUB_TOKEN":         &c.GithubToken,
		"DATABASE_URL":         &c.DatabaseURL,
		"VALKEY_URL":           &c.ValkeyURL,
		"INTERNAL_API_KEY":     &c.InternalAPIKey,
		"GITHUB_CLIENT_ID":     &c.GithubClientID,
		"GITHUB_CLIENT_SECRET": &c.GithubClientSecret,
		"JWT_SECRET":          &c.JWTSecret,
		"ENCRYPTION_KEY":      &c.EncryptionKey,
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
