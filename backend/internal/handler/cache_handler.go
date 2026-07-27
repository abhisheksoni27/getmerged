package handler

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

type purgeTagRequest struct {
	Tag string `json:"tag" binding:"required"`
}

// PurgeTagCache handles POST /api/v1/internal/cache/purge-tag
// Takes a tag string (e.g. "get_repos") and purges all associated cache keys tracked under that tag set.
func PurgeTagCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req purgeTagRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tag parameter is required"})
			return
		}

		tag := strings.TrimSpace(req.Tag)
		if tag == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tag cannot be empty"})
			return
		}

		vk := middleware.MustCache(c)
		if vk == nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "cache client not configured; no-op",
				"tag":     tag,
				"purged":  0,
			})
			return
		}

		ctx := context.Background()
		setKey := "apicache:tag:" + tag

		// Fetch all cache keys registered under this tag
		keys, err := vk.Do(ctx, vk.B().Smembers().Key(setKey).Build()).AsStrSlice()
		if err != nil || len(keys) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"message": "no keys found for tag",
				"tag":     tag,
				"purged":  0,
			})
			return
		}

		// Delete all keys stored under tag
		for _, k := range keys {
			_ = vk.Do(ctx, vk.B().Del().Key(k).Build())
		}
		// Delete the tag tracking set itself
		_ = vk.Do(ctx, vk.B().Del().Key(setKey).Build())

		slog.Info("purge cache by tag succeeded", "tag", tag, "count", len(keys))
		c.JSON(http.StatusOK, gin.H{
			"message": "tag cache purged successfully",
			"tag":     tag,
			"purged":  len(keys),
		})
	}
}
