package scan_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scan"
)

func TestParseRepoInput_Accepts(t *testing.T) {
	cases := map[string][2]string{
		"https://github.com/golang/go":              {"golang", "go"},
		"https://www.github.com/golang/go/pull/123": {"golang", "go"},
		"golang/go":                {"golang", "go"},
		"github.com/gin-gonic/gin": {"gin-gonic", "gin"},
		"https://github.com/abhisheksoni27/opendoor.git": {"abhisheksoni27", "opendoor"},
	}
	for in, want := range cases {
		owner, name, err := scan.ParseRepoInput(in)
		if err != nil {
			t.Fatalf("ParseRepoInput(%q) unexpected error: %v", in, err)
		}
		if owner != want[0] || name != want[1] {
			t.Fatalf("ParseRepoInput(%q) = %s/%s, want %s/%s", in, owner, name, want[0], want[1])
		}
	}
}

func TestParseRepoInput_RejectsSSRFAndJunk(t *testing.T) {
	bad := []string{
		"",
		"http://github.com/golang/go", // non-https
		"https://127.0.0.1/golang/go", // loopback host
		"https://169.254.169.254/latest/meta-data", // cloud metadata
		"https://github.com.evil.tld/golang/go",    // lookalike host
		"https://user:pass@github.com/golang/go",   // credentials
		"https://github.com:8080/golang/go",        // non-443 port
		"file:///etc/passwd",
		"https://github.com/golang",      // no repo segment
		"https://github.com/topics/rust", // reserved product path
		"https://gitlab.com/golang/go",
	}
	for _, in := range bad {
		if _, _, err := scan.ParseRepoInput(in); err == nil {
			t.Fatalf("ParseRepoInput(%q) should have been rejected", in)
		}
	}
}

func TestHeadlineCopy(t *testing.T) {
	if got := scan.Headline("owner/repo", "B", true); got != "This repo is a B-tier ghost town — verify before you PR" {
		t.Fatalf("unexpected stale headline: %q", got)
	}
	if got := scan.Headline("owner/repo", "S", false); got == "" {
		t.Fatal("expected non-empty headline for S tier")
	}
}
