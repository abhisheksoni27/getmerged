package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/gemoji"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
)

// repoAuditDodoProductID is the DodoPayments product for the one-time $9.50
// maintainer intelligence audit. Reuses the existing DodoPayments checkout + webhook stack.
const repoAuditDodoProductID = "pdt_0Nmb34t0HxGR01OBwxwMU"

// auditHostedCheckoutURL is the safe fallback when the Dodo session API is
// unavailable — the buy path must never dead-end (matches pack flow AC1/AC5).
const auditHostedCheckoutURL = "https://checkout.dodopayments.com/buy/pdt_0Nmb34t0HxGR01OBwxwMU"

// auditFactorWeights mirrors scoring.weights (unexported there) so the report
// can present per-factor C-Rank contributions. Must sum to 1.0.
var auditFactorWeights = map[string]float64{
	"merge_rate":         0.275,
	"response_time":      0.15,
	"activity_recency":   0.15,
	"first_timer":        0.10,
	"time_to_merge":      0.10,
	"repeat_contributor": 0.10,
	"review_rounds":      0.05,
	"maintainer_breadth": 0.05,
	"responsiveness":     0.025,
}

// auditFactorMeta describes each C-Rank factor for the report breakdown.
type auditFactorMeta struct {
	Key           string
	Label         string
	LowerIsBetter bool // for peer-percentile inversion
	RawGetter     func(scoring.RawMetrics) float64
	NormGetter    func(scoring.NormalisedMetrics) float64
}

var auditFactors = []auditFactorMeta{
	{"merge_rate", "External PR Merge Rate", false, func(m scoring.RawMetrics) float64 { return m.ExternalPRMergeRate }, func(n scoring.NormalisedMetrics) float64 { return n.MergeRate }},
	{"response_time", "First Response Time", true, func(m scoring.RawMetrics) float64 { return m.TimeToFirstResponseHours }, func(n scoring.NormalisedMetrics) float64 { return n.ResponseTime }},
	{"activity_recency", "Activity Recency", true, func(m scoring.RawMetrics) float64 { return m.LastActivityDays }, func(n scoring.NormalisedMetrics) float64 { return n.ActivityRecency }},
	{"first_timer", "First-Timer Success Rate", false, func(m scoring.RawMetrics) float64 { return m.FirstTimerSuccessRate }, func(n scoring.NormalisedMetrics) float64 { return n.FirstTimer }},
	{"time_to_merge", "Time to Merge", true, func(m scoring.RawMetrics) float64 { return m.TimeToMergeHours }, func(n scoring.NormalisedMetrics) float64 { return n.TimeToMerge }},
	{"repeat_contributor", "Repeat Contributor Rate", false, func(m scoring.RawMetrics) float64 { return m.RepeatContributorRate }, func(n scoring.NormalisedMetrics) float64 { return n.RepeatContributor }},
	{"review_rounds", "Review Rounds", true, func(m scoring.RawMetrics) float64 { return m.ReviewRounds }, func(n scoring.NormalisedMetrics) float64 { return n.ReviewRounds }},
	{"maintainer_breadth", "Maintainer Breadth", false, func(m scoring.RawMetrics) float64 { return m.DistinctMaintainerCount }, func(n scoring.NormalisedMetrics) float64 { return n.MaintainerBreadth }},
	{"responsiveness", "Maintainer Responsiveness", true, func(m scoring.RawMetrics) float64 { return m.MaintainerResponsiveness }, func(n scoring.NormalisedMetrics) float64 { return n.Responsiveness }},
}

func auditRepoKey(owner, name string) string {
	return strings.ToLower(owner) + "/" + strings.ToLower(name)
}

func newAuditSessionToken() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "audit_" + hex.EncodeToString(buf), nil
}

// CreateRepoAuditCheckoutHandler handles POST /repo/:owner/:name/audit/checkout
// Requires auth + verifies the requesting user is an admin maintainer of the repo
// (using the stored maintainer OAuth token). Already-paid repos are not re-billed.
func CreateRepoAuditCheckoutHandler(cfg *config.Config, auditRepo repository.AuditPurchaseRepository, repoStore repository.RepoRepository, oauthRepo repository.OAuthTokenRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		// Username is set by UserAuth middleware from the JWT claims.
		usernameVal, _ := c.Get(middleware.UsernameKey)
		username, _ := usernameVal.(string)

		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name
		repoKey := auditRepoKey(owner, name)

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err != nil || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// ── Maintainer verification ────────────────────────────────────────────
		// Reuse the stored maintainer OAuth token (github_maintainer provider).
		// If unavailable, fall back to the standard github login token.
		// On any successful token, verify the user is an admin collaborator.
		if err := verifyRepoMaintainer(c.Request.Context(), oauthRepo, userID, username, owner, name); err != nil {
			slog.Warn("audit checkout: maintainer verification failed", "user_id", userID, "repo", fullName, "err", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "not_maintainer", "message": "You must be an admin maintainer of this repository to purchase an audit."})
			return
		}

		sessionToken, err := newAuditSessionToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		purchase, err := auditRepo.GetOrCreatePending(c.Request.Context(), userID, repoKey, sessionToken)
		if err != nil {
			slog.Error("audit checkout: failed to create pending purchase", "user_id", userID, "repo_key", repoKey, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start checkout"})
			return
		}

		checkoutURL, checkoutID := createDodoAuditCheckout(c.Request.Context(), cfg, userID, repoKey, sessionToken)
		if checkoutID != "" {
			if err := auditRepo.SetCheckoutID(c.Request.Context(), userID, repoKey, checkoutID); err != nil {
				slog.Warn("audit checkout: failed to store dodo checkout id", "err", err)
			}
		}
		if checkoutURL == "" {
			checkoutURL = auditHostedCheckoutURL
		}

		c.JSON(http.StatusOK, gin.H{
			"checkout_url": checkoutURL,
			"session_id":   purchase.SessionID,
			"repo_key":     repoKey,
			"status":       purchase.Status,
		})
	}
}

// verifyRepoMaintainer checks that the authenticated user is an admin collaborator
// on the repo by using their stored maintainer OAuth token (github_maintainer provider).
// Falls back to the standard github provider token if the maintainer token is absent.
// Returns nil on success, an error if the user is not a maintainer.
func verifyRepoMaintainer(ctx context.Context, oauthRepo repository.OAuthTokenRepository, userID int64, username, owner, name string) error {
	// Try maintainer-specific token first (most permissive scope).
	token, _, _, err := oauthRepo.GetToken(ctx, userID, "github_maintainer")
	if err != nil || token == "" {
		// Fall back to the standard github login token.
		token, _, _, err = oauthRepo.GetToken(ctx, userID, "github")
		if err != nil || token == "" {
			// No token stored at all — cannot verify. Block checkout to be safe.
			return fmt.Errorf("no github token available for user %d", userID)
		}
	}

	// Resolve login from token if username not in JWT (should always be set, but defensive).
	login := username
	if login == "" {
		login, err = ghclient.GetViewerLogin(token)
		if err != nil {
			return fmt.Errorf("failed to resolve github login: %w", err)
		}
	}

	perm, err := ghclient.CheckCollaboratorPermission(token, owner, name, login)
	if err != nil {
		return fmt.Errorf("permission check failed: %w", err)
	}
	if perm != "admin" && perm != "maintain" {
		return fmt.Errorf("user %q has permission %q on %s/%s, not admin/maintain", login, perm, owner, name)
	}
	return nil
}



// returnURL builds the post-payment redirect target for an audit checkout,
// pointing back at the report page so the client poll can unlock it (AC6).
func returnURL(cfg *config.Config, repoKey string) string {
	base := strings.TrimRight(cfg.AppBaseURL, "/")
	if base == "" {
		base = "https://getmerged.abhishekco.de"
	}
	return base + "/" + repoKey + "/audit"
}

// createDodoAuditCheckout opens a DodoPayments checkout session for the audit
// product. Returns ("", "") when the session API is unusable so the caller can
// fall back to the hosted product page.
func createDodoAuditCheckout(ctx context.Context, cfg *config.Config, userID int64, repoKey, sessionToken string) (string, string) {
	if cfg == nil || cfg.DodopaymentsAPIKey == "" {
		return "", ""
	}
	body, err := json.Marshal(map[string]any{
		"product_cart": []map[string]any{
			{"product_id": repoAuditDodoProductID, "quantity": 1},
		},
		"metadata": map[string]string{
			"user_id":  fmt.Sprintf("%d", userID),
			"repo_key": repoKey,
			"product":  "audit",
		},
		"session_id": sessionToken,
		// AC6: Dodo redirects here after payment so the client can poll
		// /api/audit/status and auto-unlock the report.
		"return_url": returnURL(cfg, repoKey) + "?checkout=success",
	})
	if err != nil {
		return "", ""
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, dodoCheckoutsAPIURL, strings.NewReader(string(body)))
	if err != nil {
		return "", ""
	}
	req.Header.Set("Authorization", "Bearer "+cfg.DodopaymentsAPIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("audit checkout session request failed; using hosted fallback", "err", err)
		return "", ""
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("audit checkout session returned non-2xx; using hosted fallback", "status", resp.StatusCode)
		return "", ""
	}
	var parsed struct {
		ID          string `json:"id"`
		CheckoutID  string `json:"checkout_id"`
		CheckoutURL string `json:"checkout_url"`
		PaymentLink string `json:"payment_link"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", ""
	}
	sid := parsed.ID
	if sid == "" {
		sid = parsed.CheckoutID
	}
	url := parsed.CheckoutURL
	if url == "" {
		url = parsed.PaymentLink
	}
	if url == "" {
		return "", ""
	}
	return url, sid
}

// GetRepoAuditStatusHandler handles GET /api/audit/status?repo_key= (AC4/AC6):
// returns the purchase status for the authenticated user. While 'pending' it
// opportunistically reconciles the Dodo checkout so the client poll converges
// without waiting for the webhook (AC6). Best-effort: never surfaces an error.
func GetRepoAuditStatusHandler(auditRepo repository.AuditPurchaseRepository, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		repoKey := strings.TrimSpace(c.Query("repo_key"))
		if repoKey == "" || len(repoKey) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing or invalid repo_key"})
			return
		}

		status, ok, err := auditRepo.GetStatus(c.Request.Context(), userID, repoKey)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "none"})
			return
		}
		if !ok {
			c.JSON(http.StatusOK, gin.H{"status": "none"})
			return
		}
		if status != repository.AuditStatusPending {
			c.JSON(http.StatusOK, gin.H{"status": status})
			return
		}

		// Opportunistic reconcile for a pending purchase: look up the row by
		// (user_id, repo_key) and, if it carries a Dodo checkout id, poll its
		// state so the client poll converges without waiting for the webhook.
		if p, err := auditRepo.Get(c.Request.Context(), userID, repoKey); err == nil && p != nil && p.DodoCheckoutID != "" {
			if paymentID, st := fetchDodoCheckoutState(c.Request.Context(), cfg.DodopaymentsAPIKey, p.DodoCheckoutID); st == "paid" {
				if err := auditRepo.MarkPaid(c.Request.Context(), userID, repoKey, p.SessionID, paymentID); err == nil {
					c.JSON(http.StatusOK, gin.H{"status": repository.AuditStatusPaid})
					return
				}
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": status})
	}
}

// GetRepoAuditReportHandler handles GET /repo/:owner/:name/audit (AC1/AC4):
// server-side access enforced via auth user + purchases.status='paid'; otherwise
// 403. On success returns the full deep-audit report reusing the C-Rank scoring
// engine, peer percentiles, and AI insights.
func GetRepoAuditReportHandler(cfg *config.Config, auditRepo repository.AuditPurchaseRepository, repoStore repository.RepoRepository, aiClient *ai.AIClient, aiRepo repository.AIRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name
		repoKey := auditRepoKey(owner, name)

		status, ok, err := auditRepo.GetStatus(c.Request.Context(), userID, repoKey)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check purchase"})
			return
		}
		if !ok || status != repository.AuditStatusPaid {
			c.JSON(http.StatusForbidden, gin.H{"error": "audit not purchased", "status": statusOrNone(ok, status)})
			return
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err != nil || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		report, err := buildAuditReport(c.Request.Context(), repoStore, aiRepo, repo)
		if err != nil {
			slog.Error("audit report: build failed", "repo", fullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build report"})
			return
		}
		c.JSON(http.StatusOK, report)
	}
}

func statusOrNone(ok bool, status string) string {
	if !ok {
		return "none"
	}
	return status
}

// buildAuditReport computes the deep-audit report from stored telemetry: full
// per-factor C-Rank breakdown, percentile vs peer repos, and AI-prioritized
// fixes from cached insights. Never calls the paid AI API (regeneration is a
// separate rate-limited endpoint), so the report is always free to render.
func buildAuditReport(ctx context.Context, repoStore repository.RepoRepository, aiRepo repository.AIRepository, repo *repository.RepoRecord) (map[string]any, error) {
	rawThis := scoring.RawMetrics{
		ExternalPRMergeRate:      repo.ExternalPRMergeRate,
		TimeToFirstResponseHours: repo.TimeToFirstResponseHours,
		TimeToMergeHours:         repo.TimeToMergeHours,
		FirstTimerSuccessRate:    repo.FirstTimerSuccessRate,
		RepeatContributorRate:    repo.RepeatContributorRate,
		MaintainerResponsiveness: repo.MaintainerResponsiveness,
		LastActivityDays:         repo.LastActivityDays,
		ReviewRounds:             repo.ReviewRounds,
		DistinctMaintainerCount:  repo.DistinctMaintainerCount,
		BusFactor:                repo.BusFactor,
		StalenessFlag:            repo.StalenessFlag,
		GoodFirstIssueCount:      repo.GoodFirstIssueCount,
	}

	peers, err := repoStore.FetchLatestSnapshotsSample(ctx, 500)
	if err != nil || len(peers) == 0 {
		peers = []scoring.RawMetrics{rawThis}
	}
	allRaw := append(peers, rawThis)
	normedAll := scoring.NormaliseAll(allRaw)
	thisNormed := normedAll[len(normedAll)-1]

	score, tier := scoring.ComputeCRank(thisNormed, rawThis.StalenessFlag, rawThis.GoodFirstIssueCount, repo.CRankTier)

	// Build per-peer raw distributions for percentile vs peers.
	peerDist := map[string][]float64{}
	for _, f := range auditFactors {
		arr := make([]float64, 0, len(peers))
		for _, p := range peers {
			arr = append(arr, f.RawGetter(p))
		}
		sort.Float64s(arr)
		peerDist[f.Key] = arr
	}

	type factorOut struct {
		Key            string  `json:"key"`
		Label          string  `json:"label"`
		RawValue       float64 `json:"raw_value"`
		Normalized     float64 `json:"normalized_score"`
		PeerPercentile float64 `json:"peer_percentile"`
		ImpactLevel    string  `json:"impact_level"`
		Status         string  `json:"status"`
		SimulatedUplift float64 `json:"simulated_uplift"`
	}
	factorsOut := make([]factorOut, 0, len(auditFactors))
	var totalPotentialUplift float64
	for _, f := range auditFactors {
		norm := f.NormGetter(thisNormed)
		w := auditFactorWeights[f.Key]
		pr := scoring.PercentileRank(f.RawGetter(rawThis), peerDist[f.Key])
		if f.LowerIsBetter {
			pr = 100 - pr
		}

		// Impact classification (masks raw formula coefficients)
		impactLevel := "Moderate"
		if w >= 0.15 {
			impactLevel = "Critical"
		} else if w >= 0.10 {
			impactLevel = "High"
		} else if w < 0.05 {
			impactLevel = "Minor"
		}

		// Status diagnostic
		status := "Healthy"
		if pr < 30 {
			status = "Bottleneck"
		} else if pr < 55 {
			status = "Needs Attention"
		} else if pr >= 85 {
			status = "Exceptional"
		}

		// Potential uplift if brought to 80th percentile
		var uplift float64
		if pr < 75 {
			uplift = round1(math.Max(0, (75-pr)*w*0.35))
			totalPotentialUplift += uplift
		}

		factorsOut = append(factorsOut, factorOut{
			Key:            f.Key,
			Label:          f.Label,
			RawValue:       f.RawGetter(rawThis),
			Normalized:     round1(norm),
			PeerPercentile: round1(pr),
			ImpactLevel:    impactLevel,
			Status:         status,
			SimulatedUplift: uplift,
		})
	}

	// AI-prioritized fixes (cached only).
	insights := loadCachedInsights(ctx, aiRepo, repo)
	fixes := buildPrioritizedFixes(insights)

	// Review health & concentration
	concentrationRisk := "Distributed Review Team"
	if rawThis.DistinctMaintainerCount <= 1 || rawThis.BusFactor <= 1 {
		concentrationRisk = "High — Single Reviewer Bottleneck"
	} else if rawThis.DistinctMaintainerCount <= 3 {
		concentrationRisk = "Moderate — Concentrated Core Team"
	}

	// Review friction fingerprint
	stylePct := round1(math.Min(60, math.Max(15, insights.NitpickRatio*45+15)))
	testsPct := round1(math.Min(50, math.Max(20, rawThis.ReviewRounds*10+15)))
	scopePct := round1(math.Max(10, 100-(stylePct+testsPct)))

	// Tailored GitHub markdown templates
	prTemplate := fmt.Sprintf(`### Description
<!-- Briefly describe what your pull request solves and the approach taken. -->

### Changes Proposed
- 

### Verification & Testing
- [ ] Unit/Integration tests added or updated
- [ ] Local build and linters pass cleanly

### Contributor Checklist
- [ ] PR title follows Conventional Commits (e.g. feat:, fix:, docs:)
- [ ] Kept changes focused and within scope
`,)

	contributingGuide := fmt.Sprintf(`## Contributing to %s

### Quick Start & Review Guidelines
- **First Response Expectation**: Average review turnaround is ~%.1fh.
- **Pull Request Scope**: Keep pull requests focused on a single change to accelerate review rounds.
- **Code Standards**: Run linter and local test suite prior to submitting pull requests.
`, repo.FullName, rawThis.TimeToFirstResponseHours)

	return map[string]any{
		"repo": map[string]any{
			"full_name":    repo.FullName,
			"language":     repo.Language,
			"stars":        repo.Stars,
			"description":  gemoji.Resolve(repo.Description),
			"c_rank_score": round1(score),
			"c_rank_tier":  tier,
		},
		"overall": map[string]any{
			"score":                 round1(score),
			"tier":                  tier,
			"potential_uplift_pts": round1(totalPotentialUplift),
		},
		"factors": factorsOut,
		"pr_funnel": map[string]any{
			"merge_rate":               round1(rawThis.ExternalPRMergeRate),
			"abandonment_rate":         round1(math.Max(0, 100.0-rawThis.ExternalPRMergeRate)),
			"repeat_contributor_rate":  round1(rawThis.RepeatContributorRate),
			"first_timer_success_rate": round1(rawThis.FirstTimerSuccessRate),
		},
		"reviewer_health": map[string]any{
			"distinct_maintainers":     rawThis.DistinctMaintainerCount,
			"bus_factor":               rawThis.BusFactor,
			"avg_review_rounds":        round1(rawThis.ReviewRounds),
			"time_to_first_response_h": round1(rawThis.TimeToFirstResponseHours),
			"time_to_merge_h":          round1(rawThis.TimeToMergeHours),
			"concentration_risk":       concentrationRisk,
		},
		"friction_fingerprint": map[string]any{
			"formatting_and_style_pct": stylePct,
			"missing_tests_and_ci_pct": testsPct,
			"scope_and_spec_pct":       scopePct,
		},
		"actionable_templates": map[string]any{
			"pull_request_template": prTemplate,
			"contributing_guide":    contributingGuide,
		},
		"ai_insights": map[string]any{
			"maintainer_vibe":    insights.MaintainerVibe,
			"maintainer_persona": insights.MaintainerPersona,
			"warmth_score":       insights.WarmthScore,
			"patience_score":     insights.PatienceScore,
			"nitpick_ratio":      insights.NitpickRatio,
			"top_dos":            insights.TopDos,
			"top_donts":          insights.TopDonts,
			"deep_sections":      insights.DeepSections,
		},
		"prioritized_fixes": fixes,
	}, nil
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

// RegenerateRepoAuditInsightsHandler handles POST /repo/:owner/:name/audit/regen
// (AC7): rate-limited to 1/day per (user_id, repo_key). On limit hit it serves
// the cached report with regenerated:false (no new API cost, no error). A fresh
// generation updates the cached insights and the regen ledger.
func RegenerateRepoAuditInsightsHandler(cfg *config.Config, auditRepo repository.AuditPurchaseRepository, repoStore repository.RepoRepository, aiClient *ai.AIClient, aiRepo repository.AIRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		owner := c.Param("owner")
		name := c.Param("name")
		fullName := owner + "/" + name
		repoKey := auditRepoKey(owner, name)

		status, ok, err := auditRepo.GetStatus(c.Request.Context(), userID, repoKey)
		if err != nil || !ok || status != repository.AuditStatusPaid {
			c.JSON(http.StatusForbidden, gin.H{"error": "audit not purchased"})
			return
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err != nil || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// Rate-limit: has this (user, repo) regenerated in the last 24h?
		if withinRegenWindow(c.Request.Context(), auditRepo, userID, repoKey) {
			cached := loadCachedInsights(c.Request.Context(), aiRepo, repo)
			c.JSON(http.StatusOK, gin.H{
				"regenerated": false,
				"reason":      "rate_limited",
				"insights":    cached,
			})
			return
		}

		// Fresh generation (best-effort; on failure serve cached, no error).
		regenerated := false
		if aiClient != nil {
			prComments, _ := aiRepo.GetPRComments(c.Request.Context(), repo.ID, 100)
			issueComments, _ := aiRepo.GetIssueComments(c.Request.Context(), repo.ID, 100)
			resp, genErr := aiClient.GenerateRepoInsights(c.Request.Context(), repo.FullName, prComments, issueComments)
			if genErr == nil && resp != nil {
				dos, _ := json.Marshal(resp.TopDos)
				donts, _ := json.Marshal(resp.TopDonts)
				deep, _ := json.Marshal(resp.DeepSections)
				saveErr := aiRepo.SaveInsights(c.Request.Context(), &repository.AIInsights{
					RepoID:            repo.ID,
					MaintainerVibe:    resp.MaintainerVibe,
					PRGuidelines:      string(dos),
					IssueQualityScore: resp.IssueQualityScore,
					RawSummary:        resp.RawSummary,
					WarmthScore:       resp.WarmthScore,
					PatienceScore:     resp.PatienceScore,
					NitpickRatio:      resp.NitpickRatio,
					MaintainerPersona: resp.MaintainerPersona,
					DosJSON:           string(dos),
					DontsJSON:         string(donts),
					DeepSectionsJSON:  string(deep),
				})
				if saveErr == nil {
					regenerated = true
					_ = auditRepo.MarkRegen(c.Request.Context(), userID, repoKey)
				}
			}
		}

		cached := loadCachedInsights(c.Request.Context(), aiRepo, repo)
		c.JSON(http.StatusOK, gin.H{
			"regenerated": regenerated,
			"insights":    cached,
		})
	}
}

func withinRegenWindow(ctx context.Context, auditRepo repository.AuditPurchaseRepository, userID int64, repoKey string) bool {
	t, err := auditRepo.GetLastRegen(ctx, userID, repoKey)
	if err != nil || t == nil {
		return false
	}
	return time.Since(*t) < 24*time.Hour
}

// auditAIInsights is the parsed view of cached AI insights used by the report.
// The repository stores dos/donts/deep sections as JSON strings; we decode
// them once here so the report and prioritized-fixes builders share one shape.
type auditAIInsights struct {
	MaintainerVibe    string
	MaintainerPersona string
	WarmthScore       float64
	PatienceScore     float64
	NitpickRatio      float64
	TopDos            []string
	TopDonts          []string
	DeepSections      []ai.DeepSection
}

// loadCachedInsights returns the stored AI insights (never generates). Missing
// rows yield a zero struct so the report renders gracefully (AC7 stale-cache).
func loadCachedInsights(ctx context.Context, aiRepo repository.AIRepository, repo *repository.RepoRecord) auditAIInsights {
	out := auditAIInsights{}
	cached, err := aiRepo.GetInsights(ctx, repo.ID)
	if err != nil || cached == nil {
		return out
	}
	out.MaintainerVibe = cached.MaintainerVibe
	out.MaintainerPersona = cached.MaintainerPersona
	out.WarmthScore = cached.WarmthScore
	out.PatienceScore = cached.PatienceScore
	out.NitpickRatio = cached.NitpickRatio
	_ = json.Unmarshal([]byte(cached.DosJSON), &out.TopDos)
	_ = json.Unmarshal([]byte(cached.DontsJSON), &out.TopDonts)
	_ = json.Unmarshal([]byte(cached.DeepSectionsJSON), &out.DeepSections)
	return out
}

// buildPrioritizedFixes converts cached AI insights into an ordered list of
// AI-prioritized fixes (don'ts ranked first, then deep-section themes).
func buildPrioritizedFixes(ins auditAIInsights) []map[string]any {
	fixes := make([]map[string]any, 0, 8)
	for _, d := range ins.TopDonts {
		if strings.TrimSpace(d) == "" {
			continue
		}
		fixes = append(fixes, map[string]any{"priority": len(fixes) + 1, "type": "avoid", "text": d})
	}
	for _, s := range ins.DeepSections {
		if s.Title == "" {
			continue
		}
		fixes = append(fixes, map[string]any{"priority": len(fixes) + 1, "type": "theme", "title": s.Title, "text": s.Body})
	}
	return fixes
}
