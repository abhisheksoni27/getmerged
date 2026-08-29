import { AuditReport } from "@/components/RepoAuditReport";

export function generateAuditHtml(r: AuditReport): string {
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const factorsRows = r.factors
    .map(
      (f) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #27272a; font-weight: 600; color: #f4f4f5;">
          ${f.label}
          <div style="font-size: 11px; color: #a1a1aa; font-family: monospace;">Raw: ${f.raw_value.toFixed(1)}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #27272a;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${
            f.impact_level === "Critical"
              ? "background: #450a0a; color: #fca5a5; border: 1px solid #991b1b;"
              : f.impact_level === "High"
              ? "background: #451a03; color: #fdba74; border: 1px solid #9a3412;"
              : "background: #18181b; color: #d4d4d8; border: 1px solid #3f3f46;"
          }">
            ${f.impact_level}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #27272a; color: #38bdf8; font-weight: 700; font-family: monospace;">
          ${f.peer_percentile.toFixed(0)}th percentile
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #27272a;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${
            f.status === "Bottleneck"
              ? "background: #450a0a; color: #f87171;"
              : f.status === "Needs Attention"
              ? "background: #451a03; color: #fbbf24;"
              : f.status === "Exceptional"
              ? "background: #022c22; color: #34d399;"
              : "background: #14532d; color: #86efac;"
          }">
            ${f.status}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #27272a; color: #4ade80; font-weight: 700; font-family: monospace;">
          ${f.simulated_uplift > 0 ? `+${f.simulated_uplift.toFixed(1)} pts` : " - "}
        </td>
      </tr>
    `
    )
    .join("");

  const fixesList = r.prioritized_fixes
    .map(
      (fix) => `
      <li style="margin-bottom: 12px; padding: 12px; background: #18181b; border: 1px solid #27272a; border-radius: 8px; list-style: none; display: flex; gap: 12px; align-items: flex-start;">
        <span style="background: #27272a; color: #fafafa; font-weight: 700; font-size: 11px; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">${fix.priority}</span>
        <div>
          ${fix.title ? `<div style="font-weight: 700; color: #818cf8; margin-bottom: 4px;">${fix.title}</div>` : ""}
          <div style="font-size: 13px; color: #e4e4e7; line-height: 1.5;">${fix.text || ""}</div>
        </div>
      </li>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deep-Audit Diagnostic Report: ${r.repo.full_name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #09090b;
      color: #f4f4f5;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .card {
      background: #121215;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    h1, h2, h3, h4 {
      margin-top: 0;
      color: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      padding: 10px 12px;
      border-bottom: 2px solid #3f3f46;
      color: #a1a1aa;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-box {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      font-family: monospace;
    }
    .metric-label {
      font-size: 12px;
      color: #a1a1aa;
      margin-top: 4px;
    }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 12px;
      color: #38bdf8;
      overflow-x: auto;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div>
        <span class="badge" style="background: #064e3b; color: #6ee7b7; border: 1px solid #059669; margin-bottom: 8px;">Verified Deep-Audit Report</span>
        <h1 style="font-size: 28px; margin: 4px 0 0 0;">${r.repo.full_name}</h1>
        <div style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Generated on ${generatedDate} · Powered by GetMerged</div>
      </div>
      <div style="text-align: right;">
        <div class="metric-value" style="font-size: 36px; color: #10b981;">${r.overall.score.toFixed(1)}</div>
        <div style="font-size: 12px; color: #a1a1aa; font-weight: 600;">C-Rank Score · Tier ${r.overall.tier}</div>
        ${r.overall.potential_uplift_pts ? `<div style="font-size: 12px; color: #4ade80; font-weight: 700; margin-top: 2px;">+${r.overall.potential_uplift_pts.toFixed(1)} pts simulated potential</div>` : ""}
      </div>
    </div>

    <!-- PR Drop-off Funnel -->
    ${
      r.pr_funnel
        ? `
    <div class="card">
      <h2 style="font-size: 18px; margin-bottom: 16px;">PR Acceptance & Drop-off Funnel</h2>
      <div class="grid">
        <div class="metric-box">
          <div class="metric-value">${r.pr_funnel.merge_rate.toFixed(1)}%</div>
          <div class="metric-label">Outside PR Merge Rate</div>
        </div>
        <div class="metric-box">
          <div class="metric-value" style="color: #f87171;">${r.pr_funnel.abandonment_rate.toFixed(1)}%</div>
          <div class="metric-label">PR Abandonment Rate</div>
        </div>
        <div class="metric-box">
          <div class="metric-value" style="color: #38bdf8;">${r.pr_funnel.first_timer_success_rate.toFixed(1)}%</div>
          <div class="metric-label">First-Timer Merge Rate</div>
        </div>
        <div class="metric-box">
          <div class="metric-value" style="color: #a78bfa;">${r.pr_funnel.repeat_contributor_rate.toFixed(1)}%</div>
          <div class="metric-label">Repeat Contributor Retention</div>
        </div>
      </div>
    </div>
    `
        : ""
    }

    <!-- Factor Diagnostics -->
    <div class="card">
      <h2 style="font-size: 18px; margin-bottom: 16px;">Ecosystem Benchmark & Health Diagnostics</h2>
      <table>
        <thead>
          <tr>
            <th>Factor</th>
            <th>Impact Level</th>
            <th>Cohort Percentile</th>
            <th>Health Status</th>
            <th>Simulated Uplift</th>
          </tr>
        </thead>
        <tbody>
          ${factorsRows}
        </tbody>
      </table>
    </div>

    <!-- Prioritized Fixes -->
    <div class="card">
      <h2 style="font-size: 18px; margin-bottom: 16px;">AI-Prioritized Remediation Punchlist</h2>
      <ul style="padding: 0; margin: 0;">
        ${fixesList}
      </ul>
    </div>

    <!-- Review Health & Templates -->
    ${
      r.actionable_templates
        ? `
    <div class="card">
      <h2 style="font-size: 18px; margin-bottom: 16px;">Tailored GitHub Configuration Patches</h2>
      <h3 style="font-size: 14px; color: #a1a1aa; margin-bottom: 8px;">Suggested .github/pull_request_template.md</h3>
      <pre><code>${escapeHtml(r.actionable_templates.pull_request_template)}</code></pre>

      <h3 style="font-size: 14px; color: #a1a1aa; margin-top: 16px; margin-bottom: 8px;">Suggested CONTRIBUTING.md Guidelines</h3>
      <pre><code>${escapeHtml(r.actionable_templates.contributing_guide)}</code></pre>
    </div>
    `
        : ""
    }

    <div style="text-align: center; color: #71717a; font-size: 12px; margin-top: 32px;">
      GetMerged Open Source Maintainer Intelligence · getmerged.abhishekco.de
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
