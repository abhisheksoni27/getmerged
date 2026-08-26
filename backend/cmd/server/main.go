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
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/prsim"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
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
	apiKeyRepo := repository.NewAPIKeyRepository(database)
	tokenMgr := auth.NewTokenManager(oauthTokenRepo, cfg, nil)
	dnaWorker := pipeline.NewContributorDNAWorker(userRepo, profileRepo, tokenMgr, cfg.GithubToken, nil)
	repoStore := repository.NewRepoRepository(database)
	watchlistRepo := repository.NewWatchlistRepository(database)
	aiRepo := repository.NewAIRepository(database)
	shareCardRepo := repository.NewShareCardRepository(database)
	claimRepo := repository.NewClaimRepository(database)
	claimSvc := claim.NewService(database, claimRepo, repoStore, tokenMgr, gh, cfg)
	ghAppSvc := ghapp.NewService(database, cfg, userRepo, claimRepo, repoStore, aiRepo)
	defer ghAppSvc.Stop()

	// Start continuous background crawler worker loop
	gfiRepo := repository.NewGFIRepository(database)

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
	stopPRTrackerCron := prTrackerSvc.StartCron(15 * time.Minute)
	defer stopPRTrackerCron()

	// Hacktoberfest hub: lazy 5-min poll over active viewers only (AC5).
	hbStore := hacktoberfest.NewStore(database)
	hbSvc := hacktoberfest.NewService(hbStore, prTrackerStore, tokenMgr, prtracker.NewGHClient(vkClient), cfg.JWTSecret)
	stopHacktoberfestCron := hbSvc.StartCron(5 * time.Minute)
	defer stopHacktoberfestCron()

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

	// GFI alert outbox drain every 5 min + weekly digest Mondays 09:00 UTC.
	stopGFIAlertCron := startGFIAlertCron(cfg, database, gh)
	defer stopGFIAlertCron()

	// GitHub App daily org claim re-verification (AC3) & nightly sweep (AC2)
	stopGhAppCron := startGhAppDailyCron(ghAppSvc)
	defer stopGhAppCron()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.CORS())
	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// Health Check
	r.GET("/health", handler.Health())

	// One-click digest unsubscribe / resubscribe (public, token-verified)
	r.GET("/unsubscribe", handler.Unsubscribe(cfg))
	r.GET("/resubscribe", handler.Resubscribe(cfg))

	// Public SVG Badge Route (F1)
	r.GET("/badge/:owner/:repo", handler.GetBadgeSVG(repoStore))

	// Live embeddable badge: shields-style SVG with C-Rank grade + median PR
	// response time, 5-min CDN cache, neutral fallback for unscored repos.
	// Public (no auth) so it works in README <img> tags. Root level like /cards
	// to avoid the API-key group; static /api/badge prefix never conflicts
	// with the static /api/v1 group (no wildcard mixing).
	// AC4: 60 req/min per IP, 429 when exceeded.
	badgeRL := middleware.RateLimitPerIP(60, time.Minute)
	r.GET("/api/badge/:owner/:repo", badgeRL, handler.GetLiveBadgeSVG(repoStore, cfg.AppBaseURL))

	// Public share-card routes: no auth to view (AC1), 30 req/min/IP rate limit
	// and 24h CDN/Valkey cache with purge-on-revoke (AC2, AC4).
	cardRL := middleware.RateLimitPerIP(30, time.Minute)
	r.GET("/api/v1/cards/:id", cardRL, handler.GetShareCardHandler(shareCardRepo))
	r.GET("/api/v1/cards/:id/og.png", cardRL, handler.GetShareCardOGHandler(shareCardRepo))
	r.GET("/og/forecast/:id", cardRL, handler.GetShareCardOGHandler(shareCardRepo))
	r.GET("/api/v1/og/forecast/:id", cardRL, handler.GetShareCardOGHandler(shareCardRepo))

	// Verified PR-eval outcomes: public registration + verdict lookup
	// (AC1-AC6). Root-level like /cards to stay outside the API-key group.
	evalRL := middleware.RateLimitPerIP(60, time.Minute)
	r.POST("/api/v1/pr-evals", evalRL, handler.RegisterPREvalHandler(prTrackerStore))
	r.GET("/api/v1/pr-evals/:id/outcome", evalRL, handler.GetPREvalOutcomeHandler(prTrackerStore))

	// PR Acceptance Simulator (AC1-AC6): public pre-submission scoring.
	// Static "pr-sim" child under /api/v1 never conflicts with existing
	// static segments; badge is GET-only and hash-keyed server-side (AC6).
	prSimStore := prsim.NewStore(database, []byte(cfg.EncryptionKey))
	simRepoCache := prsim.NewRepoCache(prsim.RepoCacheSize)
	simRL := middleware.RateLimitPerIP(10, time.Hour)
	simBadgeRL := middleware.RateLimitPerIP(60, time.Hour)
	r.POST("/api/v1/pr-sim/score", simRL, handler.ScorePRSimHandler(prSimStore, simRepoCache, vkClient, cfg.GithubToken))
	r.GET("/api/v1/pr-sim/badge/:hash.svg", simBadgeRL, handler.PRSimBadgeHandler(prSimStore))

	// Public contributor profile (/u/[username]): aggregate PR-forecast track
	// record. Root-level like /cards to stay outside the API-key group; static
	// "u" child never conflicts with the group's other static segments (AC4).
	r.GET("/api/v1/u/:username", handler.GetPublicContributorProfileHandler(userRepo))

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
		api.GET("/issues/good-first", handler.ListGoodFirstIssues(gfiRepo))
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
		api.POST("/preflight/evaluate", middleware.RequireProOrQuota(entitlementRepo), handler.EvaluatePreflightHandler(gh))
		api.POST("/preflight/pr-details", handler.FetchPRDetailsHandler(gh))
		api.POST("/payments/webhook/dodopayments", handler.DodopaymentsWebhookHandler(cfg, entitlementRepo))
		api.POST("/webhooks/github-app", handler.GithubAppWebhookHandler(ghAppSvc))
		api.GET("/repos/:id/insights", handler.GetRepoInsights(aiClient, aiRepo, repoStore))
		api.GET("/repos/:id/claim-status", handler.GetPublicClaimStatusHandler(claimRepo))

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

		// Auth Routes
		authGroup := api.Group("/auth")
		{
			authGroup.GET("/github", handler.GitHubOAuthRedirect(cfg))
			authGroup.GET("/github/callback", handler.GitHubOAuthCallback(cfg, userRepo, tokenMgr, entitlementRepo))
			authGroup.GET("/google", handler.GoogleOAuthRedirect(cfg))
			authGroup.GET("/google/callback", handler.GoogleOAuthCallback(cfg, userRepo))
		}
	}

	// Authenticated User Routes (Custom Opendoor JWT)
	userApi := r.Group("/api/v1")
	userApi.Use(middleware.UserAuth(cfg.JWTSecret))
	{
		userApi.GET("/auth/me", handler.GetCurrentUser(userRepo))
		userApi.PATCH("/user/consent", handler.UpdateConsent(userRepo))
		userApi.PATCH("/user/profile-visibility", handler.UpdateProfileVisibilityHandler(userRepo))
		userApi.DELETE("/me/data", handler.DeleteUserData(cfg, userRepo))
		userApi.GET("/user/dna", handler.GetContributorDNA(profileRepo))
		userApi.POST("/user/dna/refresh", handler.RefreshContributorDNA(profileRepo, dnaWorker))
		userApi.GET("/user/matches", handler.GetUserMatchesHandler(profileRepo, repoStore))
		userApi.GET("/user/top-matches", handler.GetTopMatchesHandler(userRepo, repoStore))
		userApi.GET("/user/for-you", handler.GetForYouHandler(userRepo, repoStore, gfiRepo, entitlementRepo))
		userApi.GET("/user/referral", handler.GetMyReferral(entitlementRepo))

		// Maintainer Claims & C-Rank Console (AC1, AC2, AC3, AC6, AC8)
		userApi.POST("/repos/:id/claim", handler.PostClaimRepoHandler(claimSvc))
		userApi.POST("/repos/:id/verify", handler.PostVerifyRepoHandler(claimSvc))
		userApi.GET("/repos/:id/console", handler.GetMaintainerConsoleHandler(claimSvc))
		userApi.POST("/repos/:id/claim-dispute", handler.PostClaimDisputeHandler(claimRepo))
		userApi.GET("/user/claims", handler.GetUserClaimsListHandler(claimRepo))

		// Top-level aliases for direct paths (AC1)
		r.POST("/repo/:owner/:name/claim", middleware.UserAuth(cfg.JWTSecret), handler.PostClaimRepoHandler(claimSvc))
		r.POST("/repo/:owner/:name/verify", middleware.UserAuth(cfg.JWTSecret), handler.PostVerifyRepoHandler(claimSvc))
		r.GET("/repo/:owner/:name/console", middleware.UserAuth(cfg.JWTSecret), handler.GetMaintainerConsoleHandler(claimSvc))

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

		// Hacktoberfest hub: live "X of 4 merged" progress + stream-hint nudge
		userApi.GET("/hacktoberfest/progress", handler.GetHacktoberfestProgressHandler(hbSvc))
		userApi.POST("/hacktoberfest/nudge", handler.PostHacktoberfestNudgeHandler(hbSvc))

		userApi.POST("/user/feedback", handler.CreateFeedback(database, cfg.GithubToken))
		userApi.DELETE("/user/feedback/:id", handler.DeleteFeedback(database))
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
