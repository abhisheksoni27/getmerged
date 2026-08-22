// @title           OpenDoor API
// @version         1.0
// @description     Find open-source repositories that welcome contributors - ranked by C-Rank™.
// @host            opendoor.abhishekco.de
// @BasePath        /
// @securityDefinitions.apikey ApiKeyAuth
// @in              header
// @name            x-api-key
package main

import (
	"io"
	"log/slog"
	"os"
	"time"

	_ "github.com/abhisheksoni27/opendoor/docs"
	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
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
	tokenMgr := auth.NewTokenManager(oauthTokenRepo, cfg, nil)
	dnaWorker := pipeline.NewContributorDNAWorker(userRepo, profileRepo, tokenMgr, cfg.GithubToken, nil)
	repoStore := repository.NewRepoRepository(database)
	watchlistRepo := repository.NewWatchlistRepository(database)
	aiRepo := repository.NewAIRepository(database)

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

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.CORS())
	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// Health Check
	r.GET("/health", handler.Health())

	// Public SVG Badge Route (F1)
	r.GET("/badge/:owner/:repo", handler.GetBadgeSVG(repoStore))

	// Public API
	api := r.Group("/api/v1")
	api.Use(middleware.OptionalUserAuth(cfg.JWTSecret))
	{
		api.GET("/health", handler.Health())
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
		api.POST("/repos/queue", handler.RequestRepoIndexing(database))
		api.GET("/languages", handler.ListLanguages(database))
		api.GET("/topics", handler.ListTopics(repoStore))
		api.GET("/stats/macro", handler.GetMacroStats())

		api.GET("/repos/:id/feedback", handler.ListFeedback(database))
		api.GET("/users/:slug", handler.GetUserProfile(userRepo))
		api.GET("/users/:slug/achievement.svg", handler.RenderAchievementCardHandler(userRepo))
		api.GET("/badges/:owner/:name/badge.json", handler.GetRepoBadgeJSON(repoStore))
		api.GET("/badges/:owner/:name/badge.svg", handler.GetRepoBadgeSVG(repoStore))
		api.POST("/preflight/evaluate", handler.EvaluatePreflightHandler())
		api.POST("/payments/webhook/dodopayments", handler.DodopaymentsWebhookHandler(cfg, entitlementRepo))
		api.GET("/repos/:id/insights", handler.GetRepoInsights(aiClient, aiRepo, repoStore))

		// Auth Routes
		authGroup := api.Group("/auth")
		{
			authGroup.GET("/github", handler.GitHubOAuthRedirect(cfg))
			authGroup.GET("/github/callback", handler.GitHubOAuthCallback(cfg, userRepo, tokenMgr))
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
		userApi.DELETE("/me/data", handler.DeleteUserData(cfg, userRepo))
		userApi.GET("/user/dna", handler.GetContributorDNA(profileRepo))
		userApi.POST("/user/dna/refresh", handler.RefreshContributorDNA(profileRepo, dnaWorker))
		userApi.GET("/user/matches", handler.GetUserMatchesHandler(profileRepo, repoStore))
		userApi.POST("/user/watchlist", handler.AddToWatchlist(watchlistRepo))
		userApi.DELETE("/user/watchlist/:id", handler.RemoveFromWatchlist(watchlistRepo))
		userApi.GET("/user/watchlist", handler.ListWatchlist(watchlistRepo))
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
		internal.POST("/jobs/weekly-digest", handler.TriggerWeeklyDigest())
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
