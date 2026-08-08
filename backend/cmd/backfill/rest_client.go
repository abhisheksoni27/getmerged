package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"golang.org/x/time/rate"
)

type RESTClient struct {
	token      string
	httpClient *http.Client
	limiter    *rate.Limiter
	reqCount   int
}

func NewRESTClient(token string, reqsPerHour int) *RESTClient {
	if reqsPerHour <= 0 {
		reqsPerHour = 4800
	}
	interval := time.Hour / time.Duration(reqsPerHour)
	limiter := rate.NewLimiter(rate.Every(interval), 1)

	return &RESTClient{
		token:      token,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		limiter:    limiter,
	}
}

func (c *RESTClient) Get(ctx context.Context, rawURL string) ([]byte, http.Header, error) {
	var body []byte
	var headers http.Header

	for attempt := 1; attempt <= 3; attempt++ {
		if err := c.limiter.Wait(ctx); err != nil {
			return nil, nil, err
		}

		c.reqCount++
		req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
		if err != nil {
			return nil, nil, fmt.Errorf("create request failed: %w", err)
		}

		req.Header.Set("Authorization", "token "+c.token)
		req.Header.Set("Accept", "application/vnd.github.v3+json")
		req.Header.Set("User-Agent", "Opendoor-Backfill/1.0")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			slog.Warn("HTTP request error, retrying", "url", rawURL, "attempt", attempt, "err", err)
			time.Sleep(time.Duration(attempt*2) * time.Second)
			continue
		}

		headers = resp.Header

		// Rate limit handling (429 or 403 secondary rate limit)
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusForbidden {
			resp.Body.Close()
			resetHeader := resp.Header.Get("X-RateLimit-Reset")
			var sleepDur = 10 * time.Second
			if resetHeader != "" {
				if resetUnix, err := strconv.ParseInt(resetHeader, 10, 64); err == nil {
					resetTime := time.Unix(resetUnix, 0)
					if wait := time.Until(resetTime); wait > 0 {
						sleepDur = wait + 5*time.Second
					}
				}
			}
			slog.Warn("Rate limited by GitHub API, sleeping", "url", rawURL, "status", resp.StatusCode, "sleep", sleepDur)
			time.Sleep(sleepDur)
			continue
		}

		if resp.StatusCode == http.StatusNotFound {
			resp.Body.Close()
			return nil, headers, fmt.Errorf("404 Not Found")
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			slog.Warn("Unexpected status code, retrying", "url", rawURL, "status", resp.StatusCode, "attempt", attempt)
			time.Sleep(time.Duration(attempt*2) * time.Second)
			continue
		}

		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			slog.Warn("Read body failed, retrying", "url", rawURL, "attempt", attempt, "err", err)
			time.Sleep(time.Duration(attempt*2) * time.Second)
			continue
		}

		body = b
		return body, headers, nil
	}

	return nil, nil, fmt.Errorf("failed after 3 retries: %s", rawURL)
}

func (c *RESTClient) RequestCount() int {
	return c.reqCount
}
