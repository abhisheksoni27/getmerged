package handler

import "testing"

// AC4/AC5: season card ids are deterministic, pattern-valid and round-trip.
func TestSeasonCardIDRoundTrip(t *testing.T) {
	const secret = "test-secret"
	for _, uid := range []int64{1, 42, 987654, 1 << 40} {
		id := SeasonCardID(secret, uid)
		if !seasonCardPattern.MatchString(id) {
			t.Fatalf("id %q does not match pattern", id)
		}
		got, ok := parseSeasonCardID(secret, id)
		if !ok || got != uid {
			t.Fatalf("parse(%q) = %d,%v want %d,true", id, got, ok, uid)
		}
	}
	if _, ok := parseSeasonCardID(secret, SeasonCardID("other-secret", 7)); ok {
		t.Fatal("wrong secret must not validate")
	}
	if _, ok := parseSeasonCardID("test-secret", "ab12cd34ef56ab12cd34ef"); ok {
		t.Fatal("tampered checksum must not validate")
	}
	if seasonCardPattern.MatchString("0123456789abcdef0123456789abcdef") {
		t.Fatal("forecast-card ids must never match the season pattern")
	}
}
