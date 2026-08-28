import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, ArrowLeft, Star, GitPullRequest, Clock, Flame, Users } from "lucide-react";

interface ContributorEntry {
  rank: number;
  login: string;
  level: number;
  streak_weeks: number;
  season_xp: number;
  total_xp: number;
}

interface ContributorBoard {
  season: string;
  entries: ContributorEntry[];
}

async function getContributorLeaderboard(): Promise<ContributorBoard> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/contributor-leaderboard?limit=25`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return { season: "", entries: [] };
    const data = await res.json();
    return { season: typeof data?.season === "string" ? data.season : "", entries: Array.isArray(data?.entries) ? data.entries : [] };
  } catch (e) {
    console.error("Failed to fetch contributor leaderboard:", e);
    return { season: "", entries: [] };
  }
}

export const metadata: Metadata = {
  title: "Open Source Welcoming Leaderboard (C-Rank™) - GetMerged",
  description: "Comprehensive leaderboard of top open-source GitHub repositories ranked by contributor-friendliness, PR merge speed, and maintainer responsiveness.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/leaderboard",
  },
  openGraph: {
    title: "Open Source Welcoming Leaderboard - GetMerged",
    description: "Ranked list of all open-source repositories based on C-Rank™ metrics.",
    url: "https://getmerged.abhishekco.de/leaderboard",
    siteName: "GetMerged",
  },
};

async function getLeaderboardRepos(): Promise<Repo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?sort=c_rank_score&order=desc&per_page=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (e) {
    console.error("Failed to fetch leaderboard repos:", e);
    return [];
  }
}

export default async function LeaderboardPage() {
  const [repos, contributors] = await Promise.all([getLeaderboardRepos(), getContributorLeaderboard()]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open Source Welcoming Leaderboard (C-Rank™)",
    description: "Ranked list of all open-source repositories based on C-Rank™ metrics.",
    itemListElement: repos.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.full_name,
      item: {
        "@type": "SoftwareSourceCode",
        name: r.full_name,
        url: `https://getmerged.abhishekco.de/${r.full_name}`,
        programmingLanguage: r.language || "Other",
        codeRepository: r.github_url || `https://github.com/${r.full_name}`,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getmerged.abhishekco.de",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Leaderboard",
        item: "https://getmerged.abhishekco.de/leaderboard",
      },
    ],
  };

  const getBadgeStyle = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case "S": return "bg-emerald-600 text-white border border-white/[0.12] font-bold shadow-sm";
      case "A": return "bg-blue-600 text-white border border-white/[0.12] font-bold shadow-sm";
      case "B": return "bg-amber-600 text-white border border-white/[0.12] font-bold shadow-sm";
      case "C": return "bg-violet-600 text-white border border-white/[0.12] font-bold shadow-sm";
      default: return "bg-rose-600 text-white border border-white/[0.12] font-bold shadow-sm";
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-zinc-200 font-sans">
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-white/[0.1] shadow-xs mb-8">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl glass-card px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> C-Rank™ Global Leaderboard
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-space">
            Top 50 Open-Source Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Ranked by overall <strong>C-Rank™</strong> score. Evaluates PR merge rates, maintainer response times, first-timer success rates, and active maintainer breadth.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Telemetry updated: {new Date().toUTCString().slice(0, 16)} UTC (Daily Sync)</span>
          </div>
        </div>

        {contributors.entries.length > 0 && (
          <div className="mb-8 overflow-x-auto rounded-2xl glass-panel border border-white/[0.1] shadow-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 pt-5 pb-3 border-b border-white/[0.1]/10">
              <h2 className="text-sm font-bold text-white font-space flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-600" /> Weekly Contributor Leaderboard
                {contributors.season && <span className="text-[11px] font-mono text-zinc-300">· {contributors.season}</span>}
              </h2>
              <span className="text-[11px] font-mono text-zinc-300">50 XP per merged PR · streaks = consecutive weeks</span>
            </div>
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="glass-card text-zinc-200 border-b border-white/[0.1] font-semibold uppercase tracking-wider font-space text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4">Contributor</th>
                  <th className="py-3 px-4 text-center">Level</th>
                  <th className="py-3 px-4 text-right">Streak</th>
                  <th className="py-3 px-4 text-right">Season XP</th>
                  <th className="py-3 px-4 text-right">All-time XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {contributors.entries.map((entry) => (
                  <tr key={entry.rank} className="hover:glass-card/60 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-zinc-300">#{entry.rank}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      <Link
                        href={`/u/${encodeURIComponent(entry.login)}`}
                        title={`View ${entry.login}'s contributor profile and track record`}
                        className="hover:text-emerald-400 transition-colors font-space text-sm"
                      >
                        @{entry.login}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        LV {entry.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Flame className={`h-3 w-3 ${entry.streak_weeks > 0 ? "text-amber-500" : "text-zinc-300"}`} />
                        {entry.streak_weeks}wk
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">{entry.season_xp.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-zinc-300">{entry.total_xp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl glass-panel border border-white/[0.1] shadow-xs">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="glass-card text-zinc-200 border-b border-white/[0.1] font-semibold uppercase tracking-wider font-space text-[11px]">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Repository</th>
                <th className="py-3.5 px-4 text-center">Tier</th>
                <th className="py-3.5 px-4 text-right">C-Rank Score</th>
                <th className="py-3.5 px-4 text-right">Stars</th>
                <th className="py-3.5 px-4 text-right">Merge Rate</th>
                <th className="py-3.5 px-4 text-right">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {repos.map((repo, idx) => {
                const [owner, name] = repo.full_name.split("/");
                return (
                  <tr key={repo.id} className="hover:glass-card/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-300">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      <Link
                        href={`/${owner}/${name}`}
                        title={`View ${repo.full_name} C-Rank details and merge telemetry`}
                        className="hover:text-zinc-300 transition-colors font-space text-sm"
                      >
                        {repo.full_name}
                      </Link>
                      <div className="text-[11px] font-normal text-zinc-300 font-sans truncate max-w-md mt-0.5">
                        {repo.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getBadgeStyle(repo.c_rank_tier || "D")}`}>
                        {repo.c_rank_tier || "D"} Rank
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">
                      {repo.c_rank_score?.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {repo.stars?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3 text-emerald-600" />
                        {(repo.external_pr_merge_rate || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        {(repo.time_to_first_response_hours || 0).toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
