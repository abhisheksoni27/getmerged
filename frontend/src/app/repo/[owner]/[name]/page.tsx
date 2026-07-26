import React from "react";
import { Header } from "@/components/Header";
import { Repo } from "@/types/opendoor";
import {
  ArrowLeft,
  GitMerge,
  Clock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Lock,
  GitPullRequest,
  Bookmark,
  Users,
  Activity,
  Star,
  FileCode2,
} from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://opendoor.abhishekco.de";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

async function getRepoData(fullName: string): Promise<Repo | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 }, // Cache on edge/ISR for 1 hour
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawList = data.data || data.repos;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return (
        rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) ||
        rawList[0]
      );
    }
  } catch (e) {
    console.error("SSR fetch failed for repo:", fullName, e);
  }
  return null;
}

// Generate SEO Metadata dynamically for search engines
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  const repo = await getRepoData(fullName);

  const title = repo
    ? `${fullName} C-Rank™ (${repo.c_rank_tier || "A"} Tier) — Opendoor`
    : `${fullName} — Opendoor Open Source Explorer`;

  const description = repo?.description
    ? `${repo.description} Scored ${repo.c_rank_score?.toFixed(1) || 75.0}/100 on Opendoor C-Rank™. View maintainer response times, PR merge rates, and first-timer success metrics.`
    : `Find out if ${fullName} welcomes external pull requests. View response times and maintainer review speed metrics.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://opendoor.abhishekco.de/repo/${owner}/${name}`,
      siteName: "Opendoor",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  // Server-Side Data Fetching -> Zero CLS!
  const repo = await getRepoData(fullName);

  const rank = repo?.class_rank || repo?.c_rank_tier || "A";
  const score = repo?.c_rank_score || repo?.score || 78.5;

  const responseTimeStr =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? `${Math.round(repo.time_to_first_response_hours * 60)} min`
        : `${repo.time_to_first_response_hours.toFixed(1)} hours`
      : "—";

  const responseCommentary =
    repo?.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0
      ? repo.time_to_first_response_hours < 1
        ? "⚡ Fast reviewer response"
        : "Standard maintainer review cycle"
      : "No reviewer activity data";

  const mergeRateStr =
    repo?.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? `${repo.external_pr_merge_rate.toFixed(1)}%`
      : "—";

  const mergeCommentary =
    repo?.external_pr_merge_rate !== undefined && repo.external_pr_merge_rate > 0
      ? repo.external_pr_merge_rate > 75
        ? "High acceptance rate for external PRs"
        : "Moderate PR acceptance rate"
      : "Low or zero PR merges recorded";

  const firstTimerSuccessStr =
    repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 0
      ? `${repo.first_timer_success_rate.toFixed(1)}%`
      : "—";

  const firstTimerCommentary =
    repo?.first_timer_success_rate !== undefined && repo.first_timer_success_rate > 0
      ? "Welcomes new community PRs"
      : "Unverified first-timer success rate";

  const humanVibe =
    rank === "S"
      ? "Super Welcoming"
      : rank === "A"
      ? "Welcoming"
      : rank === "B"
      ? "Moderate"
      : "Slow Review";

  return (
    <div className="min-h-screen dot-pattern flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 flex-1 w-full">
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
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`rounded-md px-2.5 py-0.5 font-mono text-xs font-bold border ${
                  rank === "S"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : rank === "A"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : rank === "B"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {humanVibe}
              </span>
              <span className="font-mono text-xs text-zinc-500">
                Responsiveness Score: {score.toFixed(1)} / 100
              </span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-zinc-900">{fullName}</h1>
            <p className="mt-2 text-sm text-zinc-600 max-w-2xl leading-relaxed">
              {repo?.description ||
                "Public GitHub repository indexed and scored by maintainer responsiveness for contributor accessibility."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium font-mono text-zinc-700 hover:bg-zinc-50 transition-all shadow-xs"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Watch Repo
            </button>
            <a
              href={repo?.github_url || `https://github.com/${fullName}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-all shadow-xs"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>

        {/* Primary Metric Breakdown Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6 font-mono">
          <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>Time to First Response</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{responseTimeStr}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{responseCommentary}</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
              <GitMerge className="h-4 w-4 text-emerald-600" />
              <span>External PR Merge Rate</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{mergeRateStr}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{mergeCommentary}</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>First-Time Contributor Success</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">{firstTimerSuccessStr}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{firstTimerCommentary}</div>
          </div>
        </div>

        {/* Secondary Detailed Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-10 font-mono">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span>Stars</span>
            </div>
            <div className="text-base font-bold text-zinc-900">
              {repo?.stars ? repo.stars.toLocaleString() : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
              <FileCode2 className="h-3.5 w-3.5 text-zinc-600" />
              <span>Primary Language</span>
            </div>
            <div className="text-base font-bold text-zinc-900">{repo?.language || "Other"}</div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span>Active Maintainers</span>
            </div>
            <div className="text-base font-bold text-zinc-900">
              {repo?.distinct_maintainer_count !== undefined ? repo.distinct_maintainer_count : "3+"}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span>Repo Activity</span>
            </div>
            <div className="text-base font-bold text-zinc-900">
              {repo?.staleness_flag ? "Stale" : "Active"}
            </div>
          </div>
        </div>

        {/* AI Insights & Maintainer Vibe Check Section */}
        <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="font-mono text-base font-bold text-zinc-900">
              AI Maintainer Vibe Check & PR Guidelines
            </h2>
          </div>

          <div className="relative pb-6">
            {/* Blurred Content */}
            <div className="space-y-4 blur-xs select-none opacity-30 pointer-events-none pb-12">
              <p className="text-sm text-zinc-700">
                Active maintainer team with fast turnaround time on pull requests. Guidance provided for first-time contributors.
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

            {/* Auth Wall Overlay with Clean Spacing & Standard Button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs text-center px-6 py-12 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-4 border border-zinc-200 shadow-xs shrink-0">
                <Lock className="h-5 w-5 text-zinc-700" />
              </div>
              <h3 className="text-base font-mono font-bold text-zinc-900 mb-2">
                Unlock Full AI Insights & PR Guidelines
              </h3>
              <p className="text-xs text-zinc-600 max-w-md mb-6 leading-relaxed font-sans">
                Sign in with GitHub to view full PR submission checklists, maintainer review vibe checks, and receive repo rank shift notifications.
              </p>
              <a
                href={`${INTERNAL_API_URL}/api/v1/auth/github`}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-medium font-mono text-white shadow-xs hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Sign in with GitHub
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
