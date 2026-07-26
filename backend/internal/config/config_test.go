package config_test

import (
	"os"
	"strings"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/config"
)

func TestConfigLoad_MissingRequired(t *testing.T) {
	os.Clearenv()
	_, err := config.Load()
	if err == nil {
		t.Fatalf("expected error when required env vars are missing, got nil")
	}
}

func TestConfigLoad_ValidEnv(t *testing.T) {
	os.Clearenv()
	longKey := strings.Repeat("a", 256)

	os.Setenv("GITHUB_TOKEN", "test-token")
	os.Setenv("DATABASE_URL", "sqlite::memory:")
	os.Setenv("VALKEY_URL", "redis://localhost:6379")
	os.Setenv("INTERNAL_API_KEY", longKey)
	os.Setenv("GITHUB_CLIENT_ID", "client-id")
	os.Setenv("GITHUB_CLIENT_SECRET", "client-secret")
	os.Setenv("JWT_SECRET", "this-is-a-very-long-jwt-secret-key-32chars")
	os.Setenv("PORT", "10000")
	os.Setenv("GIN_MODE", "test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected valid config, got error: %v", err)
	}

	if cfg.GithubToken != "test-token" || cfg.Port != "10000" {
		t.Fatalf("unexpected config values: %+v", cfg)
	}
}
