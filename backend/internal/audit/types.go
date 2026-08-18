package audit

import "time"

// ProbeType identifies what subsystem is probed.
type ProbeType string

const (
	ProbeFrontendRoute ProbeType = "frontend_route"
	ProbeBackendRoute  ProbeType = "backend_route"
	ProbeDBSchema      ProbeType = "db_schema"
	ProbeFileExists    ProbeType = "file_exists"
	ProbeStaticCheck   ProbeType = "static_check"
	ProbeCategorized   ProbeType = "categorized"
)

// ItemStatus represents the implementation state of a roadmap item.
type ItemStatus string

const (
	StatusImplemented ItemStatus = "implemented"
	StatusPending     ItemStatus = "pending"
	StatusUnmapped    ItemStatus = "unmapped"
)

// CensusItem represents a single extracted deliverable or item from OPENDOOR_NEXT_STEPS.md.
type CensusItem struct {
	Section    string `json:"section"`
	Key        string `json:"key"`
	Title      string `json:"title"`
	RawContent string `json:"raw_content"`
	LineNumber int    `json:"line_number"`
	ItemType   string `json:"item_type"` // story, checklist, table_row, bullet
}

// Census holds all extracted roadmap items.
type Census struct {
	Items []CensusItem `json:"items"`
}

// ProbeResult captures the outcome of a probe oracle evaluation.
type ProbeResult struct {
	Implemented bool      `json:"implemented"`
	ProbeType   ProbeType `json:"probe_type"`
	Target      string    `json:"target"`
	Evidence    string    `json:"evidence"`
	Details     string    `json:"details"`
}

// ProbeSpec defines how a mapped item should be verified.
type ProbeSpec struct {
	Type           ProbeType  `json:"type"`
	FrontendRoute  string     `json:"frontend_route,omitempty"`
	BackendMethod  string     `json:"backend_method,omitempty"`
	BackendPath    string     `json:"backend_path,omitempty"`
	DBTable        string     `json:"db_table,omitempty"`
	DBColumn       string     `json:"db_column,omitempty"`
	FilePath       string     `json:"file_path,omitempty"`
	StaticStatus   ItemStatus `json:"static_status,omitempty"`
	StaticEvidence string     `json:"static_evidence,omitempty"`
}

// ItemMapping maps a canonical census key to an audit probe and description.
type ItemMapping struct {
	CanonicalKey string    `json:"canonical_key"`
	AuditKey     string    `json:"audit_key"`
	Section      string    `json:"section"`
	Title        string    `json:"title"`
	Probe        ProbeSpec `json:"probe"`
}

// GitHubIssue models a GitHub issue representation for deduplication and filing.
type GitHubIssue struct {
	Number int    `json:"number"`
	Title  string `json:"title"`
	Body   string `json:"body"`
	State  string `json:"state"` // open or closed
}

// ItemReport represents an individual audited roadmap item in the final report.
type ItemReport struct {
	Section    string     `json:"section"`
	Key        string     `json:"key"`
	AuditKey   string     `json:"audit_key"`
	Title      string     `json:"title"`
	Status     ItemStatus `json:"status"`
	ProbeType  ProbeType  `json:"probe_type"`
	Target     string     `json:"target"`
	Evidence   string     `json:"evidence"`
	Details    string     `json:"details"`
	LineNumber int        `json:"line_number"`
}

// AuditReport is the structured JSON output written to report.json.
type AuditReport struct {
	AuditTimestamp   time.Time    `json:"audit_timestamp"`
	TotalItemsCensus int          `json:"total_items_census"`
	MappedItems      int          `json:"mapped_items"`
	UnmappedCount    int          `json:"unmapped_count"`
	ImplementedCount int          `json:"implemented_count"`
	PendingCount     int          `json:"pending_count"`
	UnmappedItems    []CensusItem `json:"unmapped_items,omitempty"`
	Items            []ItemReport `json:"items"`
}
