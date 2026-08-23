"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LangLogo } from "@/components/LangLogo";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import {
  Scale,
  Search,
  ArrowRight,
  Star,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import posthog from "posthog-js";

interface SelectedRepo {
  full_name: string;
  owner: string;
  name: string;
  language?: string;
  stars?: number;
  c_rank_tier?: string;
  class_rank?: string;
  c_rank_score?: number;
  description?: string;
}

const POPULAR_COMPARISONS = [
  {
    repoA: "facebook/react",
    repoB: "vuejs/vue",
    category: "Frontend UI Frameworks",
  },
  {
    repoA: "vercel/next.js",
    repoB: "remix-run/remix",
    category: "Full-Stack React Frameworks",
  },
  {
    repoA: "golang/go",
    repoB: "rust-lang/rust",
    category: "Systems & Backend Languages",
  },
  {
    repoA: "fastify/fastify",
    repoB: "expressjs/express",
    category: "Node.js Web Frameworks",
  },
  {
    repoA: "tailwindlabs/tailwindcss",
    repoB: "twbs/bootstrap",
    category: "CSS Systems & Utility Frameworks",
  },
  {
    repoA: "oven-sh/bun",
    repoB: "nodejs/node",
    category: "JavaScript Runtimes & Tooling",
  },
];

export default function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialA = searchParams.get("a") || searchParams.get("repoA") || "";
  const initialB = searchParams.get("b") || searchParams.get("repoB") || "";

  const [repoA, setRepoA] = useState<SelectedRepo | null>(null);
  const [repoB, setRepoB] = useState<SelectedRepo | null>(null);

  const [queryA, setQueryA] = useState(initialA);
  const [queryB, setQueryB] = useState(initialB);

  const [resultsA, setResultsA] = useState<Repo[]>([]);
  const [resultsB, setResultsB] = useState<Repo[]>([]);

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [openDropdownA, setOpenDropdownA] = useState(false);
  const [openDropdownB, setOpenDropdownB] = useState(false);

  const dropdownRefA = useRef<HTMLDivElement | null>(null);
  const dropdownRefB = useRef<HTMLDivElement | null>(null);

  const fetchRepoByExactName = useCallback(async (fullName: string): Promise<SelectedRepo | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const rawList = data.data || data.repos;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const found = rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        const [owner, name] = found.full_name ? found.full_name.split("/") : ["", ""];
        return {
          full_name: found.full_name,
          owner: found.owner || owner,
          name: found.name || name,
          language: found.language,
          stars: found.stars,
          c_rank_tier: found.c_rank_tier || found.class_rank || "A",
          class_rank: found.class_rank || found.c_rank_tier || "A",
          c_rank_score: found.c_rank_score,
          description: found.description,
        };
      }
      const parts = fullName.split("/");
      if (parts.length === 2) {
        return {
          full_name: fullName,
          owner: parts[0],
          name: parts[1],
          language: "Code",
          stars: 0,
          c_rank_tier: "A",
        };
      }
      return null;
    } catch {
      const parts = fullName.split("/");
      if (parts.length === 2) {
        return {
          full_name: fullName,
          owner: parts[0],
          name: parts[1],
          language: "Code",
          stars: 0,
          c_rank_tier: "A",
        };
      }
      return null;
    }
  }, []);

  // Pre-fill slot A on initial load if ?a= is present
  useEffect(() => {
    if (initialA) {
      fetchRepoByExactName(initialA).then((repo) => {
        if (repo) {
          setRepoA(repo);
          setQueryA("");
        }
      });
    }
  }, [initialA, fetchRepoByExactName]);

  // Pre-fill slot B on initial load if ?b= is present
  useEffect(() => {
    if (initialB) {
      fetchRepoByExactName(initialB).then((repo) => {
        if (repo) {
          setRepoB(repo);
          setQueryB("");
        }
      });
    }
  }, [initialB, fetchRepoByExactName]);

  // Debounced search for slot A
  useEffect(() => {
    if (!queryA.trim() || repoA) {
      setResultsA([]);
      setLoadingA(false);
      return;
    }

    setLoadingA(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(queryA.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResultsA(data.data || data.repos || []);
        }
      } catch (err) {
        console.error("Search A error:", err);
      } finally {
        setLoadingA(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [queryA, repoA]);

  // Debounced search for slot B
  useEffect(() => {
    if (!queryB.trim() || repoB) {
      setResultsB([]);
      setLoadingB(false);
      return;
    }

    setLoadingB(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(queryB.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResultsB(data.data || data.repos || []);
        }
      } catch (err) {
        console.error("Search B error:", err);
      } finally {
        setLoadingB(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [queryB, repoB]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRefA.current && !dropdownRefA.current.contains(e.target as Node)) {
        setOpenDropdownA(false);
      }
      if (dropdownRefB.current && !dropdownRefB.current.contains(e.target as Node)) {
        setOpenDropdownB(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectA = (r: Repo) => {
    const [owner, name] = r.full_name ? r.full_name.split("/") : ["", ""];
    setRepoA({
      full_name: r.full_name,
      owner: r.owner || owner,
      name: r.name || name,
      language: r.language,
      stars: r.stars,
      c_rank_tier: r.c_rank_tier || r.class_rank || "A",
      class_rank: r.class_rank || r.c_rank_tier || "A",
      c_rank_score: r.c_rank_score,
      description: r.description,
    });
    setQueryA("");
    setOpenDropdownA(false);
    posthog.capture("compare_repo_selected", { slot: "A", repo: r.full_name });
  };

  const handleSelectB = (r: Repo) => {
    const [owner, name] = r.full_name ? r.full_name.split("/") : ["", ""];
    setRepoB({
      full_name: r.full_name,
      owner: r.owner || owner,
      name: r.name || name,
      language: r.language,
      stars: r.stars,
      c_rank_tier: r.c_rank_tier || r.class_rank || "A",
      class_rank: r.class_rank || r.c_rank_tier || "A",
      c_rank_score: r.c_rank_score,
      description: r.description,
    });
    setQueryB("");
    setOpenDropdownB(false);
    posthog.capture("compare_repo_selected", { slot: "B", repo: r.full_name });
  };

  const handleCompare = () => {
    if (!repoA || !repoB) return;
    const nameA = repoA.full_name.toLowerCase();
    const nameB = repoB.full_name.toLowerCase();

    posthog.capture("compare_submitted", {
      repo_a: repoA.full_name,
      repo_b: repoB.full_name,
    });

    if (nameA === nameB) {
      router.push(`/${repoA.full_name}`);
      return;
    }

    if (nameA > nameB) {
      router.push(`/compare/${repoB.full_name}/vs/${repoA.full_name}`);
    } else {
      router.push(`/compare/${repoA.full_name}/vs/${repoB.full_name}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 sm:py-16">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono font-bold mb-4">
            <Scale className="h-3.5 w-3.5" /> Repository Head-to-Head Picker
          </div>
          <h1 className="font-space text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight leading-tight">
            Compare Open Source Repositories
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 font-sans leading-relaxed">
            Benchmark two projects side-by-side across pull request turnaround, maintainer responsiveness, 90-day bus factor, and newcomer merge likelihood.
          </p>
        </div>

        {/* Dual Repo Picker Box */}
        <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs mb-14">
          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
            {/* Slot A */}
            <div className="w-full flex-1" ref={dropdownRefA}>
              <label className="block text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Repository A
              </label>

              {repoA ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://github.com/${repoA.owner}.png?size=64`}
                      alt={repoA.owner}
                      className="h-9 w-9 rounded-xl border border-zinc-200 bg-white object-cover shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-space text-sm font-bold text-zinc-900 truncate">
                        {repoA.full_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500">
                        {typeof repoA.stars === "number" && (
                          <span className="flex items-center gap-1 font-semibold text-zinc-700">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {repoA.stars >= 1000 ? `${(repoA.stars / 1000).toFixed(1)}k` : repoA.stars}
                          </span>
                        )}
                        <span>•</span>
                        {repoA.language && (
                          <>
                            <span className="flex items-center gap-1 text-zinc-600">
                              <LangLogo language={repoA.language} />
                              <span>{repoA.language}</span>
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="font-bold text-emerald-700">{repoA.c_rank_tier || "A"} Tier</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRepoA(null)}
                    aria-label="Clear Repository A"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      data-testid="repo-picker-a"
                      placeholder="Search repository A (e.g. facebook/react)..."
                      value={queryA}
                      onChange={(e) => {
                        setQueryA(e.target.value);
                        setOpenDropdownA(true);
                      }}
                      onFocus={() => setOpenDropdownA(true)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-zinc-200/90 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ring-offset-1 transition-all"
                    />
                    {loadingA && (
                      <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-zinc-400" />
                    )}
                  </div>

                  {/* Dropdown A */}
                  {openDropdownA && queryA.trim().length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto p-1.5">
                      {resultsA.length > 0 ? (
                        resultsA.map((r) => (
                          <button
                            key={r.id || r.full_name}
                            type="button"
                            onClick={() => handleSelectA(r)}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-emerald-50/70 hover:text-emerald-950 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-space text-xs font-bold text-zinc-900 truncate">
                                {r.full_name}
                              </div>
                              <div className="text-[11px] text-zinc-500 line-clamp-1">
                                {r.description || "No description"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="flex items-center gap-0.5 text-zinc-600 font-semibold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                                {r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
                                {r.c_rank_tier || r.class_rank || "A"}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : !loadingA ? (
                        <div className="p-3 text-center text-xs text-zinc-500 font-mono">
                          No repositories found for &ldquo;{queryA}&rdquo;
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VS Badge */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-mono text-xs font-black text-zinc-500 uppercase shadow-2xs">
                VS
              </div>
            </div>

            {/* Slot B */}
            <div className="w-full flex-1" ref={dropdownRefB}>
              <label className="block text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Repository B
              </label>

              {repoB ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://github.com/${repoB.owner}.png?size=64`}
                      alt={repoB.owner}
                      className="h-9 w-9 rounded-xl border border-zinc-200 bg-white object-cover shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://github.com/github.png?size=64";
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-space text-sm font-bold text-zinc-900 truncate">
                        {repoB.full_name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-zinc-500">
                        {typeof repoB.stars === "number" && (
                          <span className="flex items-center gap-1 font-semibold text-zinc-700">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {repoB.stars >= 1000 ? `${(repoB.stars / 1000).toFixed(1)}k` : repoB.stars}
                          </span>
                        )}
                        <span>•</span>
                        {repoB.language && (
                          <>
                            <span className="flex items-center gap-1 text-zinc-600">
                              <LangLogo language={repoB.language} />
                              <span>{repoB.language}</span>
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="font-bold text-emerald-700">{repoB.c_rank_tier || "A"} Tier</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRepoB(null)}
                    aria-label="Clear Repository B"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      data-testid="repo-picker-b"
                      placeholder="Search repository B (e.g. vuejs/vue)..."
                      value={queryB}
                      onChange={(e) => {
                        setQueryB(e.target.value);
                        setOpenDropdownB(true);
                      }}
                      onFocus={() => setOpenDropdownB(true)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-zinc-200/90 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ring-offset-1 transition-all"
                    />
                    {loadingB && (
                      <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-zinc-400" />
                    )}
                  </div>

                  {/* Dropdown B */}
                  {openDropdownB && queryB.trim().length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto p-1.5">
                      {resultsB.length > 0 ? (
                        resultsB.map((r) => (
                          <button
                            key={r.id || r.full_name}
                            type="button"
                            onClick={() => handleSelectB(r)}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-emerald-50/70 hover:text-emerald-950 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-space text-xs font-bold text-zinc-900 truncate">
                                {r.full_name}
                              </div>
                              <div className="text-[11px] text-zinc-500 line-clamp-1">
                                {r.description || "No description"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="flex items-center gap-0.5 text-zinc-600 font-semibold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                                {r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold">
                                {r.c_rank_tier || r.class_rank || "A"}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : !loadingB ? (
                        <div className="p-3 text-center text-xs text-zinc-500 font-mono">
                          No repositories found for &ldquo;{queryB}&rdquo;
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-zinc-500 text-center sm:text-left">
              {repoA && repoB ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready to compare {repoA.full_name} vs {repoB.full_name}
                </span>
              ) : (
                <span>Select two repositories to unlock comprehensive side-by-side scorecard</span>
              )}
            </div>

            <button
              type="button"
              disabled={!repoA || !repoB}
              onClick={handleCompare}
              className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                repoA && repoB
                  ? "bg-zinc-900 hover:bg-zinc-800 text-white shadow-md active:scale-[0.98]"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Compare Repositories</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Popular Head-to-Head Comparisons Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-space text-lg sm:text-xl font-bold text-zinc-900">
                Popular Head-to-Head Comparisons
              </h2>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                Explore frequently referenced open-source benchmark pairings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_COMPARISONS.map((item) => (
              <Link
                key={`${item.repoA}-vs-${item.repoB}`}
                href={`/compare/${item.repoA}/vs/${item.repoB}`}
                title={`Compare ${item.repoA} vs ${item.repoB} maintainer review metrics`}
                className="group p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-mono text-zinc-500 font-semibold mb-2">
                    {item.category}
                  </div>
                  <div className="font-space text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                    <span>{item.repoA}</span>
                    <span className="text-zinc-400 font-normal text-xs">vs</span>
                    <span>{item.repoB}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-500">
                  <span className="text-[11px]">Compare scorecard</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
