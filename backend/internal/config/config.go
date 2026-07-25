package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all required runtime configuration.
// Every field must be set in .env — the app will not start otherwise.
type Config struct {
	GithubToken    string
	DatabaseURL    string
	ValkeyURL      string
	ValkeyPassword string
	InternalAPIKey string
	Port           string
	GinMode        string
	LogFile        string
}

// Load reads .env (if present) then validates all required variables are set.
// Fails fast — no defaults, no guessing.
func Load() (*Config, error) {
	_ = godotenv.Load()

	c := &Config{
		ValkeyPassword: os.Getenv("VALKEY_PASSWORD"), // optional — empty OK for local dev
		LogFile:        os.Getenv("LOG_FILE"),        // optional — defaults to opendoor.log if empty
	}
	if c.LogFile == "" {
		c.LogFile = "opendoor.log"
	}

	required := map[string]*string{
		"GITHUB_TOKEN":     &c.GithubToken,
		"DATABASE_URL":     &c.DatabaseURL,
		"VALKEY_URL":       &c.ValkeyURL,
		"INTERNAL_API_KEY": &c.InternalAPIKey,
		"PORT":             &c.Port,
		"GIN_MODE":         &c.GinMode,
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

	return c, nil
}
