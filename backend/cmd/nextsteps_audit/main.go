package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/audit"
)

func main() {
	var (
		docPath      string
		repoRoot     string
		outputPath   string
		dryRun       bool
		createIssues bool
		strict       bool
	)

	flag.StringVar(&docPath, "doc", "", "Path to OPENDOOR_NEXT_STEPS.md")
	flag.StringVar(&repoRoot, "repo-root", ".", "Repository root directory")
	flag.StringVar(&outputPath, "output", "report.json", "Path to output report.json")
	flag.BoolVar(&dryRun, "dry-run", true, "Execute in dry-run mode without creating GitHub issues")
	flag.BoolVar(&createIssues, "create-issues", false, "Explicit opt-in gate to create GitHub issues for pending items")
	flag.BoolVar(&strict, "strict", true, "Hard fail with non-zero exit code if any census item is unmapped")

	flag.Parse()

	// Locate document path if not explicitly provided
	if docPath == "" {
		candidates := []string{
			filepath.Join(repoRoot, "OPENDOOR_NEXT_STEPS.md"),
			"OPENDOOR_NEXT_STEPS.md",
			"../OPENDOOR_NEXT_STEPS.md",
			"../../OPENDOOR_NEXT_STEPS.md",
		}
		for _, cand := range candidates {
			if _, err := os.Stat(cand); err == nil {
				docPath = cand
				break
			}
		}
	}

	if docPath == "" {
		fmt.Fprintf(os.Stderr, "Error: could not locate OPENDOOR_NEXT_STEPS.md. Use --doc flag.\n")
		os.Exit(1)
	}

	contentBytes, err := os.ReadFile(docPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading markdown document %s: %v\n", docPath, err)
		os.Exit(1)
	}

	census, err := audit.ParseCensus(string(contentBytes))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing markdown document census: %v\n", err)
		os.Exit(1)
	}

	engine := audit.NewAuditEngine(repoRoot, census)
	unmapped := engine.GetUnmappedItems()

	if strict && len(unmapped) > 0 {
		fmt.Fprintf(os.Stderr, "\n[FATAL AUDIT FAILURE] Full Document Census Hard-Fail: %d unmapped items found!\n", len(unmapped))
		for _, u := range unmapped {
			fmt.Fprintf(os.Stderr, "  - [%s] (line %d) Key: %s | Title: %s\n", u.Section, u.LineNumber, u.Key, u.Title)
		}
		os.Exit(2)
	}

	report, err := engine.RunAudit()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error running audit: %v\n", err)
		os.Exit(1)
	}

	if err := audit.WriteReportJSON(report, outputPath); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing report to %s: %v\n", outputPath, err)
		os.Exit(1)
	}

	// Retrieve GitHub issues for deduplication
	existingIssues, fetchErr := audit.FetchGitHubIssues(repoRoot)
	if fetchErr != nil {
		fmt.Printf("Note: Could not query GitHub issues via 'gh' (%v). Using empty deduplication index.\n", fetchErr)
		existingIssues = nil
	}
	dedup := audit.NewIssueDeduplicator(existingIssues)

	pendingItems := engine.GetPendingItemsToCreate(report, dedup)

	// Console Summary
	fmt.Printf("\n=======================================================\n")
	fmt.Printf("        OPENDOOR / GETMERGED NEXT-STEPS AUDIT          \n")
	fmt.Printf("=======================================================\n")
	fmt.Printf("Document:           %s\n", docPath)
	fmt.Printf("Repository Root:    %s\n", repoRoot)
	fmt.Printf("Total Census Items: %d (100%% mapped)\n", report.TotalItemsCensus)
	fmt.Printf("Implemented Items:  %d\n", report.ImplementedCount)
	fmt.Printf("Pending Items:      %d\n", report.PendingCount)
	fmt.Printf("Report File:        %s\n", outputPath)
	fmt.Printf("Mode:               Dry-Run=%v, Create-Issues=%v\n", dryRun, createIssues)
	fmt.Printf("-------------------------------------------------------\n")

	if len(pendingItems) > 0 {
		fmt.Printf("Pending Roadmap Items (%d to be filed):\n", len(pendingItems))
		for _, p := range pendingItems {
			fmt.Printf("  • [%s] %s\n", p.AuditKey, p.Title)
			fmt.Printf("      Section:  %s\n", p.Section)
			fmt.Printf("      Probe:    %s (%s)\n", p.ProbeType, p.Target)
			fmt.Printf("      Evidence: %s\n", p.Evidence)
		}
	} else {
		fmt.Printf("All pending items already filed or zero pending items.\n")
	}
	fmt.Printf("-------------------------------------------------------\n")

	// Filing Gate: Only create issues when explicitly enabled and NOT in dry-run mode
	if audit.ShouldCreateIssues(createIssues, dryRun) {
		fmt.Printf("\n[FILING ISSUES TO GITHUB]\n")
		for _, item := range pendingItems {
			tag := audit.FormatAuditKey(item.AuditKey)
			title := fmt.Sprintf("Roadmap Pending: %s %s", item.Title, tag)
			body := fmt.Sprintf("### Specification Deliverable Pending Implementation\n\n**Section:** %s\n**Canonical Key:** `%s`\n**Audit Key:** `%s`\n**Probe Type:** `%s`\n**Probe Target:** `%s`\n\n#### Probe Evidence\n%s\n\n---\n*Automated roadmap validation audit from `OPENDOOR_NEXT_STEPS.md` via `backend/cmd/nextsteps_audit`*", item.Section, item.Key, item.AuditKey, item.ProbeType, item.Target, item.Evidence)

			cmd := exec.Command("gh", "issue", "create", "--title", title, "--body", body)
			cmd.Dir = repoRoot
			out, err := cmd.CombinedOutput()
			if err != nil {
				fmt.Fprintf(os.Stderr, "Failed to create issue for %s: %v\nOutput: %s\n", item.AuditKey, err, string(out))
			} else {
				fmt.Printf("Successfully created issue: %s\n", strings.TrimSpace(string(out)))
			}
		}
	} else {
		fmt.Printf("\n[SAFE MODE] Issue creation skipped (Default --dry-run=true). Gated by --create-issues --dry-run=false.\n\n")
	}
}
