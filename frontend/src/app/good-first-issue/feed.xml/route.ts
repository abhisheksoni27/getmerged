import { SITE_URL, atomResponse, buildAtomFeed, escapeXml, fetchGoodFirstIssues, parseSafeLabels, truncateText, AtomEntry } from "@/lib/feeds";

export const dynamic = "force-dynamic";

function issueContent(issue: {
  body_text?: string;
  repo_full_name: string;
  stars: number;
  c_rank_score?: number;
  c_rank_tier: string;
  language: string;
  labels_json: string;
}): string {
  const score = Number(issue.c_rank_score);
  const labels = parseSafeLabels(issue.labels_json);
  const meta = [
    `Repository: ${escapeXml(issue.repo_full_name)}`,
    `${issue.stars ?? 0} ★`,
    `C-Rank ${Number.isFinite(score) ? score.toFixed(1) : "?"} ${escapeXml(issue.c_rank_tier ?? "")}`.trim(),
    ...(issue.language ? [escapeXml(issue.language)] : []),
  ].join(" · ");
  const labelsHtml = labels.length > 0 ? `<p>Labels: ${labels.map(escapeXml).join(", ")}</p>` : "";
  return `<p>${truncateText(issue.body_text ?? "", 500)}</p><p>${meta}</p>${labelsHtml}`;
}

// /good-first-issue/feed.xml — latest beginner-friendly issues across all
// languages, ranked by issue quality and repository C-Rank.
export async function GET(): Promise<Response> {
  const issues = await fetchGoodFirstIssues("", 50);

  const entries: AtomEntry[] = issues.map((issue) => ({
    id: issue.url || `${SITE_URL}/good-first-issue/${issue.repository_id}/${issue.issue_number}`,
    title: `${issue.repo_full_name}: ${truncateText(issue.title, 120)}`,
    link: issue.url || `${SITE_URL}/good-first-issue`,
    updated: issue.created_at,
    contentHtml: issueContent(issue),
  }));

  return atomResponse(
    buildAtomFeed({
      selfPath: "/good-first-issue/feed.xml",
      title: "GetMerged — Good First Issues",
      entries,
    })
  );
}
