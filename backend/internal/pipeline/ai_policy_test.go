package pipeline

import (
	"testing"
)

func TestDetectAIPolicy(t *testing.T) {
	tests := []struct {
		name           string
		content        string
		expectedPolicy AIPolicy
	}{
		{
			name:           "Empty content yields unspecified",
			content:        "",
			expectedPolicy: AIPolicyUnspecified,
		},
		{
			name:           "Generic guide yields unspecified",
			content:        "Welcome to the project! Please make sure all tests pass before opening a PR.",
			expectedPolicy: AIPolicyUnspecified,
		},
		{
			name:           "QEMU/Rust style strict AI ban",
			content:        "Notice: No AI contributions or LLM generated code are permitted in this project.",
			expectedPolicy: AIPolicyProhibited,
		},
		{
			name:           "Strict prohibition phrasing",
			content:        "We strictly prohibit the use of generative AI or ChatGPT for contributions to this repository.",
			expectedPolicy: AIPolicyProhibited,
		},
		{
			name:           "Ghostty style mandatory disclosure",
			content:        "You must disclose any AI or Copilot use in your pull request description with complete prompts.",
			expectedPolicy: AIPolicyDisclosureRequired,
		},
		{
			name:           "Assisted disclosure phrasing",
			content:        "AI-assisted contributions require prior disclosure before review commences.",
			expectedPolicy: AIPolicyDisclosureRequired,
		},
		{
			name:           "Explicitly permitted AI tools",
			content:        "AI-assisted code is welcomed! Feel free to use Copilot or LLMs to help write tests.",
			expectedPolicy: AIPolicyAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := DetectAIPolicy(tt.content)
			if res.Policy != tt.expectedPolicy {
				t.Fatalf("expected policy %s, got %s (reason: %s)", tt.expectedPolicy, res.Policy, res.Reason)
			}
			if res.Reason == "" {
				t.Fatalf("expected non-empty reason for policy %s", res.Policy)
			}
		})
	}
}
