// @title           OpenDoor API
// @version         1.0
// @description     Find open-source repositories that welcome contributors - ranked by C-Rank™.
// @host            opendoor.abhishekco.de
// @BasePath        /
// @securityDefinitions.apikey BearerAuth
// @in              header
// @name            Authorization
// @description     Public API key auth. Create a key in your dashboard, then send: Authorization: Bearer odk_... Limits per key - Free: 60 req/hour + 10 req/min burst; Pro: 600 req/hour + 100 req/min burst. Errors: 401 code=ERR_MALFORMED_AUTH_HEADER or ERR_INVALID_API_KEY (invalid/revoked); 429 code=ERR_RATE_LIMITED with Retry-After header.
package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/claim"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/ghapp"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/hacktoberfest"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/issueclaim"
	"github.com/abhisheksoni27/opendoor/internal/league"
	"github.com/abhisheksoni27/opendoor/internal/maintainerclaim"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/prsim"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scan"
	"github.com/abhisheksoni27/opendoor/internal/stack"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		// slog not set up yet - use stderr directly.
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}

	setupLogger(cfg.GinMode, cfg.LogFile, cfg.LogLevel)

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connection failed", "url", cfg.DatabaseURL, "err", err)
		os.Exit(1)
	}
	defer database.Close()
	slog.Info("db connected", "url", cfg.DatabaseURL)

	if err := db.AutoMigrate(database); err != nil {
		slog.Error("auto-migrate failed", "err", err)
		os.Exit(1)
	}

	cacheMiddleware, vkClient, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyUsername, cfg.ValkeyPassword)
	if err != nil {
		slog.Warn("cache connection failed, proceeding without cache", "url", cfg.ValkeyURL, "err", err)
	}

	gh := ghclient.NewClient(cfg.GithubToken, vkClient)

	// Initialize AI and Notification clients
	sidecarManager, sidecarErr := ai.StartNLPSidecar(".", 8095)
	if sidecarErr != nil {
		slog.Warn("could not launch nlp sidecar sub-process", "err", sidecarErr)
	} else {
		defer sidecarManager.Stop()
	}

	aiClient := ai.NewAIClient(cfg.OpencodeAPIKey)
	telegramNotifier := notification.NewTelegramNotifier(cfg.TelegramBotToken, cfg.TelegramChatID)

	userRepo := repository.NewUserRepository(database, cfg)
	oauthTokenRepo := repository.NewOAuthTokenRepository(database, cfg)
	profileRepo := repository.NewContributorProfileRepository(database)
	entitlementRepo := repository.NewEntitlementRepository(database)
	recruiterRepo := repository.NewRecruiterRepository(database)
	// Talent Pass: async reindexer keeps the recruiter-search index fresh after
	// every contributor_profiles mutation (AC8). No new infra — single worker goroutine.
	handler.StartRecruiterReindexWorker(profileRepo)
	apiKeyRepo := repository.NewAPIKeyRepository(database)
	tokenMgr := auth.NewTokenManager(oauthTokenRepo, cfg, nil)
	dnaWorker := pipeline.NewContributorDNAWorker(userRepo, profileRepo, tokenMgr, cfg.GithubToken, nil)
	// Contributor DNA background poller: processes pending profiles
	go func() {
		poll := func() {
			var pendingUserIDs []int64
			if err := database.Select(&pendingUserIDs, "SELECT user_id FROM contributor_profiles WHERE profiling_status = 'pending' LIMIT 10"); err != nil {
				slog.Error("failed to query pending contributor profiles", "err", err)
				return
			}
			for _, uid := range pendingUserIDs {
				slog.Info("processing contributor DNA profiling", "user_id", uid)
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
				if err := dnaWorker.AnalyzeUser(ctx, uid); err != nil {
					slog.Warn("background dna worker failed", "user_id", uid, "err", err)
				} else {
					slog.Info("successfully completed contributor DNA profiling", "user_id", uid)
				}
				cancel()
			}
		}

		poll() // run immediately on startup
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			poll()
		}
	}()
	repoStore := repository.NewRepoRepository(database)
	watchlistRepo := repository.NewWatchlistRepository(database)
	auditRepo := repository.NewAuditPurchaseRepository(database)
	notifRepo := notification.NewNotificationCenterRepository(database)

	// In-App Notification Center: retention cron prunes read rows >30d (AC9).
	notification.StartRetentionCron(context.Background(), notifRepo, 24*time.Hour)
	aiRepo := repository.NewAIRepository(database)
	shareCardRepo := repository.NewShareCardRepository(database)
	claimRepo := repository.NewClaimRepository(database)
	claimSvc := claim.NewService(database, claimRepo, repoStore, tokenMgr, gh, cfg)
	ghAppSvc := ghapp.NewService(database, cfg, userRepo, claimRepo, repoStore, aiRepo)
	issueClaimSvc := issueclaim.NewService(database, gh, tokenMgr, repoStore, cfg)
	// Maintainer Claim & Fast-Track SLA badging (AC1-AC7).
	maintainerClaimRepo := maintainerclaim.NewRepository(database)
	maintainerClaimMailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
	maintainerClaimSvc := maintainerclaim.NewService(database, maintainerClaimRepo, oauthTokenRepo, userRepo, cfg, maintainerClaimMailer)
	defer ghAppSvc.Stop()

	// Start continuous background crawler worker loop
	gfiRepo := repository.NewGFIRepository(database)
	repoBoostRepo := repository.NewRepoBoostRepository(database)

	if cfg.GinMode == "release" {
		crawler := pipeline.NewBackgroundCrawler(database, gh, telegramNotifier)
		crawler.SetWorkers(cfg.CrawlerWorkers)
		crawler.ConfigureDiscovery(
			time.Duration(cfg.DiscoveryIntervalMinutes)*time.Minute,
			cfg.DiscoveryMaxNewPerRun,
			cfg.SnapshotRetentionDays,
		)
		crawler.Start()
		pipeline.StartAIInsightsCron(database, aiClient, aiRepo)
		defer crawler.Stop()
	}

	// PR Tracker: 15-min poll cron reusing the existing notifier queue (AC2, AC8).
	prTrackerStore := prtracker.NewStore(database)
	prTrackerSvc := prtracker.NewService(prTrackerStore, tokenMgr, prtracker.NewGHClient(vkClient), database)
	// AC6: wire the "Merged via OpenDoor" proof-card generator into the sync loop.
	prTrackerSvc.SetSink(handler.NewMergeCardSink(shareCardRepo, cfg.JWTSecret))
	stopPRTrackerCron := prTrackerSvc.StartCron(15 * time.Minute)
	defer stopPRTrackerCron()

	// Credit-pack reconcile: hourly DodoPayments poll for paid-but-ungranted
	// pack purchases (missed-webhook failure mode, AC4). No-ops without an
	// API key configured.
	handler.NewPackPurchaseReconciler(cfg, entitlementRepo).Start(context.Background())

	// Repo deep-audit reconcile: 5-minute DodoPayments poll for paid-but-un-
	// activated one-time audit purchases (missed-webhook failure mode, AC6).
	// No-ops without an API key configured.
	handler.NewRepoAuditReconciler(cfg, auditRepo).Start(context.Background())

	// Hacktoberfest hub: lazy 5-min poll over active viewers only (AC5).
	hbStore := hacktoberfest.NewStore(database)
	hbSvc := hacktoberfest.NewService(hbStore, prTrackerStore, tokenMgr, prtracker.NewGHClient(vkClient), cfg.JWTSecret)
	stopHacktoberfestCron := hbSvc.StartCron(5 * time.Minute)
	defer stopHacktoberfestCron()

	// Monthly League Service
	leagueSvc := league.NewService(database.DB)

	// Stack Stalker & Dependency Health Radar
	stackAnalyzer := stack.NewAnalyzer(database)
	stackHandler := handler.NewStackHandler(stackAnalyzer, tokenMgr, userRepo, database)

	// Issue Sniper Alert Service
	sniperHandler := handler.NewSniperHandler(database)

	// Stalled-PR rescue alerts: hourly sweep comparing tracked open PRs
	// against each repo's merged p75 wait; email + configured Slack/Discord.
	stopStallAlertCron := startPRStallAlertCron(cfg, database)
	defer stopStallAlertCron()

	// Watchlist C-Rank change alerts: chained strictly after every snapshot
	// cycle's rescore-completion event (never cron-raced) with the real SMTP
	// mailer and the existing unsubscribe flow. Outbox-backed: 1 batched
	// email/user/night, sent_alerts exactly-once per run, retries with
	// backoff, send-time unsubscribe checks, 06:00 UTC watchdog (AC4).
	pipeline.CRankAlertHook = func(hookDB *sqlx.DB) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := notification.MarkCRankRescoreComplete(ctx, hookDB); err != nil {
			slog.Error("crank rescore completion marker failed", "err", err)
		}
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		if _, err := notification.RunCRankChangeAlerts(ctx, hookDB, notification.CRankAlertConfig{
			Mailer:    mailer,
			BaseURL:   cfg.AppBaseURL,
			JobSecret: cfg.JobSecret,

			DeltaThresholdPoints: cfg.AlertDropThreshold,
			RequireFreshRescore:  true,
		}); err != nil {
			slog.Error("crank change alerts failed", "err", err)
		}
	}

	// AC7 clean baseline: seed snapshots for every existing watched repo at
	// deploy/startup so the first post-deploy dry-run produces zero alerts.
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		n, err := notification.SeedAllWatchBaselines(ctx, database)
		if err != nil {
			slog.Error("watch baseline deploy seed failed", "err", err)
			return
		}
		if n > 0 {
			slog.Info("watch baselines seeded at startup", "pairs", n)
		}
	}()

	// AC4 watchdog: daily 06:00 UTC check that the rescore-completion event
	// arrived; logs critical and leaves alerts skipped otherwise.
	watchdogCtx, stopWatchdog := context.WithCancel(context.Background())
	defer stopWatchdog()
	notification.StartCRankRescoreWatchdog(watchdogCtx, database)

	// Claim re-verification cron (AC4): weekly lazy + scheduled re-check of
	// all claims; failures lapse the claim (7-day grace) before release.
	stopClaimCron := startClaimReverifyCron(claimSvc)
	defer stopClaimCron()

	// Maintainer Claim weekly SLA recompute + digest fanout (AC3, AC4, AC5, AC7).
	stopMCSLACron := startMaintainerSLACron(maintainerClaimSvc)
	defer stopMCSLACron()

	// GFI alert outbox drain every 5 min + weekly digest Mondays 09:00 UTC.
	stopGFIAlertCron := startGFIAlertCron(cfg, database, gh)
	defer stopGFIAlertCron()

	// Anonymous weekly language digest fanout (AC9): reuses the same SMTP
	// mailer + digest pipeline, keyed by each subscriber's language. Per-IP
	// rate limits on subscribe; the fanout itself continues past individual
	// send failures and retries the failed batch once.
	stopLangDigestCron := startLangDigestCron(cfg, database)
	defer stopLangDigestCron()

	// GitHub App daily org claim re-verification (AC3) & nightly sweep (AC2)
	stopGhAppCron := startGhAppDailyCron(ghAppSvc)
	defer stopGhAppCron()

	// Contributor XP seasons: nightly idempotent xp_events derivation (AC1).
	stopXPDeriveCron := startXPDeriveCron(prTrackerStore)
	defer stopXPDeriveCron()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.UseRawPath = true
	r.UnescapePathValues = true
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.CORS())
	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// Health Check
	r.GET("/health", handler.Health())

	// One-click digest unsubscribe / resubscribe (public, token-verified)
	r.GET("/unsubscribe", handler.Unsubscribe(cfg))
	r.GET("/resubscribe", handler.Resubscribe(cfg))

	// Public SVG Badge Route (AC1..AC9). Unauthenticated, so rate-limited
	// (60 req/min/IP) to prevent enumeration/DoS (AC7). Never proxies to any
	// external URL — only the internal C-Rank store is consulted (SSRF-safe).
	badgeRL := middleware.RateLimitPerIP(60, time.Minute)
	r.GET("/badge/:owner/:repo", badgeRL, handler.GetBadgeSVG(repoStore))

	// Live embeddable badge: shields-style SVG with C-Rank grade + median PR
	// response time, 5-min CDN cache, neutral fallback for unscored repos.
	// Public (no auth) so it works in README <img> tags. Root level like /cards
	// to avoid the API-key group; static /api/badge prefix never conflicts
	// with the static /api/v1 group (no wildcard mixing).
	// AC7: reuses the badgeRL (60 req/min/IP) defined above.
	r.GET("/api/badge/:owner/:repo", badgeRL, handler.GetLiveBadgeSVG(repoStore, cfg.AppBaseURL))

	// Org-level 'Verified Welcoming Org' badge (AC7): distinct static prefix
	// /api/org-badge never mixes wildcards with /api/badge/:owner/:repo.
	// Entitlement re-checked on every render; lapsed orgs 404 (AC5).
	r.GET("/api/org-badge/:org", badgeRL, handler.GetOrgVerifiedBadgeSVG(claimSvc, cfg.AppBaseURL))

	// Maintainer Claim & Fast-Track SLA badging — public, unauthenticated
	// surfaces (AC1-AC7). Param routes live under the static "/repo" child so
	// they never mix wildcards with the static "oauth" callback sibling under
	// /api/v1/maintainer-claims. /api/v1/maintainer-sla-badge/:owner/:name is
	// on its own static node, so it stays conflict-free.
	mcPublicRL := middleware.RateLimitPerIP(30, time.Minute)
	r.GET("/api/v1/maintainer-claims/repo/:owner/:name", mcPublicRL, handler.MaintainerGetClaimHandler(maintainerClaimSvc))
	r.POST("/api/v1/maintainer-claims/repo/:owner/:name/interest", mcPublicRL, handler.MaintainerInterestHandler(maintainerClaimSvc))
	r.GET("/api/v1/maintainer-sla-badge/:owner/:name", badgeRL, handler.MaintainerSLABadgeHandler(maintainerClaimSvc, cfg.AppBaseURL))
	r.GET("/api/v1/maintainer-claims/oauth/github/callback", handler.MaintainerOAuthCallbackHandler(maintainerClaimSvc, cfg, oauthTokenRepo))

	// Embeddable live 'Good First Issues' widget (item: embeddable GFI widget).
	// Distinct /embed/gfi/:owner/:name subtree — never overlaps the static
	// /badge or /api/badge routes, so no radix/wildcard conflict (AC1). Served
	// from the gfi_handler live pipeline with a per-instance 300s cache +
	// single-flight fetch (AC2/AC3).
	embedRL := middleware.RateLimitPerIP(60, time.Minute)
	r.GET("/embed/gfi/:owner/:name", embedRL, handler.GetGFIEmbedCard(gh, cfg.AppBaseURL))

	// PR Merge Probability Calculator embed (item: Interactive PR Merge
	// Probability Calculator). Distinct /embed-pr subtree plus the path-based
	// /badge/:owner/:repo/:pr endpoint and the /pr breakdown page. The /badge
	// route carries its own combined per-IP (60/min) + global (2000/min)
	// limiter returning 429+Retry-After (AC4); it reuses the /badge static
	// node at a shallower depth so there is no wildcard conflict with the
	// repo-CRank /badge/:owner/:repo route. The /pr page reuses the same
	// computed breakdown as the badge (AC8).
	r.GET("/embed-pr", embedRL, handler.GetPRForecastEmbed(cfg))
	r.GET("/badge/:owner/:repo/:pr", middleware.RateLimitPRBadge(), handler.GetPRForecastBadge(cfg))
	r.GET("/pr", handler.GetPRForecastPage(cfg))

	// Public share-card routes: no auth to view (AC1), 30 req/min/IP rate limit
	// and 24h CDN/Valkey cache with purge-on-revoke (AC2, AC4). Season-rank
	// cards ("sr…" ids) resolve through the same pipeline (AC4).
	cardRL := middleware.RateLimitPerIP(30, time.Minute)
	r.GET("/api/v1/cards/:id", cardRL, handler.GetShareCardHandler(shareCardRepo, prTrackerStore, cfg.JWTSecret))
	r.GET("/api/v1/cards/:id/og.png", cardRL, handler.GetShareCardOGHandler(shareCardRepo, prTrackerStore, cfg.JWTSecret))
	r.GET("/og/forecast/:id", cardRL, handler.GetShareCardOGHandler(shareCardRepo, prTrackerStore, cfg.JWTSecret))
	r.GET("/api/v1/og/forecast/:id", cardRL, handler.GetShareCardOGHandler(shareCardRepo, prTrackerStore, cfg.JWTSecret))

	// Raise-Your-C-Rank before/after OG card (AC4): deterministic per
	// (repo, score_version) via a repo_id+score-hash keyed cache served on
	// repeat hits; static "playbook" sibling of "forecast" under /og so no
	// wildcard names mix at any level. 10 req/min/IP with stale-cache
	// fallback inside the handler.
	playbookRL := middleware.RateLimitPerIP(10, time.Minute)
	r.GET("/og/playbook/:owner/:name", playbookRL, handler.GetPlaybookCardOGHandler(claimSvc, repoStore))
	// AC5 tokenized sibling: 128-bit random token scoped to a single repo,
	// 90-day expiry, validated before any card bytes are rendered. Static
	// "playbook-card" segment keeps the /og tree free of wildcard mixing.
	r.GET("/og/playbook-card/:token", playbookRL, handler.GetPlaybookCardByTokenHandler(claimSvc, repoStore))

	// Verified PR-eval outcomes: public registration + verdict lookup
	// (AC1-AC6). Root-level like /cards to stay outside the API-key group.
	evalRL := middleware.RateLimitPerIP(60, time.Minute)
	r.POST("/api/v1/pr-evals", evalRL, handler.RegisterPREvalHandler(prTrackerStore))
	r.GET("/api/v1/pr-evals/:id/outcome", evalRL, handler.GetPREvalOutcomeHandler(prTrackerStore))

	// Contributor XP seasons (AC2): public weekly leaderboard by merge XP.
	// Static segment under /api/v1; no wildcard conflicts at this level.
	r.GET("/api/v1/contributor-leaderboard", evalRL, handler.GetContributorLeaderboardHandler(prTrackerStore))

	// PR Acceptance Simulator (AC1-AC6): public pre-submission scoring.
	// Static "pr-sim" child under /api/v1 never conflicts with existing
	// static segments; badge is GET-only and hash-keyed server-side (AC6).
	prSimStore := prsim.NewStore(database, []byte(cfg.EncryptionKey))
	simRepoCache := prsim.NewRepoCache(prsim.RepoCacheSize)
	simRL := middleware.RateLimitPerIP(10, time.Hour)
	simBadgeRL := middleware.RateLimitPerIP(60, time.Hour)
	r.POST("/api/v1/pr-sim/score", simRL, handler.ScorePRSimHandler(prSimStore, simRepoCache, vkClient, cfg.GithubToken))
	r.GET("/api/v1/pr-sim/badge/:hash.svg", simBadgeRL, handler.PRSimBadgeHandler(prSimStore))

	// Instant Repo Check: on-demand C-Rank for ANY public GitHub URL.
	// Public (root-level, outside the API-key group) like /pr-sim. Static
	// "scan" children under /api/v1 and /og keep the radix tree free of
	// wildcard-name mixing: /api/v1/scan/status/:owner/:name and
	// /og/scan/:owner/:name both use :owner/:name consistently, matching the
	// existing /og/playbook/:owner/:name naming.
	scanSvc := scan.NewService(vkClient, gh, repoStore, database, cfg.AppBaseURL)
	scanRL := middleware.RateLimitPerIP(20, time.Minute)
	scanPollRL := middleware.RateLimitPerIP(120, time.Minute)
	r.POST("/api/v1/scan", scanRL, handler.StartScanHandler(scanSvc))
	r.GET("/api/v1/scan/status/:owner/:name", scanPollRL, handler.GetScanStatusHandler(scanSvc))
	r.GET("/og/scan/:owner/:name", cardRL, handler.GetScanOGCardHandler(scanSvc))
	// Signature-verified push webhook: invalidates the 24h verdict cache and
	// re-scores asynchronously (AC5).
	r.POST("/api/v1/webhooks/github-push", handler.GithubPushWebhookHandler(scanSvc, cfg.GithubAppWebhookSecret))

	// Public contributor profile (/u/[username]): aggregate PR-forecast track
	// record. Root-level like /cards to stay outside the API-key group; static
	// "u" child never conflicts with the group's other static segments (AC4).
	r.GET("/api/v1/u/:username", handler.GetPublicContributorProfileHandler(userRepo, prTrackerStore))
	// Shareable contributor report-card OG backing data (AC1/AC3/AC5). The
	// static "report-card" child under :username never collides with the
	// single-segment :username route above. Rate-limited 30 req/min/IP to
	// blunt PNG-generation DoS; caching handled in the handler.
	r.GET("/api/v1/u/:username/report-card", middleware.RateLimitPerIP(30, time.Minute), handler.ReportCardHandler(userRepo, prTrackerStore))

	// Anonymous language-match quiz (AC1): public GET reusing the ForYou
	// C-Rank/GFI matching. Static /api/public prefix keeps the route tree
	// free of wildcard conflicts; rate limit + cache live in the handler.
	// Anonymous RSS/Atom/iCal feeds for Good First Issues (AC1-AC6). Explicit
	// .rss/.atom/.ics format suffixes avoid any wildcard collision in the radix
	// tree. The FeedCacheRateLimit middleware applies the 60 req/min/IP sliding
	// token bucket and a 5-minute cache; cache hits never consume tokens so
	// legitimate WebCal pollers are never throttled (AC5/AC6).
	feedRL := middleware.FeedCacheRateLimit(60, time.Minute, 5*time.Minute)
	r.GET("/api/feeds/gfi.rss", feedRL, handler.GFIFeedRSS(gfiRepo, repoStore))
	r.GET("/api/feeds/gfi.atom", feedRL, handler.GFIFeedAtom(gfiRepo, repoStore))
	r.GET("/api/feeds/gfi.ics", feedRL, handler.GFIFeedICS(gfiRepo, repoStore))

	r.GET("/api/public/quiz-match", handler.QuizMatchHandler(repoStore, gfiRepo, database))

	// Anonymous Weekly Language Digest signup (AC1-AC11): double opt-in email
	// capture embedded on every /rankings/[lang] and /good-first-issue/[lang]
	// SEO page. All four endpoints are static /api segments, so they never
	// mix wildcard names at any level of the existing radix tree (AC10).
	r.POST("/api/subscribe", handler.LangDigestSubscribeHandler(cfg))
	r.GET("/api/confirm", handler.LangDigestConfirmHandler(cfg))
	r.GET("/api/unsubscribe", handler.LangDigestUnsubscribeHandler(cfg))
	r.GET("/api/gdpr-delete", handler.LangDigestGDPRDeleteHandler(cfg))

	// Public API
	api := r.Group("/api/v1")
	// AC2/AC3/AC4: public API keys (Authorization: Bearer odk_...) authenticate
	// with stable error codes and enforce free-tier/Pro sliding-window limits
	// (hourly + per-minute burst) with a Redis-cached entitlement tier.
	api.Use(middleware.APIKeyAuth(apiKeyRepo, entitlementRepo, []byte(cfg.EncryptionKey)))
	api.Use(middleware.OptionalUserAuth(cfg.JWTSecret))
	{
		api.GET("/health", handler.Health())
		api.GET("/docs/swagger.json", handler.PublicSwaggerSpec())
		api.GET("/repos", handler.ListRepos(repoStore))
		api.GET("/repos/:id", handler.GetRepo(repoStore))
		api.GET("/repos/:id/pr-likelihood", handler.GetPRLikelihoodHandler(repoStore))
		api.GET("/pr-likelihood", handler.GetPRLikelihoodHandler(repoStore))
		api.GET("/repos/:id/optimal-time", handler.GetOptimalTimeHandler(repoStore))
		api.GET("/optimal-time", handler.GetOptimalTimeHandler(repoStore))
		api.GET("/repos/:id/fit-radar", handler.GetFitRadarHandler(repoStore, profileRepo))
		api.GET("/fit-radar", handler.GetFitRadarHandler(repoStore, profileRepo))
		api.GET("/repos/:id/related", handler.GetRelatedReposHandler(repoStore))
		api.GET("/repos/:id/good-first-issues", handler.GetRepoGoodFirstIssues(gfiRepo, repoStore))
		api.GET("/issues/good-first", handler.ListGoodFirstIssues(gfiRepo, repoBoostRepo))
		api.GET("/history/:id", handler.GetRepoHistory(repoStore))
		api.GET("/repos/:id/trend", handler.GetRepoTrend(repoStore))
		api.POST("/repos/queue", handler.RequestRepoIndexing(database))
		api.GET("/languages", handler.ListLanguages(database))
		api.GET("/languages/trends", handler.GetLanguageTrends(database))
		api.GET("/topics", handler.ListTopics(repoStore))
		api.GET("/stats/macro", handler.GetMacroStats())

		// Hacktoberfest welcome-hub leaderboard: public, ranked by C-Rank tier
		// + GFI quality; >60% first-timer rate is a badge/weight, not a filter.
		api.GET("/hacktoberfest/leaderboard", handler.GetHacktoberfestLeaderboardHandler(hbStore))

		api.GET("/repos/:id/feedback", handler.ListFeedback(database))
		api.GET("/match", handler.MatchReposHandler(repoStore))
		api.GET("/users/:slug", handler.GetUserProfile(userRepo))
		api.GET("/users/:slug/achievement.svg", handler.RenderAchievementCardHandler(userRepo))
		api.GET("/badges/:owner/:name/badge.json", handler.GetRepoBadgeJSON(repoStore))
		api.GET("/badges/:owner/:name/badge.svg", handler.GetRepoBadgeSVG(repoStore))
		// Instant Anonymous Preflight Trial: logged-out visitors get ONE evaluate
		// per IP per 24h (aha-before-auth); signed-in users skip the trial
		// limiter and go through normal quota enforcement.
		api.POST("/preflight/evaluate",
			middleware.SkipIfAuthenticated(middleware.RateLimitPerIP(1, 24*time.Hour)),
			middleware.RequireProOrQuota(entitlementRepo),
			handler.EvaluatePreflightHandler(gh))
		api.POST("/preflight/pr-details", handler.FetchPRDetailsHandler(gh))
		api.POST("/payments/webhook/dodopayments", handler.DodopaymentsWebhookHandler(cfg, entitlementRepo, database, recruiterRepo, auditRepo))
		// Repo Boost (Stripe): featured placement webhook (AC2/AC3/AC6).
		api.POST("/payments/webhook/stripe", handler.StripeRepoBoostWebhookHandler(cfg, repoBoostRepo))
		api.POST("/webhooks/github-app", handler.GithubAppWebhookHandler(ghAppSvc))
		api.GET("/repos/:id/insights", handler.GetRepoInsights(aiClient, aiRepo, repoStore))
		api.GET("/repos/:id/claim-status", handler.GetPublicClaimStatusHandler(claimRepo))
		// Public raise-your-C-Rank checklist from stored telemetry (AC1, AC2).
		// OptionalUserAuth: signed-in maintainers get per-metric detail,
		// anonymous visitors only repo name + tier (redacted in-handler).
		api.GET("/repos/:id/playbook", middleware.OptionalUserAuth(cfg.JWTSecret), handler.GetRepoPlaybookHandler(claimSvc))
		api.POST("/user/hire-inquiry", handler.PostHireInquiryHandler(userRepo, database))

		// Good First Issue alerts & digest (AC1, AC5, AC6, AC8)
		api.POST("/gfi-alerts/subscribe", handler.GFISubscribeHandler(cfg))
		api.GET("/gfi-alerts/verify", handler.GFIVerifyHandler(cfg))
		api.GET("/gfi-alerts/prefs", handler.GFIPrefsHandler(cfg))
		api.POST("/gfi-alerts/prefs", handler.GFIPrefsHandler(cfg))
		api.GET("/gfi-alerts/unsubscribe", handler.GFIUnsubscribeHandler(cfg))
		// RFC 8058 one-click unsubscribe: providers POST to the same
		// List-Unsubscribe URL; the token rides in the query string.
		api.POST("/gfi-alerts/unsubscribe", handler.GFIUnsubscribeHandler(cfg))
		// AC6 short scheme /u/{userId}?sig= proxied here by the frontend.
		api.GET("/gfi-alerts/unsubscribe-short", handler.GFIUnsubscribeShortHandler(cfg))
		api.POST("/gfi-alerts/unsubscribe-short", handler.GFIUnsubscribeShortHandler(cfg))
		api.GET("/gfi-alerts/claim", handler.GFIClaimLinkHandler(cfg))
		api.POST("/webhooks/email-events", handler.GFIEmailWebhookHandler(cfg))

		// Stack Stalker & Dependency Health Radar (Story 1.1)
		api.POST("/stack/analyze", stackHandler.AnalyzeDirect)
		api.POST("/stack/scan-repo", middleware.OptionalUserAuth(cfg.JWTSecret), stackHandler.ScanRepo)

		// Issue Sniper Alert Service (Story 1.2)
		api.POST("/alerts/subscribe-sniper", middleware.OptionalUserAuth(cfg.JWTSecret), sniperHandler.SubscribeSniper)

		// Contributor Karma & Reputation Badges
		api.GET("/u/:username/karma", handler.GetKarmaHandler(userRepo, profileRepo))
		api.GET("/u/:username/karma.svg", handler.GetKarmaBadgeSVGHandler(userRepo, profileRepo))

		// PR Size Sweet Spot Telemetry
		api.GET("/repos/:id/pr-size-sweetspot", handler.GetPRSizeSweetSpotHandler(repoStore))

		// Contributor Progression Quest Track
		api.GET("/user/quests", middleware.OptionalUserAuth(cfg.JWTSecret), handler.GetUserQuestsHandler(database, profileRepo))

		// Auth Routes
		authGroup := api.Group("/auth")
		{
			authGroup.GET("/github", handler.GitHubOAuthRedirect(cfg))
			authGroup.GET("/github/callback", handler.GitHubOAuthCallback(cfg, userRepo, tokenMgr, entitlementRepo, dnaWorker))
			authGroup.GET("/google", handler.GoogleOAuthRedirect(cfg))
			authGroup.GET("/google/callback", handler.GoogleOAuthCallback(cfg, userRepo))
			authGroup.POST("/logout", handler.LogoutHandler(cfg))
		}
	}

	// Authenticated User Routes (Custom Opendoor JWT)
	userApi := r.Group("/api/v1")
	userApi.Use(middleware.UserAuth(cfg.JWTSecret))
	{
		userApi.GET("/auth/me", handler.GetCurrentUser(userRepo))
		userApi.PATCH("/user/consent", handler.UpdateConsent(userRepo))
		userApi.PATCH("/user/profile-visibility", handler.UpdateProfileVisibilityHandler(userRepo))
		userApi.PATCH("/user/profile", handler.UpdateUserProfileCustomizationHandler(userRepo))
		userApi.GET("/user/github-repos", handler.GetUserGitHubReposHandler(userRepo))
		// Talent Pass: 'Open to Opportunities' opt-in (AC1) + owner-only status
		// visibility (AC5). Triggers an async recruiter-index reindex on toggle.
		userApi.GET("/user/open-to-opportunities", handler.GetOpenToOpportunitiesHandler(userRepo, profileRepo))
		userApi.PATCH("/user/open-to-opportunities", handler.ToggleOpenToOpportunitiesHandler(profileRepo))
		// Recruiter Pass checkout: writes a PENDING entitlement row; the Dodo
		// webhook flips it to 'active' (AC2/AC6).
		userApi.POST("/user/recruiter-pass/checkout", handler.CreateRecruiterPassCheckoutHandler(cfg, recruiterRepo))
		userApi.DELETE("/me/data", handler.DeleteUserData(cfg, userRepo))
		userApi.GET("/user/dna", handler.GetContributorDNA(profileRepo))
		userApi.POST("/user/dna/refresh", handler.RefreshContributorDNA(profileRepo, dnaWorker))
		userApi.GET("/user/matches", handler.GetUserMatchesHandler(profileRepo, repoStore))
		userApi.GET("/user/top-matches", handler.GetTopMatchesHandler(userRepo, repoStore))
		userApi.GET("/user/for-you", handler.GetForYouHandler(userRepo, repoStore, gfiRepo, entitlementRepo))
		userApi.GET("/user/referral", handler.GetMyReferral(entitlementRepo))
		userApi.GET("/stack/user-repos", stackHandler.GetUserRepos)
		userApi.GET("/stack/saved", stackHandler.GetSavedStacks)
		userApi.GET("/alerts/my-snipers", sniperHandler.GetUserSnipers)

		// Maintainer Claims & C-Rank Console (AC1, AC2, AC3, AC6, AC8)
		userApi.POST("/repos/:id/claim", handler.PostClaimRepoHandler(claimSvc))
		userApi.POST("/repos/:id/verify", handler.PostVerifyRepoHandler(claimSvc))
		userApi.GET("/repos/:id/console", handler.GetMaintainerConsoleHandler(claimSvc))
		// Repo Boost: paid featured placement (AC1/AC5/AC8). Auth-scoped so
		// maintainers (who already claim repos via the C-Rank console) can buy
		// contributor attention for their good-first-issues.
		userApi.POST("/repos/:id/boost-checkout", handler.CreateRepoBoostCheckoutHandler(cfg, repoBoostRepo))
		userApi.GET("/repos/:id/boost-status", handler.RepoBoostStatusHandler(cfg, repoBoostRepo))
		userApi.GET("/user/repo-boosts", handler.ListUserRepoBoostsHandler(cfg, repoBoostRepo))
		// Event-driven re-score for verified claimants (AC3): refreshes the
		// score and before/after card state in one transaction.
		userApi.POST("/repos/:id/rescore", handler.PostRescoreRepoHandler(claimSvc))
		userApi.POST("/repos/:id/claim-dispute", handler.PostClaimDisputeHandler(claimRepo))
		userApi.GET("/user/claims", handler.GetUserClaimsListHandler(claimRepo))

		// Maintainer Claim & Fast-Track SLA Badging (AC1-AC7): rate-limited
		// 5/min/IP (the 20/day/user cap is enforced in the handler via a daily
		// ledger). Claim ownership is verified through the repo scope, never
		// org membership. Duplicate claims return the existing record.
		mcClaimRL := middleware.RateLimitPerIP(5, time.Minute)
		userApi.POST("/maintainer-claims", mcClaimRL, handler.MaintainerClaimHandler(maintainerClaimSvc, maintainerClaimRepo))
		userApi.PATCH("/maintainer-claims/repo/:owner/:name/onboarding", handler.MaintainerSetOnboardingHandler(maintainerClaimSvc))
		userApi.GET("/maintainer-claims/me", handler.MaintainerListMyClaimsHandler(maintainerClaimSvc))
		userApi.GET("/maintainer-claims/oauth/github", handler.MaintainerOAuthStartHandler(cfg))

		// One-Click GitHub Issue Claiming (AC1-AC9): authenticated claim flow
		// that posts a templated comment via the user's GitHub token and
		// persists the claim server-side (dashboard-synced).
		userApi.POST("/issues/:owner/:name/:number/claim", handler.PostClaimIssueHandler(issueClaimSvc))
		userApi.GET("/user/issue-claims", handler.GetUserIssueClaimsHandler(issueClaimSvc))

		// Org-wide paid console (AC1-AC6): static "orgs" child under /api/v1
		// conflicts with no existing param segment.
		userApi.GET("/orgs/:org/console", handler.GetOrgConsoleHandler(claimSvc))

		// Top-level aliases for direct paths (AC1)
		r.POST("/repo/:owner/:name/claim", middleware.UserAuth(cfg.JWTSecret), handler.PostClaimRepoHandler(claimSvc))
		r.POST("/repo/:owner/:name/verify", middleware.UserAuth(cfg.JWTSecret), handler.PostVerifyRepoHandler(claimSvc))
		r.GET("/repo/:owner/:name/console", middleware.UserAuth(cfg.JWTSecret), handler.GetMaintainerConsoleHandler(claimSvc))

		// One-Time $10 Repo Maintainer Audit. Maintainer verification gate uses the
		// stored OAuth token (github_maintainer or github provider) to confirm admin access.
		r.POST("/repo/:owner/:name/audit/checkout", middleware.UserAuth(cfg.JWTSecret), handler.CreateRepoAuditCheckoutHandler(cfg, auditRepo, repoStore, oauthTokenRepo))
		r.GET("/repo/:owner/:name/audit", middleware.UserAuth(cfg.JWTSecret), handler.GetRepoAuditReportHandler(cfg, auditRepo, repoStore, aiClient, aiRepo))
		r.POST("/repo/:owner/:name/audit/regen", middleware.UserAuth(cfg.JWTSecret), handler.RegenerateRepoAuditInsightsHandler(cfg, auditRepo, repoStore, aiClient, aiRepo))
		// AC6 client poll: /api/audit/status?repo_key=... (distinct static
		// prefix from /api/v1 so no wildcard mixing at the API-root level).
		r.GET("/api/audit/status", middleware.UserAuth(cfg.JWTSecret), handler.GetRepoAuditStatusHandler(auditRepo, cfg))

		// AC6: one-click unsubscribe /u/{userId}?sig=HMAC(secret, userId+expiry30d)
		r.GET("/u/:userid", handler.GFIUnsubscribeShortHandler(cfg))
		r.POST("/u/:userid", handler.GFIUnsubscribeShortHandler(cfg))

		// Public API key management (AC1)
		userApi.GET("/user/api-keys", handler.ListAPIKeys(apiKeyRepo, entitlementRepo))
		userApi.POST("/user/api-keys", handler.CreateAPIKey(apiKeyRepo, []byte(cfg.EncryptionKey)))
		userApi.DELETE("/user/api-keys/:id", handler.RevokeAPIKey(apiKeyRepo))
		userApi.POST("/preflight/share", handler.CreateShareCardHandler(shareCardRepo, cfg.JWTSecret))
		userApi.GET("/user/share-cards", handler.ListShareCardsHandler(shareCardRepo))
		userApi.DELETE("/user/share-cards/:id", handler.RevokeShareCardHandler(shareCardRepo))
		userApi.POST("/user/watchlist", handler.AddToWatchlist(watchlistRepo))
		userApi.DELETE("/user/watchlist/:id", handler.RemoveFromWatchlist(watchlistRepo))
		userApi.GET("/user/watchlist", handler.ListWatchlist(watchlistRepo))
		userApi.PATCH("/user/watchlist/:id", handler.ToggleWatchlistAlerts(watchlistRepo))

		// Slack/Discord webhook alert channels for watchlist C-Rank changes.
		webhookRepo := repository.NewWatchlistWebhookRepository(database, []byte(cfg.EncryptionKey))
		userApi.POST("/user/watchlist/webhooks", handler.AddWatchlistWebhook(webhookRepo))
		userApi.GET("/user/watchlist/webhooks", handler.ListWatchlistWebhooks(webhookRepo))
		userApi.DELETE("/user/watchlist/webhooks/:id", handler.RemoveWatchlistWebhook(webhookRepo))

		// My PR Tracker (personal pull-request journey on scored repos)
		userApi.GET("/user/prs", handler.GetUserPRsHandler(prTrackerSvc, entitlementRepo))
		userApi.GET("/user/prs/connection", handler.GetPRConnectionHandler(prTrackerSvc))
		userApi.POST("/user/prs/reconnect", handler.ReconnectPRConnectionHandler(prTrackerSvc))
		// AC2/AC3/AC8: paste a PR URL to explicitly track it (server-validated).
		userApi.POST("/user/prs/track", handler.TrackPRHandler(prTrackerSvc, entitlementRepo, cfg.JWTSecret))
		// AC5: client reads cached state here; the server owns the polling loop.
		userApi.GET("/user/pr-status", handler.PRStatusHandler(prTrackerSvc))
		// AC6: public Hall of Fame + per-profile merge proof cards.
		userApi.GET("/hall-of-fame", handler.GetHallOfFameHandler(prTrackerStore))
		r.GET("/api/v1/u/:username/merges", handler.GetUserMergesHandler(userRepo, prTrackerStore))

		// Contributor XP season for the signed-in user: XP/level/streak plus
		// shareable season-rank card URLs (AC1/AC3/AC4).
		userApi.GET("/user/season", handler.GetUserSeasonHandler(prTrackerStore, cfg.JWTSecret))

		// Hacktoberfest hub: live "X of 4 merged" progress + stream-hint nudge
		userApi.GET("/hacktoberfest/progress", handler.GetHacktoberfestProgressHandler(hbSvc))
		userApi.POST("/hacktoberfest/nudge", handler.PostHacktoberfestNudgeHandler(hbSvc))

		// Monthly Open-Source League ("Merge Madness")
		r.GET("/api/v1/league/leaderboard", handler.GetLeagueLeaderboardHandler(leagueSvc))
		r.GET("/api/badge/league/u/:username", handler.GetLeagueBadgeSVGHandler(leagueSvc))
		r.GET("/api/badge/u/:username", handler.GetKarmaBadgeSVGHandler(userRepo, profileRepo))
		userApi.GET("/league/progress", handler.GetLeagueProgressHandler(leagueSvc))

		userApi.POST("/user/feedback", handler.CreateFeedback(database, cfg.GithubToken))
		userApi.DELETE("/user/feedback/:id", handler.DeleteFeedback(database))

		// Talent Pass Recruiter Search (AC7): standalone /api/v1/recruiter/search
		// (NOT under /users/:slug) to avoid radix collision. 30/min/IP rate limit
		// (AC4). UserAuth -> 401 when unauthed; handler -> 403 until the Recruiter
		// Pass entitlement is 'active' (AC6/AC9); never 500 on the pending race.
		userApi.GET("/recruiter/search", middleware.RateLimitPerIP(30, time.Minute), handler.RecruiterSearchHandler(recruiterRepo))

		// Pay-as-you-go preflight credit packs (AC1/AC4/AC5): checkout
		// creation stores the order with the purchaser's user_id; the
		// pack-status poll enforces ownership and is rate-limited 10/min/user.
		userApi.POST("/credits/pack-checkout",
			middleware.RateLimitPerUser(10),
			handler.CreatePackCheckoutHandler(cfg, entitlementRepo))
		userApi.GET("/credits/pack-status",
			middleware.RateLimitPerUser(10),
			handler.PackStatusHandler(cfg, entitlementRepo))

		// In-App Notification Center (AC1 - AC4)
		userApi.GET("/notifications", middleware.RateLimitPerUser(60), handler.GetNotificationsHandler(notifRepo))
		userApi.GET("/notifications/unread-count", middleware.RateLimitPerUser(60), handler.GetUnreadNotificationCountHandler(notifRepo))
		userApi.POST("/notifications/mark-read", handler.MarkNotificationsReadHandler(notifRepo))
		userApi.GET("/notifications/preferences", handler.GetNotificationPreferencesHandler(notifRepo))
		userApi.PUT("/notifications/preferences", handler.UpdateNotificationPreferencesHandler(notifRepo))
		// SSE live stream + gap-replay (AC2/AC8)
		userApi.GET("/notifications/stream", handler.GetNotificationStreamHandler(notifRepo, database))
		userApi.GET("/notifications/since", handler.GetNotificationsSinceHandler(notifRepo))
	}

	// Top-level aliases for /api/notifications (AC1 - AC4)
	apiNotif := r.Group("/api/notifications")
	apiNotif.Use(middleware.UserAuth(cfg.JWTSecret))
	{
		apiNotif.GET("", middleware.RateLimitPerUser(60), handler.GetNotificationsHandler(notifRepo))
		apiNotif.GET("/unread-count", middleware.RateLimitPerUser(60), handler.GetUnreadNotificationCountHandler(notifRepo))
		apiNotif.POST("/mark-read", handler.MarkNotificationsReadHandler(notifRepo))
		apiNotif.GET("/preferences", handler.GetNotificationPreferencesHandler(notifRepo))
		apiNotif.PUT("/preferences", handler.UpdateNotificationPreferencesHandler(notifRepo))
		// SSE live stream + gap-replay (AC2/AC8)
		apiNotif.GET("/stream", handler.GetNotificationStreamHandler(notifRepo, database))
		apiNotif.GET("/since", handler.GetNotificationsSinceHandler(notifRepo))
	}

	// Internal routes - nginx blocks these externally
	internal := r.Group("/internal")
	internal.Use(middleware.Auth(cfg.InternalAPIKey))
	{
		internal.POST("/update-scores", handler.UpdateScores(gh))
		internal.POST("/seed", handler.Seed(gh))
		internal.POST("/score-repo", handler.ScoreRepo(gh, repoStore, aiClient, aiRepo))
		internal.POST("/sync-trending", handler.SyncTrending())
		internal.POST("/check-pat", handler.CheckPAT(gh))
		internal.POST("/purge-cache", handler.PurgeCache())
		internal.POST("/cache/purge-tag", handler.PurgeTagCache())
		internal.POST("/migrate-latest-snapshots", handler.MigrateLatestSnapshots())
		internal.POST("/jobs/weekly-digest", handler.TriggerWeeklyDigest(cfg, telegramNotifier))
		internal.POST("/jobs/gfi-digest", handler.TriggerGFIDigestHandler(cfg))
		internal.GET("/jobs/gfi-paused", handler.ListGFIPausedSubscribersHandler(cfg))
		internal.POST("/jobs/crank-change-alerts", handler.TriggerCRankChangeAlerts(cfg))
		internal.DELETE("/repos/:id", handler.DeleteRepo(repoStore))
	}

	// Swagger docs (only registered in debug mode to prevent API documentation leaks in production)
	if cfg.GinMode == "debug" {
		r.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
		slog.Info("swagger docs enabled", "path", "/docs/index.html")
	}

	slog.Info("server starting", "port", cfg.Port, "mode", cfg.GinMode)
	if err := r.Run("localhost:" + cfg.Port); err != nil {
		slog.Error("server exited", "err", err)
		os.Exit(1)
	}
}

// setupLogger configures global slog AND Gin writers to write to stdout and log file.
// Ensures systemd/journalctl and persistent log files capture both HTTP requests and application logs.
func setupLogger(ginMode, logFilePath, logLevel string) {
	var level slog.Level
	switch logLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}
	opts := &slog.HandlerOptions{Level: level}

	var writer io.Writer = os.Stdout

	if logFilePath != "" {
		logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			slog.Error("failed to open log file, logging to stdout only", "file", logFilePath, "err", err)
		} else {
			writer = io.MultiWriter(os.Stdout, logFile)
		}
	}

	// Bind Gin HTTP logger output to the writer so journalctl captures access logs
	gin.DefaultWriter = writer
	gin.DefaultErrorWriter = writer

	var handler slog.Handler
	if ginMode == "release" {
		handler = slog.NewJSONHandler(writer, opts)
	} else {
		handler = slog.NewTextHandler(writer, opts)
	}

	slog.SetDefault(slog.New(handler))
	slog.Info("logging initialized", "file", logFilePath, "level", level.String())
}

// startGFIAlertCron keeps the good-first-issue alert pipeline running (AC2):
// the batched outbox drains every 5 minutes so 15-min alert windows flush,
// and the weekly digest fires Mondays 09:00 UTC. Zero-match digest runs are
// silent no-ops; send failures back off inside the queue processor.
func startGFIAlertCron(cfg *config.Config, database *sqlx.DB, gh *ghclient.Client) func() {
	stop := make(chan struct{})
	alertCfg := notification.GFIAlertConfig{
		Mailer:          notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom),
		BaseURL:         cfg.AppBaseURL,
		JobSecret:       cfg.JobSecret,
		UnsubscribeKey:  cfg.UnsubscribeKey,
		PhysicalAddress: cfg.SMTPPhysicalAddress,
		GitHub:          gh,
		AdminEmail:      cfg.AdminEmail,
	}
	drain := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		s, err := notification.ProcessGFIEmailQueue(ctx, database, alertCfg)
		if err != nil {
			slog.Error("gfi queue drain failed", "err", err)
			return
		}
		if s.Sent > 0 || s.Dropped > 0 || s.Failed > 0 {
			slog.Info("gfi queue drained", "sent", s.Sent, "dropped", s.Dropped, "failed", s.Failed)
		}
	}
	runDigest := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		s, err := notification.RunGFIDigest(ctx, database, alertCfg)
		if err != nil {
			slog.Error("weekly gfi digest failed", "err", err)
			return
		}
		slog.Info("weekly gfi digest done", "digests_sent", s.DigestsSent, "matches", s.MatchesFound, "skipped_no_match", s.SkippedNoMatch)
	}
	nextMondayNineUTC := func() time.Duration {
		now := time.Now().UTC()
		t := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, time.UTC)
		t = t.AddDate(0, 0, (int(time.Monday)-int(t.Weekday())+7)%7)
		if !t.After(now) {
			t = t.AddDate(0, 0, 7)
		}
		return t.Sub(now)
	}

	go func() {
		drainTicker := time.NewTicker(5 * time.Minute)
		hourlyTicker := time.NewTicker(time.Hour)
		digestTimer := time.NewTimer(nextMondayNineUTC())
		defer drainTicker.Stop()
		defer hourlyTicker.Stop()
		defer digestTimer.Stop()
		for {
			select {
			case <-stop:
				return
			case <-drainTicker.C:
				drain()
			case <-hourlyTicker.C:
				// AC6 hourly matcher sweep: re-enqueue unstamped recent
				// issues (cursor = alert_dedup_key); failures resume next cycle.
				sweepCtx, sweepCancel := context.WithTimeout(context.Background(), 5*time.Minute)
				if n := notification.RunGFIMatcherSweep(sweepCtx, database); n > 0 {
					slog.Info("gfi matcher sweep enqueued", "count", n)
					drain()
				}
				sweepCancel()
				// AC2 daily fallback digest for instant-cap overflow; the
				// once-per-UTC-day guard lives inside the runner.
				fbCtx, fbCancel := context.WithTimeout(context.Background(), 10*time.Minute)
				if s, err := notification.RunGFIDailyFallbackDigest(fbCtx, database, alertCfg); err != nil {
					slog.Error("gfi fallback digest failed", "err", err)
				} else if s.FallbackSent > 0 || s.Failed > 0 {
					slog.Info("gfi fallback digest done", "sent", s.FallbackSent, "failed", s.Failed)
				}
				fbCancel()
			case <-digestTimer.C:
				runDigest()
				drain()
				digestTimer.Reset(nextMondayNineUTC())
			}
		}
	}()

	return func() { close(stop) }
}

// nextMondayNineUTC returns the duration until the next Monday 09:00 UTC, used
// by the anonymous language digest cron (AC9). Declared package-level so the
// digest cron and any other weekly timer can share it.
func nextMondayNineUTC() time.Duration {
	now := time.Now().UTC()
	t := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, time.UTC)
	t = t.AddDate(0, 0, (int(time.Monday)-int(t.Weekday())+7)%7)
	if !t.After(now) {
		t = t.AddDate(0, 0, 7)
	}
	return t.Sub(now)
}

// startLangDigestCron fires the anonymous weekly language digest fanout
// (AC9) every Monday 09:00 UTC, reusing the existing SMTP mailer. The fanout
// loops subscribers, continues past single send failures, and retries the
// failed batch exactly once — partial failure never aborts the run.
func startLangDigestCron(cfg *config.Config, database *sqlx.DB) func() {
	stop := make(chan struct{})
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		digCfg := notification.LangDigestMailerConfig{
			Mailer:          mailer,
			BaseURL:         cfg.AppBaseURL,
			PhysicalAddress: cfg.SMTPPhysicalAddress,
		}
		secrets := cfg.EmailTokenKeys()
		summary, err := notification.RunLangDigestFanout(ctx, database, digCfg, secrets[0])
		if err != nil {
			slog.Error("lang-digest fanout failed", "err", err)
			return
		}
		if summary.Sent > 0 || summary.Failed > 0 || summary.Skipped > 0 {
			slog.Info("lang-digest weekly fanout done", "sent", summary.Sent,
				"retried_ok", summary.RetriedSuccess, "failed", summary.Failed, "skipped", summary.Skipped)
		}
	}
	go func() {
		t := time.NewTimer(nextMondayNineUTC())
		defer t.Stop()
		select {
		case <-stop:
			return
		case <-time.After(2 * time.Minute):
			run()
		case <-t.C:
			run()
			t.Reset(nextMondayNineUTC())
		}
	}()
	return func() { close(stop) }
}

// startPRStallAlertCron keeps the stalled-PR rescue pipeline running: the
// sweep evaluates open tracked PRs against repo merged-p75 waits (sparse
// history falls back to a 72h global p75), queues deduped alerts keyed
// (pr_id, clock anchor) and drains them as one digest per user with a
// 50-row/run cap. Repos with zero merged data points are silent skips.
func startPRStallAlertCron(cfg *config.Config, database *sqlx.DB) func() {
	stop := make(chan struct{})
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		s, err := notification.RunPRStallAlerts(ctx, database, notification.PRStallAlertConfig{
			Mailer:        notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom),
			BaseURL:       cfg.AppBaseURL,
			EncryptionKey: []byte(cfg.EncryptionKey),
			GitHubToken:   cfg.GithubToken,
		})
		if err != nil {
			slog.Error("pr stall alert sweep failed", "err", err)
			return
		}
		if s.Queued > 0 || s.Sent > 0 || s.Failed > 0 || s.Retrying > 0 || s.StaleSkipped > 0 || s.Deferred > 0 {
			slog.Info("pr stall alert sweep done", "queued", s.Queued, "sent", s.Sent,
				"retrying", s.Retrying, "failed", s.Failed, "stale_skipped", s.StaleSkipped,
				"deferred", s.Deferred, "insufficient_samples_repos", s.InsufficientSamples,
				"draft_skipped", s.DraftSkipped)
		}
	}
	go func() {
		select {
		case <-stop:
			return
		case <-time.After(2 * time.Minute):
			run()
		}
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				run()
			}
		}
	}()
	return func() { close(stop) }
}

// startXPDeriveCron runs the nightly xp_events award pass (AC1): idempotent
// INSERT .. ON CONFLICT DO NOTHING keyed by the composite (source, eval_id),
// so overlapping or repeated runs never double-award XP.
func startXPDeriveCron(store *prtracker.Store) func() {
	stop := make(chan struct{})
	if store == nil {
		return func() {}
	}
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		n, err := store.AwardXPs(ctx, nil)
		if err != nil {
			slog.Error("nightly xp derivation failed", "err", err)
			return
		}
		slog.Info("nightly xp derivation done", "new_events", n)
	}

	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		select {
		case <-stop:
			return
		case <-time.After(90 * time.Second):
			run()
		}
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				run()
			}
		}
	}()

	return func() { close(stop) }
}

// startClaimReverifyCron runs the weekly claim re-verification job (AC4):
// once shortly after boot and then every 7 days. Each run re-checks all
// claims; failed checks lapse the claim (console locked + grace email) and
// lapses past their 7-day grace are released.
func startClaimReverifyCron(claimSvc *claim.Service) func() {
	stop := make(chan struct{})
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		kept, failed, err := claimSvc.RunWeeklyReverification(ctx)
		if err != nil {
			slog.Error("weekly claim re-verification failed", "err", err)
			return
		}
		slog.Info("weekly claim re-verification done", "kept_or_restored", kept, "lapsed_or_released", failed)
	}

	go func() {
		ticker := time.NewTicker(7 * 24 * time.Hour)
		defer ticker.Stop()
		select {
		case <-stop:
			return
		case <-time.After(time.Minute):
			run()
		}
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				run()
			}
		}
	}()

	return func() { close(stop) }
}

// startMaintainerSLACron runs the weekly SLA recompute + badge revoke sweep and
// the weekly maintainer digest fanout (AC3, AC4, AC5, AC7).
func startMaintainerSLACron(svc *maintainerclaim.Service) func() {
	stop := make(chan struct{})
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
		defer cancel()
		recomputed, revoked, err := svc.RunWeeklySLA(ctx)
		if err != nil {
			slog.Error("weekly maintainer SLA recompute failed", "err", err)
		} else if recomputed > 0 || revoked > 0 {
			slog.Info("weekly maintainer SLA recompute done", "recomputed", recomputed, "revoked", revoked)
		}
		sent, failed, derr := svc.RunWeeklyDigest(ctx)
		if derr != nil {
			slog.Error("weekly maintainer digest failed", "err", derr)
		} else if sent > 0 || failed > 0 {
			slog.Info("weekly maintainer digest done", "sent", sent, "failed", failed)
		}
	}

	go func() {
		ticker := time.NewTicker(7 * 24 * time.Hour)
		defer ticker.Stop()
		select {
		case <-stop:
			return
		case <-time.After(3 * time.Minute):
			run()
		}
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				run()
			}
		}
	}()

	return func() { close(stop) }
}

// startGhAppDailyCron runs daily org claim re-verification (AC3) and nightly sweep repair (AC2).
func startGhAppDailyCron(ghAppSvc *ghapp.Service) func() {
	stop := make(chan struct{})
	if ghAppSvc == nil || !ghAppSvc.Enabled() {
		return func() {}
	}
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		verified, revoked, err := ghAppSvc.ReverifyOrgClaims(ctx)
		if err != nil {
			slog.Error("daily ghapp org re-verification failed", "err", err)
		} else if verified > 0 || revoked > 0 {
			slog.Info("daily ghapp org re-verification done", "verified", verified, "revoked", revoked)
		}

		cleaned, sweepErr := ghAppSvc.NightlySweepCommentCheck(ctx)
		if sweepErr != nil {
			slog.Error("nightly ghapp comment sweep failed", "err", sweepErr)
		} else if cleaned > 0 {
			slog.Info("nightly ghapp comment sweep done", "repaired_count", cleaned)
		}
	}

	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		select {
		case <-stop:
			return
		case <-time.After(2 * time.Minute):
			run()
		}
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				run()
			}
		}
	}()

	return func() { close(stop) }
}
