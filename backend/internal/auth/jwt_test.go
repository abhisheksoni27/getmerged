package auth_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/auth"
)

func TestJWTGenerationAndParsing(t *testing.T) {
	secret := "super-secret-key-that-is-at-least-32-chars-long!"
	userID := int64(42)
	username := "octocat"

	tokenStr, err := auth.GenerateToken(userID, username, secret)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	claims, err := auth.ParseToken(tokenStr, secret)
	if err != nil {
		t.Fatalf("failed to parse token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("expected userID %d, got %d", userID, claims.UserID)
	}
	if claims.Username != username {
		t.Errorf("expected username %q, got %q", username, claims.Username)
	}
}

func TestJWTInvalidSecret(t *testing.T) {
	secret := "super-secret-key-that-is-at-least-32-chars-long!"
	wrongSecret := "wrong-secret-key-that-is-also-at-least-32-chars!"

	tokenStr, err := auth.GenerateToken(1, "user", secret)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	_, err = auth.ParseToken(tokenStr, wrongSecret)
	if err == nil {
		t.Fatal("expected error parsing token with wrong secret, got nil")
	}
}
