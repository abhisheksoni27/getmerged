"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { RepoCard } from "@/components/RepoCard";
import { Repo, MacroStats } from "@/types/opendoor";
import { Search, Flame, Sparkles, Filter, Code2 } from "lucide-react";

export default function Home() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [stats, setStats] = useState<MacroStats | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>("All");
  const [selectedBucket, setSelectedBucket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trendingOnly, setTrendingOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const languages = ["All", "Go", "TypeScript", "Python", "Rust", "C++", "Java", "PHP", "Ruby"];
  const buckets = ["All", "500-1k", "1k-5k", "5k-20k", "20k-50k", "50k+"];

  useEffect(() => {
    // Mock / Fallback seed data for immediate demonstration if backend is unreachable
    const mockRepos: Repo[] = [
      {
        id: 1,
        full_name: "gin-gonic/gin",
        owner: "gin-gonic",
        name: "gin",
        language: "Go",
        stars: 76500,
        description: "Gin is a HTTP web framework written in Go (Golang). It features a Martini-like API with much better performance.",
        url: "https://github.com/gin-gonic/gin",
        star_bucket: "50k+",
        is_trending: true,
        class_rank: "S",
        score: 94.5,
      },
      {
        id: 2,
        full_name: "shadcn/ui",
        owner: "shadcn",
        name: "ui",
        language: "TypeScript",
        stars: 64200,
        description: "Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
        url: "https://github.com/shadcn/ui",
        star_bucket: "50k+",
        is_trending: true,
        class_rank: "S",
        score: 92.8,
      },
      {
        id: 3,
        full_name: "tursodatabase/libsql",
        owner: "tursodatabase",
        name: "libsql",
        language: "C++",
        stars: 12400,
        description: "libSQL is an open-source, open-contribution fork of SQLite.",
        url: "https://github.com/tursodatabase/libsql",
        star_bucket: "5k-20k",
        is_trending: false,
        class_rank: "A",
        score: 87.2,
      },
      {
        id: 4,
        full_name: "antigravity-sdk/core",
        owner: "antigravity-sdk",
        name: "core",
        language: "Python",
        stars: 840,
        description: "Autonomous multi-agent orchestration runtime engine built for high-performance agent pipelines.",
        url: "https://github.com/antigravity-sdk/core",
        star_bucket: "500-1k",
        is_trending: true,
        class_rank: "S",
        score: 96.1,
      },
      {
        id: 5,
        full_name: "valkey-io/valkey",
        owner: "valkey-io",
        name: "valkey",
        language: "C",
        stars: 18500,
        description: "A flexible fully open source key-value datastore.",
        url: "https://github.com/valkey-io/valkey",
        star_bucket: "5k-20k",
        is_trending: true,
        class_rank: "A",
        score: 89.4,
      },
      {
        id: 6,
        full_name: "astral-sh/uv",
        owner: "astral-sh",
        name: "uv",
        language: "Rust",
        stars: 31200,
        description: "An extremely fast Python package and project manager, written in Rust.",
        url: "https://github.com/astral-sh/uv",
        star_bucket: "20k-50k",
        is_trending: true,
        class_rank: "S",
        score: 95.0,
      },
    ];

    // Fetch from Go backend if available
    fetch("http://localhost:8080/api/v1/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.repos && data.repos.length > 0) {
          setRepos(data.repos);
        } else {
          setRepos(mockRepos);
        }
      })
      .catch(() => setRepos(mockRepos))
      .finally(() => setLoading(false));

    fetch("http://localhost:8080/api/v1/stats/macro")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  const filteredRepos = repos.filter((r) => {
    if (selectedLang !== "All" && r.language !== selectedLang) return false;
    if (selectedBucket !== "All" && r.star_bucket !== selectedBucket) return false;
    if (trendingOnly && !r.is_trending) return false;
    if (
      searchQuery &&
      !r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen dot-pattern flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-1 text-xs font-mono text-zinc-600 shadow-xs backdrop-blur-sm mb-6">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Proprietary C-Rank™ Scoring Algorithm (S to D)</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl font-mono">
          Don&apos;t guess which door is open<span className="text-emerald-600">.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg leading-relaxed">
          Opendoor shows you public GitHub repositories where your pull requests are actually welcomed, reviewed fast, and merged.
        </p>

        {/* Macro Metrics Bar */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-xs">
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {stats?.total_repos ? stats.total_repos.toLocaleString() : "1,100+"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">Repos Scored</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {stats?.rank_counts?.["S"] ? stats.rank_counts["S"] : "420"}
            </div>
            <div className="text-xs text-zinc-500 font-mono">S-Class Open Doors</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">10+</div>
            <div className="text-xs text-zinc-500 font-mono">Languages Covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900">4.2h</div>
            <div className="text-xs text-zinc-500 font-mono">Avg First Review</div>
          </div>
        </div>
      </section>

      {/* Main Filter & Leaderboard Grid */}
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 flex-1">
        {/* Controls Bar */}
        <div className="sticky top-20 z-40 mb-8 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search repo by name, owner, or technology..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono transition-all"
              />
            </div>

            {/* Trending Toggle */}
            <button
              onClick={() => setTrendingOnly(!trendingOnly)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                trendingOnly
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${trendingOnly ? "fill-orange-500 text-orange-500" : ""}`} />
              Daily Trending Repos
            </button>
          </div>

          {/* Language & Bucket Filter Pills */}
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            {/* Language Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1">
                <Code2 className="h-3 w-3" /> Lang:
              </span>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-md px-2.5 py-1 font-mono transition-all ${
                    selectedLang === lang
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Bucket Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-zinc-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Stars:
              </span>
              {buckets.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBucket(b)}
                  className={`rounded-md px-2.5 py-1 font-mono transition-all ${
                    selectedBucket === b
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repos Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-zinc-200 bg-zinc-50 animate-pulse" />
            ))}
          </div>
        ) : filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center bg-white">
            <h3 className="text-sm font-mono font-semibold text-zinc-900">No open doors found</h3>
            <p className="mt-1 text-xs text-zinc-500">Try adjusting your language or star bucket filters.</p>
          </div>
        )}
      </main>

      {/* Silicon Valley Minimal Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-xs font-mono text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} opendoor — Glassdoor for Open Source</div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-zinc-900">
              GitHub
            </a>
            <a href="/api/v1/health" className="hover:text-zinc-900">
              API Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
