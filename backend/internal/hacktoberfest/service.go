package hacktoberfest

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
)

// searchItem is the subset of a /search/issues row the predicate consumes.
type searchItem struct {
	Number   int    `json:"number"`
	Title    string `json:"title"`
	HTMLURL  string `json:"html_url"`
	State    string `json:"state"`
	Draft    bool   `json:"draft"`
	Labels   []struct {
		Name string `json:"name"`
	} `json:"labels"`
	User *struct {
		Login string `json:"login"`
	} `json:"user,omitempty"`
	PullRequest *struct {
		MergedAt *time.Time `json:"merged_at"`
	} `json:"pull_request,omitempty"`
	Repository *struct {
		ID       int    `json:"id"`
		FullName string `json:"full_name"`
	} `json:"repository,omitempty"`
}

const (
	// pollCacheTTL is the AC5 per-user 5-min response cache: repeated page
	// loads inside the window are served from the persisted set, not GitHub.
	pollCacheTTL = 5 * time.Minute
	// nudgeThrottle caps stream-triggered immediate re-polls at <=1/user/min (AC3).
	nudgeThrottle = time.Minute
	// backoffBase/Max drive exponential backoff after limited fetches (AC5).
	backoffBase = 2 * time.Minute
	backoffMax  = 30 * time.Minute

	cardIDBytes  = 16
	cardTTL      = 90 * 24 * time.Hour
	refTokenKDF  = "card-ref:" // same format as handler.SignReferralToken consumers verify
	searchPageSz = 100
)

// Service orchestrates reconcile flows over the persisted merge set.
type Service struct {
	Store  *Store
	Conn   *prtracker.Store
	Tokens auth.TokenManager
	GH     *prtracker.GHClient
	Secret string // JWT secret reused to sign completion-card referral tokens
}

func NewService(store *Store, conn *prtracker.Store, tokens auth.TokenManager, gh *prtracker.GHClient, secret string) *Service {
	return &Service{Store: store, Conn: conn, Tokens: tokens, GH: gh, Secret: secret}
}

// Result is one progress lookup outcome; Cached results freeze last-known state.
type Result struct {
	Cached       bool
	Limited      bool          // served under rate-limit backoff (AC5)
	ReconnectReq bool          // token revoked/expired mid-session (AC6)
	RetryAfter   time.Duration // server-enforced wait before the next re-poll is honored
	Progress     Progress
	Merges       []StoredMerge
}

// TouchActivity records an open viewer page (AC5 lazy polling).
func (s *Service) TouchActivity(ctx context.Context, userID int64) {
	if err := s.Store.TouchActive(ctx, userID, time.Now().UTC()); err != nil {
		slog.Warn("hacktoberfest: touch activity failed", "err", err)
	}
}

// Reconcile reconciles the persisted qualifying set against the GitHub search
// API. force marks a stream/nudge-triggered immediate re-poll (throttled to
// once per user per minute, AC3); otherwise the 5-min per-user cache applies (AC5).
func (s *Service) Reconcile(ctx context.Context, userID int64, login string, force bool) (*Result, error) {
	now := time.Now().UTC()
	year := EventYear(now)

	prog, err := s.Store.GetProgress(ctx, userID, year)
	if err != nil {
		prog = Progress{UserID: userID, Year: year, TotalQualifying: -1} // no row yet
	}

	cached := func() *Result {
		return &Result{Cached: true, Progress: prog, Merges: nil}
	}

	if prog.BackoffUntil != nil && prog.BackoffUntil.After(now) {
		res := cached()
		res.Limited = true
		return res, nil
	}
	if force && prog.LastNudgedAt != nil && now.Sub(*prog.LastNudgedAt) < nudgeThrottle {
		res := cached()
		res.RetryAfter = nudgeThrottle - now.Sub(*prog.LastNudgedAt)
		return res, nil
	}
	if !force && prog.LastReconciledAt != nil && now.Sub(*prog.LastReconciledAt) < pollCacheTTL {
		return cached(), nil
	}

	if err := s.Store.MarkNudged(ctx, userID, year, now); err != nil {
		slog.Warn("hacktoberfest: mark nudge failed", "err", err)
	}

	token, err := s.Tokens.GetValidGithubToken(ctx, userID)
	if err != nil || token == "" {
		_ = s.Conn.SetConnection(ctx, userID, login, prtracker.ConnectionReconnectRequired, false, "GitHub token expired or missing")
		return &Result{Cached: true, ReconnectReq: true, Progress: prog}, nil // AC6: frozen count, never zeroed
	}

	items, res, err := s.searchMergedPRs(ctx, userID, token, login, year)
	if err != nil || (res != nil && res.Unauthorized) {
		if res != nil && res.Unauthorized {
			conn, _ := s.Conn.GetConnection(ctx, userID)
			limited := conn != nil && conn.LastLimited
			_ = s.Conn.SetConnection(ctx, userID, login, prtracker.ConnectionReconnectRequired, limited, "401 from GitHub: reconnect required")
			return &Result{Cached: true, ReconnectReq: true, Progress: prog}, nil // AC6 freeze
		}
		attempts := prog.BackoffAttempts + 1
		_ = s.Store.SetBackoff(ctx, userID, year, attempts, now.Add(backoffFor(attempts)))
		out := &Result{Cached: true, Limited: true, Progress: prog}
		if res != nil {
			out.RetryAfter = res.RetryAfter
		}
		return out, nil
	}

	candidates := make([]MergeCandidate, 0, len(items))
	for _, it := range items {
		if it.Repository == nil {
			continue
		}
		c := MergeCandidate{
			RepoFullName: it.Repository.FullName,
			Number:       it.Number,
			Title:        it.Title,
			HTMLURL:      it.HTMLURL,
			Draft:        it.Draft,
		}
		c.PRID = fmt.Sprintf("%s#%d", c.RepoFullName, c.Number)
		if it.User != nil {
			c.AuthorLogin = it.User.Login
		} else {
			c.AuthorLogin = login // author:{login} query guarantees authorship
		}
		if it.PullRequest != nil && it.PullRequest.MergedAt != nil {
			c.MergedAt = *it.PullRequest.MergedAt
		}
		for _, l := range it.Labels {
			c.Labels = append(c.Labels, l.Name)
		}
		candidates = append(candidates, c)
	}

	card := s.buildCardParams(userID, now)
	outcome, err := s.Store.ReconcileMerges(ctx, userID, year, candidates, login, card)
	if err != nil {
		return nil, err
	}
	_ = s.Store.MarkReconciled(ctx, userID, year, now)
	_ = s.Conn.SetConnection(ctx, userID, login, prtracker.ConnectionActive, false, "")

	fresh, err := s.Store.GetProgress(ctx, userID, year)
	if err != nil {
		fresh = prog
		fresh.TotalQualifying = outcome.Total
	}
	merges, merr := s.Store.ListStoredMerges(ctx, userID, year)
	if merr != nil {
		merges = nil
	}
	if outcome.IssuedCard {
		slog.Info("hacktoberfest: completion card issued", "user_id", userID, "year", year, "card_id", outcome.CardID)
	}
	return &Result{Progress: fresh, Merges: merges}, nil
}

func backoffFor(attempt int) time.Duration {
	d := backoffBase << uint(attempt-1)
	if d > backoffMax || d <= 0 {
		d = backoffMax
	}
	return d
}

// searchMergedPRs queries GitHub's issue search for the user's PRs merged in
// the October window (AC2 source of truth). ETag caching, per-user budgets and
// exponential backoff on 403/429 are inherited from prtracker.GHClient (AC5).
func (s *Service) searchMergedPRs(ctx context.Context, userID int64, token, login string, year int) ([]searchItem, *prtracker.GetResult, error) {
	start, _ := EventWindow(year)
	end := start.AddDate(0, 0, 30) // inclusive Oct 31 for GitHub's merged:.. range
	q := fmt.Sprintf("type:pr author:%s merged:true merged:%s..%s",
		login, start.Format("2006-01-02"), end.Format("2006-01-02"))
	apiURL := fmt.Sprintf("%s/search/issues?q=%s&per_page=%d&page=1",
		"https://api.github.com", url.QueryEscape(q), searchPageSz)
	res, err := s.GH.Get(ctx, userID, token, apiURL)
	if err != nil {
		return nil, res, err
	}
	if res.Unauthorized {
		return nil, res, nil
	}
	var parsed struct {
		TotalCount int         `json:"total_count"`
		Items      []searchItem `json:"items"`
	}
	if err := json.Unmarshal(res.Body, &parsed); err != nil {
		return nil, res, fmt.Errorf("hacktoberfest search decode failed: %w", err)
	}
	return parsed.Items, res, nil
}

// buildCardParams pre-builds the completion card payload so issuance stays
// inside the reconcile transaction (AC4).
func (s *Service) buildCardParams(userID int64, now time.Time) CardParams {
	id := make([]byte, cardIDBytes)
	if _, err := rand.Read(id); err != nil {
		// Fall back to a timestamp-derived ID; uniqueness within the CAS still holds via the flag.
		id = []byte(fmt.Sprintf("hb-%d-%d", userID, now.UnixNano()))
	}
	expires := now.Add(cardTTL)
	summary := fmt.Sprintf("%d of %d Hacktoberfest pull requests merged and verified on GitHub.", TargetMergeCount, TargetMergeCount)
	return CardParams{
		ID:        hex.EncodeToString(id),
		RefToken:  signRefToken(s.Secret, userID, expires),
		Summary:   summary,
		ExpiresAt: expires,
	}
}

func signRefToken(secret string, creatorID int64, expiresAt time.Time) string {
	payload := fmt.Sprintf("%d:%d", creatorID, expiresAt.Unix())
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(refTokenKDF + payload))
	sig := hex.EncodeToString(mac.Sum(nil))[:20]
	return "cd." + base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + sig
}

// StartCron polls only users with an open viewer page every interval (AC5).
// Returns a stop function.
func (s *Service) StartCron(interval time.Duration) (stop func()) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.pollActiveViewers(ctx, interval)
			}
		}
	}()
	return func() { cancel(); <-done }
}

func (s *Service) pollActiveViewers(ctx context.Context, interval time.Duration) {
	viewers, err := s.Store.ActiveViewers(ctx, time.Now().UTC().Add(-(interval + time.Minute)))
	if err != nil {
		slog.Warn("hacktoberfest cron: load active viewers failed", "err", err)
		return
	}
	polled := 0
	for _, v := range viewers {
		select {
		case <-ctx.Done():
			return
		default:
		}
		res, err := s.Reconcile(ctx, v.UserID, v.Login, false)
		if err != nil {
			slog.Warn("hacktoberfest cron: reconcile failed", "user_id", v.UserID, "err", err)
			continue
		}
		if !res.Cached {
			polled++
		}
	}
	if polled > 0 {
		slog.Info("hacktoberfest cron pass complete", "viewers", len(viewers), "polled", polled)
	}
}
