package claim

import (
	"testing"
)

func TestGenerateNonce(t *testing.T) {
	n1, err := GenerateNonce()
	if err != nil {
		t.Fatalf("GenerateNonce failed: %v", err)
	}
	if len(n1) < 16 {
		t.Fatalf("Nonce token too short: %s", n1)
	}

	n2, _ := GenerateNonce()
	if n1 == n2 {
		t.Fatalf("Expected unique nonces, got identical: %s", n1)
	}
}
