package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	webhookTimeout        = 10 * time.Second
	webhookRetryBackoff   = 30 * time.Second
	webhookMaxRetries     = 3
	webhookMaxConsecFails = 3
	// DiscordMaxBodyChars is the hard cap on a Discord webhook POST body (AC5).
	DiscordMaxBodyChars = 2000
	// MaxWebhooksPerUser is the per-user channel cap (AC1).
	MaxWebhooksPerUser = 5
)

// retryableError marks transient delivery outcomes (429/5xx/timeout) that
// warrant bounded retries (AC4). retryAfter, when >0, comes from the
// Retry-After header.
type retryableError struct {
	msg        string
	retryAfter time.Duration
}

func (e *retryableError) Error() string { return e.msg }

var webhookHostAllowlist = map[string]bool{"hooks.slack.com": true}

// ValidateWebhookURL enforces AC3: https-only URLs on approved hosts
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
// for UI/API responses (AC3).
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

// BuildSlackPayload builds a Slack incoming-webhook body using both a plain
// `text` fallback and rich `blocks` (AC2).
func BuildSlackPayload(text string) any {
	return map[string]any{
		"text": text,
		"blocks": []map[string]any{
			{
				"type": "section",
				"text": map[string]any{
					"type": "mrkdwn",
					"text": text,
				},
			},
		},
	}
}

// BuildDiscordPayload builds a Discord webhook body using `content` plus an
// `embeds` entry (AC2). AC5: the body is truncated to stay <=2000 chars; if it
// cannot be brought under the cap it returns an error so the send aborts.
func BuildDiscordPayload(text string) (any, error) {
	content := truncate(text, 80)
	desc := text
	for i := 0; i < 8; i++ {
		desc = truncate(desc, DiscordMaxBodyChars-220-i*200)
		payload := map[string]any{
			"content": content,
			"embeds": []map[string]any{
				{
					"title":       "OpenDoor C-Rank Alert",
					"description": desc,
					"color":       0x2ecc71,
				},
			},
		}
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		if len(b) <= DiscordMaxBodyChars {
			return payload, nil
		}
	}
	return nil, fmt.Errorf("discord payload exceeds %d char limit after truncation", DiscordMaxBodyChars)
}

// truncate cuts s to at most max runes, appending an ellipsis when cut (AC5).
func truncate(s string, max int) string {
	if max <= 0 {
		return ""
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	if max <= 3 {
		return string(r[:max])
	}
	return string(r[:max-3]) + "..."
}

// buildPayload selects the provider-correct payload for label (AC2).
func buildPayload(label, text string) (any, error) {
	label = NormalizeWebhookLabel(label)
	if label == "discord" {
		return BuildDiscordPayload(text)
	}
	return BuildSlackPayload(text), nil
}

// enforceDiscordSize is the final AC5 backstop: abort if a Discord body is
// somehow over the hard cap.
func enforceDiscordSize(body []byte) error {
	if len(body) > DiscordMaxBodyChars {
		return fmt.Errorf("discord payload body is %d chars, exceeds hard limit %d", len(body), DiscordMaxBodyChars)
	}
	return nil
}

// deliverWebhook posts one message with AC4 semantics: 10s timeout per
// attempt; 429/5xx or timeout retried up to webhookMaxRetries times honoring
// the Retry-After header (bounded backoff); only a final failure counts as one
// failure. AC3: the URL is re-validated (SSRF guard) before every send. AC5:
// oversize Discord bodies never send.
func deliverWebhook(ctx context.Context, client *http.Client, label, channelURL string, msg WebhookMessage) error {
	label = NormalizeWebhookLabel(label)
	if err := ValidateWebhookURL(channelURL); err != nil {
		slog.Error("webhook send blocked: invalid URL", "label", label, "err", err)
		return err
	}
	payload, err := buildPayload(label, msg.Text)
	if err != nil {
		slog.Error("webhook payload build failed", "label", label, "err", err)
		return err
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if label == "discord" {
		if err := enforceDiscordSize(body); err != nil {
			slog.Error("webhook send aborted: payload too large", "label", label, "err", err)
			return err
		}
	}

	var lastErr error
	for attempt := 0; attempt <= webhookMaxRetries; attempt++ {
		if attempt > 0 {
			backoff := webhookRetryBackoff
			if re, ok := lastErr.(*retryableError); ok && re.retryAfter > 0 {
				backoff = re.retryAfter
			}
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		err := attemptDeliver(ctx, client, channelURL, body)
		if err == nil {
			return nil
		}
		lastErr = err
		var re *retryableError
		if !errors.As(err, &re) {
			// Non-retryable (4xx/validation) — surface immediately (AC4).
			return err
		}
	}
	if lastErr != nil {
		slog.Error("webhook delivery exhausted retries", "label", label, "err", lastErr)
	}
	return lastErr
}

// attemptDeliver performs a single POST and classifies the outcome.
func attemptDeliver(ctx context.Context, client *http.Client, channelURL string, body []byte) error {
	actx, cancel := context.WithTimeout(ctx, webhookTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(actx, http.MethodPost, channelURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return &retryableError{msg: fmt.Sprintf("request failed: %v", err)}
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		return nil
	case resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500:
		return &retryableError{msg: fmt.Sprintf("status %d", resp.StatusCode), retryAfter: parseRetryAfter(resp.Header.Get("Retry-After"))}
	default:
		return fmt.Errorf("non-2xx status %d", resp.StatusCode)
	}
}

// parseRetryAfter parses the Retry-After header (seconds or HTTP date),
// clamped to a sane bound (AC4).
func parseRetryAfter(v string) time.Duration {
	v = strings.TrimSpace(v)
	if v == "" {
		return 0
	}
	if secs, err := strconv.Atoi(v); err == nil && secs > 0 {
		d := time.Duration(secs) * time.Second
		if d > 5*time.Minute {
			d = 5 * time.Minute
		}
		return d
	}
	if t, err := http.ParseTime(v); err == nil {
		if d := time.Until(t); d > 0 && d <= 5*time.Minute {
			return d
		}
	}
	return 0
}
