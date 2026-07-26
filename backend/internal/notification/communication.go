package notification

import (
	"context"
	"log/slog"
)

// CommunicationClient abstracts external notification delivery (email, webhook, push).
type CommunicationClient interface {
	SendNotification(ctx context.Context, userID int64, notificationType string, payload string) error
}

// PlaceholderCommunicationClient logs notifications without actually sending them.
// Wire this client until a real email/SMS provider is connected.
type PlaceholderCommunicationClient struct{}

func NewPlaceholderCommunicationClient() *PlaceholderCommunicationClient {
	return &PlaceholderCommunicationClient{}
}

func (c *PlaceholderCommunicationClient) SendNotification(ctx context.Context, userID int64, notificationType string, payload string) error {
	slog.Info("[PLACEHOLDER NOTIFICATION]",
		"user_id", userID,
		"type", notificationType,
		"payload", payload,
	)
	return nil
}
