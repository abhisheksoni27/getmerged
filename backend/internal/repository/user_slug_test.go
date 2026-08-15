package repository_test

import (
	"context"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/repository"
)

func TestSlugGenerationAndResolution(t *testing.T) {
	database, cfg := setupTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	// 1. GitHub User creation generates clean slug from username
	ghUserID, err := userRepo.UpsertUser(ctx, 1001, "Torvalds", "linus@kernel.org", "https://avatar.url/linus")
	if err != nil {
		t.Fatalf("failed to upsert github user: %v", err)
	}

	user1, err := userRepo.FindByID(ctx, ghUserID)
	if err != nil {
		t.Fatalf("failed to find user by id: %v", err)
	}
	if user1.Slug == nil || *user1.Slug != "torvalds" {
		t.Fatalf("expected slug 'torvalds', got %v", user1.Slug)
	}

	// Re-login preserves existing slug
	ghUserID2, err := userRepo.UpsertUser(ctx, 1001, "Linus Torvalds", "linus@kernel.org", "https://avatar.url/linus2")
	if err != nil || ghUserID2 != ghUserID {
		t.Fatalf("re-login upsert failed: %v", err)
	}
	user1Again, _ := userRepo.FindByID(ctx, ghUserID)
	if user1Again.Slug == nil || *user1Again.Slug != "torvalds" {
		t.Fatalf("expected preserved slug 'torvalds', got %v", user1Again.Slug)
	}

	// 2. Google User creation generates unique slug and handles collision
	gUserID1, err := userRepo.UpsertGoogleUser(ctx, "google-100", "Torvalds", "torvalds@gmail.com", "https://avatar.google/1")
	if err != nil {
		t.Fatalf("failed to upsert google user: %v", err)
	}
	gUser1, _ := userRepo.FindByID(ctx, gUserID1)
	if gUser1.Slug == nil || *gUser1.Slug != "torvalds-2" {
		t.Fatalf("expected collided slug 'torvalds-2', got %v", gUser1.Slug)
	}

	// 3. Look up public profile by slug
	profile, err := userRepo.GetUserProfileBySlug(ctx, "torvalds")
	if err != nil {
		t.Fatalf("GetUserProfileBySlug failed: %v", err)
	}
	if profile.Username != "Linus Torvalds" {
		t.Fatalf("unexpected profile username: %s", profile.Username)
	}
	if profile.GithubURL == nil || *profile.GithubURL != "https://github.com/torvalds" {
		t.Fatalf("expected github_url for github user, got %v", profile.GithubURL)
	}

	// 4. Google-only profile returns nil github_url and nil verified_contributions
	gProfile, err := userRepo.GetUserProfileBySlug(ctx, "torvalds-2")
	if err != nil {
		t.Fatalf("GetUserProfileBySlug for google user failed: %v", err)
	}
	if gProfile.GithubURL != nil {
		t.Fatalf("expected nil github_url for google user, got %v", gProfile.GithubURL)
	}
	if gProfile.Stats.VerifiedContributions != nil {
		t.Fatalf("expected nil verified_contributions for google user, got %v", gProfile.Stats.VerifiedContributions)
	}

	// 5. Unknown slug returns sql.ErrNoRows
	_, err = userRepo.GetUserProfileBySlug(ctx, "nonexistent-slug-404")
	if err == nil {
		t.Fatalf("expected error for nonexistent slug, got nil")
	}
}
