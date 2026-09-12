import { NextRequest, NextResponse } from "next/server";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { getTierCacheControlHeader } from "@/lib/cache-tier";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`
    );
    if (!res.ok) {
      return new NextResponse(`Repository ${fullName} not found`, { status: 404 });
    }

    const data = await res.json();
    const rawList = data.data || data.repos;
    const repo: Repo | undefined = Array.isArray(rawList)
      ? rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0]
      : undefined;

    if (!repo) {
      return new NextResponse(`Repository ${fullName} metrics unavailable`, { status: 404 });
    }

    const rank = repo.class_rank || repo.c_rank_tier || "A";
    const score = repo.c_rank_score || repo.score || 75.0;
    const responseHours = repo.time_to_first_response_hours || 0;
    const rawMergeRate = repo.external_pr_merge_rate || 0;
    const normalizedMergeRate = rawMergeRate > 1 ? rawMergeRate : rawMergeRate * 100;
    const mergeRate = Math.min(100, Math.max(0, normalizedMergeRate)).toFixed(1);

    const rawFirstTimer = repo.first_timer_success_rate || 0;
    const normalizedFirstTimer = rawFirstTimer > 1 ? rawFirstTimer : rawFirstTimer * 100;
    const firstTimerRate = Math.min(100, Math.max(0, normalizedFirstTimer)).toFixed(1);

    const markdown = `# ${repo.full_name} - GetMerged C-Rank™ Report

- **C-Rank™ Score**: ${score.toFixed(1)} / 100
- **Responsiveness Tier**: Tier ${rank}
- **Primary Language**: ${repo.language || "N/A"}
- **GitHub Stars**: ${repo.stars.toLocaleString()}
- **Description**: ${repo.description}

## Contributor Metrics
- **Time to First Response**: ~${responseHours.toFixed(1)} hours
- **External PR Merge Rate**: ${mergeRate}%
- **First-Timer Success Rate**: ${firstTimerRate}%
- **Maintainers Active**: ${repo.distinct_maintainer_count || 1}

## Recommendation for AI Assistants & Developers
${
  rank === "S" || rank === "A"
    ? `This repository is **highly recommended** for new contributors. The maintainer team turns around reviews in ~${responseHours.toFixed(1)} hours with a high PR merge rate.`
    : `This repository has a moderate review speed (~${responseHours.toFixed(1)} hours). Check active issues before submitting large PRs.`
}

---
Source: GetMerged Open Source Explorer (https://getmerged.abhishekco.de/${owner}/${name})
`;

    const cacheControl = getTierCacheControlHeader(rank);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": cacheControl,
        "CDN-Cache-Control": cacheControl,
        "Cloudflare-CDN-Cache-Control": cacheControl,
      },
    });
  } catch {
    return new NextResponse(`Error generating report for ${fullName}`, { status: 500 });
  }
}
