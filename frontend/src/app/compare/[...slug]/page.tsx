import React from "react";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareShareBar } from "@/components/CompareShareBar";
import { VsShowdownCard } from "@/components/VsShowdownCard";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import {
  GitPullRequest,
  Clock,
  Users,
  FileText,
  ArrowRight,
  Scale,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

interface ComparePageProps {
  params: Promise<{ slug?: string[] }>;
}

export interface PRSizeCategory {
  label: string;
  line_range: string;
  median_merge_hours: number;
  merge_rate: number;
  review_likelihood: string;
}

export interface PRSizeSweetSpotData {
  sweet_spot_threshold?: string;
  speed_multiplier?: number;
  actionable_advice?: string;
  small_pr?: PRSizeCategory;
  medium_pr?: PRSizeCategory;
  large_pr?: PRSizeCategory;
}

export interface OptimalTimeData {
  optimal_time?: {
    primary_start_hour_utc?: number;
    primary_end_hour_utc?: number;
    secondary_start_hour_utc?: number;
    secondary_end_hour_utc?: number;
    peak_hour_utc?: number;
    active_maintainer_count?: number;
    hourly_heatmap?: number[];
    recommended_day_window?: string;
    confidence_score?: number;
  };
  repository?: string;
}

export interface PRLikelihoodData {
  repository?: string;
  c_rank_tier?: string;
  overall_acceptance_rate?: number | null;
  first_timer_acceptance_rate?: number | null;
  repeat_contributor_acceptance_rate?: number | null;
  response_time_p50_hours?: number | null;
  response_time_p90_hours?: number | null;
  median_time_to_merge_hours?: number | null;
  bus_factor?: number | null;
  staleness_flag?: boolean;
}

async function fetchRepoData(fullName: string): Promise<Repo | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to fetch repo ${fullName}: ${res.statusText}`);
    }
    const data = await res.json();
    const rawList = data.data || data.repos;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return (
        rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) || null
      );
    }
    return null;
  } catch (err) {
    console.error("fetchRepoData error:", err);
    throw err; // Trigger error boundary for 5xx transient failures
  }
}

async function fetchSweetSpotData(repoId: string | number | undefined): Promise<PRSizeSweetSpotData | null> {
  if (!repoId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(String(repoId))}/pr-size-sweetspot`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchOptimalTimeData(fullName: string): Promise<OptimalTimeData | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/optimal-time?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchLikelihoodData(fullName: string): Promise<PRLikelihoodData | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/pr-likelihood?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  if (slug.length === 2) {
    const repoA = `${slug[0]}/${slug[1]}`;
    return {
      title: `Compare ${repoA} with Other Open Source Repositories | GetMerged`,
      description: `Benchmark ${repoA} against other repositories on PR merge rates, reviewer response latency, and beginner friendliness.`,
    };
  }

  if (slug.length !== 5 || slug[2] !== "vs") {
    return { title: "Compare Open Source Repositories | GetMerged" };
  }

  const repoA = `${slug[0]}/${slug[1]}`;
  const repoB = `${slug[3]}/${slug[4]}`;

  const sortedA = repoA.toLowerCase() < repoB.toLowerCase() ? repoA : repoB;
  const sortedB = repoA.toLowerCase() < repoB.toLowerCase() ? repoB : repoA;

  const canonical = `https://getmerged.abhishekco.de/compare/${sortedA}/vs/${sortedB}`;
  const ogImage = `/api/og/vs?a=${encodeURIComponent(repoA)}&b=${encodeURIComponent(repoB)}`;

  return {
    title: `${repoA} vs ${repoB} Review & C-Rank™ Comparison (2026) | GetMerged`,
    description: `Compare ${repoA} vs ${repoB} pull request merge rates, maintainer response times, 90-day bus factor, PR size sweet spots, and first-timer acceptance odds on GetMerged.`,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${repoA} vs ${repoB}: Should I Contribute? Showdown`,
      description: `Deep maintainer responsiveness, review sweet spot, and merge velocity comparison between ${repoA} and ${repoB}.`,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${repoA} vs ${repoB}: Should I Contribute? Showdown`,
      description: `Deep maintainer responsiveness, review sweet spot, and merge velocity comparison between ${repoA} and ${repoB}.`,
      images: [ogImage],
    },
  };
}

function formatHours(h: number | null | undefined): string {
  if (h === null || h === undefined || isNaN(h)) return " - ";
  if (h === 0) return "< 1h";
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h >= 100) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return " - ";
  return `${val.toFixed(1)}%`;
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { slug = [] } = await params;

  // Single repo handling: /compare/owner/repo -> Redirect to picker with ?a=owner/repo
  if (slug.length === 2) {
    redirect(`/compare?a=${encodeURIComponent(`${slug[0]}/${slug[1]}`)}`);
  }

  // Expected format: /compare/[orgA]/[repoA]/vs/[orgB]/[repoB] -> 5 segments
  if (slug.length !== 5 || slug[2] !== "vs") {
    notFound();
  }

  const repoNameA = `${slug[0]}/${slug[1]}`;
  const repoNameB = `${slug[3]}/${slug[4]}`;

  // 1. Self-comparison redirect
  if (repoNameA.toLowerCase() === repoNameB.toLowerCase()) {
    redirect(`/${repoNameA}`);
  }

  // 2. Lexicographical canonical redirect
  if (repoNameA.toLowerCase() > repoNameB.toLowerCase()) {
    redirect(`/compare/${slug[3]}/${slug[4]}/vs/${slug[0]}/${slug[1]}`);
  }

  // 3. Fetch primary repo telemetry in parallel SSR
  const [repoA, repoB] = await Promise.all([
    fetchRepoData(repoNameA),
    fetchRepoData(repoNameB),
  ]);

  if (!repoA || !repoB) {
    notFound();
  }

  // 4. Fetch deep value telemetry in parallel SSR
  const [sweetSpotA, sweetSpotB, optimalTimeA, optimalTimeB, likelihoodA, likelihoodB] =
    await Promise.all([
      fetchSweetSpotData(repoA.id),
      fetchSweetSpotData(repoB.id),
      fetchOptimalTimeData(repoA.full_name),
      fetchOptimalTimeData(repoB.full_name),
      fetchLikelihoodData(repoA.full_name),
      fetchLikelihoodData(repoB.full_name),
    ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${repoA.full_name} vs ${repoB.full_name} Comparison`,
    description: `Side-by-side maintainer responsiveness, pull request sweet spot, and contributor acceptance comparison.`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: repoA.full_name,
        url: `https://getmerged.abhishekco.de/${repoA.full_name}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: repoB.full_name,
        url: `https://getmerged.abhishekco.de/${repoB.full_name}`,
      },
    ],
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
        name: "Compare Repositories",
        item: "https://getmerged.abhishekco.de/compare",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${repoA.full_name} vs ${repoB.full_name}`,
        item: `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`,
      },
    ],
  };

  // Compute recommendation insights based on live numbers
  const mergeRateA = repoA.external_pr_merge_rate ?? 0;
  const mergeRateB = repoB.external_pr_merge_rate ?? 0;
  const latencyA = repoA.response_p50_hours || repoA.time_to_first_response_hours || 0;
  const latencyB = repoB.response_p50_hours || repoB.time_to_first_response_hours || 0;
  const busA = repoA.bus_factor ?? repoA.distinct_maintainer_count ?? 1;
  const busB = repoB.bus_factor ?? repoB.distinct_maintainer_count ?? 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/" title="Home" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/compare" title="All Comparisons" className="hover:text-white transition-colors">
            Compare
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">{`${repoA.full_name} vs ${repoB.full_name}`}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold mb-3">
            <Scale className="h-3.5 w-3.5" /> Repository Head-to-Head
          </div>
          <h1 className="font-space text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {`${repoA.full_name} `}
            <span className="text-zinc-500 font-normal">vs</span>
            {` ${repoB.full_name}`}
          </h1>
          <p className="text-sm text-zinc-400 font-sans mt-2 max-w-2xl">
            Objective C-Rank™ telemetry comparison benchmarked across PR merge rates, reviewer latency, PR size sweet spots, maintainer availability, and newcomer hospitality.
          </p>
        </div>

        {/* Compare Share & Export Bar */}
        <CompareShareBar repoA={repoA} repoB={repoB} />

        {/* Should I Contribute? Repo vs Repo Showdown */}
        <VsShowdownCard repoA={repoA} repoB={repoB} />

        {/* Side-by-Side High-Level Overview Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Card A */}
          <div className="rounded-3xl border border-white/[0.08] glass-panel p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-mono glass-card text-zinc-300 px-2.5 py-1 rounded-lg font-bold">
                  {repoA.language || "Multi-language"}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  {repoA.c_rank_tier || repoA.class_rank || "A"} Tier ({(repoA.c_rank_score || 0).toFixed(0)}%)
                </span>
              </div>
              <h2 className="font-space text-xl font-bold text-white mb-1">
                <Link
                  href={`/${repoA.full_name}`}
                  title={`View full scorecard for ${repoA.full_name}`}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {repoA.full_name}
                </Link>
              </h2>
              <p className="text-xs text-zinc-400 line-clamp-2 mb-6">{repoA.description || "No description provided."}</p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-400" /> External PR Merge Rate</span>
                  <strong className="text-white font-bold">{formatPercent(repoA.external_pr_merge_rate)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> Review Latency (p50)</span>
                  <strong className="text-white font-bold">{formatHours(repoA.response_p50_hours || repoA.time_to_first_response_hours)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> First-Timer Acceptance</span>
                  <strong className="text-white font-bold">{formatPercent(likelihoodA?.first_timer_acceptance_rate ?? repoA.first_timer_success_rate)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-400" /> 90-Day Bus Factor</span>
                  <strong className="text-white font-bold">{repoA.bus_factor ?? repoA.distinct_maintainer_count ?? 1} Maintainers</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-400" /> Onboarding Readiness</span>
                  <strong className="text-white font-bold">{repoA.onboarding_score || 0}/100</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08]">
              <Link
                href={`/${repoA.full_name}`}
                title={`Open full ${repoA.full_name} scorecard`}
                className="w-full py-2.5 rounded-xl glass-card hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                View Full Scorecard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card B */}
          <div className="rounded-3xl border border-white/[0.08] glass-panel p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-mono glass-card text-zinc-300 px-2.5 py-1 rounded-lg font-bold">
                  {repoB.language || "Multi-language"}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  {repoB.c_rank_tier || repoB.class_rank || "A"} Tier ({(repoB.c_rank_score || 0).toFixed(0)}%)
                </span>
              </div>
              <h2 className="font-space text-xl font-bold text-white mb-1">
                <Link
                  href={`/${repoB.full_name}`}
                  title={`View full scorecard for ${repoB.full_name}`}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {repoB.full_name}
                </Link>
              </h2>
              <p className="text-xs text-zinc-400 line-clamp-2 mb-6">{repoB.description || "No description provided."}</p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-400" /> External PR Merge Rate</span>
                  <strong className="text-white font-bold">{formatPercent(repoB.external_pr_merge_rate)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> Review Latency (p50)</span>
                  <strong className="text-white font-bold">{formatHours(repoB.response_p50_hours || repoB.time_to_first_response_hours)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> First-Timer Acceptance</span>
                  <strong className="text-white font-bold">{formatPercent(likelihoodB?.first_timer_acceptance_rate ?? repoB.first_timer_success_rate)}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-400" /> 90-Day Bus Factor</span>
                  <strong className="text-white font-bold">{repoB.bus_factor ?? repoB.distinct_maintainer_count ?? 1} Maintainers</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.08]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-400" /> Onboarding Readiness</span>
                  <strong className="text-white font-bold">{repoB.onboarding_score || 0}/100</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08]">
              <Link
                href={`/${repoB.full_name}`}
                title={`Open full ${repoB.full_name} scorecard`}
                className="w-full py-2.5 rounded-xl glass-card hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                View Full Scorecard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Deep Value Section 1: PR Size Sweet Spot Showdown */}
        <section aria-label="PR Size Sweet Spot Comparison" className="mb-10 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 font-bold mb-1">
                <Zap className="h-4 w-4" /> Code Review Sweet Spot Showdown
              </div>
              <h2 className="font-space text-xl sm:text-2xl font-bold text-white">
                How PR Size Affects Merge Speed & Acceptance Odds
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">Lines of Code vs Approval Rate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Repo A Sweet Spot Card */}
            <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-space text-sm font-bold text-white truncate max-w-[200px]">
                  {repoA.full_name}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Sweet Spot: {sweetSpotA?.sweet_spot_threshold || "< 150 lines"}
                </span>
              </div>
              {sweetSpotA?.actionable_advice && (
                <p className="text-xs text-zinc-300 mb-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl leading-relaxed">
                  {sweetSpotA.actionable_advice}
                </p>
              )}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Small PR (&lt;150 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">{formatPercent(sweetSpotA?.small_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotA?.small_pr?.median_merge_hours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Medium PR (150–500 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200 font-bold">{formatPercent(sweetSpotA?.medium_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotA?.medium_pr?.median_merge_hours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Large PR (&gt;500 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">{formatPercent(sweetSpotA?.large_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotA?.large_pr?.median_merge_hours)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Repo B Sweet Spot Card */}
            <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-space text-sm font-bold text-white truncate max-w-[200px]">
                  {repoB.full_name}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Sweet Spot: {sweetSpotB?.sweet_spot_threshold || "< 150 lines"}
                </span>
              </div>
              {sweetSpotB?.actionable_advice && (
                <p className="text-xs text-zinc-300 mb-4 bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl leading-relaxed">
                  {sweetSpotB.actionable_advice}
                </p>
              )}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Small PR (&lt;150 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">{formatPercent(sweetSpotB?.small_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotB?.small_pr?.median_merge_hours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Medium PR (150–500 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200 font-bold">{formatPercent(sweetSpotB?.medium_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotB?.medium_pr?.median_merge_hours)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400">Large PR (&gt;500 lines)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">{formatPercent(sweetSpotB?.large_pr?.merge_rate)} merge</span>
                    <span className="text-zinc-400">~{formatHours(sweetSpotB?.large_pr?.median_merge_hours)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Value Section 2: Maintainer Review Windows & Timezones */}
        <section aria-label="Optimal Submission Timing & Maintainer Activity" className="mb-10 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold mb-1">
                <Clock className="h-4 w-4" /> Maintainer Availability & Review Windows
              </div>
              <h2 className="font-space text-xl sm:text-2xl font-bold text-white">
                When Do Reviewers Actually Respond?
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">UTC Operating Schedule</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Repo A Timing */}
            <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
              <div className="font-space text-sm font-bold text-white mb-4">
                {repoA.full_name}
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-400" /> Peak Review Hour (UTC)</span>
                  <span className="text-white font-bold">
                    {optimalTimeA?.optimal_time?.peak_hour_utc !== undefined
                      ? `${optimalTimeA.optimal_time.peak_hour_utc}:00 UTC`
                      : "Variable"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-purple-400" /> Best Days to Submit</span>
                  <span className="text-emerald-300 font-bold">
                    {optimalTimeA?.optimal_time?.recommended_day_window || "Mon - Thu"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-400" /> Active Reviewers</span>
                  <span className="text-white font-bold">
                    {optimalTimeA?.optimal_time?.active_maintainer_count ?? repoA.bus_factor ?? 1} Maintainers
                  </span>
                </div>
              </div>
            </div>

            {/* Repo B Timing */}
            <div className="rounded-2xl glass-card border border-white/[0.08] p-5">
              <div className="font-space text-sm font-bold text-white mb-4">
                {repoB.full_name}
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-400" /> Peak Review Hour (UTC)</span>
                  <span className="text-white font-bold">
                    {optimalTimeB?.optimal_time?.peak_hour_utc !== undefined
                      ? `${optimalTimeB.optimal_time.peak_hour_utc}:00 UTC`
                      : "Variable"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-purple-400" /> Best Days to Submit</span>
                  <span className="text-emerald-300 font-bold">
                    {optimalTimeB?.optimal_time?.recommended_day_window || "Mon - Thu"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                  <span className="text-zinc-400 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-400" /> Active Reviewers</span>
                  <span className="text-white font-bold">
                    {optimalTimeB?.optimal_time?.active_maintainer_count ?? repoB.bus_factor ?? 1} Maintainers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep Value Section 3: Where Should You Contribute? Tailored Recommendations */}
        <section aria-label="Contribution Guidance and Decision Framework" className="mb-12 rounded-3xl border border-white/[0.08] glass-panel p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold mb-2">
            <Sparkles className="h-4 w-4" /> Actionable Decision Framework
          </div>
          <h2 className="font-space text-xl sm:text-2xl font-bold text-white mb-2">
            Where Should You Contribute?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans mb-6 max-w-2xl">
            Choose your contribution target based on your specific developer goals rather than vanity star counts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Scenario 1: Quickest First PR Merge */}
            <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Highest Merge Probability
                </div>
                <h3 className="font-space text-base font-bold text-white mb-2">
                  {mergeRateA >= mergeRateB ? repoA.full_name : repoB.full_name}
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
                  {mergeRateA >= mergeRateB
                    ? `${repoA.full_name} accepts ${formatPercent(mergeRateA)} of external PRs versus ${formatPercent(mergeRateB)} for ${repoB.full_name}. Lower rejection friction.`
                    : `${repoB.full_name} accepts ${formatPercent(mergeRateB)} of external PRs versus ${formatPercent(mergeRateA)} for ${repoA.full_name}. Lower rejection friction.`}
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-emerald-400">
                Pick for confident shipping
              </div>
            </div>

            {/* Scenario 2: Fastest Feedback Loop */}
            <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" /> Fastest Review Turnaround
                </div>
                <h3 className="font-space text-base font-bold text-white mb-2">
                  {latencyA <= latencyB ? repoA.full_name : repoB.full_name}
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
                  {latencyA <= latencyB
                    ? `${repoA.full_name} averages ~${formatHours(latencyA)} to initial review versus ~${formatHours(latencyB)} for ${repoB.full_name}. Shorter waiting periods.`
                    : `${repoB.full_name} averages ~${formatHours(latencyB)} to initial review versus ~${formatHours(latencyA)} for ${repoA.full_name}. Shorter waiting periods.`}
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-cyan-400">
                Pick for rapid iteration
              </div>
            </div>

            {/* Scenario 3: Community Resilience & Bus Factor */}
            <div className="p-5 rounded-2xl glass-card border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" /> Reviewer Breadth & Health
                </div>
                <h3 className="font-space text-base font-bold text-white mb-2">
                  {busA >= busB ? repoA.full_name : repoB.full_name}
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
                  {busA >= busB
                    ? `${repoA.full_name} boasts ${busA} active maintainers (vs ${busB}), meaning your PR does not depend on a single overwhelmed person.`
                    : `${repoB.full_name} boasts ${busB} active maintainers (vs ${busA}), meaning your PR does not depend on a single overwhelmed person.`}
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-purple-400">
                Pick for lower burnout risk
              </div>
            </div>
          </div>
        </section>

        {/* Popular Head-to-Head Comparisons Quick Links */}
        <section aria-label="Explore other popular comparisons" className="pt-6 border-t border-white/[0.08]">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
            Compare More High-Profile Repositories
          </h3>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <Link
              href="/compare/facebook/react/vs/vuejs/vue"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              React vs Vue
            </Link>
            <Link
              href="/compare/remix-run/remix/vs/vercel/next.js"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Next.js vs Remix
            </Link>
            <Link
              href="/compare/golang/go/vs/rust-lang/rust"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Go vs Rust
            </Link>
            <Link
              href="/compare/expressjs/express/vs/fastify/fastify"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Fastify vs Express
            </Link>
            <Link
              href="/compare/nodejs/node/vs/oven-sh/bun"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Bun vs Node.js
            </Link>
            <Link
              href="/compare/bootstrap/vs/tailwindlabs/tailwindcss"
              className="px-3 py-1.5 rounded-xl glass-card text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Tailwind vs Bootstrap
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
