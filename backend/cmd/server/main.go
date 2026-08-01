// @title           OpenDoor API
// @version         1.0
// @description     Find open-source repositories that welcome contributors — ranked by C-Rank™.
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

	_ "github.com/abhisheksoni27/opendoor/docs"
	"github.com/abhisheksoni27/opendoor/internal/ai"
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
		// slog not set up yet — use stderr directly.
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}

	setupLogger(cfg.GinMode, cfg.LogFile)

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connection failed", "url", cfg.DatabaseURL, "err", err)
		os.Exit(1)
	}
	defer database.Close()
	slog.Info("db connected", "url", cfg.DatabaseURL)

	cacheMiddleware, vkClient, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyUsername, cfg.ValkeyPassword)
	if err != nil {
		slog.Error("cache connection failed", "url", cfg.ValkeyURL, "err", err)
		os.Exit(1)
	}
	slog.Info("cache connected", "url", cfg.ValkeyURL)

	gh := ghclient.NewClient(cfg.GithubToken, vkClient)

	// Initialize AI and Notification clients
	aiClient := ai.NewAIClient(cfg.OpencodeAPIKey)
	telegramNotifier := notification.NewTelegramNotifier(cfg.TelegramBotToken, cfg.TelegramChatID)

	// Initialize Repository Layer
	userRepo := repository.NewUserRepository(database, cfg)
	repoStore := repository.NewRepoRepository(database)
	watchlistRepo := repository.NewWatchlistRepository(database)
	aiRepo := repository.NewAIRepository(database)

	// Start continuous background crawler worker loop
	crawler := pipeline.NewBackgroundCrawler(database, gh, telegramNotifier)
	crawler.Start()
	defer crawler.Stop()

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.CORS())
	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// Health Check
	r.GET("/health", handler.Health())

	// Public API
	api := r.Group("/api/v1")
	{
		api.GET("/health", handler.Health())
		api.GET("/repos", handler.ListRepos(repoStore))
		api.GET("/repos/:id", handler.GetRepo(repoStore))
		api.POST("/repos/queue", handler.RequestRepoIndexing(database))
		api.GET("/languages", handler.ListLanguages(database))
		api.GET("/stats/macro", handler.GetMacroStats())

		api.GET("/repos/:id/feedback", handler.ListFeedback(database))

		// Auth Routes
		authGroup := api.Group("/auth")
		{
			authGroup.GET("/github", handler.GitHubOAuthRedirect(cfg))
			authGroup.GET("/github/callback", handler.GitHubOAuthCallback(cfg, userRepo))
		}
	}

	// Authenticated User Routes (Custom Opendoor JWT)
	userApi := r.Group("/api/v1")
	userApi.Use(middleware.UserAuth(cfg.JWTSecret))
	{
		userApi.GET("/auth/me", handler.GetCurrentUser(userRepo))
		userApi.GET("/repos/:id/insights", handler.GetRepoInsights(aiClient, aiRepo, repoStore))
		userApi.POST("/user/watchlist", handler.AddToWatchlist(watchlistRepo))
		userApi.DELETE("/user/watchlist/:id", handler.RemoveFromWatchlist(watchlistRepo))
		userApi.GET("/user/watchlist", handler.ListWatchlist(watchlistRepo))
		userApi.POST("/user/feedback", handler.CreateFeedback(database, cfg.GithubToken))
	}

	// Internal routes — nginx blocks these externally
	internal := r.Group("/internal")
	internal.Use(middleware.Auth(cfg.InternalAPIKey))
	{
		internal.POST("/update-scores", handler.UpdateScores(gh))
		internal.POST("/seed", handler.Seed(gh))
		internal.POST("/score-repo", handler.ScoreRepo(gh, repoStore))
		internal.POST("/sync-trending", handler.SyncTrending())
		internal.POST("/check-pat", handler.CheckPAT(gh))
		internal.POST("/purge-cache", handler.PurgeCache())
		internal.POST("/cache/purge-tag", handler.PurgeTagCache())
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
func setupLogger(ginMode, logFilePath string) {
	level := slog.LevelDebug
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
