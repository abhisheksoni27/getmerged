package claim

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/jmoiron/sqlx"
)

// ProofFileName is the standard file name for file-based proof verification.
const ProofFileName = ".crank-claim"
const ProofFileNameAlt = "CRANK_CLAIM"

// nonceTTL bounds the verify-file window (AC2): 128-bit crypto/rand hex
// nonce, single-use, expires after 24h; fetch failures fail closed and the
// claim stays pending for a later retry.
const nonceTTL = 24 * time.Hour

// lapseGracePeriod is the recovery window after a failed weekly re-check:
// the console stays locked but the claim can be restored before release (AC4).
const lapseGracePeriod = repository.ClaimGracePeriod

// Service handles repository claim lifecycle, proof verification, re-verification, and console payload building.
type Service struct {
	db          *sqlx.DB
	claimRepo   repository.ClaimRepository
	repoRepo    repository.RepoRepository
	tokenMgr    auth.TokenManager
	ghClient    *ghclient.Client
	httpClient  *http.Client
	cfg         *config.Config
}

func NewService(
	db *sqlx.DB,
	claimRepo repository.ClaimRepository,
	repoRepo repository.RepoRepository,
	tokenMgr auth.TokenManager,
	ghClient *ghclient.Client,
	cfg *config.Config,
) *Service {
	return &Service{
		db:         db,
		claimRepo:  claimRepo,
		repoRepo:   repoRepo,
		tokenMgr:   tokenMgr,
		ghClient:   ghClient,
		httpClient: &http.Client{Timeout: 5 * time.Second}, // fail-closed timeout > 5s (AC5)
		cfg:        cfg,
	}
}

// GenerateNonce creates a secure cryptographically random token string.
func GenerateNonce() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ClaimResponse returned when a maintainer initiates a claim.
type ClaimResponse struct {
	ClaimID            int64      `json:"claim_id"`
	RepoID             string     `json:"repo_id"`
	FullName           string     `json:"full_name"`
	State              string     `json:"state"`
	VerificationMethod string     `json:"verification_method"`
	NonceToken         string     `json:"nonce_token,omitempty"`
	FileInstructions   *FileInfo  `json:"file_instructions,omitempty"`
	OrgVerified        bool       `json:"org_verified,omitempty"`
	ExpiresAt          time.Time  `json:"expires_at"`
}

type FileInfo struct {
	FileName        string `json:"file_name"`
	FileContent     string `json:"file_content"`
	Nonce           string `json:"nonce"`
	CommitGuidance  string `json:"commit_guidance"`
}

// InitiateClaim creates or updates a pending claim (AC1).
func (s *Service) InitiateClaim(ctx context.Context, owner, name string, userID int64, username string) (*ClaimResponse, error) {
	fullName := owner + "/" + name
	repo, err := s.repoRepo.FindByIDOrName(ctx, fullName)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup repo: %w", err)
	}

	repoID := fullName
	if repo != nil && repo.ID != "" {
		repoID = repo.ID
	}

	// AC3: first verified claim wins; a second claimant is told who holds it.
	existingVerified, err := s.claimRepo.GetVerifiedClaimByRepoID(ctx, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup claim: %w", err)
	}
	if existingVerified != nil && existingVerified.OwnerUserID != userID {
		return nil, newConflictError(s.claimerMention(ctx, existingVerified.OwnerUserID))
	}

	// Generate single-use nonce expiring after 72h (AC1, AC5)
	nonce, err := GenerateNonce()
	if err != nil {
		return nil, fmt.Errorf("nonce generation: %w", err)
	}
	nonceLine := fmt.Sprintf("crank-claim: %s", nonce)
	expiresAt := time.Now().UTC().Add(nonceTTL)

	// Check if user has GitHub token to check org membership or direct repo admin
	method := repository.ClaimMethodFile
	orgVerified := false

	// Attempt GitHub OAuth org / direct maintainer check if token available
	if token, tokenErr := s.tokenMgr.GetValidGithubToken(ctx, userID); tokenErr == nil && token != "" {
		isMember, isFork, _, chkErr := s.githubMaintainerCheck(ctx, token, owner, name, username)
		if chkErr == nil && !isFork && isMember {
			method = repository.ClaimMethodOrg
			orgVerified = true
		}
	}

	claimRecord, err := s.claimRepo.CreateOrUpdatePendingClaim(ctx, repoID, fullName, userID, method, nonce, expiresAt)
	if err != nil {
		if errors.Is(err, repository.ErrRepoAlreadyClaimed) {
			// AC3: concurrent claim lost the race -> 409, no partial state.
			return nil, newConflictError("repository already claimed by another maintainer")
		}
		return nil, err
	}

	// If repo push/admin confirmed via GitHub OAuth on initiation, transition
	// straight to verified (AC1).
	if orgVerified {
		tx, err := s.claimRepo.BeginTx(ctx)
		if err == nil {
			if vErr := s.claimRepo.VerifyClaimTx(ctx, tx, claimRecord.ID); vErr == nil {
				_ = tx.Commit()
				claimRecord.State = string(repository.ClaimStateVerified)
				s.subscribeToWeeklyRankEmails(ctx, userID, repoID)
			} else {
				_ = tx.Rollback()
			}
		}
	}

	resp := &ClaimResponse{
		ClaimID:            claimRecord.ID,
		RepoID:             repoID,
		FullName:           fullName,
		State:              claimRecord.State,
		VerificationMethod: string(method),
		ExpiresAt:          expiresAt,
		OrgVerified:        orgVerified,
	}

	if claimRecord.State == string(repository.ClaimStatePending) {
		resp.NonceToken = nonceLine
		resp.FileInstructions = &FileInfo{
			FileName:       fmt.Sprintf(".github/verify-%s.md", nonce),
			FileContent:    nonceLine,
			Nonce:          nonce,
			CommitGuidance: fmt.Sprintf("Commit a one-line file `.github/verify-%s.md` (or a `%s` line in README.md / a root `%s`) to the default branch containing `%s`", nonce, ProofFileName, ProofFileNameAlt, nonceLine),
		}
	}

	return resp, nil
}

// VerifyClaim performs proof verification (file fetch or org membership check) (AC2, AC3, AC5, AC7).
func (s *Service) VerifyClaim(ctx context.Context, owner, name string, userID int64, username string) (*RepoClaimRecordDTO, error) {
	fullName := owner + "/" + name
	repo, err := s.repoRepo.FindByIDOrName(ctx, fullName)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup repo: %w", err)
	}

	repoID := fullName
	if repo != nil && repo.ID != "" {
		repoID = repo.ID
	}

	// AC7: Row lock via transaction to serialize concurrent verifies
	tx, err := s.claimRepo.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	claim, err := s.claimRepo.GetClaimByRepoForUpdate(ctx, tx, repoID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("claim not found: please initiate claim first (404)")
		}
		return nil, fmt.Errorf("lock claim: %w", err)
	}

	// If already verified, return idempotent success
	if claim.State == string(repository.ClaimStateVerified) {
		return toClaimDTO(claim, fullName), nil
	}

	// Check expiry (AC2)
	if time.Now().UTC().After(claim.ExpiresAt) {
		return nil, fmt.Errorf("claim token has expired; please initiate a new claim")
	}

	// Verification logic:
	// 1. Try Org Membership / Direct GitHub permissions if user has OAuth token
	verified := false
	var verifyErr error

	if token, tokenErr := s.tokenMgr.GetValidGithubToken(ctx, userID); tokenErr == nil && token != "" {
		isMember, isFork, _, chkErr := s.githubMaintainerCheck(ctx, token, owner, name, username)
		if isFork {
			return nil, fmt.Errorf("forks are excluded from maintainer claims (AC2)")
		}
		if chkErr == nil && isMember {
			verified = true
		}
	}

	// 2. If not verified via org, verify via raw file at HEAD of default branch (AC2, AC5)
	if !verified {
		fileVerified, isFork, rawErr := s.verifyRawProofFile(ctx, owner, name, claim.NonceToken)
		if isFork {
			return nil, fmt.Errorf("forks are excluded from maintainer claims (AC2)")
		}
		if rawErr != nil {
			verifyErr = rawErr
		} else if fileVerified {
			verified = true
		}
	}

	if !verified {
		if verifyErr != nil {
			return nil, fmt.Errorf("verification failed (retryable): %w", verifyErr)
		}
		return nil, fmt.Errorf("verification failed: proof file `%s` not found at HEAD of default branch or nonce did not match `crank-claim: %s`", ProofFileName, claim.NonceToken)
	}

	// AC3: Verify claim inside tx (enforces one verified claim per repo)
	if err := s.claimRepo.VerifyClaimTx(ctx, tx, claim.ID); err != nil {
		return nil, fmt.Errorf("conflict: %w (409)", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit verification: %w", err)
	}

	// AC5: a verified claimant is subscribed to the weekly rank-change
	// report emails through the existing crank_alerts/watchlist stack.
	s.subscribeToWeeklyRankEmails(ctx, userID, repoID)

	claim.State = string(repository.ClaimStateVerified)
	now := time.Now().UTC()
	claim.VerifiedAt = &now

	return toClaimDTO(claim, fullName), nil
}

// verifyRawProofFile fetches the proof file from raw.githubusercontent.com / GitHub API with 3x backoff retry (AC2, AC5).
func (s *Service) verifyRawProofFile(ctx context.Context, owner, name, expectedNonce string) (verified bool, isFork bool, err error) {
	// First verify repo is not a fork via GitHub API (AC2)
	isFork, forkErr := s.checkIsFork(ctx, owner, name)
	if forkErr != nil {
		// If checkIsFork failed due to rate limit or 5xx, fail-closed
		return false, false, forkErr
	}
	if isFork {
		return false, true, nil
	}

	expectedLine := fmt.Sprintf("crank-claim: %s", strings.TrimSpace(expectedNonce))
	// AC2 accepted proofs: `.github/verify-<nonce>.md`, the root proof files,
	// or a nonce line anywhere in README.md.
	fileNames := []string{
		fmt.Sprintf(".github/verify-%s.md", expectedNonce),
		ProofFileName,
		ProofFileNameAlt,
		"README.md",
	}

	var lastErr error
	for _, fn := range fileNames {
		// Backoff retry x3 (AC5)
		for attempt := 1; attempt <= 3; attempt++ {
			reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second) // Fail closed if timeout > 5s (AC5)
			rawURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/%s", owner, name, fn)

			req, rErr := http.NewRequestWithContext(reqCtx, http.MethodGet, rawURL, nil)
			if rErr != nil {
				cancel()
				lastErr = rErr
				break
			}
			req.Header.Set("User-Agent", "Opendoor-Maintainer-Verification/1.0")

			resp, doErr := s.httpClient.Do(req)
			if doErr != nil {
				cancel()
				lastErr = fmt.Errorf("raw file fetch timeout/network error: %w", doErr)
				time.Sleep(time.Duration(attempt*100) * time.Millisecond)
				continue
			}

			body, readErr := io.ReadAll(resp.Body)
			resp.Body.Close()
			cancel()

			if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
				lastErr = fmt.Errorf("github raw file API error (status %d, fail-closed)", resp.StatusCode)
				time.Sleep(time.Duration(attempt*100) * time.Millisecond)
				continue
			}

			if resp.StatusCode == http.StatusOK && readErr == nil {
				content := strings.TrimSpace(string(body))
				// Match exact line or token
				if strings.Contains(content, expectedLine) || strings.TrimSpace(content) == expectedNonce {
					return true, false, nil
				}
			}

			// If 404, file not found on this attempt
			if resp.StatusCode == http.StatusNotFound {
				break
			}
		}
	}

	return false, false, lastErr
}

func (s *Service) checkIsFork(ctx context.Context, owner, name string) (bool, error) {
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, name)
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, apiURL, nil)
	if err != nil {
		return false, err
	}
	if s.cfg.GithubToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.cfg.GithubToken)
	}
	req.Header.Set("User-Agent", "Opendoor-Maintainer-Verification/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("check fork api error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode >= 500 {
		return false, fmt.Errorf("github api failure (status %d, fail-closed)", resp.StatusCode)
	}

	if resp.StatusCode == http.StatusNotFound {
		return false, fmt.Errorf("repository not found on github: %s/%s", owner, name)
	}

	var data struct {
		Fork bool `json:"fork"`
	}
	if err := jsonDecode(resp.Body, &data); err != nil {
		return false, err
	}

	return data.Fork, nil
}

// githubMaintainerCheck validates via the user's OAuth token that they hold
// push/admin rights ON THAT REPO (collaborator permission check) or are the
// repo owner - mere org membership is NOT sufficient (AC1). It also reports
// the repo's CURRENT full_name so re-checks can detect a transfer (binding
// stays keyed by immutable repo ID).
func (s *Service) githubMaintainerCheck(ctx context.Context, userAccessToken, owner, name, username string) (isMember bool, isFork bool, currentFullName string, err error) {
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Check repository permissions using user's OAuth access token
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, name)
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, apiURL, nil)
	if err != nil {
		return false, false, "", err
	}
	req.Header.Set("Authorization", "Bearer "+userAccessToken)
	req.Header.Set("User-Agent", "Opendoor-Maintainer-Verification/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, false, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var repoData struct {
			FullName    string `json:"full_name"`
			Fork        bool   `json:"fork"`
			Permissions struct {
				Admin bool `json:"admin"`
				Push  bool `json:"push"`
			} `json:"permissions"`
			Owner struct {
				Login string `json:"login"`
			} `json:"owner"`
		}
		if err := jsonDecode(resp.Body, &repoData); err == nil {
			currentFullName = repoData.FullName
			if repoData.Fork {
				return false, true, currentFullName, nil
			}
			if repoData.Permissions.Admin || repoData.Permissions.Push || strings.EqualFold(repoData.Owner.Login, username) {
				return true, false, currentFullName, nil
			}
		}
	}

	return false, false, currentFullName, nil
}

// RunWeeklyReverification is the scheduled weekly cron body (AC4): every
// stale verified claim is re-checked (API perm check or file presence);
// failures mark the claim 'lapsed' (console locked) with a 7-day grace email,
// recovered lapses restore, and lapses that fall out of grace are released.
func (s *Service) RunWeeklyReverification(ctx context.Context) (int, int, error) {
	return s.ReverifyStaleClaims(ctx, 7*24*time.Hour)
}

// ReverifyStaleClaims re-checks verified AND lapsed claims whose
// last_checked_at is older than olderThan (AC4).
func (s *Service) ReverifyStaleClaims(ctx context.Context, olderThan time.Duration) (int, int, error) {
	claims, err := s.claimRepo.ListStaleClaimsForRecheck(ctx, olderThan, 500)
	if err != nil {
		return 0, 0, err
	}

	kept := 0
	failed := 0

	for i := range claims {
		if s.evaluateVerifiedClaim(ctx, &claims[i]) {
			kept++
		} else {
			failed++
		}
	}

	return kept, failed, nil
}

// ReverifyUserClaims re-validates every verified claim of one user at login
// time (AC2): lost org membership/admin rights or a repo transfer auto-revokes
// with exactly one email notification.
func (s *Service) ReverifyUserClaims(ctx context.Context, userID int64) (int, int, error) {
	claims, err := s.claimRepo.ListVerifiedClaimsByUser(ctx, userID)
	if err != nil {
		return 0, 0, err
	}

	reverified := 0
	revoked := 0

	for i := range claims {
		if s.evaluateVerifiedClaim(ctx, &claims[i]) {
			reverified++
		} else {
			revoked++
		}
	}

	return reverified, revoked, nil
}

// evaluateVerifiedClaim re-checks one claim against GitHub using the
// verifier's OAuth token ONLY - the proof file is irrelevant post-verification
// (AC1). Returns true when the claim remains valid (including fail-closed
// skips); false when it lapsed or was released.
func (s *Service) evaluateVerifiedClaim(ctx context.Context, c *repository.RepoClaimRecord) bool {
	fullName := c.FullName
	if fullName == "" {
		// Legacy row: resolve from the repositories table by immutable ID.
		var stored string
		if err := s.db.GetContext(ctx, &stored, `SELECT full_name FROM repositories WHERE id = ?`, c.RepoID); err == nil && strings.Contains(stored, "/") {
			fullName = stored
		}
	}
	owner, name, ok := splitFullName(fullName)
	if !ok {
		slog.Warn("claim recheck skipped: cannot resolve owner/name (fail-closed)", "claim_id", c.ID, "repo_id", c.RepoID)
		return true
	}

	var username string
	if err := s.db.GetContext(ctx, &username, `SELECT username FROM users WHERE id = ?`, c.OwnerUserID); err != nil {
		slog.Warn("claim recheck skipped: user lookup failed (fail-closed)", "claim_id", c.ID, "err", err)
		return true
	}

	token, tokenErr := s.tokenMgr.GetValidGithubToken(ctx, c.OwnerUserID)
	if tokenErr != nil || token == "" {
		slog.Warn("claim recheck skipped: no usable github token (fail-closed)", "user_id", c.OwnerUserID)
		return true
	}

	verified, isFork, currentFullName, chkErr := s.githubMaintainerCheck(ctx, token, owner, name, username)
	switch {
	case chkErr != nil:
		// GitHub API failure / rate limit: fail closed without touching state.
		slog.Warn("claim recheck fail-closed: github api error", "repo", fullName, "err", chkErr)
		return true
	case isFork:
		s.handleRecheckFailure(ctx, c, fullName, "Repository is now a fork")
		return false
	case currentFullName != "" && !strings.EqualFold(currentFullName, fullName):
		// Repo transferred to another owner: verifier no longer governs it (AC1).
		s.handleRecheckFailure(ctx, c, fullName, fmt.Sprintf("Repository transferred from %s to %s", fullName, currentFullName))
		return false
	case verified:
		if c.State == string(repository.ClaimStateLapsed) {
			// AC4: recovered within the 7-day grace window.
			if err := s.claimRepo.RestoreLapsedClaim(ctx, c.ID); err != nil {
				slog.Error("claim restore failed", "claim_id", c.ID, "err", err)
				return false
			}
			return true
		}
		_ = s.claimRepo.TouchClaimChecked(ctx, c.ID)
		return true
	default:
		s.handleRecheckFailure(ctx, c, fullName, "Verifier lost push/admin permission on the repository")
		return false
	}
}

// handleRecheckFailure applies the AC4 lifecycle to one failed weekly check:
// a verified claim becomes 'lapsed' (console locked) with a grace email;
// a lapsed claim past its 7-day grace is released for re-claim.
func (s *Service) handleRecheckFailure(ctx context.Context, c *repository.RepoClaimRecord, fullName, reason string) {
	if c.State == string(repository.ClaimStateLapsed) {
		if time.Since(c.UpdatedAt) > lapseGracePeriod {
			s.revokeClaimWithNotice(ctx, c, fullName, fmt.Sprintf("%s (claim released after %d-day grace period)", reason, int(lapseGracePeriod.Hours()/24)))
		} else {
			slog.Info("claim stays lapsed within grace window", "claim_id", c.ID, "repo", fullName)
		}
		return
	}

	if err := s.claimRepo.LapseClaim(ctx, c.ID, reason); err != nil {
		slog.Error("claim lapse failed", "claim_id", c.ID, "err", err)
		return
	}

	alertCfg := notification.CRankAlertConfig{
		Mailer:    notification.NewSMTPMailer(s.cfg.SMTPHost, s.cfg.SMTPPort, s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPFrom),
		BaseURL:   s.cfg.AppBaseURL,
		JobSecret: s.cfg.JobSecret,
	}
	if err := notification.SendClaimLapseAlert(ctx, s.db, alertCfg, c.OwnerUserID, fullName, reason); err != nil {
		slog.Warn("claim lapse email failed", "claim_id", c.ID, "err", err)
	}
}

// revokeClaimWithNotice revokes one claim and sends exactly one email notice
// through the existing notification stack (AC2).
func (s *Service) revokeClaimWithNotice(ctx context.Context, c *repository.RepoClaimRecord, fullName, reason string) {
	if err := s.claimRepo.RevokeClaim(ctx, c.ID, reason); err != nil {
		slog.Error("claim revocation failed", "claim_id", c.ID, "err", err)
		return
	}
	alertCfg := notification.CRankAlertConfig{
		Mailer:    notification.NewSMTPMailer(s.cfg.SMTPHost, s.cfg.SMTPPort, s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPFrom),
		BaseURL:   s.cfg.AppBaseURL,
		JobSecret: s.cfg.JobSecret,
	}
	if err := notification.SendClaimRevocationAlert(ctx, s.db, alertCfg, c.OwnerUserID, fullName, reason); err != nil {
		slog.Warn("claim revocation email failed", "claim_id", c.ID, "err", err)
	}
}

// claimerMention resolves "@username" for a conflict notice (AC3); empty
// string when the user record is unavailable.
func (s *Service) claimerMention(ctx context.Context, userID int64) string {
	var username string
	if err := s.db.GetContext(ctx, &username, `SELECT username FROM users WHERE id = ?`, userID); err != nil || username == "" {
		return ""
	}
	return "@" + username
}

// ConflictError signals an AC3 ownership conflict; ClaimedBy carries the
// winning maintainer's "@handle" when resolvable.
type ConflictError struct {
	ClaimedBy string
}

func (e *ConflictError) Error() string {
	if e.ClaimedBy != "" {
		return fmt.Sprintf("repository already claimed by %s", e.ClaimedBy)
	}
	return "repository already claimed by another maintainer"
}

func newConflictError(claimedBy string) error {
	return &ConflictError{ClaimedBy: claimedBy}
}

// subscribeToWeeklyRankEmails upserts an opted-in watchlist row so the
// verified claimant receives weekly crank_alerts/watchlist_digest rank-change
// emails through the existing notification stack (AC5).
func (s *Service) subscribeToWeeklyRankEmails(ctx context.Context, userID int64, repoID string) {
	query := `
		INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
		VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE notify_rank_change = VALUES(notify_rank_change)
	`
	if s.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
			VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, repo_id) DO UPDATE SET notify_rank_change = TRUE
		`
	}
	if _, err := s.db.ExecContext(ctx, query, userID, repoID); err != nil {
		slog.Warn("weekly rank-email subscription failed", "user_id", userID, "repo_id", repoID, "err", err)
	}
}

// RevokeOwnClaim lets the current claimant relinquish their claim via the
// revoke link, freeing the repo for re-claim by someone else (AC3).
func (s *Service) RevokeOwnClaim(ctx context.Context, owner, name string, userID int64) error {
	fullName := owner + "/" + name
	repo, err := s.repoRepo.FindByIDOrName(ctx, fullName)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup repo: %w", err)
	}

	repoID := fullName
	if repo != nil && repo.ID != "" {
		repoID = repo.ID
	}

	claimRec, err := s.claimRepo.GetClaimByRepoAndUser(ctx, repoID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no claim found for this repository (404)")
		}
		return err
	}

	return s.claimRepo.RevokeClaim(ctx, claimRec.ID, "revoked by maintainer: claim released for transfer")
}

func splitFullName(fn string) (owner, name string, ok bool) {
	parts := strings.Split(fn, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

// MaintainerConsolePayload encapsulates C-Rank breakdown, checklist, and claim status (AC6).
type MaintainerConsolePayload struct {
	RepoFullName string                             `json:"repo_full_name"`
	IsClaimed    bool                               `json:"is_claimed"`
	IsVerified   bool                               `json:"is_verified"`
	Claim        *RepoClaimRecordDTO                `json:"claim,omitempty"`
	CRankScore   float64                            `json:"c_rank_score"`
	CRankTier    string                             `json:"c_rank_tier"`
	Breakdown    CRankBreakdownDTO                  `json:"breakdown"`
	Checklist    []scoring.MaintainerChecklistItem  `json:"checklist"`
}

type CRankBreakdownDTO struct {
	ExternalPRMergeRate      float64 `json:"external_pr_merge_rate"`
	TimeToFirstResponseHours float64 `json:"time_to_first_response_hours"`
	ResponseP50Hours         float64 `json:"response_p50_hours"`
	ResponseP90Hours         float64 `json:"response_p90_hours"`
	TimeToMergeHours         float64 `json:"time_to_merge_hours"`
	FirstTimerSuccessRate    float64 `json:"first_timer_success_rate"`
	RepeatContributorRate    float64 `json:"repeat_contributor_rate"`
	MaintainerResponsiveness float64 `json:"maintainer_responsiveness"`
	DistinctMaintainerCount  float64 `json:"distinct_maintainer_count"`
	BusFactor                int     `json:"bus_factor"`
	GoodFirstIssueCount      int     `json:"good_first_issue_count"`
	OnboardingScore          int     `json:"onboarding_score"`
}

type RepoClaimRecordDTO struct {
	ID                 int64      `json:"id"`
	RepoID             string     `json:"repo_id"`
	OwnerUserID        int64      `json:"owner_user_id"`
	VerificationMethod string     `json:"verification_method"`
	State              string     `json:"state"`
	VerifiedAt         *time.Time `json:"verified_at"`
	LastCheckedAt      *time.Time `json:"last_checked_at"`
	ExpiresAt          time.Time  `json:"expires_at"`
}

func toClaimDTO(c *repository.RepoClaimRecord, fullName string) *RepoClaimRecordDTO {
	return &RepoClaimRecordDTO{
		ID:                 c.ID,
		RepoID:             fullName,
		OwnerUserID:        c.OwnerUserID,
		VerificationMethod: c.VerificationMethod,
		State:              c.State,
		VerifiedAt:         c.VerifiedAt,
		LastCheckedAt:      c.LastCheckedAt,
		ExpiresAt:          c.ExpiresAt,
	}
}

// GetMaintainerConsole fetches full console data for a claimed repo (AC6).
func (s *Service) GetMaintainerConsole(ctx context.Context, owner, name string, requestingUserID int64) (*MaintainerConsolePayload, error) {
	fullName := owner + "/" + name
	repo, err := s.repoRepo.FindByIDOrName(ctx, fullName)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup repo: %w", err)
	}

	repoID := fullName
	if repo != nil && repo.ID != "" {
		repoID = repo.ID
	}

	claim, err := s.claimRepo.GetVerifiedClaimByRepoID(ctx, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup claim: %w", err)
	}

	if claim == nil || claim.OwnerUserID != requestingUserID {
		// AC4: give the claimant a precise lock reason instead of a generic 403.
		if own, err := s.claimRepo.GetClaimByRepoAndUser(ctx, repoID, requestingUserID); err == nil && own != nil {
			switch own.State {
			case string(repository.ClaimStateLapsed):
				return nil, errors.New("403: your maintainer claim lapsed after a failed weekly re-check; re-verify within the 7-day grace window to restore console access")
			case string(repository.ClaimStatePending):
				return nil, errors.New("403: your claim is still pending verification")
			}
		}
		return nil, fmt.Errorf("unauthorized: verified maintainer claim required for console access (403)")
	}

	// Trigger on-demand re-verification if older than 30d (AC2): OAuth-scope
	// check only, never the proof file (AC5). Async so console load is fast.
	if claim.LastCheckedAt != nil && time.Since(*claim.LastCheckedAt) > 30*24*time.Hour {
		go func(rec repository.RepoClaimRecord) {
			bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			s.evaluateVerifiedClaim(bgCtx, &rec)
		}(*claim)
	}

	var (
		score float64 = 0
		tier  string  = "D"
		effP50 float64 = 0
		timeToFirst float64 = 0
		mergeRate float64 = 0
		firstTimer float64 = 0
		gfiCount int = 0
		busFactor int = 1
		onboardScore int = 0
	)

	if repo != nil {
		score = repo.CRankScore
		tier = repo.CRankTier
		effP50 = repo.ResponseP50Hours
		timeToFirst = repo.TimeToFirstResponseHours
		mergeRate = repo.ExternalPRMergeRate
		firstTimer = repo.FirstTimerSuccessRate
		gfiCount = repo.GoodFirstIssueCount
		busFactor = repo.BusFactor
		onboardScore = repo.OnboardingScore
	}

	// Generate top 5 prioritized checklist items (AC6)
	hasContributing := onboardScore >= 40
	hasPRTemplate := onboardScore >= 65 || onboardScore == 25
	hasIssueTemplate := onboardScore >= 85

	checklist := scoring.GenerateMaintainerChecklist(
		effP50,
		timeToFirst,
		mergeRate,
		firstTimer,
		hasContributing,
		hasPRTemplate,
		hasIssueTemplate,
		gfiCount,
		busFactor,
	)

	return &MaintainerConsolePayload{
		RepoFullName: fullName,
		IsClaimed:    true,
		IsVerified:   true,
		Claim:        toClaimDTO(claim, fullName),
		CRankScore:   score,
		CRankTier:    tier,
		Breakdown: CRankBreakdownDTO{
			ExternalPRMergeRate:      mergeRate,
			TimeToFirstResponseHours: timeToFirst,
			ResponseP50Hours:         effP50,
			ResponseP90Hours:         repo.ResponseP90Hours,
			TimeToMergeHours:         repo.TimeToMergeHours,
			FirstTimerSuccessRate:    firstTimer,
			RepeatContributorRate:    repo.RepeatContributorRate,
			MaintainerResponsiveness: repo.MaintainerResponsiveness,
			DistinctMaintainerCount:  repo.DistinctMaintainerCount,
			BusFactor:                busFactor,
			GoodFirstIssueCount:      gfiCount,
			OnboardingScore:          onboardScore,
		},
		Checklist: checklist,
	}, nil
}

func (s *Service) reverifySingleClaim(ctx context.Context, claimID int64, owner, name, nonce string, userID int64) {
	fileVerified, isFork, err := s.verifyRawProofFile(ctx, owner, name, nonce)
	if isFork || (!fileVerified && err == nil) {
		reason := "Proof file removed or verification criteria unmet during 30d check"
		_ = s.claimRepo.RevokeClaim(ctx, claimID, reason)
		alertCfg := notification.CRankAlertConfig{
			Mailer:    notification.NewSMTPMailer(s.cfg.SMTPHost, s.cfg.SMTPPort, s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPFrom),
			BaseURL:   s.cfg.AppBaseURL,
			JobSecret: s.cfg.JobSecret,
		}
		_ = notification.SendClaimRevocationAlert(ctx, s.db, alertCfg, userID, owner+"/"+name, reason)
	} else if fileVerified {
		_ = s.claimRepo.TouchClaimChecked(ctx, claimID)
	}
}

func jsonDecode(r io.Reader, v any) error {
	b, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	return jsonUnmarshal(b, v)
}

func jsonUnmarshal(data []byte, v any) error {
	return json.Unmarshal(data, v)
}
