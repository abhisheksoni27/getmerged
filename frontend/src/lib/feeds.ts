import { API_BASE_URL } from "@/lib/api";
import { GoodFirstIssueItem, Repo } from "@/types/opendoor";

export const SITE_URL = "https://getmerged.abhishekco.de";

export interface AtomEntry {
  id: string;
  title: string;
  link: string;
  updated: string;
  contentHtml: string;
}

interface AtomFeedOptions {
  selfPath: string;
  title: string;
  entries: AtomEntry[];
}

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(value: string): string {
  return escapeXml(value);
}

export function buildAtomFeed({ selfPath, title, entries }: AtomFeedOptions): string {
  const updated =
    entries.reduce<string>((max, e) => (e.updated > max ? e.updated : max), "") ||
    new Date().toISOString();

  const entryXml = entries
    .map(
      (e) => `  <entry>
    <id>${escapeXml(e.id)}</id>
    <title>${escapeXml(e.title)}</title>
    <link rel="alternate" href="${escapeXml(e.link)}" />
    <updated>${escapeXml(new Date(e.updated).toISOString() || new Date().toISOString())}</updated>
    <content type="html">${escapeHtml(e.contentHtml)}</content>
  </entry>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <id>${escapeXml(`${SITE_URL}${selfPath}`)}</id>
  <link rel="self" href="${escapeXml(`${SITE_URL}${selfPath}`)}" />
  <link rel="alternate" href="${escapeXml(SITE_URL)}" />
  <updated>${escapeXml(updated)}</updated>
  <generator>GetMerged C-Rank Feeds</generator>
${entryXml}
</feed>`;
}

export function atomResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchFeedRepos(params: Record<string, string>): Promise<Repo[]> {
  const qs = new URLSearchParams({ sort: "c_rank_score", order: "desc", per_page: "30", ...params });
  const data = await fetchJson<{ data?: Repo[] }>(
    `${API_BASE_URL}/api/v1/repos?${qs.toString()}`,
    1800
  );
  return Array.isArray(data?.data) ? data.data : [];
}

interface RepoTrendResponse {
  trend?: { snapshot_date?: string; c_rank_score?: number }[];
}

export interface TrendingMover {
  repo: Repo;
  scoreDelta: number;
}

// Trending movers: recent C-Rank change over the last 14 days for the current
// top-ranked repositories, sourced from the existing per-repo trend API.
export async function fetchTrendingMovers(limit = 20): Promise<TrendingMover[]> {
  const repos = await fetchFeedRepos({ exclude_stale: "true", per_page: "50" });
  if (repos.length === 0) return [];

  const scored = await Promise.all(
    repos.map(async (repo): Promise<TrendingMover | null> => {
      const id = repo.id != null ? String(repo.id) : "";
      if (!id || id.includes("/")) return null;
      const data = await fetchJson<RepoTrendResponse>(
        `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}/trend?days=14`,
        21600
      );
      const trend = Array.isArray(data?.trend) ? data.trend : [];
      if (trend.length < 2) return null;
      const first = Number(trend[0]?.c_rank_score);
      const last = Number(trend[trend.length - 1]?.c_rank_score);
      if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
      return { repo, scoreDelta: last - first };
    })
  );

  return scored
    .filter((m): m is TrendingMover => m !== null && m.scoreDelta > 0)
    .sort((a, b) => b.scoreDelta - a.scoreDelta)
    .slice(0, limit);
}

export function parseSafeLabels(labelsJson: string): string[] {
  try {
    const parsed: unknown = JSON.parse(labelsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((l) =>
        typeof l === "string"
          ? l
          : l && typeof l === "object" && typeof (l as { name?: unknown }).name === "string"
            ? (l as { name: string }).name
            : ""
      )
      .filter((l) => l.length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function fetchGoodFirstIssues(language = "", limit = 50): Promise<GoodFirstIssueItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (language) qs.set("language", language);
  const data = await fetchJson<{ data?: GoodFirstIssueItem[] }>(
    `${API_BASE_URL}/api/v1/issues/good-first?${qs.toString()}`,
    1800
  );
  return Array.isArray(data?.data) ? data.data : [];
}

export function truncateText(value: string, max = 400): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
