package analytics

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCategorizeURI(t *testing.T) {
	tests := []struct {
		uri  string
		want RouteCategory
	}{
		{"/api/v1/repos", CategoryAPI},
		{"/api/v1/repos/5b0a2839-4a62-400b-b3ce-9710e85dce2d/insights", CategoryAPI},
		{"/badge/facebook/react", CategoryAPI},
		{"/api/v1/badges/facebook/react/badge.json", CategoryAPI},
		{"/facebook/react", CategoryPage},
		{"/compare/vuejs/vue/vs/facebook/react", CategoryPage},
		{"/good-first-issue", CategoryPage},
		{"/pricing", CategoryPage},
		{"/rankings/rust", CategoryPage},
		{"/_next/static/chunks/main.js", CategoryStaticOrAsset},
		{"/favicon.ico", CategoryStaticOrAsset},
		{"/robots.txt", CategoryStaticOrAsset},
		{"/sitemap.xml", CategoryStaticOrAsset},
		{"/status", CategoryStaticOrAsset},
	}

	for _, tt := range tests {
		got := CategorizeURI(tt.uri)
		if got != tt.want {
			t.Errorf("CategorizeURI(%q) = %v, want %v", tt.uri, got, tt.want)
		}
	}
}

func TestNormalizeRoute(t *testing.T) {
	tests := []struct {
		uri  string
		cat  RouteCategory
		want string
	}{
		{"/api/v1/repos/5b0a2839-4a62-400b-b3ce-9710e85dce2d/insights", CategoryAPI, "/api/v1/repos/:id/insights"},
		{"/api/v1/repos/facebook/react/pr-likelihood?query=1", CategoryAPI, "/api/v1/repos/:owner/:name/pr-likelihood"},
		{"/badge/facebook/react", CategoryAPI, "/badge/:owner/:name"},
		{"/api/v1/badges/facebook/react/badge.json", CategoryAPI, "/api/v1/badges/:owner/:name/badge.json"},
		{"/compare/vuejs/vue/vs/facebook/react", CategoryPage, "/compare/:orgA/:repoA/vs/:orgB/:repoB"},
		{"/facebook/react", CategoryPage, "/:owner/:name"},
		{"/DavidVentura/offline-translator", CategoryPage, "/:owner/:name"},
		{"/rankings/rust", CategoryPage, "/rankings/:lang"},
		{"/org/google", CategoryPage, "/org/:org"},
		{"/topics/machine-learning", CategoryPage, "/topics/:topic"},
		{"/contribute/python", CategoryPage, "/contribute/:language"},
		{"/u/abhishek", CategoryPage, "/u/:username"},
		{"/pricing", CategoryPage, "/pricing"},
	}

	for _, tt := range tests {
		got := NormalizeRoute(tt.uri, tt.cat)
		if got != tt.want {
			t.Errorf("NormalizeRoute(%q, %v) = %q, want %q", tt.uri, tt.cat, got, tt.want)
		}
	}
}

func TestDetectBotName(t *testing.T) {
	tests := []struct {
		ua        string
		loggedBot string
		want      string
	}{
		{"", "Claude", "Claude"},
		{"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "", "Googlebot"},
		{"Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", "", "Claude"},
		{"Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)", "", "OpenAI"},
		{"Mozilla/5.0 (compatible; PerplexityBot/1.0)", "", "Perplexity"},
		{"facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "", "Meta"},
		{"Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "", "Bing"},
		{"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1)", "", "Amazon"},
		{"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "", ""},
	}

	for _, tt := range tests {
		got := DetectBotName(tt.ua, tt.loggedBot)
		if got != tt.want {
			t.Errorf("DetectBotName(%q, %q) = %q, want %q", tt.ua, tt.loggedBot, got, tt.want)
		}
	}
}

func TestComputeLatencyPercentiles(t *testing.T) {
	samples := []float64{10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0}
	stats := ComputeLatencyPercentiles(samples)

	if stats.Count != 10 {
		t.Fatalf("expected count 10, got %d", stats.Count)
	}
	if stats.AvgMs != 55.0 {
		t.Errorf("expected avg 55.0, got %.1f", stats.AvgMs)
	}
	if stats.P50Ms != 55.0 {
		t.Errorf("expected p50 55.0, got %.1f", stats.P50Ms)
	}
	if stats.MaxMs != 100.0 {
		t.Errorf("expected max 100.0, got %.1f", stats.MaxMs)
	}
}

func TestProcessNginxLogsAndFormatting(t *testing.T) {
	tmpDir := t.TempDir()
	logFile := filepath.Join(tmpDir, "access.log")

	sampleLogs := `{"time":"2026-08-31T10:00:00+00:00","ip":"1.1.1.1","method":"GET","uri":"/api/v1/repos/5b0a2839-4a62-400b-b3ce-9710e85dce2d/insights","status":200,"request_time":0.025,"bytes":500,"cf_ray":"abc","cf_ipcountry":"US","cf_connecting_ip":"1.1.1.1","ua":"Mozilla/5.0","bot":""}
{"time":"2026-08-31T10:01:00+00:00","ip":"1.1.1.1","method":"GET","uri":"/api/v1/repos/5b0a2839-4a62-400b-b3ce-9710e85dce2d/insights","status":200,"request_time":0.045,"bytes":500,"cf_ray":"abc","cf_ipcountry":"US","cf_connecting_ip":"1.1.1.1","ua":"Mozilla/5.0","bot":""}
{"time":"2026-08-31T10:02:00+00:00","ip":"2.2.2.2","method":"GET","uri":"/facebook/react","status":200,"request_time":0.120,"bytes":25000,"cf_ray":"abc","cf_ipcountry":"DE","cf_connecting_ip":"2.2.2.2","ua":"Mozilla/5.0 (compatible; ClaudeBot/1.0)","bot":"Claude"}
{"time":"2026-08-31T10:03:00+00:00","ip":"3.3.3.3","method":"GET","uri":"/vuejs/vue","status":200,"request_time":0.180,"bytes":24000,"cf_ray":"abc","cf_ipcountry":"FR","cf_connecting_ip":"3.3.3.3","ua":"Mozilla/5.0 (compatible; Googlebot/2.1)","bot":"Googlebot"}
{"time":"2026-08-31T10:04:00+00:00","ip":"127.0.0.1","method":"GET","uri":"/api/v1/health","status":200,"request_time":0.001,"bytes":10,"cf_ray":"","cf_ipcountry":"","cf_connecting_ip":"127.0.0.1","ua":"node","bot":""}
`
	if err := os.WriteFile(logFile, []byte(sampleLogs), 0644); err != nil {
		t.Fatal(err)
	}

	summary, err := ProcessNginxLogs(tmpDir, "2026-08-31")
	if err != nil {
		t.Fatalf("ProcessNginxLogs failed: %v", err)
	}

	if summary.TotalRequests != 4 {
		t.Errorf("expected 4 non-internal requests, got %d", summary.TotalRequests)
	}
	if summary.GooglebotHits != 1 {
		t.Errorf("expected 1 Googlebot hit, got %d", summary.GooglebotHits)
	}
	if summary.BotCounts["Claude"] != 1 {
		t.Errorf("expected 1 Claude hit, got %d", summary.BotCounts["Claude"])
	}
	if summary.APILatency.Count != 2 {
		t.Errorf("expected 2 API requests, got %d", summary.APILatency.Count)
	}
	if summary.APILatency.AvgMs != 35.0 {
		t.Errorf("expected 35.0ms API avg latency, got %.1f", summary.APILatency.AvgMs)
	}
	if summary.PageLatency.Count != 2 {
		t.Errorf("expected 2 Page requests, got %d", summary.PageLatency.Count)
	}
	if summary.PageLatency.AvgMs != 150.0 {
		t.Errorf("expected 150.0ms Page avg latency, got %.1f", summary.PageLatency.AvgMs)
	}

	if len(summary.TopSlowAPIs) != 1 {
		t.Fatalf("expected 1 slow API endpoint, got %d", len(summary.TopSlowAPIs))
	}
	if summary.TopSlowAPIs[0].Route != "/api/v1/repos/:id/insights" {
		t.Errorf("unexpected top slow API route: %s", summary.TopSlowAPIs[0].Route)
	}

	msg := FormatMorningPulseTelegram(summary, 1250, 85, 300, 150, []string{"🚨 API response time anomaly"})
	if !strings.Contains(msg, "GetMerged Morning Pulse — 2026-08-31") {
		t.Errorf("missing header in telegram brief: %s", msg)
	}
	if !strings.Contains(msg, "Claude (1)") {
		t.Errorf("missing bot breakdown in telegram brief: %s", msg)
	}
	if !strings.Contains(msg, "Top Slow APIs:") || !strings.Contains(msg, "Top Slow Pages:") {
		t.Errorf("missing slow endpoints section in telegram brief: %s", msg)
	}
}
