package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	webhookTimeout        = 10 * time.Second
	webhookRetryBackoff   = 30 * time.Second
	webhookMaxConsecFails = 3
	// MaxWebhooksPerUser is the per-user channel cap (AC1).
	MaxWebhooksPerUser = 5
)

// retryableError marks transient delivery outcomes (429/5xx/timeout) that
// warrant exactly one retry after backoff (AC4).
type retryableError struct{ msg string }

func (e retryableError) Error() string { return e.msg }

var webhookHostAllowlist = map[string]bool{"hooks.slack.com": true}

// ValidateWebhookURL enforces AC2: https-only URLs on approved hosts
// (hooks.slack.com, discord.com/api/webhooks, discordapp.com/api/webhooks).
func ValidateWebhookURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return errors.New("invalid webhook URL")
	}
	if u.Scheme != "https" {
		return errors.New("webhook URL must use https://")
	}
	switch {
	case webhookHostAllowlist[u.Host]:
	case u.Host == "discord.com" && strings.HasPrefix(u.Path, "/api/webhooks/"):
	case u.Host == "discordapp.com" && strings.HasPrefix(u.Path, "/api/webhooks/"):
	default:
		return errors.New("webhook host not allowed: use hooks.slack.com or discord.com/api/webhooks")
	}
	return nil
}

// MaskWebhookURL renders the stored URL as `https://hooks.slack.com/…abcd`
// for UI/API responses (AC2).
func MaskWebhookURL(raw string) string {
	if raw == "" {
		return ""
	}
	suffix := raw
	if len(suffix) > 4 {
		suffix = suffix[len(suffix)-4:]
	}
	if u, err := url.Parse(raw); err == nil && u.Scheme != "" && u.Host != "" {
		return fmt.Sprintf("%s://%s/…%s", u.Scheme, u.Host, suffix)
	}
	return "https://…" + suffix
}

// NormalizeWebhookLabel lowercases and trims a channel label.
func NormalizeWebhookLabel(label string) string {
	return strings.ToLower(strings.TrimSpace(label))
}

// ValidWebhookLabel reports whether label is an allowed channel type (AC1).
func ValidWebhookLabel(label string) bool {
	return label == "slack" || label == "discord"
}

// WebhookMessage is one combined alert message for a channel (AC3).
type WebhookMessage struct {
	Text string
}

func webhookPayload(label, text string) any {
	if label == "discord" {
		return map[string]string{"content": text}
	}
	return map[string]string{"text": text} // Slack incoming-webhook format
}

// deliverWebhook posts one message with AC4 semantics: 10s timeout per
// attempt; 429/5xx or timeout retried once after a 30s backoff; only a final
// failure counts as one failure.
func deliverWebhook(ctx context.Context, client *http.Client, label, channelURL string, msg WebhookMessage) error {
	attempt := func() error {
		actx, cancel := context.WithTimeout(ctx, webhookTimeout)
		defer cancel()
		body, err := json.Marshal(webhookPayload(label, msg.Text))
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(actx, http.MethodPost, channelURL, bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			return retryableError{fmt.Sprintf("request failed: %v", err)}
		}
		defer resp.Body.Close()
		_, _ = io.Copy(io.Discard, resp.Body)
		switch {
		case resp.StatusCode >= 200 && resp.StatusCode < 300:
			return nil
		case resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500:
			return retryableError{fmt.Sprintf("status %d", resp.StatusCode)}
		default:
			return fmt.Errorf("non-2xx status %d", resp.StatusCode)
		}
	}
	err := attempt()
	var re retryableError
	if errors.As(err, &re) {
		select {
		case <-time.After(webhookRetryBackoff):
		case <-ctx.Done():
			return ctx.Err()
		}
		err = attempt()
	}
	return err
}
