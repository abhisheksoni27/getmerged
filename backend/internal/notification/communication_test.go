package notification_test

import (
	"context"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/notification"
)

func TestPlaceholderCommunicationClient(t *testing.T) {
	client := notification.NewPlaceholderCommunicationClient()
	err := client.SendNotification(context.Background(), 123, "rank_changed", `{"old_rank":"B","new_rank":"S"}`)
	if err != nil {
		t.Fatalf("expected nil error from placeholder client, got: %v", err)
	}
}
