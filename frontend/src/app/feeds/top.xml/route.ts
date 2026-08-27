import { atomResponse, buildAtomFeed, escapeXml, fetchFeedRepos, AtomEntry } from "@/lib/feeds";

export const dynamic = "force-dynamic";

// /feeds/top.xml - overall top-ranked repositories by C-Rank score.
export async function GET(): Promise<Response> {
  const repos = await fetchFeedRepos({});

  const entries: AtomEntry[] = repos.map((repo) => {
    const [owner, name] = repo.full_name.split("/");
    return {
      id: `https://getmerged.abhishekco.de/repos/${repo.id}`,
      title: `${repo.full_name} - C-Rank ${repo.c_rank_tier ?? "-"} (${Math.round(repo.c_rank_score ?? 0)})`,
      link: `https://getmerged.abhishekco.de/${owner}/${name}`,
      updated: repo.updated_at || new Date().toISOString(),
      contentHtml: `<p>${escapeXml(repo.description)}</p><p>Language: ${escapeXml(
        repo.language || "n/a"
      )} · Stars: ${repo.stars ?? 0} · External PR merge rate: ${
        repo.external_pr_merge_rate != null ? `${repo.external_pr_merge_rate.toFixed(0)}%` : "n/a"
      }${
        repo.good_first_issue_count ? ` · Good first issues: ${repo.good_first_issue_count}` : ""
      }</p>`,
    };
  });

  return atomResponse(
    buildAtomFeed({
      selfPath: "/feeds/top.xml",
      title: "GetMerged - Top-Ranked Open Source Repositories",
      entries,
    })
  );
}
