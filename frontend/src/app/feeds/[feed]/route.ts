import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { atomResponse, buildAtomFeed, escapeXml, fetchFeedRepos, AtomEntry } from "@/lib/feeds";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ feed: string }>;
}

// /feeds/[feed] serves per-language (e.g. /feeds/go.xml) and per-topic
// (e.g. /feeds/cli.xml) ranking feeds. Language resolution wins when a slug
// matches both a language and a GitHub topic.
export async function GET(_request: Request, { params }: RouteProps): Promise<Response> {
  const raw = (await params).feed.toLowerCase();
  if (!raw.endsWith(".xml")) {
    return new Response("Not Found", { status: 404 });
  }
  const slug = raw.slice(0, -4);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) {
    return new Response("Not Found", { status: 404 });
  }

  const languageName = displayNameFromSlug(slug);
  let kind: "language" | "topic" = "language";
  let filterLabel = languageName;
  let repos =
    languageName && canonicalizeSlug(slug) === slug
      ? await fetchFeedRepos({ language: languageName })
      : [];

  if (repos.length === 0) {
    kind = "topic";
    filterLabel = slug;
    repos = await fetchFeedRepos({ topic: slug });
  }
  if (repos.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  const entries: AtomEntry[] = repos.map((repo) => {
    const [owner, name] = repo.full_name.split("/");
    return {
      id: `https://getmerged.abhishekco.de/repos/${repo.id}`,
      title: `${repo.full_name} — C-Rank ${repo.c_rank_tier ?? "-"} (${Math.round(repo.c_rank_score ?? 0)})`,
      link: `https://getmerged.abhishekco.de/${owner}/${name}`,
      updated: repo.updated_at || new Date().toISOString(),
      contentHtml: `<p>${escapeXml(repo.description)}</p><p>${kind === "language" ? "Language" : "Topic"}: ${escapeXml(
        filterLabel
      )} · Stars: ${repo.stars ?? 0} · External PR merge rate: ${
        repo.external_pr_merge_rate != null ? `${repo.external_pr_merge_rate.toFixed(0)}%` : "n/a"
      }</p>`,
    };
  });

  return atomResponse(
    buildAtomFeed({
      selfPath: `/feeds/${slug}.xml`,
      title:
        kind === "language"
          ? `GetMerged — Top ${filterLabel} Repositories for Contributors`
          : `GetMerged — Top "${filterLabel}" Topic Repositories for Contributors`,
      entries,
    })
  );
}
