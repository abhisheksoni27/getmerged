import { atomResponse, buildAtomFeed, escapeXml, fetchTrendingMovers, AtomEntry } from "@/lib/feeds";

export const dynamic = "force-dynamic";

// /feeds/trending.xml - repositories with the largest C-Rank gains over the
// last 14 days ("trending movers"), sourced from the per-repo trend API.
export async function GET(): Promise<Response> {
  const movers = await fetchTrendingMovers(20);

  const entries: AtomEntry[] = movers.map(({ repo, scoreDelta }) => {
    const [owner, name] = repo.full_name.split("/");
    return {
      id: `https://getmerged.abhishekco.de/repos/${repo.id}`,
      title: `${repo.full_name} +${scoreDelta.toFixed(1)} C-Rank pts (14d)`,
      link: `https://getmerged.abhishekco.de/${owner}/${name}`,
      updated: repo.updated_at || new Date().toISOString(),
      contentHtml: `<p>${escapeXml(repo.description)}</p><p>C-Rank ${repo.c_rank_score?.toFixed(1)} (${escapeXml(
        repo.c_rank_tier ?? "-"
      )}) · ${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)} pts over last 14 days · Stars: ${repo.stars ?? 0}</p>`,
    };
  });

  return atomResponse(
    buildAtomFeed({
      selfPath: "/feeds/trending.xml",
      title: "GetMerged - Trending Repository Movers",
      entries,
    })
  );
}
