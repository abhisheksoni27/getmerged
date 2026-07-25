package middleware

import (
	"log"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const dbKey = "db"

// DB attaches an open *sqlx.DB to the gin context under the key "db".
func DB(database *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(dbKey, database)
		c.Next()
	}
}

// MustDB retrieves the *sqlx.DB from the gin context.
// Aborts with 500 if not found — indicates misconfigured middleware.
func MustDB(c *gin.Context) *sqlx.DB {
	v, ok := c.Get(dbKey)
	if !ok {
		log.Println("middleware: db not found in context")
		c.AbortWithStatus(http.StatusInternalServerError)
		return nil
	}
	return v.(*sqlx.DB)
}

// ConnectDB is a convenience wrapper used at startup.
var ConnectDB = db.Connect
