package notification

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidateTelegramChatID(t *testing.T) {
	cases := []struct {
		input string
		valid bool
	}{
		{"12345678", true},
		{"@developer_user", true},
		{"-1001234567890", true},
		{"", false},
		{"   ", false},
		{"bad id with space", false},
	}

	for _, tc := range cases {
		err := ValidateTelegramChatID(tc.input)
		if tc.valid && err != nil {
			t.Errorf("expected valid for %q, got error: %v", tc.input, err)
		}
		if !tc.valid && err == nil {
			t.Errorf("expected error for %q, got nil", tc.input)
		}
	}
}

func TestSendTelegramAlert(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	// Empty bot token simulates gracefully
	err := SendTelegramAlert(context.Background(), server.Client(), "", "12345678", "Test alert message")
	if err != nil {
		t.Fatalf("expected nil error for empty bot token, got %v", err)
	}

	// Invalid chat ID fails validation
	err = SendTelegramAlert(context.Background(), server.Client(), "fake_token", "", "Test")
	if err == nil {
		t.Fatalf("expected validation error for empty chat ID")
	}
}
