package middleware

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

const cacheKey = "cache"

// Cache attaches a valkey.Client to the gin context under the key "cache".
func Cache(url, password string) (gin.HandlerFunc, valkey.Client, error) {
	opts := valkey.ClientOption{
		InitAddress: []string{url},
	}
	if password != "" {
		opts.Password = password
	}

	client, err := valkey.NewClient(opts)
	if err != nil {
		return nil, nil, fmt.Errorf("valkey connect: %w", err)
	}

	if err := client.Do(context.Background(), client.B().Ping().Build()).Error(); err != nil {
		return nil, nil, fmt.Errorf("valkey ping: %w", err)
	}

	slog.Info("cache connected", "url", url)

	return func(c *gin.Context) {
		c.Set(cacheKey, client)
		c.Next()
	}, client, nil
}

// MustCache retrieves the valkey.Client from the gin context.
func MustCache(c *gin.Context) valkey.Client {
	v, ok := c.Get(cacheKey)
	if !ok {
		return nil
	}
	return v.(valkey.Client)
}
