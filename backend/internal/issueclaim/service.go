package issueclaim

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
)

// AbuseThrottleWindow and AbuseThrottleMax implement AC9: max 10 claim comments
// per user per 10 minutes, server-side 429.
const (
	AbuseThrottleWindow = 10 * time.Minute
	AbuseThrottleMax    = 10
)

// ErrNoGithubToken is returned when the user has no stored GitHub OAuth token
// with issues:write scope.
var ErrNoGithubToken = errors.New("no github token available; please sign in with github")

// Service implements One-Click GitHub Issue Claiming.
type Service struct {
	db         *sqlx.DB
	gh         *github.Client
	tokenMgr   auth.TokenManager
	repoStore  repository.RepoRepository
	claimRepo  repository.IssueClaimRepository
	cfg        *config.Config
}

func NewService(db *sqlx.DB, gh *github.Client, tokenMgr auth.TokenManager, repoStore repository.RepoRepository, cfg *config.Config) *Service {
	return &Service{
		db:        db,
		gh:        gh,
		tokenMgr:  tokenMgr,
		repoStore: repoStore,
		claimRepo: repository.NewIssueClaimRepository(db),
		cfg:       cfg,
	}
}

// ClaimResult is returned to the handler / frontend.
type ClaimResult struct {
	Record        *repository.IssueClaimRecord `json:"claim"`
	CommentPosted bool                          `json:"comment_posted"`
	LabelAdded    bool                          `json:"label_added"`
	Skipped       bool                          `json:"skipped_existing"`
	Message       string                        `json:"message"`
}

// ClaimIssue performs the full claim flow (AC1-AC6, AC8, AC9):
//  1. resolve the user's GitHub token (issues:write).
//  2. AC9 abuse throttle (429 if exceeded).
//  3. AC5 dedup: return existing row if already claimed (idempotent).
//  4. AC3 pre-check: skip post if a prior claim comment or 'claimed' label exists.
//  5. AC2: post the templated comment FIRST; on failure no row is written.
//  6. persist the claim row in a single transaction.
//  7. AC4: add the 'claimed' label so the AC3 guard is real.
func (s *Service) ClaimIssue(ctx context.Context, owner, name string, issueNumber int, user *auth.Claims) (*ClaimResult, error) {
	fullName := owner + "/" + name

	// AC9: abuse throttle on actually-posted claim comments.
	since := time.Now().UTC().Add(-AbuseThrottleWindow)
	posted, err := s.claimRepo.CountClaimCommentsLastWindow(ctx, user.UserID, since)
	if err == nil && posted >= AbuseThrottleMax {
		return nil, repository.ErrClaimCommentRateLimited
	}

	token, err := s.tokenMgr.GetValidGithubToken(ctx, user.UserID)
	if err != nil || token == "" {
		return nil, ErrNoGithubToken
	}

	// AC5: dedup — if a row already exists, reconcile & return (never re-post).
	existing, err := s.claimRepo.GetByUserAndIssue(ctx, user.UserID, fullName, issueNumber)
	if err != nil {
		return nil, fmt.Errorf("lookup existing claim: %w", err)
	}
	if existing != nil {
		return s.reconcileExisting(ctx, owner, name, issueNumber, token, existing)
	}

	// AC3: pre-check for an existing claim comment or the 'claimed' label.
	alreadyClaimed, err := s.preCheckGitHub(ctx, owner, name, issueNumber, token)
	if err != nil {
		// Fail closed: if we cannot verify GitHub state, do not post a duplicate.
		return nil, fmt.Errorf("pre-check failed: %w", err)
	}
	if alreadyClaimed {
		rec, insErr := s.persistClaim(ctx, user.UserID, fullName, issueNumber, 0, repository.IssueClaimActive, true)
		if insErr != nil {
			return nil, insErr
		}
		return &ClaimResult{Record: rec, Skipped: true, LabelAdded: true, Message: "Issue already claimed (idempotent): persisted without re-posting."}, nil
	}

	// Build attribution link (AC8).
	attrib := s.attributionURL(fullName)

	// AC2: post the templated comment FIRST. If this fails, no row is written.
	body := buildClaimComment(user.Username, attrib)
	commentID, postErr := s.gh.PostIssueComment(ctx, owner, name, issueNumber, body, token)
	if postErr != nil {
		return nil, fmt.Errorf("post claim comment: %w", postErr)
	}

	// Log the actually-posted comment for AC9.
	_ = s.claimRepo.LogClaimComment(ctx, user.UserID)

	// Persist the claim row in a single transaction (AC2/AC5).
	rec, insErr := s.persistClaim(ctx, user.UserID, fullName, issueNumber, commentID, repository.IssueClaimPendingReview, false)
	if insErr != nil {
		// Unique violation => someone else (or a retry) already claimed it.
		if isDuplicate(insErr) {
			dup, _ := s.claimRepo.GetByUserAndIssue(ctx, user.UserID, fullName, issueNumber)
			if dup != nil {
				return &ClaimResult{Record: dup, Skipped: true, Message: "Claim already recorded."}, nil
			}
		}
		return nil, insErr
	}

	// AC4: add the 'claimed' label; flip state to active on success.
	labelAdded := true
	if labErr := s.gh.AddIssueLabel(ctx, owner, name, issueNumber, repository.ClaimedLabel, token); labErr != nil {
		labelAdded = false
	}
	if labelAdded {
		if tx, txErr := s.claimRepo.BeginTx(ctx); txErr == nil {
			_ = s.claimRepo.UpdateStateTx(ctx, tx, rec.ID, string(repository.IssueClaimActive), true)
			_ = tx.Commit()
		}
		rec.State = string(repository.IssueClaimActive)
		rec.LabelAdded = true
	}

	return &ClaimResult{Record: rec, CommentPosted: true, LabelAdded: labelAdded, Message: "Claim comment posted and issue claimed."}, nil
}

// ListUserClaims returns all issue claims for a user (dashboard sync / AC6 reload).
func (s *Service) ListUserClaims(ctx context.Context, userID int64) ([]repository.IssueClaimRecord, error) {
	var recs []repository.IssueClaimRecord
	if err := s.db.GetContext(ctx, &recs, `
		SELECT id, user_id, repo_full_name, issue_number, issue_node_id, github_comment_id, state, attribution_url, label_added, created_at, updated_at
		FROM issue_claims WHERE user_id = ? ORDER BY created_at DESC`, userID); err != nil {
		return nil, err
	}
	return recs, nil
}

// reconcileExisting re-runs the AC3 pre-check for a pending_review claim (AC6)
// and never re-posts a duplicate comment.
func (s *Service) reconcileExisting(ctx context.Context, owner, name string, issueNumber int, token string, existing *repository.IssueClaimRecord) (*ClaimResult, error) {
	if existing.State == string(repository.IssueClaimActive) {
		return &ClaimResult{Record: existing, Skipped: true, LabelAdded: existing.LabelAdded, Message: "Claim already active."}, nil
	}
	// pending_review: confirm the claim is real on GitHub, then mark active.
	alreadyClaimed, err := s.preCheckGitHub(ctx, owner, name, issueNumber, token)
	if err != nil {
		// Cannot verify — return existing without re-posting (safe).
		return &ClaimResult{Record: existing, Skipped: true, Message: "Existing pending claim retained."}, nil
	}
	labelAdded := existing.LabelAdded
	if !alreadyClaimed {
		if labErr := s.gh.AddIssueLabel(ctx, owner, name, issueNumber, repository.ClaimedLabel, token); labErr == nil {
			labelAdded = true
		}
	} else {
		labelAdded = true
	}
	if tx, txErr := s.claimRepo.BeginTx(ctx); txErr == nil {
		_ = s.claimRepo.UpdateStateTx(ctx, tx, existing.ID, string(repository.IssueClaimActive), labelAdded)
		_ = tx.Commit()
	}
	existing.State = string(repository.IssueClaimActive)
	existing.LabelAdded = labelAdded
	return &ClaimResult{Record: existing, Skipped: true, LabelAdded: labelAdded, Message: "Reconciled existing pending claim."}, nil
}

// preCheckGitHub returns true when a prior OpenDoor claim comment OR the
// 'claimed' label already exists on the issue (AC3).
func (s *Service) preCheckGitHub(ctx context.Context, owner, name string, issueNumber int, token string) (bool, error) {
	hasComment, err := s.gh.HasOpenDoorClaimComment(ctx, owner, name, issueNumber, token)
	if err != nil {
		return false, err
	}
	if hasComment {
		return true, nil
	}
	hasLabel, err := s.gh.HasLabel(ctx, owner, name, issueNumber, repository.ClaimedLabel, token)
	if err != nil {
		return false, err
	}
	return hasLabel, nil
}

// persistClaim writes the claim row inside a transaction.
func (s *Service) persistClaim(ctx context.Context, userID int64, fullName string, issueNumber int, commentID int64, state repository.IssueClaimState, labelAdded bool) (*repository.IssueClaimRecord, error) {
	tx, err := s.claimRepo.BeginTx(ctx)
	if err != nil {
		return nil, err
	}
	rec := &repository.IssueClaimRecord{
		UserID:          userID,
		RepoFullName:    fullName,
		IssueNumber:     issueNumber,
		GitHubCommentID: commentID,
		State:           string(state),
		AttributionURL:  s.attributionURL(fullName),
		LabelAdded:      labelAdded,
	}
	created, insErr := s.claimRepo.InsertClaimTx(ctx, tx, rec)
	if insErr != nil {
		_ = tx.Rollback()
		return nil, insErr
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return created, nil
}

// attributionURL implements AC8: repo scorecard URL if the repo is indexed,
// else a safe repo root link to GitHub.
func (s *Service) attributionURL(fullName string) string {
	base := strings.TrimSuffix(s.cfg.AppBaseURL, "/")
	if s.repoStore != nil {
		if rec, err := s.repoStore.FindByIDOrName(context.Background(), fullName); err == nil && rec != nil && rec.FullName != "" {
			return base + "/" + fullName
		}
	}
	if base == "" {
		return "https://github.com/" + fullName
	}
	// Repo not indexed yet: still link to its (safe) GitHub scorecard-style page.
	return "https://github.com/" + fullName
}

// buildClaimComment renders the templated claim comment with attribution link.
func buildClaimComment(username, attrib string) string {
	who := username
	if who == "" {
		who = "I"
	}
	return fmt.Sprintf("I'd like to work on this. — claimed via OpenDoor%s\n\n%s\n\n📊 [View this repository's OpenDoor scorecard](%s)",
		claimSignatureSuffix(who), github.IssueClaimSignature, attrib)
}

func claimSignatureSuffix(who string) string {
	if who == "" || who == "I" {
		return ""
	}
	return " by @" + who
}

// isDuplicate reports whether err is a unique/duplicate-key violation.
func isDuplicate(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") || strings.Contains(msg, "unique") || strings.Contains(msg, "1062") || strings.Contains(msg, "23000")
}
