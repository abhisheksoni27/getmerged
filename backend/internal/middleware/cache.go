package middleware

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

const cacheKey = "cache"

// Cache attaches a valkey.Client to the gin context under the key "cache".
func Cache(rawURL, username, password string) (gin.HandlerFunc, valkey.Client, error) {
	addr := rawURL
	useTLS := false

	if strings.HasPrefix(addr, "rediss://") {
		useTLS = true
		addr = strings.TrimPrefix(addr, "rediss://")
	} else if strings.HasPrefix(addr, "redis://") {
		addr = strings.TrimPrefix(addr, "redis://")
	}

	opts := valkey.ClientOption{
		InitAddress: []string{addr},
	}

	if useTLS {
		opts.TLSConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
		}
	}
	if username != "" {
		opts.Username = username
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

	slog.Info("cache connected", "url", rawURL)

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
