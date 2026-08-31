package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/dna"
	"github.com/jmoiron/sqlx"
)

type User struct {
	ID               int64      `db:"id" json:"id"`
	GithubID         *int64     `db:"github_id" json:"github_id,omitempty"`
	GoogleID         *string    `db:"google_id" json:"google_id,omitempty"`
	Slug             *string    `db:"slug" json:"slug,omitempty"`
	Username         string     `db:"username" json:"username"`
	Email            *string    `db:"email" json:"email,omitempty"`
	AvatarURL        *string    `db:"avatar_url" json:"avatar_url,omitempty"`
	ProfilingConsent bool       `db:"profiling_consent" json:"profiling_consent"`
	PublicAccuracy   bool       `db:"public_accuracy" json:"public_accuracy"`
	IsPublic         bool       `db:"is_public" json:"is_public"`
	Bio              *string    `db:"bio" json:"bio,omitempty"`
	Headline         *string    `db:"headline" json:"headline,omitempty"`
	ShowcaseProjectsJSON *string `db:"showcase_projects_json" json:"showcase_projects_json,omitempty"`
	PinnedReposJSON  *string    `db:"pinned_repos_json" json:"pinned_repos_json,omitempty"`
	Skills           *string    `db:"skills" json:"skills,omitempty"`
	LangSnapshot     *string    `db:"lang_snapshot" json:"lang_snapshot,omitempty"`
	LangSnapshotAt   *time.Time `db:"lang_snapshot_at" json:"lang_snapshot_at,omitempty"`
	DeletedAt        *time.Time `db:"deleted_at" json:"-"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

type ShowcaseProject struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	DemoURL     string   `json:"demo_url,omitempty"`
	RepoURL     string   `json:"repo_url,omitempty"`
	IsPrivate   bool     `json:"is_private,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	ImageURLs   []string `json:"image_urls,omitempty"`
	Stars       int      `json:"stars,omitempty"`
}

type UserPublicRepo struct {
	FullName    string `json:"full_name"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Language    string `json:"language"`
	Stars       int    `json:"stars"`
	Forks       int    `json:"forks"`
	HTMLURL     string `json:"html_url"`
	IsPinned    bool   `json:"is_pinned,omitempty"`
}

type UserStats struct {
	WatchlistCount        int  `json:"watchlist_count"`
	FeedbackCount         int  `json:"feedback_count"`
	VerifiedContributions *int `json:"verified_contributions"`
}

type UserFeedbackItem struct {
	ID                  int64     `db:"id" json:"id"`
	RepositoryID        string    `db:"repository_id" json:"repo_id"`
	RepoFullName        string    `db:"repo_full_name" json:"repo_full_name"`
	RepoLanguage        string    `db:"repo_language" json:"repo_language"`
	MaintainerRating    int       `db:"maintainer_rating" json:"maintainer_rating"`
	ReviewSpeedRating   int       `db:"review_speed_rating" json:"review_speed_rating"`
	BeginnerRating      int       `db:"beginner_friendly_rating" json:"beginner_rating"`
	Comment             *string   `db:"comment" json:"comment,omitempty"`
	VerifiedContributor bool      `db:"verified_pr_author" json:"verified_contributor"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
}

type UserProfile struct {
	Slug        string             `json:"slug"`
	Username    string             `json:"username"`
	AvatarURL   *string            `json:"avatar_url,omitempty"`
	Bio         string             `json:"bio,omitempty"`
	Headline    string             `json:"headline,omitempty"`
	MemberSince time.Time          `json:"member_since"`
	GithubURL   *string            `json:"github_url,omitempty"`
	Stats       UserStats          `json:"stats"`
	Watchlist   []RepoRecord       `json:"watchlist"`
	Feedback    []UserFeedbackItem `json:"feedback"`
	DNA         *dna.Result        `json:"dna,omitempty"`
}

type PublicRepoTier struct {
	FullName  string `json:"full_name"`
	CRankTier string `json:"c_rank_tier"`
}

// PublicEvalItem is one row of the /u profile eval feed (latest 20).
type PublicEvalItem struct {
	RepoFullName   string    `db:"repository_full_name" json:"repository_full_name"`
	PRNumber       *int      `db:"pr_number" json:"pr_number,omitempty"`
	PredictedScore int       `db:"predicted_score" json:"predicted_score"`
	Outcome        string    `db:"outcome" json:"outcome"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// PublicContributorProfile is the /u/[username] payload: aggregate forecast
// track record only. Accuracy is nil when nothing has settled yet so callers
// hide it instead of rendering 0%/NaN.
type PublicContributorProfile struct {
	Slug             string            `json:"slug"`
	Username         string            `json:"username"`
	AvatarURL        *string           `json:"avatar_url,omitempty"`
	Bio              string            `json:"bio,omitempty"`
	Headline         string            `json:"headline,omitempty"`
	MemberSince      time.Time         `json:"member_since"`
	IsPublic         bool              `json:"is_public"`
	IsPro            bool              `json:"is_pro"`
	TotalEvals       int               `json:"total_evals"`
	AccuracyRate     *float64          `json:"accuracy_rate"`
	AccuracyN        int               `json:"accuracy_n"`
	MergedCount      int               `json:"merged_count"`
	Repos            []PublicRepoTier  `json:"repos"`
	PublicRepos      []UserPublicRepo  `json:"public_repos"`
	ShowcaseProjects []ShowcaseProject `json:"showcase_projects"`
	Evals            []PublicEvalItem  `json:"evals"`
	// Contributor XP season (AC2/AC8): level/streak/season rank attached from
	// the pr-eval store. Level defaults to 0 and season_rank to null (rendered
	// as a dash) for zero-XP profiles.
	Season       string   `json:"season,omitempty"`
	TotalXP      int      `json:"total_xp"`
	SeasonXP     int      `json:"season_xp"`
	WeeklyXP     int      `json:"weekly_xp"`
	Level        int      `json:"level"`
	XPToNext     int      `json:"xp_to_next_level"`
	StreakWeeks  int      `json:"streak_weeks"`
	SeasonRank   *int     `json:"season_rank"`
	Percentile   *float64 `json:"percentile"`
	// DNA powers the persona banner + identity-card sections. Nil for
	// users who haven't opted in to profiling or have no merged PRs yet.
	DNA *dna.Result `json:"dna,omitempty"`
}

type UserRepository interface {
	FindByGithubID(ctx context.Context, githubID int64) (*User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*User, error)
	FindByID(ctx context.Context, id int64) (*User, error)
	FindBySlug(ctx context.Context, slug string) (*User, error)
	GetUserProfileBySlug(ctx context.Context, slug string) (*UserProfile, error)
	GetPublicContributorProfileBySlug(ctx context.Context, slug string) (*PublicContributorProfile, error)
	UpdateProfilePublic(ctx context.Context, userID int64, public bool) error
	UpdateUserBioAndShowcase(ctx context.Context, userID int64, bio, headline string, showcaseJSON string, pinnedReposJSON string) error
	UpsertUser(ctx context.Context, githubID int64, username, email, avatarURL string) (int64, error)
	UpsertGoogleUser(ctx context.Context, googleID string, username, email, avatarURL string) (int64, error)
	UpdateProfilingConsent(ctx context.Context, userID int64, consent bool) error
	UpdatePublicAccuracy(ctx context.Context, userID int64, public bool) error
	UpdateUserSkills(ctx context.Context, userID int64, skills string) error
	UpdateLanguageSnapshot(ctx context.Context, userID int64, snapshotJSON string) error
	SoftDeleteUser(ctx context.Context, userID int64) error
	PurgeDeletedUsers(ctx context.Context) (int64, error)
}

type sqlxUserRepository struct {
	db     *sqlx.DB
	encKey []byte
}

func NewUserRepository(db *sqlx.DB, cfg *config.Config) UserRepository {
	encKey := []byte(cfg.EncryptionKey)
	if len(encKey) > 32 {
		encKey = encKey[:32]
	}
	return &sqlxUserRepository{
		db:     db,
		encKey: encKey,
	}
}

func (r *sqlxUserRepository) FindByGithubID(ctx context.Context, githubID int64) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, is_public, bio, headline, showcase_projects_json, pinned_repos_json, skills, lang_snapshot, lang_snapshot_at, deleted_at, created_at, updated_at FROM users WHERE github_id = ? AND deleted_at IS NULL", githubID)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindByGoogleID(ctx context.Context, googleID string) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, is_public, bio, headline, showcase_projects_json, pinned_repos_json, skills, lang_snapshot, lang_snapshot_at, deleted_at, created_at, updated_at FROM users WHERE google_id = ? AND deleted_at IS NULL", googleID)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, is_public, bio, headline, showcase_projects_json, pinned_repos_json, skills, lang_snapshot, lang_snapshot_at, deleted_at, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindBySlug(ctx context.Context, slug string) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, is_public, bio, headline, showcase_projects_json, pinned_repos_json, skills, lang_snapshot, lang_snapshot_at, deleted_at, created_at, updated_at FROM users WHERE slug = ? AND deleted_at IS NULL", slug)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

// sanitizeSlug lowercases a display name into its public slug form.
func sanitizeSlug(baseName string) string {
	sanitized := strings.ToLower(strings.TrimSpace(baseName))
	var clean []rune
	for _, ch := range sanitized {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			clean = append(clean, ch)
		} else if len(clean) > 0 && clean[len(clean)-1] != '-' {
			clean = append(clean, '-')
		}
	}
	return strings.Trim(string(clean), "-")
}

// reservedSlugs collide with first-party app routes (frontend pages, API,
// OG images, static assets) and are blocked at signup AND route level.
var reservedSlugs = map[string]struct{}{
	"api":          {},
	"og":           {},
	"u":            {},
	"dashboard":    {},
	"login":        {},
	"settings":     {},
	"static":       {},
	"public":       {},
	"assets":       {},
	"images":       {},
	"_next":        {},
	"favicon.ico":  {},
}

// IsReservedSlug reports whether a slug would shadow an app route.
func IsReservedSlug(slug string) bool {
	_, ok := reservedSlugs[strings.ToLower(strings.TrimSpace(slug))]
	return ok
}

// githubSignupHandle picks the display username for a brand-new GitHub signup:
// the raw GitHub login when unused, otherwise login + "-gh", then numeric
// suffixes until unique. Availability is checked against the plaintext unique
// slug column because usernames are encrypted at rest.
func (r *sqlxUserRepository) githubSignupHandle(ctx context.Context, login string) (string, error) {
	base := strings.TrimSpace(login)
	if base == "" {
		base = "user"
	}
	baseSlug := sanitizeSlug(base)
	if baseSlug == "" {
		baseSlug = "user"
	}

	slugFree := func(slug string) (bool, error) {
		if IsReservedSlug(slug) {
			return false, nil
		}
		var id int64
		err := r.db.GetContext(ctx, &id, "SELECT id FROM users WHERE slug = ?", slug)
		if err == sql.ErrNoRows {
			return true, nil
		}
		if err != nil {
			return false, err
		}
		return false, nil
	}

	free, err := slugFree(baseSlug)
	if err != nil {
		return "", err
	}
	if free {
		return base, nil
	}

	free, err = slugFree(baseSlug + "-gh")
	if err != nil {
		return "", err
	}
	if free {
		return base + "-gh", nil
	}

	for i := 2; i < 1000; i++ {
		handle := fmt.Sprintf("%s-gh-%d", base, i)
		free, err := slugFree(fmt.Sprintf("%s-gh-%d", baseSlug, i))
		if err != nil {
			return "", err
		}
		if free {
			return handle, nil
		}
	}
	return "", fmt.Errorf("no unique username available for %q", login)
}

func (r *sqlxUserRepository) generateUniqueSlug(ctx context.Context, baseName string, currentUserID int64) (string, error) {
	baseSlug := sanitizeSlug(baseName)
	if baseSlug == "" {
		baseSlug = "user"
	}

	candidate := baseSlug
	counter := 2
	for {
		if IsReservedSlug(candidate) {
			candidate = fmt.Sprintf("%s-%d", baseSlug, counter)
			counter++
			continue
		}
		var existingID int64
		err := r.db.GetContext(ctx, &existingID, "SELECT id FROM users WHERE slug = ?", candidate)
		if err == sql.ErrNoRows {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
		if currentUserID > 0 && existingID == currentUserID {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}
}

// reclaimEmailHash clears the blind email index on any other active row claiming it, so the
// incoming OAuth-verified email can be re-assigned to the matched row without violating
// UNIQUE(email_hash).
func (r *sqlxUserRepository) reclaimEmailHash(ctx context.Context, emailHash string, excludeID int64) error {
	if emailHash == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, "UPDATE users SET email_hash = NULL WHERE email_hash = ? AND deleted_at IS NULL AND id != ?", emailHash, excludeID)
	return err
}

func (r *sqlxUserRepository) UpsertUser(ctx context.Context, githubID int64, username, email, avatarURL string) (int64, error) {
	encUsername, _ := crypto.EncryptAESGCM([]byte(username), r.encKey)
	encEmail, _ := crypto.EncryptAESGCM([]byte(email), r.encKey)
	encAvatar, _ := crypto.EncryptAESGCM([]byte(avatarURL), r.encKey)
	emailHash := crypto.HashSHA256(email, r.encKey)

	var existing struct {
		ID   int64   `db:"id"`
		Slug *string `db:"slug"`
	}

	// 1. Try matching by github_id
	err := r.db.GetContext(ctx, &existing, "SELECT id, slug FROM users WHERE github_id = ?", githubID)

	// 2. If not found by github_id, try linking via verified email hash
	if (err == sql.ErrNoRows || err != nil) && emailHash != "" {
		err = r.db.GetContext(ctx, &existing, "SELECT id, slug FROM users WHERE email_hash = ?", emailHash)
	}

	if err == sql.ErrNoRows || err != nil {
		// New signup: keep the GitHub username when free, else derive a unique one.
		signupUsername, err := r.githubSignupHandle(ctx, username)
		if err != nil {
			return 0, err
		}
		encUsername, _ = crypto.EncryptAESGCM([]byte(signupUsername), r.encKey)
		slug, err := r.generateUniqueSlug(ctx, signupUsername, 0)
		if err != nil {
			return 0, err
		}
		res, err := r.db.ExecContext(ctx, `
			INSERT INTO users (github_id, slug, email_hash, username, email, avatar_url, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, githubID, slug, emailHash, encUsername, encEmail, encAvatar)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}

	if err := r.reclaimEmailHash(ctx, emailHash, existing.ID); err != nil {
		return 0, err
	}

	if existing.Slug != nil && *existing.Slug != "" {
		// Returning user: never overwrite the existing username or slug.
		_, err = r.db.ExecContext(ctx, `
			UPDATE users SET github_id = ?, email_hash = ?, email = ?, avatar_url = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
		`, githubID, emailHash, encEmail, encAvatar, existing.ID)
		if err != nil {
			return 0, err
		}
		return existing.ID, nil
	}

	newSlug, err := r.generateUniqueSlug(ctx, username, existing.ID)
	if err != nil {
		return 0, err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE users SET github_id = ?, slug = ?, email_hash = ?, email = ?, avatar_url = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, githubID, newSlug, emailHash, encEmail, encAvatar, existing.ID)
	if err != nil {
		return 0, err
	}

	return existing.ID, nil
}

func (r *sqlxUserRepository) UpsertGoogleUser(ctx context.Context, googleID string, username, email, avatarURL string) (int64, error) {
	encUsername, _ := crypto.EncryptAESGCM([]byte(username), r.encKey)
	encEmail, _ := crypto.EncryptAESGCM([]byte(email), r.encKey)
	encAvatar, _ := crypto.EncryptAESGCM([]byte(avatarURL), r.encKey)
	emailHash := crypto.HashSHA256(email, r.encKey)

	var existing struct {
		ID   int64   `db:"id"`
		Slug *string `db:"slug"`
	}

	// 1. Try matching by google_id
	err := r.db.GetContext(ctx, &existing, "SELECT id, slug FROM users WHERE google_id = ?", googleID)

	// 2. If not found by google_id, try linking via verified email hash
	if (err == sql.ErrNoRows || err != nil) && emailHash != "" {
		err = r.db.GetContext(ctx, &existing, "SELECT id, slug FROM users WHERE email_hash = ?", emailHash)
	}

	if err == sql.ErrNoRows || err != nil {
		slug, err := r.generateUniqueSlug(ctx, username, 0)
		if err != nil {
			return 0, err
		}
		res, err := r.db.ExecContext(ctx, `
			INSERT INTO users (google_id, slug, email_hash, username, email, avatar_url, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, googleID, slug, emailHash, encUsername, encEmail, encAvatar)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}

	var slugToUse string
	if existing.Slug != nil && *existing.Slug != "" {
		slugToUse = *existing.Slug
	} else {
		newSlug, err := r.generateUniqueSlug(ctx, username, existing.ID)
		if err != nil {
			return 0, err
		}
		slugToUse = newSlug
	}

	if err := r.reclaimEmailHash(ctx, emailHash, existing.ID); err != nil {
		return 0, err
	}

	_, err = r.db.ExecContext(ctx, `
		UPDATE users SET google_id = ?, slug = ?, email_hash = ?, username = ?, email = ?, avatar_url = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, googleID, slugToUse, emailHash, encUsername, encEmail, encAvatar, existing.ID)
	if err != nil {
		return 0, err
	}

	return existing.ID, nil
}

func (r *sqlxUserRepository) GetUserProfileBySlug(ctx context.Context, slug string) (*UserProfile, error) {
	user, err := r.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	var githubURL *string
	if user.GithubID != nil {
		ghLink := fmt.Sprintf("https://github.com/%s", user.SlugOrUsername())
		githubURL = &ghLink
	}

	// 1. Fetch user stats
	var watchlistCount int
	_ = r.db.GetContext(ctx, &watchlistCount, "SELECT COUNT(1) FROM user_watchlists WHERE user_id = ?", user.ID)

	var feedbackCount int
	_ = r.db.GetContext(ctx, &feedbackCount, "SELECT COUNT(1) FROM contributor_feedback WHERE user_id = ?", user.ID)

	var verifiedCount *int
	if user.GithubID != nil {
		var count int
		_ = r.db.GetContext(ctx, &count, "SELECT COUNT(1) FROM contributor_feedback WHERE user_id = ? AND verified_pr_author = 1", user.ID)
		verifiedCount = &count
	}

	// 2. Fetch watchlist repositories
	var watchlist []RepoRecord
	watchlistQuery := `
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, COALESCE(r.github_url,'') as github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date,
			COALESCE(s.good_first_issue_count,0) as good_first_issue_count,
			r.updated_at
		FROM user_watchlists uw
		JOIN repositories r ON r.id = uw.repo_id
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE uw.user_id = ?
		ORDER BY r.stars DESC
	`
	_ = r.db.SelectContext(ctx, &watchlist, watchlistQuery, user.ID)
	if watchlist == nil {
		watchlist = []RepoRecord{}
	}

	// 3. Fetch user feedback
	var feedback []UserFeedbackItem
	feedbackQuery := `
		SELECT
			cf.id, cf.repository_id, cf.maintainer_rating, cf.review_speed_rating,
			cf.beginner_friendly_rating, cf.comment, cf.verified_pr_author, cf.created_at,
			COALESCE(r.full_name, cf.repository_id) as repo_full_name,
			COALESCE(r.language, '') as repo_language
		FROM contributor_feedback cf
		LEFT JOIN repositories r ON r.id = cf.repository_id
		WHERE cf.user_id = ?
		ORDER BY cf.created_at DESC
	`
	_ = r.db.SelectContext(ctx, &feedback, feedbackQuery, user.ID)
	if feedback == nil {
		feedback = []UserFeedbackItem{}
	}

	// 4. Fetch cached contributor DNA (typed, not interface{} — the FE
	// expects the real shape so persona/temporal/stars fields are present).
	var dnaParsed *dna.Result
	var dnaRaw sql.NullString
	_ = r.db.GetContext(ctx, &dnaRaw, "SELECT dna_json FROM contributor_profiles WHERE user_id = ? AND profiling_status = 'completed'", user.ID)
	if dnaRaw.Valid && dnaRaw.String != "" {
		var parsed dna.Result
		if err := json.Unmarshal([]byte(dnaRaw.String), &parsed); err == nil {
			dnaParsed = &parsed
		}
	}

	slugVal := ""
	if user.Slug != nil {
		slugVal = *user.Slug
	}

	avatarURL := user.AvatarURL
	if avatarURL != nil && *avatarURL != "" {
		formatted := *avatarURL
		if strings.Contains(formatted, "githubusercontent.com") && !strings.Contains(formatted, "s=") {
			if strings.Contains(formatted, "?") {
				formatted += "&s=64"
			} else {
				formatted += "?s=64"
			}
		}
		avatarURL = &formatted
	}

	return &UserProfile{
		Slug:        slugVal,
		Username:    user.Username,
		AvatarURL:   avatarURL,
		MemberSince: user.CreatedAt,
		GithubURL:   githubURL,
		Stats: UserStats{
			WatchlistCount:        watchlistCount,
			FeedbackCount:         feedbackCount,
			VerifiedContributions: verifiedCount,
		},
		Watchlist: watchlist,
		Feedback:  feedback,
		DNA:       dnaParsed,
	}, nil
}

func (r *sqlxUserRepository) UpdateProfilePublic(ctx context.Context, userID int64, public bool) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", public, userID)
	return err
}

// GetPublicContributorProfileBySlug resolves a case-insensitive slug to the
// user's aggregate PR-forecast track record: total evals, hit rate over
// settled evals, merged count and the C-Rank tiers of repos merged into.
// Callers MUST 404 unless IsPublic is true — this method returns data for
// private users too so the handler owns the privacy gate.
func (r *sqlxUserRepository) GetPublicContributorProfileBySlug(ctx context.Context, slug string) (*PublicContributorProfile, error) {
	user, err := r.FindBySlug(ctx, strings.ToLower(strings.TrimSpace(slug)))
	if err != nil {
		return nil, err
	}

	var isPro int
	_ = r.db.GetContext(ctx, &isPro, "SELECT is_pro FROM user_entitlements WHERE user_id = ?", user.ID)

	profile := &PublicContributorProfile{
		Username:    user.Username,
		AvatarURL:   user.AvatarURL,
		MemberSince: user.CreatedAt,
		IsPublic:    user.IsPublic,
		IsPro:       isPro == 1,
		Repos:       []PublicRepoTier{},
		Evals:       []PublicEvalItem{},
		// AC5: zero-PR profiles stay Level 0 with 0 XP.
	}
	if user.Slug != nil {
		profile.Slug = *user.Slug
	}

	var stats struct {
		Total   int `db:"total"`
		Settled int `db:"settled"`
		Hits    int `db:"hits"`
		Merged  int `db:"merged"`
	}
	err = r.db.GetContext(ctx, &stats, `
		SELECT COUNT(*) AS total,
		       COALESCE(SUM(CASE WHEN outcome IN ('hit','miss') THEN 1 ELSE 0 END), 0) AS settled,
		       COALESCE(SUM(CASE WHEN outcome = 'hit' THEN 1 ELSE 0 END), 0) AS hits,
		       COALESCE(SUM(CASE WHEN merged_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS merged
		FROM pr_evaluations WHERE owner_user_id = ?`, user.ID)
	if err == nil {
		profile.TotalEvals = stats.Total
		profile.AccuracyN = stats.Settled
		profile.MergedCount = stats.Merged
		if stats.Settled > 0 {
			rate := float64(stats.Hits) / float64(stats.Settled)
			profile.AccuracyRate = &rate
		}
	}

	_ = r.db.SelectContext(ctx, &profile.Repos, `
		SELECT e.repository_full_name AS full_name,
		       COALESCE(s.c_rank_tier, 'D') AS c_rank_tier
		FROM pr_evaluations e
		LEFT JOIN latest_snapshots s ON LOWER(s.repository_id) = LOWER(e.repository_full_name)
		WHERE e.owner_user_id = ? AND e.merged_at IS NOT NULL
		GROUP BY e.repository_full_name
		ORDER BY e.repository_full_name
		LIMIT 50`, user.ID)

	// AC2: eval feed capped at latest 20; the /u page links to the dashboard
	// for anything older.
	_ = r.db.SelectContext(ctx, &profile.Evals, `
		SELECT repository_full_name, pr_number, predicted_score, outcome, created_at
		FROM pr_evaluations
		WHERE owner_user_id = ?
		ORDER BY created_at DESC
		LIMIT 20`, user.ID)

	// DNA: same source as the owner page. Surfaces persona + stars + top repos
	// on the public card. Nil for users without a completed profile.
	var dnaRaw sql.NullString
	_ = r.db.GetContext(ctx, &dnaRaw,
		"SELECT dna_json FROM contributor_profiles WHERE user_id = ? AND profiling_status = 'completed'",
		user.ID)
	if dnaRaw.Valid && dnaRaw.String != "" {
		var parsed dna.Result
		if err := json.Unmarshal([]byte(dnaRaw.String), &parsed); err == nil {
			profile.DNA = &parsed

			// If no evaluated PRs yet, populate Repos list from verified DNA top_repos
			if len(profile.Repos) == 0 && len(parsed.TopRepos) > 0 {
				for _, tr := range parsed.TopRepos {
					tier := "A"
					if tr.StargazerCount > 10000 {
						tier = "S"
					} else if tr.StargazerCount < 1000 {
						tier = "B"
					}
					profile.Repos = append(profile.Repos, PublicRepoTier{
						FullName:  tr.NameWithOwner,
						CRankTier: tier,
					})
				}
			}
		}
	}

	if user.Bio != nil {
		profile.Bio = *user.Bio
	}
	if user.Headline != nil {
		profile.Headline = *user.Headline
	}
	if user.ShowcaseProjectsJSON != nil && *user.ShowcaseProjectsJSON != "" {
		_ = json.Unmarshal([]byte(*user.ShowcaseProjectsJSON), &profile.ShowcaseProjects)
	}
	if profile.ShowcaseProjects == nil {
		profile.ShowcaseProjects = []ShowcaseProject{}
	}

	pinnedSet := make(map[string]bool)
	if user.PinnedReposJSON != nil && *user.PinnedReposJSON != "" {
		var pinnedList []string
		if err := json.Unmarshal([]byte(*user.PinnedReposJSON), &pinnedList); err == nil {
			for _, p := range pinnedList {
				pinnedSet[strings.ToLower(p)] = true
			}
		}
	}

	profile.PublicRepos = []UserPublicRepo{}
	if profile.DNA != nil && len(profile.DNA.OwnedRepos) > 0 {
		for _, or := range profile.DNA.OwnedRepos {
			if or.IsFork {
				continue
			}
			isPinned := pinnedSet[strings.ToLower(or.NameWithOwner)] || pinnedSet[strings.ToLower(or.Name)]
			lang := ""
			if or.PrimaryLanguage != nil {
				lang = *or.PrimaryLanguage
			}
			repoName := or.Name
			if repoName == "" {
				parts := strings.Split(or.NameWithOwner, "/")
				if len(parts) == 2 {
					repoName = parts[1]
				} else {
					repoName = or.NameWithOwner
				}
			}
			profile.PublicRepos = append(profile.PublicRepos, UserPublicRepo{
				FullName:    or.NameWithOwner,
				Name:        repoName,
				Description: or.Description,
				Language:    lang,
				Stars:       or.StargazerCount,
				Forks:       or.ForkCount,
				HTMLURL:     or.URL,
				IsPinned:    isPinned,
			})
		}
	}

	// If no owned repos cached in DNA, fetch from GitHub directly (strictly ignoring forks)
	if len(profile.PublicRepos) == 0 && user.SlugOrUsername() != "" {
		targetUsername := user.SlugOrUsername()
		req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("https://api.github.com/users/%s/repos?per_page=100&type=owner", targetUsername), nil)
		if err == nil {
			req.Header.Set("Accept", "application/vnd.github.v3+json")
			req.Header.Set("User-Agent", "GetMerged-App")
			client := &http.Client{Timeout: 3 * time.Second}
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				var ghRepos []struct {
					FullName    string `json:"full_name"`
					Name        string `json:"name"`
					Description string `json:"description"`
					Language    string `json:"language"`
					Stargazers  int    `json:"stargazers_count"`
					Forks       int    `json:"forks_count"`
					HTMLURL     string `json:"html_url"`
					Fork        bool   `json:"fork"`
					Owner       struct {
						Login string `json:"login"`
					} `json:"owner"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&ghRepos); err == nil {
					for _, gr := range ghRepos {
						if gr.Fork {
							continue
						}
						if gr.Owner.Login != "" && !strings.EqualFold(gr.Owner.Login, targetUsername) {
							continue
						}
						isPinned := pinnedSet[strings.ToLower(gr.FullName)] || pinnedSet[strings.ToLower(gr.Name)]
						profile.PublicRepos = append(profile.PublicRepos, UserPublicRepo{
							FullName:    gr.FullName,
							Name:        gr.Name,
							Description: gr.Description,
							Language:    gr.Language,
							Stars:       gr.Stargazers,
							Forks:       gr.Forks,
							HTMLURL:     gr.HTMLURL,
							IsPinned:    isPinned,
						})
					}
				}
			}
		}
	}

	// Sort so pinned repos come first, then ranked by stars descending
	sort.SliceStable(profile.PublicRepos, func(i, j int) bool {
		if profile.PublicRepos[i].IsPinned != profile.PublicRepos[j].IsPinned {
			return profile.PublicRepos[i].IsPinned
		}
		return profile.PublicRepos[i].Stars > profile.PublicRepos[j].Stars
	})

	return profile, nil
}

func (r *sqlxUserRepository) UpdateUserBioAndShowcase(ctx context.Context, userID int64, bio, headline string, showcaseJSON string, pinnedReposJSON string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET bio = ?, headline = ?, showcase_projects_json = ?, pinned_repos_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", bio, headline, showcaseJSON, pinnedReposJSON, userID)
	return err
}

func (u *User) SlugOrUsername() string {
	if u.Slug != nil && *u.Slug != "" {
		return *u.Slug
	}
	return strings.ToLower(u.Username)
}

func (r *sqlxUserRepository) UpdateProfilingConsent(ctx context.Context, userID int64, consent bool) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET profiling_consent = ?, profiling_consent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", consent, userID)
	return err
}

func (r *sqlxUserRepository) UpdatePublicAccuracy(ctx context.Context, userID int64, public bool) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET public_accuracy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", public, userID)
	return err
}

func (r *sqlxUserRepository) UpdateUserSkills(ctx context.Context, userID int64, skills string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET skills = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", skills, userID)
	return err
}

func (r *sqlxUserRepository) UpdateLanguageSnapshot(ctx context.Context, userID int64, snapshotJSON string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET lang_snapshot = ?, lang_snapshot_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", snapshotJSON, userID)
	return err
}

func (r *sqlxUserRepository) SoftDeleteUser(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET
			deleted_at = CURRENT_TIMESTAMP,
			username = 'Deleted User',
			email = NULL,
			avatar_url = NULL,
			email_hash = NULL,
			profiling_consent = FALSE,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND deleted_at IS NULL
	`, userID)
	return err
}

func (r *sqlxUserRepository) PurgeDeletedUsers(ctx context.Context) (int64, error) {
	// 1. Purge watchlists of deleted users
	_, _ = r.db.ExecContext(ctx, "DELETE FROM user_watchlists WHERE user_id IN (SELECT id FROM users WHERE deleted_at IS NOT NULL)")

	// 2. Purge oauth tokens of deleted users
	_, _ = r.db.ExecContext(ctx, "DELETE FROM user_oauth_tokens WHERE user_id IN (SELECT id FROM users WHERE deleted_at IS NOT NULL)")

	// 3. Hard delete purged users
	res, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE deleted_at IS NOT NULL")
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *sqlxUserRepository) decryptUserPII(user *User) {
	decUser, err := crypto.DecryptAESGCM(user.Username, r.encKey)
	if err == nil && decUser != "" {
		user.Username = decUser
	}

	if user.Email != nil && *user.Email != "" {
		decEmail, err := crypto.DecryptAESGCM(*user.Email, r.encKey)
		if err == nil && decEmail != "" {
			user.Email = &decEmail
		}
	}

	if user.AvatarURL != nil && *user.AvatarURL != "" {
		decAvatar, err := crypto.DecryptAESGCM(*user.AvatarURL, r.encKey)
		if err == nil && decAvatar != "" {
			user.AvatarURL = &decAvatar
		}
	}
}
