package gemoji

import "testing"

func TestResolve(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", ""},
		{"no shortcode", "Browser extension", "Browser extension"},
		{"fire resolves", ":fire: great", "🔥 great"},
		{"tada resolves", "Ship it :tada:", "Ship it 🎉"},
		{"octocat skipped", ":octocat: Browser extension", ":octocat: Browser extension"},
		{"unknown kept", ":notarealemoji: x", ":notarealemoji: x"},
		{"mixed", ":fire: :octocat: go", "🔥 :octocat: go"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Resolve(c.in); got != c.want {
				t.Errorf("Resolve(%q) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}
