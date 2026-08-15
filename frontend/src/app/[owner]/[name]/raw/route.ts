import { NextRequest, NextResponse } from "next/server";
import { Repo } from "@/types/opendoor";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`
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
    const mergeRate = ((repo.external_pr_merge_rate || 0) * 100).toFixed(1);
    const firstTimerRate = ((repo.first_timer_success_rate || 0) * 100).toFixed(1);

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

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse(`Error generating report for ${fullName}`, { status: 500 });
  }
}
