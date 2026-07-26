package crypto_test

import (
	"crypto/rand"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
)

func TestAESGCM_EncryptDecrypt(t *testing.T) {
	key := make([]byte, 32)
	_, _ = rand.Read(key)

	originalEmail := "developer@opendoor.dev"
	encrypted, err := crypto.EncryptAESGCM([]byte(originalEmail), key)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	if encrypted == originalEmail {
		t.Fatalf("encrypted string matches original plaintext")
	}

	decrypted, err := crypto.DecryptAESGCM(encrypted, key)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if decrypted != originalEmail {
		t.Fatalf("expected decrypted string %s, got %s", originalEmail, decrypted)
	}
}

func TestAESGCM_InvalidKeyLength(t *testing.T) {
	shortKey := []byte("short-key")
	_, err := crypto.EncryptAESGCM([]byte("test"), shortKey)
	if err == nil {
		t.Fatalf("expected error for key length != 32 bytes")
	}
}
