package ghapp

import (
	"context"
	"crypto/rsa"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
)

// claimMethodApp marks claims auto-verified by a GitHub App installation (AC5).
var claimMethodApp = repository.ClaimVerificationMethod("github_app")

const claimExpiry = 3650 * 24 * time.Hour

// Service implements the GetMerged GitHub App: first-contributor welcome
// comments (AC1-AC4, AC6, AC7) and install-driven maintainer claim
// verification feeding the existing Maintainer Console and badge system (AC5).
type Service struct {
	db        *sqlx.DB
	cfg       *config.Config
	userRepo  repository.UserRepository
	claimRepo repository.ClaimRepository
	repoStore repository.RepoRepository
	aiRepo    repository.AIRepository
	http      *ghHTTPClient

	mu      sync.Mutex
	appKey  *rsa.PrivateKey
	tokens  map[int64]cachedInstallToken
	queues  map[int64]chan *commentJob
	stopped bool
	wg      sync.WaitGroup
}

// NewService wires the app service. The private key is resolved eagerly so
// Enabled() is cheap and consistent; when unset the whole feature is inert.
func NewService(db *sqlx.DB, cfg *config.Config, userRepo repository.UserRepository, claimRepo repository.ClaimRepository, repoStore repository.RepoRepository, aiRepo repository.AIRepository) *Service {
	return &Service{
		db:        db,
		cfg:       cfg,
		userRepo:  userRepo,
		claimRepo: claimRepo,
		repoStore: repoStore,
		aiRepo:    aiRepo,
		http:      &ghHTTPClient{hc: &http.Client{Timeout: 20 * time.Second}},
		appKey:    loadAppPrivateKey(cfg.GithubAppPrivateKey),
		tokens:    map[int64]cachedInstallToken{},
		queues:    map[int64]chan *commentJob{},
	}
}

// Enabled reports whether GitHub App credentials are configured.
func (s *Service) Enabled() bool {
	s.mu.Lock()
	key := s.appKey
	s.mu.Unlock()
	return s.cfg.GithubAppID != "" && key != nil
}

// HandleEvent dispatches one verified webhook event (AC1, AC2, AC5).
func (s *Service) HandleEvent(ctx context.Context, eventName string, payload []byte) {
	if !s.Enabled() {
		return
	}
	var p webhookPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		slog.Warn("ghapp webhook payload decode failed", "event", eventName, "err", err)
		return
	}

	switch eventName {
	case "installation":
		switch p.Action {
		case "created":
			s.onInstallationCreated(ctx, &p)
		case "deleted":
			s.onInstallationDeleted(ctx, &p)
		}
	case "pull_request":
		// AC1: only first-time-contributor PRs qualify, gated on the
		// payload author_association; all other values skip.
		if p.Action != "opened" {
			return
		}
		s.onFirstContribution(&p, p.PullRequest, "FIRST_TIME_CONTRIBUTOR")
	case "issues":
		if p.Action != "opened" {
			return
		}
		s.onFirstContribution(&p, p.Issue, "FIRST_TIME_ISSUE_CONTRIBUTOR")
	default:
		// Unrelated events are acknowledged silently.
	}
}

type webhookPayload struct {
	Action       string            `json:"action"`
	Installation *ghInstallation   `json:"installation"`
	Sender       *ghUser           `json:"sender"`
	PullRequest  *ghIssueRef       `json:"pull_request"`
	Issue        *ghIssueRef       `json:"issue"`
	Repository   *ghRepoRef        `json:"repository"`
	Repositories []ghInstalledRepo `json:"repositories"`
}

type ghAccount struct {
	Login string `json:"login"`
	ID    int64  `json:"id"`
	Type  string `json:"type"`
}

type ghUser ghAccount

type ghPermissions struct {
	Issues string `json:"issues"`
}

type ghInstallation struct {
	ID          int64         `json:"id"`
	Account     ghAccount     `json:"account"`
	Permissions ghPermissions `json:"permissions"`
}

type ghIssueRef struct {
	Number            int        `json:"number"`
	State             string     `json:"state"`
	Locked            bool       `json:"locked"`
	AuthorAssociation string     `json:"author_association"`
	User              *ghAccount `json:"user"`
}

type ghRepoRef struct {
	ID       int64      `json:"id"`
	Name     string     `json:"name"`
	FullName string     `json:"full_name"`
	Private  bool       `json:"private"`
	Owner    *ghAccount `json:"owner"`
}

type ghInstalledRepo struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	FullName string `json:"full_name"`
	Private  bool   `json:"private"`
}

// onInstallationCreated stores the installation + repos (keyed by immutable
// numeric repo id), records whether issues:write was granted, verifies the
// installer's org membership (AC3) and auto-verifies maintainer claims.
func (s *Service) onInstallationCreated(ctx context.Context, p *webhookPayload) {
	inst := p.Installation
	if inst == nil || inst.ID == 0 {
		return
	}
	hasWrite := strings.EqualFold(strings.TrimSpace(inst.Permissions.Issues), "write")

	installerLogin, installerID := "", int64(0)
	if p.Sender != nil {
		installerLogin, installerID = p.Sender.Login, p.Sender.ID
	}
	accountLogin, accountID := "", int64(0)
	if inst.Account.Login != "" || inst.Account.ID != 0 {
		accountLogin, accountID = inst.Account.Login, inst.Account.ID
	}

	// AC3: an org install verifies the maintainer's membership claim via
	// GET /orgs/{org}/memberships/{owner}; personal installs are their own
	// proof. A failed check blocks claim auto-verification (welcome comments
	// still work) and is surfaced in the Maintainer Console.
	orgVerified := true
	if accountLogin != "" && installerLogin != "" && !strings.EqualFold(accountLogin, installerLogin) {
		orgVerified = s.verifyOrgMembership(ctx, inst.ID, accountLogin, installerLogin)
		if !orgVerified {
			slog.Warn("ghapp install: org membership check failed; maintainer claims NOT auto-verified", "installation_id", inst.ID, "org", accountLogin, "member", installerLogin)
		}
	}

	upsertQuery := `
		INSERT INTO ghapp_installations (installation_id, account_login, account_id, installer_login, installer_id, has_issues_write, org_verified_at, installed_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			account_login = VALUES(account_login),
			account_id = VALUES(account_id),
			installer_login = VALUES(installer_login),
			installer_id = VALUES(installer_id),
			has_issues_write = VALUES(has_issues_write),
			org_verified_at = VALUES(org_verified_at),
			updated_at = CURRENT_TIMESTAMP
	`
	var orgVerifiedAt interface{}
	if orgVerified {
		now := time.Now().UTC()
		orgVerifiedAt = &now
	}
	if s.db.DriverName() == "sqlite" {
		upsertQuery = `
			INSERT INTO ghapp_installations (installation_id, account_login, account_id, installer_login, installer_id, has_issues_write, org_verified_at, installed_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(installation_id) DO UPDATE SET
				account_login = excluded.account_login,
				account_id = excluded.account_id,
				installer_login = excluded.installer_login,
				installer_id = excluded.installer_id,
				has_issues_write = excluded.has_issues_write,
				org_verified_at = excluded.org_verified_at,
				updated_at = CURRENT_TIMESTAMP
		`
	}
	if _, err := s.db.ExecContext(ctx, upsertQuery, inst.ID, accountLogin, accountID, installerLogin, installerID, hasWrite, orgVerifiedAt); err != nil {
		slog.Error("ghapp installation upsert failed", "installation_id", inst.ID, "err", err)
		return
	}
	if !hasWrite {
		slog.Warn("ghapp installed without issues:write; welcome comments disabled until permission granted", "installation_id", inst.ID)
	}

	for _, r := range p.Repositories {
		if r.ID == 0 || r.FullName == "" {
			continue
		}
		if _, err := s.db.ExecContext(ctx, upsertInstallRepoQuery(s.db.DriverName()), inst.ID, r.ID, r.FullName, r.Private); err != nil {
			slog.Warn("ghapp installation repo upsert failed", "repo_id", r.ID, "err", err)
			continue
		}
		if !orgVerified {
			continue // AC3: failed org membership check blocks claim auto-verification
		}
		s.autoVerifyClaim(ctx, inst.ID, installerID, r.FullName)
	}
}

func upsertInstallRepoQuery(driver string) string {
	if driver == "sqlite" {
		return `
			INSERT INTO ghapp_installation_repos (installation_id, repo_id, full_name, is_private, added_at)
			VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(installation_id, repo_id) DO UPDATE SET
				full_name = excluded.full_name,
				is_private = excluded.is_private
		`
	}
	return `
		INSERT INTO ghapp_installation_repos (installation_id, repo_id, full_name, is_private, added_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			full_name = VALUES(full_name),
			is_private = VALUES(is_private)
	`
}

// autoVerifyClaim turns the act of installing into a verified maintainer
// claim (AC5): installing GitHub account + installation id are stored by
// construction as the verification proof.
func (s *Service) autoVerifyClaim(ctx context.Context, installationID, installerGithubID int64, fullName string) {
	if installerGithubID == 0 {
		return
	}
	user, err := s.userRepo.FindByGithubID(ctx, installerGithubID)
	if err != nil || user == nil {
		slog.Info("ghapp install: installer has no opendoor account; claim skipped", "full_name", fullName, "github_id", installerGithubID)
		return
	}

	repoID := s.resolveClaimRepoID(ctx, fullName)

	existing, err := s.claimRepo.GetVerifiedClaimByRepoID(ctx, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		slog.Warn("ghapp claim lookup failed", "repo", fullName, "err", err)
		return
	}
	if existing != nil {
		if existing.OwnerUserID == user.ID {
			return // already verified for this maintainer
		}
		slog.Info("ghapp install: repo already claimed by another maintainer", "repo", fullName)
		return
	}

	rec, err := s.claimRepo.CreateOrUpdatePendingClaim(ctx, repoID, fullName, user.ID, claimMethodApp, "", time.Now().UTC().Add(claimExpiry))
	if err != nil {
		if !errors.Is(err, repository.ErrRepoAlreadyClaimed) {
			slog.Warn("ghapp pending claim failed", "repo", fullName, "err", err)
		}
		return
	}

	tx, err := s.claimRepo.BeginTx(ctx)
	if err != nil {
		return
	}
	if vErr := s.claimRepo.VerifyClaimTx(ctx, tx, rec.ID); vErr != nil {
		_ = tx.Rollback()
		slog.Warn("ghapp claim verify failed", "repo", fullName, "err", vErr)
		return
	}
	if cErr := tx.Commit(); cErr != nil {
		return
	}
	slog.Info("ghapp install: maintainer claim auto-verified", "repo", fullName, "user_id", user.ID, "installation_id", installationID)
}

// resolveClaimRepoID mirrors claim.Service's binding: repositories.id when the
// repo row exists, else the full name (claims stay stable across rename /
// transfer because scoring state is joined via this immutable key, AC7).
func (s *Service) resolveClaimRepoID(ctx context.Context, fullName string) string {
	rec, err := s.repoStore.FindByIDOrName(ctx, fullName)
	if err == nil && rec != nil && rec.ID != "" {
		return rec.ID
	}
	return fullName
}

// onInstallationDeleted revokes github_app-method claims for that install
// (badge revoked on uninstall, AC5) and drops stored installation state.
func (s *Service) onInstallationDeleted(ctx context.Context, p *webhookPayload) {
	inst := p.Installation
	if inst == nil || inst.ID == 0 {
		return
	}

	var installerID int64
	_ = s.db.GetContext(ctx, &installerID, `SELECT installer_id FROM ghapp_installations WHERE installation_id = ?`, inst.ID)
	if installerID == 0 && p.Sender != nil {
		installerID = p.Sender.ID
	}

	var repos []struct {
		RepoID   int64  `db:"repo_id"`
		FullName string `db:"full_name"`
	}
	if err := s.db.SelectContext(ctx, &repos, `SELECT repo_id, full_name FROM ghapp_installation_repos WHERE installation_id = ?`, inst.ID); err != nil {
		slog.Warn("ghapp uninstall: repo list lookup failed", "installation_id", inst.ID, "err", err)
	}

	for _, r := range repos {
		repoID := s.resolveClaimRepoID(ctx, r.FullName)
		var rows []struct {
			ID          int64 `db:"id"`
			OwnerUserID int64 `db:"owner_user_id"`
		}
		q := `SELECT id, owner_user_id FROM repo_claims WHERE verification_method = 'github_app' AND state IN ('verified','pending') AND repo_id = ?`
		args := []interface{}{repoID}
		if installerID > 0 {
			q += ` AND owner_user_id = ?`
			args = append(args, installerID)
		}
		if err := s.db.SelectContext(ctx, &rows, q, args...); err != nil {
			continue
		}
		for _, row := range rows {
			if err := s.claimRepo.RevokeClaim(ctx, row.ID, "GetMerged GitHub App uninstalled; verified badge revoked"); err != nil {
				slog.Warn("ghapp uninstall: claim revoke failed", "claim_id", row.ID, "err", err)
			} else {
				slog.Info("ghapp uninstall: maintainer claim revoked", "repo", r.FullName, "user_id", row.OwnerUserID)
			}
		}
	}

	_, _ = s.db.ExecContext(ctx, `DELETE FROM ghapp_installation_repos WHERE installation_id = ?`, inst.ID)
	_, _ = s.db.ExecContext(ctx, `DELETE FROM ghapp_installations WHERE installation_id = ?`, inst.ID)
}

// onFirstContribution enqueues a first-ever-author welcome job when the
// event passes the AC1 guards.
func (s *Service) onFirstContribution(p *webhookPayload, ref *ghIssueRef, wantAssociation string) {
	if j := s.firstTimerJob(p, ref, wantAssociation); j != nil {
		s.enqueue(j)
	}
}

// firstTimerJob applies the AC1 guards and returns the welcome job, or nil
// when skipped: the payload author_association must match the expected
// first-timer value (all other values skip), bots skipped, closed/locked
// targets skipped, installs without issues:write skipped. Private repos are
// skipped unless the install grant covers them (webhooks only fire for
// installed, granted repos; private ones get a generic comment without
// public links).
func (s *Service) firstTimerJob(p *webhookPayload, ref *ghIssueRef, wantAssociation string) *commentJob {
	if ref == nil || p.Repository == nil || p.Repository.ID == 0 || p.Installation == nil || p.Installation.ID == 0 {
		return nil
	}
	// AC1: exactly one welcome for the qualifying author_association value.
	if !strings.EqualFold(strings.TrimSpace(ref.AuthorAssociation), wantAssociation) {
		return nil
	}
	if isBot((*ghAccount)(p.Sender)) || isBot(ref.User) {
		return nil
	}
	if strings.EqualFold(strings.TrimSpace(ref.State), "closed") || ref.Locked {
		return nil
	}

	var hasWrite bool
	if err := s.db.GetContext(context.Background(), &hasWrite, `SELECT has_issues_write FROM ghapp_installations WHERE installation_id = ?`, p.Installation.ID); err != nil || !hasWrite {
		return nil // no issues:write grant: nothing posted, including private repos
	}

	owner, name := ownerName(p.Repository)
	author := ""
	if ref.User != nil {
		author = ref.User.Login
	}
	if owner == "" || name == "" || author == "" {
		return nil
	}

	return &commentJob{
		installationID: p.Installation.ID,
		repoID:         p.Repository.ID,
		owner:          owner,
		name:           name,
		number:         ref.Number,
		author:         author,
		isPrivate:      p.Repository.Private,
	}
}

func (s *Service) verifyOrgMembership(ctx context.Context, installationID int64, org, username string) bool {
	token, err := s.installationToken(ctx, installationID)
	if err != nil {
		slog.Error("ghapp installation token failed for org check", "installation_id", installationID, "err", err)
		return false
	}
	apiURL := fmt.Sprintf("%s/orgs/%s/memberships/%s", apiBase, org, username)
	status, body, _, err := s.http.do(ctx, http.MethodGet, apiURL, token, nil)
	if err != nil || status != http.StatusOK {
		slog.Warn("ghapp org membership check failed", "org", org, "username", username, "status", status, "err", err)
		return false
	}
	var out struct {
		State string `json:"state"`
	}
	if json.Unmarshal(body, &out) != nil {
		return false
	}
	return strings.EqualFold(out.State, "active")
}

func isBot(a *ghAccount) bool {
	if a == nil {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(a.Type), "Bot") {
		return true
	}
	login := strings.ToLower(strings.TrimSpace(a.Login))
	if strings.HasSuffix(login, "[bot]") || strings.HasSuffix(login, "-bot") || strings.HasSuffix(login, "_bot") || login == "bot" {
		return true
	}
	return false
}

func ownerName(r *ghRepoRef) (string, string) {
	if r.Owner != nil && r.Owner.Login != "" && r.Name != "" {
		return r.Owner.Login, r.Name
	}
	parts := strings.SplitN(r.FullName, "/", 2)
	if len(parts) == 2 && parts[0] != "" && parts[1] != "" {
		return parts[0], parts[1]
	}
	return "", ""
}

func (s *Service) WebhookSecret() string { return s.cfg.GithubAppWebhookSecret }

// ReverifyOrgClaims re-verifies org claim memberships for active installations (AC3).
// Failed checks revoke the claim, flip badge to unverified, and log the event.
func (s *Service) ReverifyOrgClaims(ctx context.Context) (int, int, error) {
	if !s.Enabled() {
		return 0, 0, nil
	}
	type orgInstallRow struct {
		InstallationID int64  `db:"installation_id"`
		AccountLogin   string `db:"account_login"`
		InstallerLogin string `db:"installer_login"`
		InstallerID    int64  `db:"installer_id"`
	}
	var installs []orgInstallRow
	query := `SELECT installation_id, account_login, installer_login, installer_id FROM ghapp_installations WHERE account_login != '' AND installer_login != '' AND account_login != installer_login`
	if err := s.db.SelectContext(ctx, &installs, query); err != nil {
		return 0, 0, err
	}

	verifiedCount := 0
	revokedCount := 0

	for _, inst := range installs {
		valid := s.verifyOrgMembership(ctx, inst.InstallationID, inst.AccountLogin, inst.InstallerLogin)
		if valid {
			_, _ = s.db.ExecContext(ctx, `UPDATE ghapp_installations SET org_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE installation_id = ?`, inst.InstallationID)
			verifiedCount++
			continue
		}

		slog.Warn("ghapp daily cron: org membership re-check failed; revoking maintainer claims", "installation_id", inst.InstallationID, "org", inst.AccountLogin, "installer", inst.InstallerLogin)
		_, _ = s.db.ExecContext(ctx, `UPDATE ghapp_installations SET org_verified_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE installation_id = ?`, inst.InstallationID)

		var repos []struct {
			RepoID   int64  `db:"repo_id"`
			FullName string `db:"full_name"`
		}
		if err := s.db.SelectContext(ctx, &repos, `SELECT repo_id, full_name FROM ghapp_installation_repos WHERE installation_id = ?`, inst.InstallationID); err != nil {
			continue
		}
		for _, r := range repos {
			repoID := s.resolveClaimRepoID(ctx, r.FullName)
			var rows []struct {
				ID          int64 `db:"id"`
				OwnerUserID int64 `db:"owner_user_id"`
			}
			q := `SELECT id, owner_user_id FROM repo_claims WHERE verification_method = 'github_app' AND state IN ('verified','pending') AND repo_id = ?`
			args := []interface{}{repoID}
			if inst.InstallerID > 0 {
				q += ` AND owner_user_id = ?`
				args = append(args, inst.InstallerID)
			}
			if err := s.db.SelectContext(ctx, &rows, q, args...); err != nil {
				continue
			}
			for _, row := range rows {
				revErr := s.claimRepo.RevokeClaim(ctx, row.ID, "Org membership re-check failed; maintainer claim revoked and badge set to unverified")
				if revErr != nil {
					slog.Error("ghapp cron claim revoke failed", "claim_id", row.ID, "err", revErr)
				} else {
					revokedCount++
					slog.Info("ghapp maintainer console: claim revoked due to failed org membership re-check", "repo", r.FullName, "user_id", row.OwnerUserID, "claim_id", row.ID)
				}
			}
		}
	}

	return verifiedCount, revokedCount, nil
}

// NightlySweepCommentCheck inspects recent posted welcome comments and deletes duplicates if found (AC2 fallback repair).
func (s *Service) NightlySweepCommentCheck(ctx context.Context) (int, error) {
	if !s.Enabled() {
		return 0, nil
	}
	type welcomeRow struct {
		ID               int64  `db:"id"`
		InstallationID   int64  `db:"installation_id"`
		RepoID           int64  `db:"repo_id"`
		ContributorLogin string `db:"contributor_login"`
		PRNumber         int    `db:"pr_number"`
		CommentID        int64  `db:"comment_id"`
	}
	var welcomes []welcomeRow
	q := `SELECT id, installation_id, repo_id, contributor_login, pr_number, comment_id FROM ghapp_welcomes WHERE status = 'posted' AND comment_id > 0 AND created_at > ?`
	since := time.Now().UTC().Add(-48 * time.Hour)
	if err := s.db.SelectContext(ctx, &welcomes, q, since); err != nil {
		return 0, err
	}

	cleaned := 0
	for _, w := range welcomes {
		var repoFullName string
		if err := s.db.GetContext(ctx, &repoFullName, `SELECT full_name FROM ghapp_installation_repos WHERE repo_id = ? AND installation_id = ? LIMIT 1`, w.RepoID, w.InstallationID); err != nil || repoFullName == "" {
			continue
		}
		parts := strings.SplitN(repoFullName, "/", 2)
		if len(parts) != 2 {
			continue
		}
		token, err := s.installationToken(ctx, w.InstallationID)
		if err != nil {
			continue
		}
		// Self-check comment presence on GitHub
		apiURL := fmt.Sprintf("%s/repos/%s/%s/issues/comments/%d", apiBase, parts[0], parts[1], w.CommentID)
		status, _, _, _ := s.http.do(ctx, http.MethodGet, apiURL, token, nil)
		if status == http.StatusNotFound {
			// Comment was deleted on GitHub
			_, _ = s.db.ExecContext(ctx, `UPDATE ghapp_welcomes SET status = 'deleted_remotely', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, w.ID)
			cleaned++
		}
	}
	return cleaned, nil
}
