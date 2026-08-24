package handler

import (
	"net/http"

	docs "github.com/abhisheksoni27/opendoor/docs"
	"github.com/gin-gonic/gin"
)

// PublicSwaggerSpec serves the OpenAPI/Swagger document generated from code
// annotations. The public /docs page renders this spec (AC4); it mirrors
// docs/swagger.json in the repository root.
func PublicSwaggerSpec() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "public, max-age=3600")
		c.Data(http.StatusOK, "application/json", []byte(docs.SwaggerInfo.ReadDoc()))
	}
}
