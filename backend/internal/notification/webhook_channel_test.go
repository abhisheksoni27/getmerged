package notification

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBuildSlackPayload(t *testing.T) {
	p := BuildSlackPayload("hello *world*")
	m, ok := p.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any, got %T", p)
	}
	if m["text"] != "hello *world*" {
		t.Fatalf("missing text field")
	}
	blocks, ok := m["blocks"].([]map[string]any)
	if !ok || len(blocks) == 0 {
		t.Fatalf("expected non-empty blocks slice")
	}
	if blocks[0]["type"] != "section" {
		t.Fatalf("expected section block, got %v", blocks[0]["type"])
	}
}

func TestBuildDiscordPayload(t *testing.T) {
	p, err := BuildDiscordPayload("hello *world*")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	m, ok := p.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any, got %T", p)
	}
	if _, ok := m["content"]; !ok {
		t.Fatalf("expected content field for discord")
	}
	embeds, ok := m["embeds"].([]map[string]any)
	if !ok || len(embeds) == 0 {
		t.Fatalf("expected non-empty embeds slice")
	}
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if len(b) > DiscordMaxBodyChars {
		t.Fatalf("discord body %d exceeds %d", len(b), DiscordMaxBodyChars)
	}
}

func TestBuildDiscordPayloadTruncates(t *testing.T) {
	big := strings.Repeat("x", 50000)
	p, err := BuildDiscordPayload(big)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	b, _ := json.Marshal(p)
	if len(b) > DiscordMaxBodyChars {
		t.Fatalf("truncated discord body %d still exceeds %d", len(b), DiscordMaxBodyChars)
	}
}

func TestValidateWebhookURL(t *testing.T) {
	cases := []struct {
		url string
		ok  bool
	}{
		{"https://hooks.slack.com/services/T/B/X", true},
		{"https://discord.com/api/webhooks/123/abc", true},
		{"https://discordapp.com/api/webhooks/123/abc", true},
		{"http://hooks.slack.com/services/T/B/X", false},
		{"https://example.com/api/webhooks/1", false},
		{"https://slack.com/api/webhooks/1", false},
		{"https://discord.com/evil", false},
		{"not-a-url", false},
	}
	for _, c := range cases {
		err := ValidateWebhookURL(c.url)
		if (err == nil) != c.ok {
			t.Errorf("ValidateWebhookURL(%q) = %v, want ok=%v", c.url, err, c.ok)
		}
	}
}

func TestEnforceDiscordSize(t *testing.T) {
	over := make([]byte, DiscordMaxBodyChars+10)
	if err := enforceDiscordSize(over); err == nil {
		t.Fatalf("expected error for oversize body")
	}
	ok := make([]byte, 100)
	if err := enforceDiscordSize(ok); err != nil {
		t.Fatalf("unexpected error for small body: %v", err)
	}
}

func TestParseRetryAfter(t *testing.T) {
	if d := parseRetryAfter(""); d != 0 {
		t.Fatalf("empty should be 0, got %v", d)
	}
	if d := parseRetryAfter("30"); d != 30*1e9 {
		t.Fatalf("seconds parse wrong: %v", d)
	}
	if d := parseRetryAfter("999999"); d > 5*60*1e9 {
		t.Fatalf("should clamp to 5m, got %v", d)
	}
}
