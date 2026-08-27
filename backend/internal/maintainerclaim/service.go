package maintainerclaim

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
)

const maintainerProvider = "github_maintainer"

// Service implements the Maintainer Claim & Fast-Track SLA badging feature.
type Service struct {
	db        *sqlx.DB
	repo      Repository
	oauthRepo repository.OAuthTokenRepository
	userRepo  repository.UserRepository
	cfg       *config.Config
	mailer    *notification.SMTPMailer
}

// NewService constructs the SLA claim service.
func NewService(db *sqlx.DB, repo Repository, oauthRepo repository.OAuthTokenRepository, userRepo repository.UserRepository, cfg *config.Config, mailer *notification.SMTPMailer) *Service {
	return &Service{db: db, repo: repo, oauthRepo: oauthRepo, userRepo: userRepo, cfg: cfg, mailer: mailer}
}

// StoreMaintainerToken persists the read:org + repo scoped OAuth token
// encrypted-at-rest (KMS/secret manager via AES-GCM), never in plaintext (AC1).
func (s *Service) StoreMaintainerToken(ctx context.Context, userID int64, access, refresh string, expiresIn int) error {
	var expiresAt *time.Time
	if expiresIn > 0 {
		t := time.Now().Add(time.Duration(expiresIn) * time.Second)
		expiresAt = &t
	}
	return s.oauthRepo.UpsertToken(ctx, userID, maintainerProvider, access, refresh, expiresAt)
}

func (s *Service) getMaintainerToken(ctx context.Context, userID int64) (string, error) {
	access, _, expiresAt, err := s.oauthRepo.GetToken(ctx, userID, maintainerProvider)
	if err != nil {
		return "", err
	}
	if access == "" {
		return "", fmt.Errorf("no maintainer oauth token")
	}
	if expiresAt != nil && time.Until(*expiresAt) <= 0 {
		return "", fmt.Errorf("maintainer token expired")
	}
	return access, nil
}

// Claim verifies ownership via the collaborator permission endpoint (repo
// scope, not org membership) and persists the claim (AC1, AC2, AC6).
func (s *Service) Claim(ctx context.Context, userID int64, owner, name string, onboarding string, slaHours int) (*MaintainerSLAClaim, error) {
	if len(onboarding) > 500 {
		onboarding = onboarding[:500]
	}
	if slaHours <= 0 {
		slaHours = 48
	}

	token, err := s.getMaintainerToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("maintainer github auth required: %w", err)
	}

	// Verify the requesting user is an admin collaborator on the repo.
	login, err := ghclient.GetViewerLogin(token)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve github identity: %w", err)
	}
	perm, err := ghclient.CheckCollaboratorPermission(token, owner, name, login)
	if err != nil {
		return nil, fmt.Errorf("ownership verification failed: %w", err)
	}
	if perm != "admin" {
		// Ownership transfer blocked: only the current admin claim is valid (AC6).
		return nil, fmt.Errorf("not an admin collaborator on %s/%s (permission=%q)", owner, name, perm)
	}

	existing, err := s.repo.GetClaim(ctx, owner, name)
	if err != nil {
		return nil, err
	}
	// Duplicate claim returns the existing record (AC6).
	if existing != nil && existing.Revoked {
		// Reclaim allowed after revoke (AC6): reactivate.
		existing.UserID = userID
		existing.OnboardingGuidance = onboarding
		existing.SLAHours = slaHours
		existing.Verified = true
		existing.SLAMet = false
		existing.ConsecutiveBrokenWeeks = 0
		existing.Revoked = false
		existing.RevokeReason = ""
	} else if existing != nil {
		// Already claimed & active: return existing (no transfer).
		return existing, nil
	}

	claim := &MaintainerSLAClaim{
		RepoFullName:       owner + "/" + name,
		Owner:              owner,
		Name:               name,
		UserID:             userID,
		OnboardingGuidance: onboarding,
		SLAHours:           slaHours,
		Verified:           true,
	}
	return s.repo.UpsertClaim(ctx, claim)
}

// SetOnboarding updates the free-text onboarding guidance (AC2).
func (s *Service) SetOnboarding(ctx context.Context, userID int64, owner, name, onboarding string) (*MaintainerSLAClaim, error) {
	if len(onboarding) > 500 {
		return nil, fmt.Errorf("onboarding guidance exceeds 500 characters")
	}
	claim, err := s.repo.GetUserClaim(ctx, userID, owner, name)
	if err != nil {
		return nil, err
	}
	if claim == nil || claim.Revoked {
		return nil, fmt.Errorf("no active claim for %s/%s", owner, name)
	}
	claim.OnboardingGuidance = onboarding
	if _, err := s.repo.UpsertClaim(ctx, claim); err != nil {
		return nil, err
	}
	return claim, nil
}

// GetClaim returns the public-facing claim view (badge + onboarding).
func (s *Service) GetClaim(ctx context.Context, owner, name string) (*MaintainerSLAClaim, error) {
	return s.repo.GetClaim(ctx, owner, name)
}

// ListUserClaims returns the authenticated maintainer's claims.
func (s *Service) ListUserClaims(ctx context.Context, userID int64) ([]*MaintainerSLAClaim, error) {
	return s.repo.ListUserClaims(ctx, userID)
}

// RunWeeklySLA recomputes sla_met for every active claim using batched GitHub
// API calls with rate-limit backoff, then applies revoke rules (AC3, AC4, AC5).
func (s *Service) RunWeeklySLA(ctx context.Context) (recomputed, revoked int, err error) {
	claims, err := s.repo.ListActiveClaims(ctx)
	if err != nil {
		return 0, 0, err
	}
	for _, c := range claims {
		recomputed++
		token, terr := s.getMaintainerToken(ctx, c.UserID)
		if terr != nil {
			// Token revoked/expired with no refresh -> revoke (AC5).
			_ = s.repo.Revoke(ctx, c.ID, "oauth token expired/revoked")
			revoked++
			continue
		}
		// Re-verify admin access; loss of access -> revoke (AC5).
		login, lerr := ghclient.GetViewerLogin(token)
		if lerr != nil {
			_ = s.repo.Revoke(ctx, c.ID, "oauth token invalid")
			revoked++
			continue
		}
		perm, perr := ghclient.CheckCollaboratorPermission(token, c.Owner, c.Name, login)
		if perr != nil {
			slog.Warn("sla cron: permission check failed", "claim", c.ID, "err", perr)
		}
		if perm != "admin" {
			_ = s.repo.Revoke(ctx, c.ID, "maintainer lost admin access")
			revoked++
			continue
		}

		gh := ghclient.NewClient(token, nil)
		prs, _, ferr := gh.FetchPRs(c.Owner, c.Name, 30)
		if ferr != nil {
			slog.Warn("sla cron: fetch prs failed", "claim", c.ID, "err", ferr)
			continue
		}
		met, denom := computeSLAMet(prs, c.SLAHours)
		broken := !met
		brokenWeeks := c.ConsecutiveBrokenWeeks
		if denom == 0 {
			// No merged PRs in window: undefined SLA, do not penalize.
			broken = false
		}
		if broken {
			brokenWeeks++
		} else {
			brokenWeeks = 0
		}
		if err := s.repo.UpdateSLA(ctx, c.ID, met && denom > 0, brokenWeeks); err != nil {
			slog.Warn("sla cron: update failed", "claim", c.ID, "err", err)
		}
		// Revoke on SLA broken for 2 consecutive weeks (AC5).
		if brokenWeeks >= 2 {
			_ = s.repo.Revoke(ctx, c.ID, "sla broken 2 consecutive weeks")
			revoked++
		}
	}
	return recomputed, revoked, nil
}

// computeSLAMet returns (met, denominator) per AC3.
func computeSLAMet(prs []ghclient.PR, slaHours int) (bool, int) {
	denom := 0
	metCount := 0
	for _, p := range prs {
		if p.MergedAt == nil {
			// Open/unmerged PRs excluded from denominator.
			continue
		}
		// Latency = (first_review_at OR merged_at) - created_at.
		reviewAt := p.MergedAt
		if p.FirstCommentAt != nil && p.FirstCommentAt.Before(*p.MergedAt) {
			reviewAt = p.FirstCommentAt
		}
		denom++
		hours := reviewAt.Sub(p.CreatedAt).Hours()
		if hours <= float64(slaHours) {
			metCount++
		}
	}
	if denom == 0 {
		return false, 0
	}
	return float64(metCount)/float64(denom) >= 0.80, denom
}

// RunWeeklyDigest emails verified maintainers their inbound contributor-interest
// counts sourced from OpenDoor's own event log, with an unsubscribe link and a
// privacy note. Failures are logged; no PII beyond the GitHub handle (AC7).
func (s *Service) RunWeeklyDigest(ctx context.Context) (sent, failed int, err error) {
	claims, err := s.repo.ListActiveClaims(ctx)
	if err != nil {
		return 0, 0, err
	}
	since := time.Now().UTC().Add(-7 * 24 * time.Hour)
	for _, c := range claims {
		if !(c.Verified && c.SLAMet) {
			continue
		}
		user, uerr := s.userRepo.FindByID(ctx, c.UserID)
		if uerr != nil || user == nil || user.Email == nil || *user.Email == "" {
			failed++
			slog.Warn("digest: no email for claim", "claim", c.ID)
			continue
		}
		count, cerr := s.repo.CountInterest(ctx, c.RepoFullName, since)
		if cerr != nil {
			failed++
			continue
		}
		handle := user.Username
		body := fmt.Sprintf(
			"Hi %s,\n\nYour OpenDoor Fast-Track repo %s received %d inbound contributor-interest signal(s) (page views/clicks) in the last 7 days.\n\nKeep your SLA pledge of %dh review turnaround to retain the verified Fast-Track badge.\n\nPrivacy note: this digest contains only your public GitHub handle and aggregate interest counts from OpenDoor's own event log. We do not share contributor PII.\n\nUnsubscribe: %s/unsubscribe\n",
			handle, c.RepoFullName, count, c.SLAHours, s.cfg.AppBaseURL)
		if s.mailer == nil {
			failed++
			continue
		}
		if serr := s.mailer.Send(ctx, *user.Email, "Your OpenDoor Fast-Track weekly digest", body, ""); serr != nil {
			slog.Warn("digest: send failed", "claim", c.ID, "err", serr)
			failed++
			continue
		}
		sent++
	}
	return sent, failed, nil
}

// RecordInterest persists a click/view event on a repo page (AC7).
func (s *Service) RecordInterest(ctx context.Context, repoFullName, eventType, ip string) error {
	return s.repo.RecordInterest(ctx, repoFullName, eventType, ip)
}
