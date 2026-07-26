"use client";

import React, { useEffect, useState, use } from "react";
import { Header } from "@/components/Header";
import { AIInsights } from "@/types/opendoor";
import { ArrowLeft, GitMerge, Clock, Sparkles, CheckCircle2, ShieldCheck, Lock, GitPullRequest, Bookmark } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export default function RepoDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { owner, name } = resolvedParams;
  const fullName = `${owner}/${name}`;

  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [watchlisted, setWatchlisted] = useState<boolean>(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("opendoor_token") : null;
    if (token) {
      setTimeout(() => setUserToken(token), 0);
      fetch(`http://localhost:8080/api/v1/repos/1/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.insights) setInsights(data.insights);
        })
        .catch(() => {});
    }
  }, [owner, name]);

  const toggleWatchlist = () => {
    setWatchlisted(!watchlisted);
  };

  return (
    <div className="min-h-screen dot-pattern flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Explorer
        </Link>

        {/* Header Title & Watch Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                S Class Door
              </span>
              <span className="font-mono text-xs text-zinc-500">Score: 94.5 / 100</span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-zinc-900">{fullName}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              High-performance web framework with fast reviewer response times and excellent first-timer merge rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleWatchlist}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium font-mono transition-all ${
                watchlisted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${watchlisted ? "fill-emerald-600" : ""}`} />
              {watchlisted ? "Watching Repo" : "Watch Repo"}
            </button>
            <a
              href={`https://github.com/${fullName}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-all"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>

        {/* Objective C-Rank Breakdown Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10 font-mono">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">3.8 hours</div>
            <div className="mt-1 text-[11px] text-emerald-600">Top 5% speed on GitHub</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <GitMerge className="h-4 w-4 text-emerald-600" />
              <span>Merge Rate</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">92.4%</div>
            <div className="mt-1 text-[11px] text-emerald-600">9 in 10 PRs merged</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>First-Time Success</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">86.1%</div>
            <div className="mt-1 text-[11px] text-emerald-600">Welcomes new contributors</div>
          </div>
        </div>

        {/* AI Insights & Maintainer Vibe Check Section */}
        <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="font-mono text-base font-bold text-zinc-900">AI Maintainer Vibe Check & PR Guidelines</h2>
          </div>

          {userToken ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-1">MAINTAINER REVIEWS & VIBE SUMMARY</h3>
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {insights?.maintainer_vibe ||
                    "Active and encouraging maintainers. PRs with unit tests are reviewed within 4 hours. Feedback is constructive and beginner-friendly."}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-mono text-zinc-400 mb-2">PR SUBMISSION CHECKLIST</h3>
                <ul className="space-y-2">
                  {(insights?.pr_guidelines || [
                    "Include unit tests covering new feature logic",
                    "Follow conventional commit syntax (e.g., feat: ...)",
                    "Ensure CI workflow checks pass before requesting review",
                  ]).map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-zinc-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Blurred Mock Content */}
              <div className="space-y-4 blur-sm select-none opacity-40">
                <p className="text-sm text-zinc-700">
                  Active maintainer team with very fast turnaround time on pull requests. Guidance provided for first-time contributors.
                </p>
                <ul className="space-y-2 text-xs text-zinc-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Ensure test coverage passes 80%
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Use descriptive PR body templates
                  </li>
                </ul>
              </div>

              {/* Auth Wall Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-xs text-center p-6">
                <Lock className="h-6 w-6 text-zinc-400 mb-2" />
                <h3 className="text-sm font-mono font-bold text-zinc-900 mb-1">Unlock Full AI Insights</h3>
                <p className="text-xs text-zinc-600 max-w-sm mb-4">
                  Sign in with GitHub to view full PR guidelines, maintainer review vibe check, and receive repo rank shift notifications.
                </p>
                <a
                  href="http://localhost:8080/api/v1/auth/github"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 transition-all"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Sign in with GitHub
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
