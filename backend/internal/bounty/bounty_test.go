package bounty

import "testing"

func TestMatchAllowlist(t *testing.T) {
	cases := map[string]bool{
		"💰":              true,
		" 💰 ":            true,
		"💰BOUNTY":        true,
		"algora":         true,
		"ALGOR":          false,
		"polar":          true,
		"bounty":         true,
		"Bounty":         true,
		"bounty-hunter":  false, // no substring matching
		"algora reward":  false,
		"":               false,
	}
	for name, want := range cases {
		if got, _ := Match(name); got != want {
			t.Errorf("Match(%q) = %v, want %v", name, got, want)
		}
	}
}

func TestMatchAlgoraReward(t *testing.T) {
	ok, amt := Match("algora::reward/$100")
	if !ok || amt == nil || *amt != 100 {
		t.Fatalf("expected $100 match with amount, got ok=%v amt=%v", ok, amt)
	}
	ok, amt = Match("algora::reward/$1250.50")
	if !ok || amt == nil || *amt != 1250.5 {
		t.Fatalf("expected $1250.50, got ok=%v amt=%v", ok, amt)
	}
	ok, amt = Match("algora::reward/$10,00")
	if !ok || amt == nil || *amt != 10 {
		t.Fatalf("expected $10.00 comma form, got ok=%v amt=%v", ok, amt)
	}
	for _, bad := range []string{"algora::reward/100", "algora::reward/$10.5", "algora::reward/$10.123", "xalgora::reward/$10"} {
		if ok, _ := Match(bad); ok {
			t.Errorf("Match(%q) should not match", bad)
		}
	}
}

func TestDetect(t *testing.T) {
	ok, _ := Detect(`[{"name":"💰","color":"f9c74f"},{"name":"good first issue"}]`)
	if !ok {
		t.Fatal("emoji label should be detected")
	}
	ok, amt := Detect(`[{"name":"algora::reward/$500"}]`)
	if !ok || amt == nil || *amt != 500 {
		t.Fatalf("algora amount detect failed: %v %v", ok, amt)
	}
	ok, amt = Detect(`[{"name":"bounty"}]`)
	if !ok || amt != nil {
		t.Fatalf("plain bounty should have nil amount: %v %v", ok, amt)
	}
	if ok, _ := Detect(`not json`); ok {
		t.Fatal("malformed json must not match")
	}
	if ok, _ := Detect(""); ok {
		t.Fatal("empty must not match")
	}
}
