// Package bounty implements cash-bounty detection for GitHub issue labels
// flowing through the GoodFirstIssue pipeline. Detection is an exact-match
// allowlist (case-insensitive, trimmed) plus a strict Algora reward pattern;
// substring or fuzzy matching is deliberately not performed.
package bounty

import (
	"encoding/json"
	"regexp"
	"strings"
)

// allowlist is the exact set of bounty label names (compared trimmed and
// lowercased): 💰, 💰bounty, algora, polar, bounty.
var allowlist = map[string]bool{
	"💰": true,
	"💰bounty": true,
	"algora":   true,
	"polar":    true,
	"bounty":   true,
}

// algoraRewardRe matches "algora::reward/$NN" or "algora::reward/$NN.DD"
// (comma decimal separator accepted). Anchored both ends; no fuzz.
var algoraRewardRe = regexp.MustCompile(`^algora::reward/\$(\d+)([.,]\d{2})?$`)

type labelRef struct {
	Name string `json:"name"`
}

// Match reports whether the label name is a bounty label per AC1 and, when
// the matched label carries an amount (Algora reward form), returns it in
// USD. amount is nil whenever no amount is encoded in the label.
func Match(name string) (matched bool, amount *float64) {
	trimmed := strings.ToLower(strings.TrimSpace(name))
	if allowlist[trimmed] {
		return true, nil
	}
	if m := algoraRewardRe.FindStringSubmatch(strings.TrimSpace(name)); m != nil {
		var dollars int64
		for _, ch := range m[1] {
			dollars = dollars*10 + int64(ch-'0')
		}
		var cents int64
		if len(m) >= 3 && len(m[2]) == 3 {
			cents = int64(m[2][1]-'0')*10 + int64(m[2][2]-'0')
		}
		totalCents := dollars*100 + cents
		v := float64(totalCents) / 100.0
		return true, &v
	}
	return false, nil
}

// Detect parses a labels_json blob ([{"name":"..."},...]) and reports whether
// any label is a bounty label, returning the parsed amount when present
// (null otherwise). Malformed JSON never panics and yields no match.
func Detect(labelsJSON string) (isBounty bool, amount *float64) {
	if strings.TrimSpace(labelsJSON) == "" {
		return false, nil
	}
	var labels []labelRef
	if err := json.Unmarshal([]byte(labelsJSON), &labels); err != nil {
		// Tolerate plain-name arrays ["💰", "help wanted"] defensively.
		var names []string
		if err2 := json.Unmarshal([]byte(labelsJSON), &names); err2 != nil {
			return false, nil
		}
		for _, n := range names {
			if ok, amt := Match(n); ok {
				return true, amt
			}
		}
		return false, nil
	}
	for _, l := range labels {
		if ok, amt := Match(l.Name); ok {
			return true, amt
		}
	}
	return false, nil
}
