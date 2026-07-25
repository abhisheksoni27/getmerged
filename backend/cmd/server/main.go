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
	"log"

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
		log.Fatalf("config: %v", err)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer database.Close()
	log.Println("db: connected")

	cacheMiddleware, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyPassword)
	if err != nil {
		log.Fatalf("cache: %v", err)
	}
	log.Println("cache: ready")

	gh := ghclient.NewClient(cfg.GithubToken)

	gin.SetMode(cfg.GinMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Shared middleware — attach db and cache to all requests.
	r.Use(middleware.DB(database))
	r.Use(cacheMiddleware)

	// --- Public API ---
	v1 := r.Group("/api/v1")
	v1.Use(middleware.RateLimit())
	{
		v1.GET("/repos", handler.ListRepos)
		v1.GET("/repos/:id", handler.GetRepo)
	}

	// --- Internal routes (nginx blocks these from the internet) ---
	internal := r.Group("/internal")
	internal.Use(middleware.Auth(cfg.InternalAPIKey))
	{
		internal.POST("/update-scores", handler.UpdateScores(gh))
		internal.POST("/seed", handler.Seed(gh))
	}

	// --- Swagger docs ---
	r.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Printf("server: listening on :%s (mode: %s)", cfg.Port, cfg.GinMode)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
