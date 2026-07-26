package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
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
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAESGCM decrypts a base64-encoded AES-256-GCM ciphertext string.
func DecryptAESGCM(cryptoText string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("encryption key must be exactly 32 bytes (AES-256)")
	}
	if cryptoText == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(cryptoText)
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
