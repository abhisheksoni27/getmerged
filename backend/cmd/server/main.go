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
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
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

	// Watchlist C-Rank change alerts: run at the end of every snapshot cycle
	// with the real SMTP mailer and the existing unsubscribe flow.
	pipeline.CRankAlertHook = func(hookDB *sqlx.DB) {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		if _, err := notification.RunCRankChangeAlerts(ctx, hookDB, notification.CRankAlertConfig{
			Mailer:    mailer,
			BaseURL:   cfg.AppBaseURL,
			JobSecret: cfg.JobSecret,

			DropThresholdPoints: cfg.AlertDropThreshold,
			Cooldown:            time.Duration(cfg.AlertCooldownHours) * time.Hour,
			MaxSendFailures:     cfg.MaxSendFailures,
		}); err != nil {
			slog.Error("crank change alerts failed", "err", err)
		}
	}

	// Claim re-verification cron (AC4): weekly lazy + scheduled re-check of
	// all claims; failures lapse the claim (7-day grace) before release.
	stopClaimCron := startClaimReverifyCron(claimSvc)
	defer stopClaimCron()

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

		// Slack/Discord webhook alert channels for watchlist C-Rank changes.
		webhookRepo := repository.NewWatchlistWebhookRepository(database, []byte(cfg.EncryptionKey))
		userApi.POST("/user/watchlist/webhooks", handler.AddWatchlistWebhook(webhookRepo))
		userApi.GET("/user/watchlist/webhooks", handler.ListWatchlistWebhooks(webhookRepo))
		userApi.DELETE("/user/watchlist/webhooks/:id", handler.RemoveWatchlistWebhook(webhookRepo))

		// My PR Tracker (personal pull-request journey on scored repos)
		userApi.GET("/user/prs", handler.GetUserPRsHandler(prTrackerSvc, entitlementRepo))
		userApi.GET("/user/prs/connection", handler.GetPRConnectionHandler(prTrackerSvc))
		userApi.POST("/user/prs/reconnect", handler.ReconnectPRConnectionHandler(prTrackerSvc))
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

