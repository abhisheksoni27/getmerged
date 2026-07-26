package ai_test

import (
	"context"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/ai"
)

func TestAIClient_FallbackMock(t *testing.T) {
	client := ai.NewAIClient("")
	res, err := client.GenerateRepoInsights(context.Background(), "freeCodeCamp/freeCodeCamp", nil)
	if err != nil {
		t.Fatalf("expected fallback mock response without error, got: %v", err)
	}

	if res.MaintainerVibe == "" || len(res.PRGuidelines) == 0 {
		t.Fatalf("expected non-empty mock insights, got: %+v", res)
	}
}


