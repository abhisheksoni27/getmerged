package audit

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// ProbeOracle resolves implementation status across multiple codebase surfaces.
type ProbeOracle struct {
	repoRoot string
}

// NewProbeOracle creates a probe oracle bound to a repository root path.
func NewProbeOracle(repoRoot string) *ProbeOracle {
	return &ProbeOracle{
		repoRoot: repoRoot,
	}
}

// ProbeFrontendRoute verifies if a Next.js App Router route exists under frontend/src/app.
func (p *ProbeOracle) ProbeFrontendRoute(route string) ProbeResult {
	cleanRoute := strings.Trim(route, "/")
	if cleanRoute == "" {
		// Root homepage route
		targetFile := filepath.Join(p.repoRoot, "frontend", "src", "app", "page.tsx")
		if fileExists(targetFile) {
			return ProbeResult{
				Implemented: true,
				ProbeType:   ProbeFrontendRoute,
				Target:      "/",
				Evidence:    "frontend/src/app/page.tsx exists",
			}
		}
		return ProbeResult{
			Implemented: false,
			ProbeType:   ProbeFrontendRoute,
			Target:      "/",
			Evidence:    "frontend/src/app/page.tsx not found",
		}
	}

	segments := strings.Split(cleanRoute, "/")
	possiblePaths := generateCandidateAppPaths(segments)

	for _, cand := range possiblePaths {
		dirPath := filepath.Join(p.repoRoot, "frontend", "src", "app", cand)
		for _, file := range []string{"page.tsx", "page.jsx", "page.js", "route.ts", "route.js"} {
			fullPath := filepath.Join(dirPath, file)
			if fileExists(fullPath) {
				relPath, _ := filepath.Rel(p.repoRoot, fullPath)
				return ProbeResult{
					Implemented: true,
					ProbeType:   ProbeFrontendRoute,
					Target:      route,
					Evidence:    relPath + " exists",
					Details:     fmt.Sprintf("Matched route '%s' to '%s'", route, relPath),
				}
			}
		}
	}

	return ProbeResult{
		Implemented: false,
		ProbeType:   ProbeFrontendRoute,
		Target:      route,
		Evidence:    fmt.Sprintf("No page.tsx or route.ts found for '%s' under frontend/src/app", route),
	}
}

func generateCandidateAppPaths(segments []string) []string {
	var candidates []string

	// Direct match: e.g. ["topics", "[topic]"] -> "topics/[topic]"
	direct := filepath.Join(segments...)
	candidates = append(candidates, direct)

	// Compare route variations: /compare/[a]/[b] -> compare/[...slug]
	if len(segments) == 3 && segments[0] == "compare" {
		candidates = append(candidates, filepath.Join("compare", "[...slug]"))
		candidates = append(candidates, filepath.Join("compare", "[a]", "[b]"))
		candidates = append(candidates, filepath.Join("compare", "[slug]"))
	}

	// Dynamic username / owner variations: /u/[username] -> [owner] or u/[username]
	if len(segments) == 2 && segments[0] == "u" {
		candidates = append(candidates, filepath.Join("u", "[username]"))
		candidates = append(candidates, "[owner]")
	}

	// Repo detail variations: /repo/[owner]/[name] -> repo/[owner]/[name] or [owner]/[name]
	if len(segments) == 3 && segments[0] == "repo" {
		candidates = append(candidates, filepath.Join("[owner]", "[name]"))
	}

	return candidates
}

// ProbeBackendRoute scans backend code for registered router endpoints.
func (p *ProbeOracle) ProbeBackendRoute(method, path string) ProbeResult {
	backendDir := filepath.Join(p.repoRoot, "backend")
	mainGoPath := filepath.Join(backendDir, "cmd", "server", "main.go")

	contentBytes, err := os.ReadFile(mainGoPath)
	if err != nil {
		// Fallback: search all Go files in backend
		return p.scanBackendDirForRoute(method, path)
	}

	content := string(contentBytes)
	if matchRouteInCode(content, method, path) {
		return ProbeResult{
			Implemented: true,
			ProbeType:   ProbeBackendRoute,
			Target:      method + " " + path,
			Evidence:    "backend/cmd/server/main.go registers endpoint",
			Details:     fmt.Sprintf("Route %s %s registered in router", method, path),
		}
	}

	return p.scanBackendDirForRoute(method, path)
}

func (p *ProbeOracle) scanBackendDirForRoute(method, path string) ProbeResult {
	backendDir := filepath.Join(p.repoRoot, "backend")
	found := false
	var foundFile string

	_ = filepath.Walk(backendDir, func(fp string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(fp, ".go") {
			return nil
		}
		// Ignore the audit package itself to prevent probe recursion/false matches
		if strings.Contains(fp, filepath.Join("internal", "audit")) || strings.Contains(fp, filepath.Join("cmd", "nextsteps_audit")) {
			return nil
		}
		b, rerr := os.ReadFile(fp)
		if rerr == nil && matchRouteInCode(string(b), method, path) {
			found = true
			foundFile, _ = filepath.Rel(p.repoRoot, fp)
			return filepath.SkipAll
		}
		return nil
	})

	if found {
		return ProbeResult{
			Implemented: true,
			ProbeType:   ProbeBackendRoute,
			Target:      method + " " + path,
			Evidence:    foundFile + " matches route definition",
		}
	}

	return ProbeResult{
		Implemented: false,
		ProbeType:   ProbeBackendRoute,
		Target:      method + " " + path,
		Evidence:    fmt.Sprintf("Route %s %s not found in backend router registrations", method, path),
	}
}

func matchRouteInCode(code, method, fullPath string) bool {
	cleanPath := fullPath
	prefix := ""
	if strings.HasPrefix(cleanPath, "/api/v1") {
		cleanPath = strings.TrimPrefix(cleanPath, "/api/v1")
		prefix = "/api/v1"
	} else if strings.HasPrefix(cleanPath, "/internal") {
		cleanPath = strings.TrimPrefix(cleanPath, "/internal")
		prefix = "/internal"
	}

	// Exact pattern match in code
	exactPatterns := []string{
		fmt.Sprintf(`"%s"`, fullPath),
		fmt.Sprintf(`"%s"`, cleanPath),
	}

	for _, pat := range exactPatterns {
		if strings.Contains(code, pat) {
			if method == "" || strings.Contains(strings.ToUpper(code), strings.ToUpper(method)) {
				return true
			}
		}
	}

	// Regex for gin group route e.g. api.GET("/repos/:id/pr-likelihood"
	normalizedRelPath := regexp.QuoteMeta(cleanPath)
	re := regexp.MustCompile(`\.(?:GET|POST|PUT|DELETE|PATCH)\(\s*"` + normalizedRelPath + `"`)
	if re.MatchString(code) {
		return true
	}

	if prefix != "" {
		normalizedFullPath := regexp.QuoteMeta(fullPath)
		reFull := regexp.MustCompile(`\.(?:GET|POST|PUT|DELETE|PATCH)\(\s*"` + normalizedFullPath + `"`)
		if reFull.MatchString(code) {
			return true
		}
	}

	// Nested sub-group handling (e.g., api.Group("/auth") -> authGroup.GET("/github"))
	parts := strings.Split(strings.Trim(cleanPath, "/"), "/")
	if len(parts) >= 2 {
		groupPath := "/" + parts[0]
		subPath := "/" + strings.Join(parts[1:], "/")
		if strings.Contains(code, fmt.Sprintf(`Group("%s")`, groupPath)) || strings.Contains(code, fmt.Sprintf(`Group("%s"`, groupPath)) {
			reSub := regexp.MustCompile(`\.(?:GET|POST|PUT|DELETE|PATCH)\(\s*"` + regexp.QuoteMeta(subPath) + `"`)
			if reSub.MatchString(code) {
				return true
			}
		}
	}

	return false
}

// ProbeDBSchema verifies if a table or column exists in backend/internal/db/db.go or schema migrations.
func (p *ProbeOracle) ProbeDBSchema(table, column string) ProbeResult {
	dbGoPath := filepath.Join(p.repoRoot, "backend", "internal", "db", "db.go")
	contentBytes, err := os.ReadFile(dbGoPath)
	if err != nil {
		return ProbeResult{
			Implemented: false,
			ProbeType:   ProbeDBSchema,
			Target:      table + "." + column,
			Evidence:    "backend/internal/db/db.go not found",
		}
	}

	content := string(contentBytes)
	tablePattern := regexp.MustCompile(`(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?` + regexp.QuoteMeta(table) + `\s*\(([^;]+)\)`)
	matches := tablePattern.FindStringSubmatch(content)

	if len(matches) > 1 {
		tableBody := matches[1]
		if column == "" {
			return ProbeResult{
				Implemented: true,
				ProbeType:   ProbeDBSchema,
				Target:      table,
				Evidence:    fmt.Sprintf("Table %s defined in backend/internal/db/db.go", table),
			}
		}

		colPattern := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(column) + `\b`)
		if colPattern.MatchString(tableBody) {
			return ProbeResult{
				Implemented: true,
				ProbeType:   ProbeDBSchema,
				Target:      table + "." + column,
				Evidence:    fmt.Sprintf("Column %s.%s defined in backend/internal/db/db.go", table, column),
			}
		}

		// Also check ALTER TABLE / AddColumn in db.go or migrations
		alterPattern := regexp.MustCompile(`(?i)ALTER\s+TABLE\s+` + regexp.QuoteMeta(table) + `\s+ADD\s+(?:COLUMN\s+)?` + regexp.QuoteMeta(column))
		if alterPattern.MatchString(content) {
			return ProbeResult{
				Implemented: true,
				ProbeType:   ProbeDBSchema,
				Target:      table + "." + column,
				Evidence:    fmt.Sprintf("Column %s.%s altered in backend/internal/db/db.go", table, column),
			}
		}

		return ProbeResult{
			Implemented: false,
			ProbeType:   ProbeDBSchema,
			Target:      table + "." + column,
			Evidence:    fmt.Sprintf("Column '%s' not found in table '%s' schema", column, table),
		}
	}

	if column == "" {
		return ProbeResult{
			Implemented: false,
			ProbeType:   ProbeDBSchema,
			Target:      table,
			Evidence:    fmt.Sprintf("Table '%s' not found in db.go", table),
		}
	}

	return ProbeResult{
		Implemented: false,
		ProbeType:   ProbeDBSchema,
		Target:      table + "." + column,
		Evidence:    fmt.Sprintf("Table '%s' not found in db.go", table),
	}
}

// ProbeFileExists checks if a file or directory exists relative to repository root.
func (p *ProbeOracle) ProbeFileExists(relPath string) ProbeResult {
	fullPath := filepath.Join(p.repoRoot, relPath)
	if fileExists(fullPath) {
		return ProbeResult{
			Implemented: true,
			ProbeType:   ProbeFileExists,
			Target:      relPath,
			Evidence:    relPath + " exists on disk",
		}
	}
	return ProbeResult{
		Implemented: false,
		ProbeType:   ProbeFileExists,
		Target:      relPath,
		Evidence:    relPath + " does not exist",
	}
}

// ExecuteProbe resolves a ProbeSpec against the repository.
func (p *ProbeOracle) ExecuteProbe(spec ProbeSpec) ProbeResult {
	switch spec.Type {
	case ProbeFrontendRoute:
		return p.ProbeFrontendRoute(spec.FrontendRoute)
	case ProbeBackendRoute:
		return p.ProbeBackendRoute(spec.BackendMethod, spec.BackendPath)
	case ProbeDBSchema:
		return p.ProbeDBSchema(spec.DBTable, spec.DBColumn)
	case ProbeFileExists:
		return p.ProbeFileExists(spec.FilePath)
	case ProbeStaticCheck:
		return ProbeResult{
			Implemented: spec.StaticStatus == StatusImplemented,
			ProbeType:   ProbeStaticCheck,
			Target:      "static",
			Evidence:    spec.StaticEvidence,
		}
	case ProbeCategorized:
		return ProbeResult{
			Implemented: spec.StaticStatus == StatusImplemented,
			ProbeType:   ProbeCategorized,
			Target:      "categorized",
			Evidence:    spec.StaticEvidence,
		}
	default:
		return ProbeResult{
			Implemented: false,
			ProbeType:   "unknown",
			Target:      "unknown",
			Evidence:    "Unrecognized probe specification",
		}
	}
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir() || true
}
