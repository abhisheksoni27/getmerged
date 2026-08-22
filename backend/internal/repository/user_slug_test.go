package repository_test

import (
	"context"
	"database/sql"
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

	// Re-login preserves existing slug AND username even when GitHub login changed
	ghUserID2, err := userRepo.UpsertUser(ctx, 1001, "Linus Torvalds", "linus@kernel.org", "https://avatar.url/linus2")
	if err != nil || ghUserID2 != ghUserID {
		t.Fatalf("re-login upsert failed: %v", err)
	}
	user1Again, _ := userRepo.FindByID(ctx, ghUserID)
	if user1Again.Slug == nil || *user1Again.Slug != "torvalds" {
		t.Fatalf("expected preserved slug 'torvalds', got %v", user1Again.Slug)
	}
	if user1Again.Username != "Torvalds" {
		t.Fatalf("expected preserved username 'Torvalds', got %q", user1Again.Username)
	}

	// 2. New GitHub signup appends -gh then numeric suffix on username collisions
	collideID, err := userRepo.UpsertUser(ctx, 2002, "Torvalds", "other@kernel.org", "https://avatar.url/other")
	if err != nil {
		t.Fatalf("failed to upsert colliding github user: %v", err)
	}
	collideUser, _ := userRepo.FindByID(ctx, collideID)
	if collideUser.Username != "Torvalds-gh" {
		t.Fatalf("expected collision username 'Torvalds-gh', got %q", collideUser.Username)
	}
	if collideUser.Slug == nil || *collideUser.Slug != "torvalds-gh" {
		t.Fatalf("expected collision slug 'torvalds-gh', got %v", collideUser.Slug)
	}

	collideID2, err := userRepo.UpsertUser(ctx, 2003, "Torvalds", "third@kernel.org", "https://avatar.url/third")
	if err != nil {
		t.Fatalf("failed to upsert second colliding github user: %v", err)
	}
	collideUser2, _ := userRepo.FindByID(ctx, collideID2)
	if collideUser2.Username != "Torvalds-gh-2" {
		t.Fatalf("expected numeric suffix username 'Torvalds-gh-2', got %q", collideUser2.Username)
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
	if profile.Username != "Torvalds" {
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

	// 5. Cross-provider Account Linking via verified email
	linkID1, err := userRepo.UpsertUser(ctx, 9999, "DevUser", "dev@domain.com", "https://avatar/gh")
	if err != nil {
		t.Fatalf("failed to create initial user: %v", err)
	}

	// Login with Google using the same email
	linkID2, err := userRepo.UpsertGoogleUser(ctx, "goog-9999", "DevUser Google", "dev@domain.com", "https://avatar/goog")
	if err != nil {
		t.Fatalf("failed to link google user: %v", err)
	}

	if linkID1 != linkID2 {
		t.Fatalf("expected linked user ID %d, got %d", linkID1, linkID2)
	}

	linkedUser, _ := userRepo.FindByID(ctx, linkID1)
	if linkedUser.GithubID == nil || *linkedUser.GithubID != 9999 || linkedUser.GoogleID == nil || *linkedUser.GoogleID != "goog-9999" {
		t.Fatalf("expected both github_id and google_id populated on linked user: %+v", linkedUser)
	}

	// 6. Unknown slug returns sql.ErrNoRows
	_, err = userRepo.GetUserProfileBySlug(ctx, "nonexistent-slug-404")
	if err == nil {
		t.Fatalf("expected error for nonexistent slug, got nil")
	}
}

func TestSoftDeletedUserResurrectionViaGoogle(t *testing.T) {
	database, cfg := setupTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := userRepo.UpsertGoogleUser(ctx, "google-gh72", "Abhishek Soni", "abhishek@example.com", "https://avatar/google/1")
	if err != nil {
		t.Fatalf("failed to create google user: %v", err)
	}

	if err := userRepo.SoftDeleteUser(ctx, userID); err != nil {
		t.Fatalf("failed to soft delete user: %v", err)
	}
	if _, err := userRepo.FindByID(ctx, userID); err == nil {
		t.Fatalf("expected soft-deleted user to be hidden from FindByID")
	}

	reAuthID, err := userRepo.UpsertGoogleUser(ctx, "google-gh72", "Abhishek Soni", "abhishek@example.com", "https://avatar/google/2")
	if err != nil {
		t.Fatalf("re-auth upsert failed: %v", err)
	}
	if reAuthID != userID {
		t.Fatalf("expected re-auth to return original id %d, got %d", userID, reAuthID)
	}

	var deletedAt sql.NullTime
	if err := database.Get(&deletedAt, "SELECT deleted_at FROM users WHERE id = ?", userID); err != nil {
		t.Fatalf("failed to read deleted_at: %v", err)
	}
	if deletedAt.Valid {
		t.Fatalf("expected deleted_at to be NULL after resurrection, got %v", deletedAt.Time)
	}

	resurrected, err := userRepo.FindByID(ctx, userID)
	if err != nil {
		t.Fatalf("FindByID after resurrection failed: %v", err)
	}
	if resurrected.ProfilingConsent {
		t.Fatalf("expected profiling_consent to remain FALSE after resurrection")
	}
	if resurrected.Email == nil || *resurrected.Email != "abhishek@example.com" {
		t.Fatalf("expected email restored after resurrection, got %v", resurrected.Email)
	}

	byGoogle, err := userRepo.FindByGoogleID(ctx, "google-gh72")
	if err != nil {
		t.Fatalf("FindByGoogleID after resurrection failed: %v", err)
	}
	if byGoogle.ID != userID {
		t.Fatalf("expected FindByGoogleID to resolve user %d, got %d", userID, byGoogle.ID)
	}
}

func TestSoftDeletedUserResurrectionViaGithub(t *testing.T) {
	database, cfg := setupTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := userRepo.UpsertUser(ctx, 727272, "Github Dev", "github@example.com", "https://avatar/gh/1")
	if err != nil {
		t.Fatalf("failed to create github user: %v", err)
	}

	if err := userRepo.SoftDeleteUser(ctx, userID); err != nil {
		t.Fatalf("failed to soft delete user: %v", err)
	}
	if _, err := userRepo.FindByGithubID(ctx, 727272); err == nil {
		t.Fatalf("expected soft-deleted user to be hidden from FindByGithubID")
	}

	reAuthID, err := userRepo.UpsertUser(ctx, 727272, "Github Dev", "github@example.com", "https://avatar/gh/2")
	if err != nil {
		t.Fatalf("re-auth upsert failed: %v", err)
	}
	if reAuthID != userID {
		t.Fatalf("expected re-auth to return original id %d, got %d", userID, reAuthID)
	}

	var deletedAt sql.NullTime
	if err := database.Get(&deletedAt, "SELECT deleted_at FROM users WHERE id = ?", userID); err != nil {
		t.Fatalf("failed to read deleted_at: %v", err)
	}
	if deletedAt.Valid {
		t.Fatalf("expected deleted_at to be NULL after resurrection, got %v", deletedAt.Time)
	}

	resurrected, err := userRepo.FindByID(ctx, userID)
	if err != nil {
		t.Fatalf("FindByID after resurrection failed: %v", err)
	}
	if resurrected.ProfilingConsent {
		t.Fatalf("expected profiling_consent to remain FALSE after resurrection")
	}
	if resurrected.Email == nil || *resurrected.Email != "github@example.com" {
		t.Fatalf("expected email restored after resurrection, got %v", resurrected.Email)
	}

	byGithub, err := userRepo.FindByGithubID(ctx, 727272)
	if err != nil {
		t.Fatalf("FindByGithubID after resurrection failed: %v", err)
	}
	if byGithub.ID != userID {
		t.Fatalf("expected FindByGithubID to resolve user %d, got %d", userID, byGithub.ID)
	}
}

func TestSoftDeletedResurrectionReclaimsEmailHashFromActiveRow(t *testing.T) {
	database, cfg := setupTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	// User A (google) soft-deleted, freeing its email_hash slot
	aID, err := userRepo.UpsertGoogleUser(ctx, "google-compete", "Alice", "shared@example.com", "https://avatar/a")
	if err != nil {
		t.Fatalf("failed to create user A: %v", err)
	}
	if err := userRepo.SoftDeleteUser(ctx, aID); err != nil {
		t.Fatalf("failed to soft delete user A: %v", err)
	}

	// User B (github) registers with the same email while A is deleted, claiming email_hash
	bID, err := userRepo.UpsertUser(ctx, 9001, "Bob", "shared@example.com", "https://avatar/b")
	if err != nil {
		t.Fatalf("failed to create user B: %v", err)
	}

	// A re-auths via google, reclaiming the verified email
	reAuthID, err := userRepo.UpsertGoogleUser(ctx, "google-compete", "Alice", "shared@example.com", "https://avatar/a2")
	if err != nil {
		t.Fatalf("re-auth upsert with competing email_hash failed: %v", err)
	}
	if reAuthID != aID {
		t.Fatalf("expected re-auth to return user A id %d, got %d", aID, reAuthID)
	}

	byGoogle, err := userRepo.FindByGoogleID(ctx, "google-compete")
	if err != nil {
		t.Fatalf("FindByGoogleID should resolve user A after resurrection: %v", err)
	}
	if byGoogle.ID != aID {
		t.Fatalf("expected FindByGoogleID to resolve user A %d, got %d", aID, byGoogle.ID)
	}

	byGithub, err := userRepo.FindByGithubID(ctx, 9001)
	if err != nil {
		t.Fatalf("competing row B should remain resolvable by github id: %v", err)
	}
	if byGithub.ID != bID {
		t.Fatalf("expected FindByGithubID to resolve user B %d, got %d", bID, byGithub.ID)
	}
}
