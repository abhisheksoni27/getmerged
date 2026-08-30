package quests

import (
	"testing"
)

func TestComputeUserQuests_Empty(t *testing.T) {
	track := ComputeUserQuests(UserActivitySnapshot{})
	if track.CompletedQuests != 0 {
		t.Fatalf("expected 0 completed quests, got %d", track.CompletedQuests)
	}
	if track.TotalKarmaEarned != 0 {
		t.Fatalf("expected 0 karma earned, got %d", track.TotalKarmaEarned)
	}
}

func TestComputeUserQuests_FullCompletion(t *testing.T) {
	track := ComputeUserQuests(UserActivitySnapshot{
		HasScannedStack:    true,
		HasActiveSniper:    true,
		HasViewedSweetSpot: true,
		MergedPRCount:      2,
		HasSubmittedReview: true,
	})

	if track.CompletedQuests != 5 {
		t.Fatalf("expected 5 completed quests, got %d", track.CompletedQuests)
	}
	if track.CompletionRate != 100.0 {
		t.Fatalf("expected 100%% completion rate, got %.1f", track.CompletionRate)
	}
	if track.TotalKarmaEarned != 300 {
		t.Fatalf("expected 300 karma earned, got %d", track.TotalKarmaEarned)
	}
}
