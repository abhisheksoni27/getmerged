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

func TestAIClient_LocalZeroCostInsights(t *testing.T) {
	client := ai.NewAIClient("")
	comments := []string{
		"Thanks for this PR! LGTM, merged.",
		"Great fix, please make sure unit tests pass.",
		"Welcome to the repo! Please follow conventional commit guidelines.",
	}

	res, err := client.GenerateRepoInsights(context.Background(), "gin-gonic/gin", comments)
	if err != nil {
		t.Fatalf("expected local zero cost insights to succeed, got: %v", err)
	}

	if res.IssueQualityScore <= 0 {
		t.Fatalf("expected positive quality score, got %f", res.IssueQualityScore)
	}

	if len(res.PRGuidelines) == 0 {
		t.Fatalf("expected extracted guidelines, got empty slice")
	}
}


