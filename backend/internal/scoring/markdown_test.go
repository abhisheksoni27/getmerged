package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestStripMarkdownAndTruncate(t *testing.T) {
	t.Run("strips markdown elements cleanly", func(t *testing.T) {
		input := "### Title\nThis is **bold** and [link](https://example.com). ```go\nfmt.Println()\n``` `code`."
		output := scoring.StripMarkdownAndTruncate(input, 100)

		if output != "Title This is bold and link. code." {
			t.Errorf("unexpected stripped output: %q", output)
		}
	})

	t.Run("truncates to maxLen with ellipsis", func(t *testing.T) {
		input := "A very long sentence that exceeds the character limit specified by caller."
		output := scoring.StripMarkdownAndTruncate(input, 20)

		if len([]rune(output)) > 23 {
			t.Errorf("output exceeded maxLen: %q", output)
		}
		if output != "A very long sentence..." {
			t.Errorf("unexpected output: %q", output)
		}
	})
}
