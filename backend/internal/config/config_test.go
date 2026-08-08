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
	os.Setenv("ENCRYPTION_KEY", "12345678901234567890123456789012")
	os.Setenv("PORT", "10000")
	os.Setenv("GIN_MODE", "test")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected valid config, got error: %v", err)
	}

	if cfg.GithubToken != "test-token" || cfg.Port != "10000" {
		t.Fatalf("unexpected config values: %+v", cfg)
	}

	if cfg.LogLevel != "info" {
		t.Errorf("expected default LOG_LEVEL 'info', got %q", cfg.LogLevel)
	}
	if cfg.DiscoveryIntervalMinutes != 15 {
		t.Errorf("expected default discovery interval 15, got %d", cfg.DiscoveryIntervalMinutes)
	}
	if cfg.DiscoveryMaxNewPerRun != 10 {
		t.Errorf("expected default discovery max new per run 10, got %d", cfg.DiscoveryMaxNewPerRun)
	}
	if cfg.SnapshotRetentionDays != 90 {
		t.Errorf("expected default snapshot retention 90, got %d", cfg.SnapshotRetentionDays)
	}
}

func TestConfigLoad_OptionalTuningEnv(t *testing.T) {
	os.Clearenv()
	longKey := strings.Repeat("b", 256)

	os.Setenv("GITHUB_TOKEN", "test-token")
	os.Setenv("DATABASE_URL", "sqlite::memory:")
	os.Setenv("VALKEY_URL", "redis://localhost:6379")
	os.Setenv("INTERNAL_API_KEY", longKey)
	os.Setenv("GITHUB_CLIENT_ID", "client-id")
	os.Setenv("GITHUB_CLIENT_SECRET", "client-secret")
	os.Setenv("JWT_SECRET", "this-is-a-very-long-jwt-secret-key-32chars")
	os.Setenv("ENCRYPTION_KEY", "12345678901234567890123456789012")
	os.Setenv("PORT", "10000")
	os.Setenv("GIN_MODE", "test")

	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("DISCOVERY_INTERVAL_MINUTES", "30")
	os.Setenv("DISCOVERY_MAX_NEW_PER_RUN", "5")
	os.Setenv("SNAPSHOT_RETENTION_DAYS", "30")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected valid config, got error: %v", err)
	}

	if cfg.LogLevel != "debug" {
		t.Errorf("expected LOG_LEVEL 'debug', got %q", cfg.LogLevel)
	}
	if cfg.DiscoveryIntervalMinutes != 30 {
		t.Errorf("expected discovery interval 30, got %d", cfg.DiscoveryIntervalMinutes)
	}
	if cfg.DiscoveryMaxNewPerRun != 5 {
		t.Errorf("expected discovery max new per run 5, got %d", cfg.DiscoveryMaxNewPerRun)
	}
	if cfg.SnapshotRetentionDays != 30 {
		t.Errorf("expected snapshot retention 30, got %d", cfg.SnapshotRetentionDays)
	}
}
