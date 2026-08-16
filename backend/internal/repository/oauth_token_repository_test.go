package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupOAuthTokenTestDB(t *testing.T) (*sqlx.DB, *config.Config) {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate db: %v", err)
	}

	cfg := &config.Config{
		EncryptionKey: "12345678901234567890123456789012",
	}

	return database, cfg
}

func TestOAuthTokenRepository_UpsertAndGet(t *testing.T) {
	database, cfg := setupOAuthTokenTestDB(t)
	defer database.Close()

	repo := repository.NewOAuthTokenRepository(database, cfg)
	ctx := context.Background()

	userID := int64(100)
	provider := "github"
	accessToken := "gho_testaccesstoken12345"
	refreshToken := "ghr_testrefreshtoken67890"
	expires := time.Now().Add(8 * time.Hour).Truncate(time.Second)

	// 1. Insert token
	err := repo.UpsertToken(ctx, userID, provider, accessToken, refreshToken, &expires)
	if err != nil {
		t.Fatalf("UpsertToken failed: %v", err)
	}

	// Verify database record has encrypted ciphertext (v1:...)
	var rawEnc string
	err = database.Get(&rawEnc, "SELECT access_token_enc FROM user_oauth_tokens WHERE user_id = ? AND provider = ?", userID, provider)
	if err != nil {
		t.Fatalf("failed to get raw access_token_enc: %v", err)
	}
	if rawEnc == accessToken {
		t.Fatalf("expected access token to be encrypted in DB, found plaintext")
	}

	// 2. Fetch and decrypt token
	gotAccess, gotRefresh, gotExpires, err := repo.GetToken(ctx, userID, provider)
	if err != nil {
		t.Fatalf("GetToken failed: %v", err)
	}
	if gotAccess != accessToken {
		t.Fatalf("expected access token %q, got %q", accessToken, gotAccess)
	}
	if gotRefresh != refreshToken {
		t.Fatalf("expected refresh token %q, got %q", refreshToken, gotRefresh)
	}
	if gotExpires == nil {
		t.Fatalf("expected non-nil expires_at")
	}

	// 3. Upsert update with new access token
	newAccess := "gho_updatedaccesstoken999"
	err = repo.UpsertToken(ctx, userID, provider, newAccess, refreshToken, &expires)
	if err != nil {
		t.Fatalf("second UpsertToken failed: %v", err)
	}

	gotAccessUpdated, _, _, err := repo.GetToken(ctx, userID, provider)
	if err != nil {
		t.Fatalf("GetToken after update failed: %v", err)
	}
	if gotAccessUpdated != newAccess {
		t.Fatalf("expected updated access token %q, got %q", newAccess, gotAccessUpdated)
	}
}
