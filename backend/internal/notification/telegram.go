package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

// TelegramNotifier sends notifications and pulse digests via Telegram Bot API.
type TelegramNotifier struct {
	botToken   string
	chatID     string
	httpClient *http.Client
}

// NewTelegramNotifier initializes a TelegramNotifier instance.
func NewTelegramNotifier(botToken, chatID string) *TelegramNotifier {
	return &TelegramNotifier{
		botToken:   botToken,
		chatID:     chatID,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// IsConfigured returns true if both token and chatID are present.
func (t *TelegramNotifier) IsConfigured() bool {
	return t != nil && t.botToken != "" && t.chatID != ""
}

// SendTextMessage sends a Markdown-formatted message to the configured Telegram chat.
func (t *TelegramNotifier) SendTextMessage(ctx context.Context, text string) error {
	if !t.IsConfigured() {
		return nil
	}

	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)
	form := url.Values{}
	form.Set("chat_id", t.chatID)
	form.Set("parse_mode", "Markdown")
	form.Set("text", text)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := t.httpClient.Do(req)
	if err != nil {
		slog.Error("telegram notifier: http request failed", "err", err)
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		var apiErr struct {
			Description string `json:"description"`
		}
		_ = json.NewDecoder(res.Body).Decode(&apiErr)
		slog.Error("telegram notifier: non-200 status", "status", res.StatusCode, "desc", apiErr.Description)
		return fmt.Errorf("telegram API error %d: %s", res.StatusCode, apiErr.Description)
	}

	return nil
}
