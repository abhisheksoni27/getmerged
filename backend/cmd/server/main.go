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
	"log/slog"
	"os"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
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

	setupLogger(cfg.GinMode)

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connection failed", "url", cfg.DatabaseURL, "err", err)
		os.Exit(1)
	}
	defer database.Close()
	slog.Info("db connected", "url", cfg.DatabaseURL)

	cacheMiddleware, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyPassword)
	if err != nil {
		slog.Error("cache connection failed", "url", cfg.ValkeyURL, "err", err)
		os.Exit(1)
	}
	slog.Info("cache connected", "url", cfg.ValkeyURL)

	gh := ghclient.NewClient(cfg.GithubToken)

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// Public API
	v1 := r.Group("/api/v1")
	v1.Use(middleware.RateLimit())
	{
		v1.GET("/repos", handler.ListRepos)
		v1.GET("/repos/:id", handler.GetRepo)
	}

	// Internal routes — nginx blocks these externally
	internal := r.Group("/internal")
	internal.Use(middleware.Auth(cfg.InternalAPIKey))
	{
		internal.POST("/update-scores", handler.UpdateScores(gh))
		internal.POST("/seed", handler.Seed(gh))
	}

	// Swagger docs
	r.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	slog.Info("server starting", "port", cfg.Port, "mode", cfg.GinMode)
	if err := r.Run("localhost:" + cfg.Port); err != nil {
		slog.Error("server exited", "err", err)
		os.Exit(1)
	}
}

// setupLogger configures the global slog default.
// JSON handler in release (structured, machine-readable for journald/log aggregators).
// Text handler in debug (human-readable for local dev).
func setupLogger(ginMode string) {
	level := slog.LevelInfo
	if ginMode == "debug" {
		level = slog.LevelDebug
	}

	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	if ginMode == "release" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}
