// Package scan implements on-demand ("instant") C-Rank scoring for any public
// GitHub repository URL pasted by a visitor.
package scan

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// ErrInvalidInput is returned for anything that is not a parseable public
// GitHub owner/repo reference (safe, non-leaky message for the client).
var ErrInvalidInput = errors.New("enter a public GitHub repository URL, e.g. https://github.com/owner/repo")

// allowedHosts is the SSRF host allowlist (AC1). Nothing else is ever
// contacted or accepted, so no user-controlled host can be reached.
var allowedHosts = map[string]bool{
	"github.com":     true,
	"www.github.com": true,
	"api.github.com": true,
}

var segmentRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$`)

// reservedOwners are GitHub product paths that are never repositories.
var reservedOwners = map[string]bool{
	"features": true, "topics": true, "trending": true, "collections": true,
	"events": true, "sponsors": true, "settings": true, "marketplace": true,
	"explore": true, "notifications": true, "pulls": true, "issues": true,
	"login": true, "join": true, "orgs": true, "apps": true, "about": true,
}

// ParseRepoInput accepts "owner/repo" or an https github.com URL and returns
// the normalised owner and name. Only https is allowed; http, ssh, git,
// credentials, ports and any non-allowlisted host are rejected (AC1).
func ParseRepoInput(raw string) (string, string, error) {
	in := strings.TrimSpace(raw)
	if in == "" || len(in) > 300 {
		return "", "", ErrInvalidInput
	}

	if strings.Contains(in, "://") || strings.HasPrefix(in, "//") {
		if strings.HasPrefix(in, "//") {
			in = "https:" + in
		}
		u, err := url.Parse(in)
		if err != nil || u == nil {
			return "", "", ErrInvalidInput
		}
		if !strings.EqualFold(u.Scheme, "https") {
			return "", "", ErrInvalidInput
		}
		if u.User != nil {
			return "", "", ErrInvalidInput
		}
		if u.Port() != "" && u.Port() != "443" {
			return "", "", ErrInvalidInput
		}
		if !allowedHosts[strings.ToLower(u.Hostname())] {
			return "", "", ErrInvalidInput
		}
		in = strings.TrimPrefix(u.Path, "/")
	} else {
		// Bare host forms: github.com/owner/repo
		lower := strings.ToLower(in)
		for host := range allowedHosts {
			if strings.HasPrefix(lower, host+"/") {
				in = in[len(host)+1:]
				break
			}
		}
	}

	parts := strings.Split(strings.Trim(in, "/"), "/")
	if len(parts) < 2 {
		return "", "", ErrInvalidInput
	}
	owner, name := parts[0], strings.TrimSuffix(parts[1], ".git")
	if !segmentRe.MatchString(owner) || !segmentRe.MatchString(name) {
		return "", "", ErrInvalidInput
	}
	if reservedOwners[strings.ToLower(owner)] {
		return "", "", ErrInvalidInput
	}
	return owner, name, nil
}

// isPublicIP rejects loopback, private, link-local, multicast, unspecified and
// CGNAT addresses so no internal service can ever be reached (AC1).
func isPublicIP(ip net.IP) bool {
	if ip == nil || ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() ||
		ip.IsInterfaceLocalMulticast() {
		return false
	}
	if v4 := ip.To4(); v4 != nil {
		// 100.64.0.0/10 CGNAT, 169.254/16 handled above, 0.0.0.0/8
		if v4[0] == 100 && v4[1] >= 64 && v4[1] <= 127 {
			return false
		}
		if v4[0] == 0 {
			return false
		}
	}
	return true
}

// resolveAllowedHost verifies that the allowlisted host resolves only to
// public (GitHub-routable) addresses before any request is made (AC1).
func resolveAllowedHost(ctx context.Context, host string) error {
	if !allowedHosts[strings.ToLower(host)] {
		return ErrInvalidInput
	}
	rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	ips, err := net.DefaultResolver.LookupIPAddr(rctx, host)
	if err != nil || len(ips) == 0 {
		return fmt.Errorf("could not resolve %s", host)
	}
	for _, ip := range ips {
		if !isPublicIP(ip.IP) {
			return ErrInvalidInput
		}
	}
	return nil
}

// safeHTTPClient builds a client with redirects disabled and a dial-time IP
// guard, so even a DNS-rebind cannot reach a private address (AC1).
func safeHTTPClient(timeout time.Duration) *http.Client {
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	return &http.Client{
		Timeout: timeout,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return errors.New("redirects are not followed")
		},
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				host, _, err := net.SplitHostPort(addr)
				if err != nil {
					return nil, err
				}
				if ip := net.ParseIP(host); ip != nil {
					if !isPublicIP(ip) {
						return nil, ErrInvalidInput
					}
				} else if err := resolveAllowedHost(ctx, host); err != nil {
					return nil, err
				}
				return dialer.DialContext(ctx, network, addr)
			},
		},
	}
}
