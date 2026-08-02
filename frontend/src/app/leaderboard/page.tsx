import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, ArrowLeft, Star, GitPullRequest, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Open Source Welcoming Leaderboard (C-Rank™) — Opendoor",
  description: "Comprehensive leaderboard of top open-source GitHub repositories ranked by contributor-friendliness, PR merge speed, and maintainer responsiveness.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/leaderboard",
  },
  openGraph: {
    title: "Open Source Welcoming Leaderboard — Opendoor",
    description: "Ranked list of all open-source repositories based on C-Rank™ metrics.",
    url: "https://opendoor.abhishekco.de/leaderboard",
    siteName: "Opendoor",
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
  const repos = await getLeaderboardRepos();

  const getBadgeStyle = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case "S": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "A": return "bg-blue-50 text-blue-700 border-blue-200";
      case "B": return "bg-amber-50 text-amber-700 border-amber-200";
      case "C": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white font-mono">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              <Trophy className="h-3.5 w-3.5 text-amber-600" /> C-Rank™ Global Leaderboard
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Top 50 Open-Source Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Ranked by overall <strong>C-Rank™</strong> score. Evaluates PR merge rates, maintainer response times, first-timer success rates, and active maintainer breadth.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50 text-zinc-900 border-b border-zinc-200 font-semibold uppercase tracking-wider">
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
            <tbody className="divide-y divide-zinc-200 font-mono">
              {repos.map((repo, idx) => {
                const [owner, name] = repo.full_name.split("/");
                return (
                  <tr key={repo.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-500">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      <Link href={`/repo/${owner}/${name}`} className="hover:text-emerald-600 transition-colors">
                        {repo.full_name}
                      </Link>
                      <div className="text-[11px] font-normal text-zinc-400 font-sans truncate max-w-md">
                        {repo.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getBadgeStyle(repo.c_rank_tier || "D")}`}>
                        {repo.c_rank_tier || "D"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-zinc-900">
                      {repo.c_rank_score?.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        {repo.stars?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3 text-emerald-600" />
                        {(repo.external_pr_merge_rate || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-600">
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
