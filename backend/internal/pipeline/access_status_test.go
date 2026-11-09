package pipeline

import (
	"testing"
)

func TestDetectAccessStatus(t *testing.T) {
	tests := []struct {
		name           string
		content        string
		expectedStatus AccessStatus
	}{
		{
			name:           "Empty content defaults to open",
			content:        "",
			expectedStatus: AccessStatusOpen,
		},
		{
			name:           "Standard friendly open source",
			content:        "We welcome all contributions! Fork the repository and open a pull request against main.",
			expectedStatus: AccessStatusOpen,
		},
		{
			name:           "Ghostty vouch required pattern",
			content:        "Contributing to Ghostty: Before opening your first PR, you must request a vouch in our Discord community.",
			expectedStatus: AccessStatusVouchRequired,
		},
		{
			name:           "Prior approval required pattern",
			content:        "Please note: PRs without an approved issue will be closed automatically.",
			expectedStatus: AccessStatusVouchRequired,
		},
		{
			name:           "tldraw style auto-close external PRs",
			content:        "Notice: External PRs will be automatically closed. We are currently not accepting external pull requests while we rewrite the core engine.",
			expectedStatus: AccessStatusClosed,
		},
		{
			name:           "Closed to community PRs",
			content:        "At this time, we do not accept unsolicited pull requests from community members.",
			expectedStatus: AccessStatusClosed,
		},
		{
			name:           "Collaborator only contributions",
			content:        "Contributions are restricted to collaborators and core team members.",
			expectedStatus: AccessStatusCollaboratorOnly,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := DetectAccessStatus(tt.content)
			if res.Status != tt.expectedStatus {
				t.Fatalf("expected status %s, got %s (reason: %s)", tt.expectedStatus, res.Status, res.Reason)
			}
			if res.Reason == "" {
				t.Fatalf("expected non-empty reason for status %s", res.Status)
			}
		})
	}
}
