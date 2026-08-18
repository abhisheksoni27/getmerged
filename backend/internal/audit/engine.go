package audit

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// AuditEngine coordinates census parsing, probe evaluation, and reporting.
type AuditEngine struct {
	repoRoot string
	census   *Census
	oracle   *ProbeOracle
	mappings map[string]ItemMapping
}

// NewAuditEngine creates a new AuditEngine.
func NewAuditEngine(repoRoot string, census *Census) *AuditEngine {
	return &AuditEngine{
		repoRoot: repoRoot,
		census:   census,
		oracle:   NewProbeOracle(repoRoot),
		mappings: DefaultMappings(),
	}
}

// SetCustomMappings overrides the mapping table (used in tests).
func (e *AuditEngine) SetCustomMappings(mappings map[string]ItemMapping) {
	e.mappings = mappings
}

// GetUnmappedItems returns all extracted census items that do not have a defined mapping.
func (e *AuditEngine) GetUnmappedItems() []CensusItem {
	var unmapped []CensusItem
	for _, item := range e.census.Items {
		if _, ok := FindMapping(e.mappings, item.Key); !ok {
			unmapped = append(unmapped, item)
		}
	}
	return unmapped
}

// RunAudit evaluates the entire document census against codebase surfaces.
func (e *AuditEngine) RunAudit() (*AuditReport, error) {
	unmappedItems := e.GetUnmappedItems()

	var itemReports []ItemReport
	implementedCount := 0
	pendingCount := 0

	for _, item := range e.census.Items {
		mapping, found := FindMapping(e.mappings, item.Key)
		if !found {
			itemReports = append(itemReports, ItemReport{
				Section:    item.Section,
				Key:        item.Key,
				AuditKey:   "unmapped-" + item.Key,
				Title:      item.Title,
				Status:     StatusUnmapped,
				ProbeType:  "none",
				Target:     "none",
				Evidence:   "No probe or category mapping found in audit census dictionary",
				LineNumber: item.LineNumber,
			})
			continue
		}

		result := e.oracle.ExecuteProbe(mapping.Probe)
		status := StatusPending
		if result.Implemented {
			status = StatusImplemented
			implementedCount++
		} else {
			pendingCount++
		}

		itemReports = append(itemReports, ItemReport{
			Section:    mapping.Section,
			Key:        item.Key,
			AuditKey:   mapping.AuditKey,
			Title:      mapping.Title,
			Status:     status,
			ProbeType:  result.ProbeType,
			Target:     result.Target,
			Evidence:   result.Evidence,
			Details:    result.Details,
			LineNumber: item.LineNumber,
		})
	}

	report := &AuditReport{
		AuditTimestamp:   time.Now().UTC(),
		TotalItemsCensus: len(e.census.Items),
		MappedItems:      len(e.census.Items) - len(unmappedItems),
		UnmappedCount:    len(unmappedItems),
		ImplementedCount: implementedCount,
		PendingCount:     pendingCount,
		UnmappedItems:    unmappedItems,
		Items:            itemReports,
	}

	return report, nil
}

// GetPendingItemsToCreate filters pending items and excludes those already filed.
func (e *AuditEngine) GetPendingItemsToCreate(report *AuditReport, dedup *IssueDeduplicator) []ItemReport {
	var toCreate []ItemReport
	for _, item := range report.Items {
		if item.Status == StatusPending {
			if dedup != nil && dedup.IsDuplicate(item.AuditKey) {
				continue
			}
			toCreate = append(toCreate, item)
		}
	}
	return toCreate
}

// WriteReportJSON serializes an audit report to a file.
func WriteReportJSON(report *AuditReport, outputPath string) error {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal audit report: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write audit report to %s: %w", outputPath, err)
	}

	return nil
}
