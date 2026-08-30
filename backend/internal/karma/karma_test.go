package karma

import (
	"strings"
	"testing"
)

func TestCalculateKarma_ZeroPRs(t *testing.T) {
	karma := CalculateKarma(nil, 0, "Go")
	if karma.TotalKarma != 0 {
		t.Fatalf("expected 0 karma, got %d", karma.TotalKarma)
	}
	if karma.Rank.Level != 1 {
		t.Fatalf("expected Level 1, got %d", karma.Rank.Level)
	}
	if karma.Rank.Title != "Apprentice Contributor" {
		t.Fatalf("expected Apprentice Contributor, got %s", karma.Rank.Title)
	}
}

func TestCalculateKarma_TierSAndStreak(t *testing.T) {
	prs := []MergedPRInput{
		{RepoFullName: "vercel/next.js", CRankTier: "S", IsFirstTimer: true, LinesChanged: 80, Language: "TypeScript"},
		{RepoFullName: "supabase/supabase", CRankTier: "S", IsFirstTimer: false, LinesChanged: 45, Language: "TypeScript"},
		{RepoFullName: "gin-gonic/gin", CRankTier: "A", IsFirstTimer: false, LinesChanged: 20, Language: "Go"},
	}

	// 100 + 50 (first timer) + 100 + 50 = 300 raw points
	// Streak 3 months: 1.0 + (3-1)*0.1 = 1.2 multiplier => 300 * 1.2 = 360 points => Level 2
	karma := CalculateKarma(prs, 3, "TypeScript")

	if karma.TotalKarma != 360 {
		t.Fatalf("expected 360 total karma, got %d", karma.TotalKarma)
	}
	if karma.Rank.Level != 2 {
		t.Fatalf("expected Level 2, got %d", karma.Rank.Level)
	}
	if karma.MergedTierSCount != 2 {
		t.Fatalf("expected 2 Tier S merges, got %d", karma.MergedTierSCount)
	}
}

func TestRenderKarmaBadgeSVG(t *testing.T) {
	karma := CalculateKarma([]MergedPRInput{
		{CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"},
		{CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"},
		{CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"},
		{CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"}, {CRankTier: "S"},
	}, 1, "Go")

	svg := RenderKarmaBadgeSVG("abhisheksoni", karma)
	if !strings.Contains(svg, "<svg") || !strings.Contains(svg, "Karma") {
		t.Fatalf("expected valid SVG badge with Karma, got: %s", svg)
	}
}
