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
	"strings"
	"time"
)

const (
	telegramTimeout = 10 * time.Second
	// TelegramMaxMessageChars is the message character limit for Telegram Bot API
	TelegramMaxMessageChars = 4096
)

// TelegramMessage represents the payload for sendMessage API
type TelegramMessage struct {
	ChatID                string `json:"chat_id"`
	Text                  string `json:"text"`
	ParseMode             string `json:"parse_mode,omitempty"`
	DisableWebPagePreview bool   `json:"disable_web_page_preview,omitempty"`
}

// ValidateTelegramChatID checks if a given chat ID or handle is formatted properly
func ValidateTelegramChatID(target string) error {
	trimmed := strings.TrimSpace(target)
	if trimmed == "" {
		return errors.New("telegram chat ID or handle cannot be empty")
	}
	if strings.ContainsAny(trimmed, " \t\r\n") {
		return errors.New("telegram chat ID cannot contain whitespace")
	}
	return nil
}

// SendTelegramAlert posts an alert message to a Telegram chat via Bot API
func SendTelegramAlert(ctx context.Context, client *http.Client, botToken string, chatID string, text string) error {
	if err := ValidateTelegramChatID(chatID); err != nil {
		return err
	}
	if botToken == "" {
		// Log gracefully in development/test if token is not set
		slog.Info("Telegram alert simulated (TELEGRAM_BOT_TOKEN not configured)", "chat_id", chatID, "text_len", len(text))
		return nil
	}

	if client == nil {
		client = &http.Client{Timeout: telegramTimeout}
	}

	// Truncate text if needed to stay within Telegram limits
	if len(text) > TelegramMaxMessageChars {
		text = text[:TelegramMaxMessageChars-20] + "\n…[truncated]"
	}

	payload := TelegramMessage{
		ChatID:    chatID,
		Text:      text,
		ParseMode: "Markdown",
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal telegram payload: %w", err)
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("telegram API error (status %d): %s", resp.StatusCode, string(respBody))
}
