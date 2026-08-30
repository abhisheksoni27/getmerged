package repository

import (
	"context"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/bounty"
	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/jmoiron/sqlx"
)

type GoodFirstIssueItem struct {
	ID              int64     `db:"id" json:"id"`
	RepositoryID    string    `db:"repository_id" json:"repository_id"`
	RepoFullName    string    `db:"repo_full_name" json:"repo_full_name"`
	Language        string    `db:"language" json:"language"`
	Stars           int       `db:"stars" json:"stars"`
	CRankTier       string    `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore      float64   `db:"c_rank_score" json:"c_rank_score"`
	IssueNumber     int       `db:"issue_number" json:"issue_number"`
	Title           string    `db:"title" json:"title"`
	BodyText        string    `db:"body_text" json:"body_text"`
	URL             string    `db:"url" json:"url"`
	CommentsCount   int       `db:"comments_count" json:"comments_count"`
	LabelsJSON      string    `db:"labels_json" json:"labels_json"`
	QualityScore    int       `db:"quality_score" json:"quality_score"`
	BountyAmountUSD *float64  `db:"bounty_amount_usd" json:"bounty_amount_usd,omitempty"`
	BountyStatus    string    `db:"bounty_status" json:"bounty_status"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	SyncedAt        time.Time `db:"synced_at" json:"synced_at"`
	// Bounty signals derived from labels_json (AC1): self-reported
	// bounty-labeled issues; amount is set only when the label encodes one.
	IsBounty     bool     `db:"-" json:"is_bounty"`
	BountyAmount *float64 `db:"-" json:"bounty_amount,omitempty"`
	// Boosted reports an active paid boost entitlement at query time (AC4).
	Boosted bool `db:"boosted" json:"boosted"`
	// Sponsored reports a paid featured-placement (Repo Boost) at query time
	// (Repo Boost AC1/AC5/AC7). Derived in Go from the repo's boost_expires_at.
	Sponsored bool `db:"-" json:"sponsored"`
	// RepoBoostExpiresAt is scanned from repositories.boost_expires_at and used
	// to compute Sponsored + the boosted-first ordering (AC5).
	RepoBoostExpiresAt *time.Time `db:"repo_boost_expires_at" json:"-"`
}

type GFIRepository interface {
	UpsertIssues(ctx context.Context, repoID string, issues []github.GoodFirstIssue) error
	ListByLanguage(ctx context.Context, language string, limit int, bountyOnly bool) ([]GoodFirstIssueItem, error)
	ListByRepoID(ctx context.Context, repoID string, limit int, bountyOnly bool) ([]GoodFirstIssueItem, error)
	// ListFeed returns Good First Issues indexed within the last 7 days
	// (AC3 inclusion window) filtered by an optional allow-listed language,
	// topic, or repository full name (any combinable, all optional). Results
	// are deduped by issue id and ordered newest-first.
	ListFeed(ctx context.Context, filter GFIFeedFilter, limit int) ([]GoodFirstIssueItem, error)
}

// GFIFeedFilter carries the optional, pre-validated feed filters (AC4). Empty
// fields mean "no filter" on that dimension.
type GFIFeedFilter struct {
	Language     string
	Topic        string
	RepoFullName string
}

type sqlxGFIRepository struct {
	db *sqlx.DB
}

func NewGFIRepository(db *sqlx.DB) GFIRepository {
	return &sqlxGFIRepository{db: db}
}

func GFICutoffUTC() time.Time {
	return time.Now().UTC().AddDate(0, -9, 0)
}

func (r *sqlxGFIRepository) UpsertIssues(ctx context.Context, repoID string, issues []github.GoodFirstIssue) error {
	if len(issues) == 0 {
		return nil
	}

	cutoff := GFICutoffUTC()

	for _, issue := range issues {
		if !issue.CreatedAt.IsZero() && issue.CreatedAt.UTC().Before(cutoff) {
			continue
		}

		isBounty, bountyAmt := bounty.Detect(issue.LabelsJSON)
		bountyStatus := "closed"
		if isBounty {
			bountyStatus = "active"
		}

		query := `
			INSERT INTO repo_good_first_issues (
				repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, bounty_amount_usd, bounty_status, is_open, created_at, synced_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE
				title = VALUES(title),
				body_text = VALUES(body_text),
				url = VALUES(url),
				comments_count = VALUES(comments_count),
				labels_json = VALUES(labels_json),
				quality_score = VALUES(quality_score),
				bounty_amount_usd = VALUES(bounty_amount_usd),
				bounty_status = VALUES(bounty_status),
				is_open = 1,
				synced_at = CURRENT_TIMESTAMP
		`
		if r.db.DriverName() == "sqlite" {
			query = `
				INSERT INTO repo_good_first_issues (
					repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, bounty_amount_usd, bounty_status, is_open, created_at, synced_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(repository_id, issue_number) DO UPDATE SET
					title = excluded.title,
					body_text = excluded.body_text,
					url = excluded.url,
					comments_count = excluded.comments_count,
					labels_json = excluded.labels_json,
					bounty_amount_usd = excluded.bounty_amount_usd,
					bounty_status = excluded.bounty_status,
					is_open = 1,
					synced_at = CURRENT_TIMESTAMP
			`
		}

		sanitizedTitle := strings.ToValidUTF8(issue.Title, "")
		sanitizedBody := strings.ToValidUTF8(issue.BodyText, "")

		if _, err := r.db.ExecContext(ctx, query,
			repoID, issue.Number, sanitizedTitle, sanitizedBody, issue.URL,
			issue.CommentsCount, issue.LabelsJSON, issue.QualityScore, bountyAmt, bountyStatus, issue.CreatedAt,
		); err != nil {
			return err
		}
	}
	return nil
}

// gfiListSelect is the shared projection used by the bounty-aware listing
// queries. The boost join reads the entitlement table live (AC4): a boost
// counts only while expires_at > now, so refunds revoke instantly.
const gfiListSelect = `
	SELECT
		g.id, g.repository_id, rep.full_name as repo_full_name, COALESCE(rep.language, '') as language,
		rep.stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier, COALESCE(s.c_rank_score, 75.0) as c_rank_score,
		g.issue_number, g.title, COALESCE(g.body_text, '') as body_text, g.url, g.comments_count,
		g.labels_json, COALESCE(g.quality_score, 0) as quality_score,
		g.bounty_amount_usd, COALESCE(g.bounty_status, 'active') as bounty_status,
		g.created_at, g.synced_at,
		CASE WHEN b.payment_id IS NOT NULL THEN TRUE ELSE FALSE END as boosted,
		rep.boost_expires_at as repo_boost_expires_at
	FROM repo_good_first_issues g
	INNER JOIN repositories rep ON g.repository_id = rep.id
	LEFT JOIN latest_snapshots s ON rep.id = s.repository_id
	LEFT JOIN gfi_bounty_boosts b ON b.repository_id = g.repository_id AND b.issue_number = g.issue_number
		AND b.expires_at > ? AND b.status = 'active'
`

func (r *sqlxGFIRepository) ListByLanguage(ctx context.Context, language string, limit int, bountyOnly bool) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 30
	}

	cutoff := GFICutoffUTC()
	now := time.Now().UTC()
	whereClause := "g.created_at >= ?"
	args := []interface{}{now, cutoff}
	if language != "" && stringsToLower(language) != "all" {
		whereClause += " AND LOWER(rep.language) = LOWER(?)"
		args = append(args, language)
	}
	// Bounty-only requests over-fetch then filter in Go: exact label matching
	// cannot be expressed portably in SQL (AC1).
	fetchLimit := limit
	if bountyOnly {
		fetchLimit = limit * 10
	}
	args = append(args, fetchLimit)

	query := gfiListSelect + `
		WHERE ` + whereClause + `
		ORDER BY (rep.boost_expires_at > CURRENT_TIMESTAMP) DESC, rep.boost_expires_at ASC,
			boosted DESC,
			g.created_at DESC,
			g.id DESC
		LIMIT ?
	`

	items, err := r.selectAndEnrich(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return finalizeBountyList(items, bountyOnly, limit), nil
}

func (r *sqlxGFIRepository) ListByRepoID(ctx context.Context, repoID string, limit int, bountyOnly bool) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 10
	}

	cutoff := GFICutoffUTC()
	now := time.Now().UTC()
	fetchLimit := limit
	if bountyOnly {
		fetchLimit = limit * 10
	}
	query := gfiListSelect + `
		WHERE g.repository_id = ? AND g.created_at >= ?
		ORDER BY (rep.boost_expires_at > CURRENT_TIMESTAMP) DESC, rep.boost_expires_at ASC,
			boosted DESC,
			g.created_at DESC,
			g.id DESC
		LIMIT ?
	`

	items, err := r.selectAndEnrich(ctx, query, now, repoID, cutoff, fetchLimit)
	if err != nil {
		return nil, err
	}
	return finalizeBountyList(items, bountyOnly, limit), nil
}

// ListFeed implements the GFIRepository interface (AC1/AC3/AC4). The inclusion
// window is the last 7 days by created_at, deduped by issue id, and filtered by
// any pre-validated language/topic/repo combination.
func (r *sqlxGFIRepository) ListFeed(ctx context.Context, filter GFIFeedFilter, limit int) ([]GoodFirstIssueItem, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}

	// AC3: only issues indexed within the last 7 days are eligible.
	cutoff := time.Now().UTC().Add(-7 * 24 * time.Hour)
	now := time.Now().UTC()

	// gfiListSelect carries a `b.expires_at > ?` placeholder (boost join) as
	// its first argument, so `now` must be args[0].
	where := "g.created_at >= ?"
	args := []interface{}{now, cutoff}
	if filter.Language != "" {
		where += " AND LOWER(rep.language) = LOWER(?)"
		args = append(args, filter.Language)
	}
	if filter.Topic != "" {
		// EXISTS avoids row multiplication when a repo has many topics.
		where += " AND EXISTS (SELECT 1 FROM repository_topics rt WHERE rt.repository_id = rep.id AND rt.topic = ?)"
		args = append(args, filter.Topic)
	}
	if filter.RepoFullName != "" {
		where += " AND rep.full_name = ?"
		args = append(args, filter.RepoFullName)
	}
	args = append(args, limit)

	query := gfiListSelect + `
		WHERE ` + where + `
		ORDER BY (rep.boost_expires_at > CURRENT_TIMESTAMP) DESC, rep.boost_expires_at ASC,
			g.created_at DESC, g.id DESC
		LIMIT ?
	`

	items, err := r.selectAndEnrich(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	// AC3: dedupe by issue id regardless of join shape.
	seen := make(map[int64]bool, len(items))
	out := items[:0]
	for _, it := range items {
		if seen[it.ID] {
			continue
		}
		seen[it.ID] = true
		out = append(out, it)
	}
	if out == nil {
		out = []GoodFirstIssueItem{}
	}
	return out, nil
}

func (r *sqlxGFIRepository) selectAndEnrich(ctx context.Context, query string, args ...interface{}) ([]GoodFirstIssueItem, error) {
	var items []GoodFirstIssueItem
	if err := r.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}
	for i := range items {
		ok, amount := bounty.Detect(items[i].LabelsJSON)
		items[i].IsBounty = ok
		items[i].BountyAmount = amount
		// Repo Boost (AC1/AC5): a repo with boost_expires_at in the future
		// sponsors ALL its open good-first-issues at query time.
		if items[i].RepoBoostExpiresAt != nil && items[i].RepoBoostExpiresAt.After(time.Now().UTC()) {
			items[i].Sponsored = true
		}
	}
	return items, nil
}

// finalizeBountyList applies the exact-match bounty filter and trims to the
// caller's original limit after the boosted-first ordering (AC1/AC5).
func finalizeBountyList(items []GoodFirstIssueItem, bountyOnly bool, limit int) []GoodFirstIssueItem {
	out := items[:0]
	for _, it := range items {
		if bountyOnly && !it.IsBounty {
			continue
		}
		out = append(out, it)
	}
	if len(out) > limit {
		out = out[:limit]
	}
	if out == nil {
		out = []GoodFirstIssueItem{}
	}
	return out
}

func stringsToLower(s string) string {
	var b []byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c += 'a' - 'A'
		}
		b = append(b, c)
	}
	return string(b)
}
