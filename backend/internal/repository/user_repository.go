package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/crypto"
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
	DeletedAt        *time.Time `db:"deleted_at" json:"-"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
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
	MemberSince time.Time          `json:"member_since"`
	GithubURL   *string            `json:"github_url,omitempty"`
	Stats       UserStats          `json:"stats"`
	Watchlist   []RepoRecord       `json:"watchlist"`
	Feedback    []UserFeedbackItem `json:"feedback"`
	DNA         interface{}        `json:"dna,omitempty"`
}

type UserRepository interface {
	FindByGithubID(ctx context.Context, githubID int64) (*User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*User, error)
	FindByID(ctx context.Context, id int64) (*User, error)
	FindBySlug(ctx context.Context, slug string) (*User, error)
	GetUserProfileBySlug(ctx context.Context, slug string) (*UserProfile, error)
	UpsertUser(ctx context.Context, githubID int64, username, email, avatarURL string) (int64, error)
	UpsertGoogleUser(ctx context.Context, googleID string, username, email, avatarURL string) (int64, error)
	UpdateProfilingConsent(ctx context.Context, userID int64, consent bool) error
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
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, deleted_at, created_at, updated_at FROM users WHERE github_id = ? AND deleted_at IS NULL", githubID)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindByGoogleID(ctx context.Context, googleID string) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, deleted_at, created_at, updated_at FROM users WHERE google_id = ? AND deleted_at IS NULL", googleID)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, deleted_at, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindBySlug(ctx context.Context, slug string) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, google_id, slug, username, email, avatar_url, profiling_consent, deleted_at, created_at, updated_at FROM users WHERE slug = ? AND deleted_at IS NULL", slug)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) generateUniqueSlug(ctx context.Context, baseName string, currentUserID int64) (string, error) {
	sanitized := strings.ToLower(strings.TrimSpace(baseName))
	var clean []rune
	for _, ch := range sanitized {
		if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') {
			clean = append(clean, ch)
		} else if len(clean) > 0 && clean[len(clean)-1] != '-' {
			clean = append(clean, '-')
		}
	}
	baseSlug := strings.Trim(string(clean), "-")
	if baseSlug == "" {
		baseSlug = "user"
	}

	candidate := baseSlug
	counter := 2
	for {
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
		slug, err := r.generateUniqueSlug(ctx, username, 0)
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
		UPDATE users SET github_id = ?, slug = ?, email_hash = ?, username = ?, email = ?, avatar_url = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, githubID, slugToUse, emailHash, encUsername, encEmail, encAvatar, existing.ID)
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

	// 4. Fetch cached contributor DNA
	var dnaParsed interface{}
	var dnaRaw sql.NullString
	_ = r.db.GetContext(ctx, &dnaRaw, "SELECT dna_json FROM contributor_profiles WHERE user_id = ? AND profiling_status = 'completed'", user.ID)
	if dnaRaw.Valid && dnaRaw.String != "" {
		_ = json.Unmarshal([]byte(dnaRaw.String), &dnaParsed)
	}

	slugVal := ""
	if user.Slug != nil {
		slugVal = *user.Slug
	}

	return &UserProfile{
		Slug:        slugVal,
		Username:    user.Username,
		AvatarURL:   user.AvatarURL,
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
