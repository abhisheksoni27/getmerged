package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
)

// EncryptAESGCM encrypts plaintext using AES-256-GCM authenticated encryption.
// The key must be 32 bytes (256 bits). Generates a unique 12-byte nonce per call.
func EncryptAESGCM(plaintext, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("encryption key must be exactly 32 bytes (AES-256)")
	}
	if len(plaintext) == 0 {
		return "", nil
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("aes cipher error: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm cipher error: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation error: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return "v1:" + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAESGCM decrypts a v1:<base64> or legacy <base64> AES-256-GCM ciphertext string.
func DecryptAESGCM(cryptoText string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("encryption key must be exactly 32 bytes (AES-256)")
	}
	if cryptoText == "" {
		return "", nil
	}

	payload := cryptoText
	if strings.HasPrefix(cryptoText, "v1:") {
		payload = strings.TrimPrefix(cryptoText, "v1:")
	}

	data, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", fmt.Errorf("base64 decode error: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("aes cipher error: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm cipher error: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("gcm decryption error: %w", err)
	}

	return string(plaintext), nil
}

// HashSHA256 computes deterministic HMAC-SHA256 hex string for blind indexing PII fields.
func HashSHA256(data string, salt []byte) string {
	if data == "" {
		return ""
	}
	h := hmac.New(sha256.New, salt)
	h.Write([]byte(strings.ToLower(strings.TrimSpace(data))))
	return hex.EncodeToString(h.Sum(nil))
}
