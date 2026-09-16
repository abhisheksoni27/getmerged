package analytics

import (
	"bufio"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// RouteCategory classifies incoming requests for performance tracking.
type RouteCategory int

const (
	CategoryAPI RouteCategory = iota
	CategoryPage
	CategoryStaticOrAsset
)

// NginxLogEntry represents a structured JSON log line from Nginx.
type NginxLogEntry struct {
	Time           string  `json:"time"`
	Status         int     `json:"status"`
	Method         string  `json:"method"`
	URI            string  `json:"uri"`
	RequestTime    float64 `json:"request_time"` // in seconds
	Bytes          int64   `json:"bytes"`
	UserAgent      string  `json:"ua"`
	CFConnectingIP string  `json:"cf_connecting_ip"`
	CFIpCountry    string  `json:"cf_ipcountry"`
	Bot            string  `json:"bot,omitempty"`
}

// LatencyPercentiles holds summary statistics for a set of latency samples.
type LatencyPercentiles struct {
	Count int     `json:"count"`
	AvgMs float64 `json:"avg_ms"`
	P50Ms float64 `json:"p50_ms"`
	P90Ms float64 `json:"p90_ms"`
	P95Ms float64 `json:"p95_ms"`
	P99Ms float64 `json:"p99_ms"`
	MaxMs float64 `json:"max_ms"`
}

// EndpointLatency tracks latency metrics for a specific normalized route.
type EndpointLatency struct {
	Route     string  `json:"route"`
	Category  string  `json:"category"`
	Count     int     `json:"count"`
	AvgMs     float64 `json:"avg_ms"`
	P95Ms     float64 `json:"p95_ms"`
	MaxMs     float64 `json:"max_ms"`
	SampleURI string  `json:"sample_uri"`
	samples   []float64
}

// PerformanceSummary captures the complete daily performance & traffic profile.
type PerformanceSummary struct {
	TargetDate    string             `json:"target_date"`
	TotalRequests int                `json:"total_requests"`
	UniqueIPs     int                `json:"unique_ips"`
	Status200     int                `json:"status_200"`
	Status4xx     int                `json:"status_4xx"`
	Status5xx     int                `json:"status_5xx"`
	GooglebotHits int                `json:"googlebot_hits"`
	BotCounts     map[string]int     `json:"bot_counts"`
	APILatency    LatencyPercentiles `json:"api_latency"`
	PageLatency   LatencyPercentiles `json:"page_latency"`
	TopSlowAPIs   []EndpointLatency  `json:"top_slow_apis"`
	TopSlowPages  []EndpointLatency  `json:"top_slow_pages"`
}

var uuidRegex = regexp.MustCompile(`(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)

// CategorizeURI determines whether a URI is an API endpoint, an SSR page, or a static asset.
func CategorizeURI(rawURI string) RouteCategory {
	cleanURI := strings.Split(rawURI, "?")[0]
	if strings.HasPrefix(cleanURI, "/api/") || strings.HasPrefix(cleanURI, "/badge/") {
		return CategoryAPI
	}

	// Filter static assets, chunks, and metadata
	if strings.HasPrefix(cleanURI, "/_next/") ||
		strings.HasPrefix(cleanURI, "/sitemap") ||
		cleanURI == "/favicon.ico" ||
		cleanURI == "/robots.txt" ||
		cleanURI == "/status" ||
		strings.HasSuffix(cleanURI, ".png") ||
		strings.HasSuffix(cleanURI, ".jpg") ||
		strings.HasSuffix(cleanURI, ".jpeg") ||
		strings.HasSuffix(cleanURI, ".svg") ||
		strings.HasSuffix(cleanURI, ".ico") ||
		strings.HasSuffix(cleanURI, ".css") ||
		strings.HasSuffix(cleanURI, ".js") ||
		strings.HasSuffix(cleanURI, ".map") ||
		strings.HasSuffix(cleanURI, ".txt") ||
		strings.HasSuffix(cleanURI, ".xml") {
		return CategoryStaticOrAsset
	}

	return CategoryPage
}

// NormalizeRoute groups dynamic parameters and IDs into consistent route templates.
func NormalizeRoute(rawURI string, cat RouteCategory) string {
	decoded, err := url.QueryUnescape(rawURI)
	if err != nil {
		decoded = rawURI
	}
	clean := strings.Split(decoded, "?")[0]
	if clean == "" {
		return "/"
	}

	// Replace UUIDs
	clean = uuidRegex.ReplaceAllString(clean, ":id")

	if cat == CategoryAPI {
		if strings.HasPrefix(clean, "/api/v1/repos/") {
			rest := strings.TrimPrefix(clean, "/api/v1/repos/")
			parts := strings.Split(rest, "/")
			if len(parts) >= 2 && parts[0] != ":id" {
				if len(parts) == 2 {
					return "/api/v1/repos/:owner/:name"
				}
				return "/api/v1/repos/:owner/:name/" + strings.Join(parts[2:], "/")
			}
		}
		if strings.HasPrefix(clean, "/api/v1/badges/") {
			return "/api/v1/badges/:owner/:name/badge.json"
		}
		if strings.HasPrefix(clean, "/badge/") {
			return "/badge/:owner/:name"
		}
		return clean
	}

	if cat == CategoryPage {
		if strings.HasPrefix(clean, "/compare/") && strings.Contains(clean, "/vs/") {
			return "/compare/:orgA/:repoA/vs/:orgB/:repoB"
		}
		if strings.HasPrefix(clean, "/org/") {
			return "/org/:org"
		}
		if strings.HasPrefix(clean, "/topics/") {
			return "/topics/:topic"
		}
		if strings.HasPrefix(clean, "/contribute/") {
			return "/contribute/:language"
		}
		if strings.HasPrefix(clean, "/rankings/") {
			return "/rankings/:lang"
		}
		if strings.HasPrefix(clean, "/u/") {
			return "/u/:username"
		}
		// 2-segment path: /:owner/:name (e.g. /facebook/react)
		trimmed := strings.Trim(clean, "/")
		parts := strings.Split(trimmed, "/")
		if len(parts) == 2 {
			reserved := map[string]bool{
				"api": true, "badge": true, "docs": true, "stack": true,
				"legal": true, "u": true, "org": true, "topics": true,
				"contribute": true, "rankings": true, "compare": true,
			}
			if !reserved[strings.ToLower(parts[0])] {
				return "/:owner/:name"
			}
		}
		return clean
	}

	return clean
}

// DetectBotName classifies user agents into canonical bot identities.
func DetectBotName(ua, loggedBot string) string {
	if loggedBot != "" {
		return loggedBot
	}
	uaLower := strings.ToLower(ua)
	switch {
	case strings.Contains(uaLower, "googlebot") || strings.Contains(uaLower, "google-inspectiontool") || strings.Contains(uaLower, "storebot-google") || strings.Contains(uaLower, "adsbot-google") || strings.Contains(uaLower, "mediapartners-google"):
		return "Googlebot"
	case strings.Contains(uaLower, "claudebot") || strings.Contains(uaLower, "claude-web") || strings.Contains(uaLower, "anthropic-ai") || strings.Contains(uaLower, "claude"):
		return "Claude"
	case strings.Contains(uaLower, "gptbot") || strings.Contains(uaLower, "chatgpt-user") || strings.Contains(uaLower, "oai-searchbot"):
		return "OpenAI"
	case strings.Contains(uaLower, "perplexitybot"):
		return "Perplexity"
	case strings.Contains(uaLower, "meta-externalagent") || strings.Contains(uaLower, "facebookexternalhit") || strings.Contains(uaLower, "meta-externalfetcher"):
		return "Meta"
	case strings.Contains(uaLower, "bingbot") || strings.Contains(uaLower, "msnbot") || strings.Contains(uaLower, "bingpreview") || strings.Contains(uaLower, "adidxbot"):
		return "Bing"
	case strings.Contains(uaLower, "amazonbot"):
		return "Amazon"
	case strings.Contains(uaLower, "applebot"):
		return "Apple"
	case strings.Contains(uaLower, "bytespider"):
		return "ByteDance"
	case strings.Contains(uaLower, "duckduckbot"):
		return "DuckDuckGo"
	case strings.Contains(uaLower, "twitterbot"):
		return "Twitter"
	case strings.Contains(uaLower, "discordbot"):
		return "Discord"
	case strings.Contains(uaLower, "slackbot") || strings.Contains(uaLower, "slack-imgproxy"):
		return "Slack"
	case strings.Contains(uaLower, "linkedinbot"):
		return "LinkedIn"
	case strings.Contains(uaLower, "yandexbot"):
		return "Yandex"
	case strings.Contains(uaLower, "baiduspider"):
		return "Baidu"
	case strings.Contains(uaLower, "semrushbot"):
		return "Semrush"
	case strings.Contains(uaLower, "ahrefsbot"):
		return "Ahrefs"
	case strings.Contains(uaLower, "dotbot"):
		return "DotBot"
	case strings.Contains(uaLower, "mj12bot"):
		return "MJ12bot"
	case strings.Contains(uaLower, "petalbot"):
		return "PetalBot"
	case strings.Contains(uaLower, "sogou"):
		return "Sogou"
	case strings.Contains(uaLower, "youbot"):
		return "YouBot"
	case strings.Contains(uaLower, "cohere-ai"):
		return "Cohere"
	case strings.Contains(uaLower, "diffbot"):
		return "Diffbot"
	default:
		return ""
	}
}

// ComputeLatencyPercentiles calculates average, p50, p90, p95, p99, and max from latency samples (in ms).
func ComputeLatencyPercentiles(samples []float64) LatencyPercentiles {
	if len(samples) == 0 {
		return LatencyPercentiles{}
	}
	sorted := make([]float64, len(samples))
	copy(sorted, samples)
	sort.Float64s(sorted)

	n := len(sorted)
	var sum float64
	for _, s := range sorted {
		sum += s
	}

	return LatencyPercentiles{
		Count: n,
		AvgMs: sum / float64(n),
		P50Ms: calcPercentile(sorted, 50),
		P90Ms: calcPercentile(sorted, 90),
		P95Ms: calcPercentile(sorted, 95),
		P99Ms: calcPercentile(sorted, 99),
		MaxMs: sorted[n-1],
	}
}

func calcPercentile(sorted []float64, p float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n == 1 {
		return sorted[0]
	}
	rank := (p / 100.0) * float64(n-1)
	low := int(math.Floor(rank))
	high := int(math.Ceil(rank))
	if low == high {
		return sorted[low]
	}
	weight := rank - float64(low)
	return sorted[low]*(1-weight) + sorted[high]*weight
}

// ProcessNginxLogs parses and analyzes Nginx access logs for targetDate.
func ProcessNginxLogs(logDir, targetDate string) (*PerformanceSummary, error) {
	files, err := filepath.Glob(filepath.Join(logDir, "access.log*"))
	if err != nil {
		return nil, err
	}

	summary := &PerformanceSummary{
		TargetDate: targetDate,
		BotCounts:  make(map[string]int),
	}

	ipMap := make(map[string]bool)
	apiSamples := make([]float64, 0)
	pageSamples := make([]float64, 0)

	apiRoutes := make(map[string]*EndpointLatency)
	pageRoutes := make(map[string]*EndpointLatency)

	for _, file := range files {
		f, err := os.Open(file)
		if err != nil {
			continue
		}

		var scanner *bufio.Scanner
		if strings.HasSuffix(file, ".gz") {
			gz, err := gzip.NewReader(f)
			if err != nil {
				f.Close()
				continue
			}
			scanner = bufio.NewScanner(gz)
		} else {
			scanner = bufio.NewScanner(f)
		}

		buf := make([]byte, 1024*1024)
		scanner.Buffer(buf, 1024*1024)

		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "{") {
				continue
			}
			if !strings.Contains(line, targetDate) {
				continue
			}

			var entry NginxLogEntry
			if err := json.Unmarshal([]byte(line), &entry); err != nil {
				continue
			}

			if len(entry.Time) >= 10 && entry.Time[:10] == targetDate {
				// Exclude internal loopback and healthchecks
				if entry.CFConnectingIP == "80.225.224.144" || entry.CFConnectingIP == "127.0.0.1" ||
					entry.UserAgent == "node" || entry.UserAgent == "Next.js Middleware" ||
					strings.Contains(entry.UserAgent, "Go-http-client") {
					continue
				}

				summary.TotalRequests++
				if entry.CFConnectingIP != "" {
					ipMap[entry.CFConnectingIP] = true
				}

				// Bot parsing
				bot := DetectBotName(entry.UserAgent, entry.Bot)
				if bot != "" {
					summary.BotCounts[bot]++
					if bot == "Googlebot" {
						summary.GooglebotHits++
					}
				}

				// Status codes
				if entry.Status >= 200 && entry.Status < 300 {
					summary.Status200++
				} else if entry.Status >= 400 && entry.Status < 500 {
					summary.Status4xx++
				} else if entry.Status >= 500 {
					summary.Status5xx++
				}

				latencyMs := entry.RequestTime * 1000.0
				cat := CategorizeURI(entry.URI)

				switch cat {
				case CategoryAPI:
					apiSamples = append(apiSamples, latencyMs)
					normRoute := NormalizeRoute(entry.URI, CategoryAPI)
					routeObj, ok := apiRoutes[normRoute]
					if !ok {
						routeObj = &EndpointLatency{
							Route:     normRoute,
							Category:  "api",
							SampleURI: entry.URI,
							samples:   make([]float64, 0),
						}
						apiRoutes[normRoute] = routeObj
					}
					routeObj.Count++
					routeObj.samples = append(routeObj.samples, latencyMs)

				case CategoryPage:
					pageSamples = append(pageSamples, latencyMs)
					normRoute := NormalizeRoute(entry.URI, CategoryPage)
					routeObj, ok := pageRoutes[normRoute]
					if !ok {
						routeObj = &EndpointLatency{
							Route:     normRoute,
							Category:  "page",
							SampleURI: entry.URI,
							samples:   make([]float64, 0),
						}
						pageRoutes[normRoute] = routeObj
					}
					routeObj.Count++
					routeObj.samples = append(routeObj.samples, latencyMs)
				}
			}
		}
		f.Close()
	}

	summary.UniqueIPs = len(ipMap)
	summary.APILatency = ComputeLatencyPercentiles(apiSamples)
	summary.PageLatency = ComputeLatencyPercentiles(pageSamples)

	// Compute route-level stats & find slowest
	summary.TopSlowAPIs = selectTopSlowEndpoints(apiRoutes, 5)
	summary.TopSlowPages = selectTopSlowEndpoints(pageRoutes, 5)

	return summary, nil
}

func selectTopSlowEndpoints(routeMap map[string]*EndpointLatency, limit int) []EndpointLatency {
	list := make([]EndpointLatency, 0, len(routeMap))
	for _, ep := range routeMap {
		stats := ComputeLatencyPercentiles(ep.samples)
		ep.AvgMs = stats.AvgMs
		ep.P95Ms = stats.P95Ms
		ep.MaxMs = stats.MaxMs
		list = append(list, *ep)
	}

	// Sort by AvgMs descending
	sort.Slice(list, func(i, j int) bool {
		if list[i].AvgMs == list[j].AvgMs {
			return list[i].Count > list[j].Count
		}
		return list[i].AvgMs > list[j].AvgMs
	})

	if len(list) > limit {
		return list[:limit]
	}
	return list
}

// FormatMorningPulseTelegram generates the Telegram Markdown message for Morning Pulse.
func FormatMorningPulseTelegram(
	summary *PerformanceSummary,
	totalRepos, sRankCount, totalUsers, totalReviews int,
	anomalies []string,
	spotlightSection ...string,
) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("🌅 *GetMerged Morning Pulse — %s*\n\n", summary.TargetDate))

	sb.WriteString("🔍 *SEO & Search Engine Indexing:*\n")
	sb.WriteString(fmt.Sprintf("• *Googlebot Hits:* `%d requests`\n", summary.GooglebotHits))

	// Format AI & Search Crawlers
	botDetails := formatBotBreakdown(summary.BotCounts)
	if botDetails != "" {
		sb.WriteString(fmt.Sprintf("• *AI & Search Crawlers:* %s\n", botDetails))
	}

	sb.WriteString(fmt.Sprintf("• *Total Traffic:* `%d requests` (%d unique IPs)\n", summary.TotalRequests, summary.UniqueIPs))
	sb.WriteString(fmt.Sprintf("• *Status Health:* %d OK (2xx) · %d (4xx) · %d (5xx)\n\n", summary.Status200, summary.Status4xx, summary.Status5xx))

	sb.WriteString("⚡ *Response Time & Latency Breakdown:*\n")
	if summary.APILatency.Count > 0 {
		sb.WriteString(fmt.Sprintf("• *🔌 APIs:* `avg %.1fms` · p50 `%.1fms` · p90 `%.1fms` · p99 `%.1fms` (%d reqs)\n",
			summary.APILatency.AvgMs, summary.APILatency.P50Ms, summary.APILatency.P90Ms, summary.APILatency.P99Ms, summary.APILatency.Count))
	} else {
		sb.WriteString("• *🔌 APIs:* `0 requests`\n")
	}

	if summary.PageLatency.Count > 0 {
		sb.WriteString(fmt.Sprintf("• *📄 Pages:* `avg %.1fms` · p50 `%.1fms` · p90 `%.1fms` · p99 `%.1fms` (%d reqs)\n\n",
			summary.PageLatency.AvgMs, summary.PageLatency.P50Ms, summary.PageLatency.P90Ms, summary.PageLatency.P99Ms, summary.PageLatency.Count))
	} else {
		sb.WriteString("• *📄 Pages:* `0 requests`\n\n")
	}

	// Flag top slow endpoints if any exist
	if len(summary.TopSlowAPIs) > 0 || len(summary.TopSlowPages) > 0 {
		sb.WriteString("🐢 *Slowest Endpoints Flagged:*\n")
		if len(summary.TopSlowAPIs) > 0 {
			sb.WriteString("• *Top Slow APIs:*\n")
			for i, ep := range summary.TopSlowAPIs {
				sb.WriteString(fmt.Sprintf("  %d. `%s` — avg `%.1fms` (max `%.1fms`, %d reqs)\n", i+1, ep.Route, ep.AvgMs, ep.MaxMs, ep.Count))
			}
		}
		if len(summary.TopSlowPages) > 0 {
			sb.WriteString("• *Top Slow Pages:*\n")
			for i, ep := range summary.TopSlowPages {
				sb.WriteString(fmt.Sprintf("  %d. `%s` — avg `%.1fms` (max `%.1fms`, %d reqs)\n", i+1, ep.Route, ep.AvgMs, ep.MaxMs, ep.Count))
			}
		}
		sb.WriteString("\n")
	}

	sb.WriteString("📊 *Level 0 Platform Telemetry:*\n")
	sb.WriteString(fmt.Sprintf("• *Indexed Repos:* `%d` codebases\n", totalRepos))
	sb.WriteString(fmt.Sprintf("• *S-Tier Open Doors:* `%d` elite repos\n", sRankCount))
	sb.WriteString(fmt.Sprintf("• *Registered Users:* `%d` accounts\n", totalUsers))
	sb.WriteString(fmt.Sprintf("• *Contributor Reviews:* `%d` ratings\n\n", totalReviews))

	if len(anomalies) > 0 {
		sb.WriteString("⚠️ *Statistical Anomalies Detected (10d DMA):*\n")
		for _, a := range anomalies {
			sb.WriteString(fmt.Sprintf("• %s\n", a))
		}
	} else {
		sb.WriteString("✅ *System Status:* All Level 0 metrics within 10-day normal variance.")
	}

	if len(spotlightSection) > 0 && strings.TrimSpace(spotlightSection[0]) != "" {
		sb.WriteString("\n\n" + strings.TrimSpace(spotlightSection[0]))
	}

	return sb.String()
}

func formatBotBreakdown(counts map[string]int) string {
	type botItem struct {
		Name  string
		Count int
	}
	items := make([]botItem, 0, len(counts))
	for name, count := range counts {
		if name == "Googlebot" {
			continue // Displayed separately
		}
		items = append(items, botItem{Name: name, Count: count})
	}
	if len(items) == 0 {
		return ""
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Count > items[j].Count
	})

	var parts []string
	for _, it := range items {
		parts = append(parts, fmt.Sprintf("%s (%d)", it.Name, it.Count))
	}
	return strings.Join(parts, " · ")
}
