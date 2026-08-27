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
} from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

interface ComparePageProps {
  params: Promise<{ slug?: string[] }>;
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

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  if (slug.length !== 5 || slug[2] !== "vs") {
    return { title: "Compare Open Source Repositories | GetMerged" };
  }

  const repoA = `${slug[0]}/${slug[1]}`;
  const repoB = `${slug[3]}/${slug[4]}`;

  const canonical = `https://getmerged.abhishekco.de/compare/${repoA}/vs/${repoB}`;
  const ogImage = `/api/og/vs?a=${encodeURIComponent(repoA)}&b=${encodeURIComponent(repoB)}`;

  return {
    title: `${repoA} vs ${repoB} Review & C-Rank™ Comparison (2026) | GetMerged`,
    description: `Compare ${repoA} vs ${repoB} pull request merge rates, maintainer response times, 90-day bus factor, and first-timer acceptance odds on GetMerged.`,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${repoA} vs ${repoB}: Should I Contribute? Showdown`,
      description: `Maintainer responsiveness & merge velocity verdict between ${repoA} and ${repoB}.`,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${repoA} vs ${repoB}: Should I Contribute? Showdown`,
      description: `Maintainer responsiveness & merge velocity verdict between ${repoA} and ${repoB}.`,
      images: [ogImage],
    },
  };
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { slug = [] } = await params;

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

  const [repoA, repoB] = await Promise.all([
    fetchRepoData(repoNameA),
    fetchRepoData(repoNameB),
  ]);

  if (!repoA || !repoB) {
    notFound();
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${repoA.full_name} vs ${repoB.full_name} Comparison`,
    description: `Side-by-side maintainer responsiveness and pull request merge likelihood comparison.`,
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

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300/80 text-emerald-300 text-xs font-mono font-bold mb-3">
            <Scale className="h-3.5 w-3.5" /> Repository Head-to-Head
          </div>
          <h1 className="font-space text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {repoA.full_name} <span className="text-zinc-300 font-normal">vs</span> {repoB.full_name}
          </h1>
          <p className="text-sm text-zinc-300 font-sans mt-2 max-w-2xl">
            Objective C-Rank™ telemetry comparison benchmarked across PR merge rates, reviewer latency, maintainer breadth, and newcomer hospitality.
          </p>
        </div>

        {/* Compare Share & Export Bar */}
        <CompareShareBar repoA={repoA} repoB={repoB} />

        {/* Should I Contribute? Repo vs Repo Showdown */}
        <VsShowdownCard repoA={repoA} repoB={repoB} />

        {/* Side-by-Side Comparison Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Card A */}
          <div className="rounded-3xl border border-white/[0.1] glass-panel p-6 shadow-xs flex flex-col justify-between">
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
              <p className="text-xs text-zinc-300 line-clamp-2 mb-6">{repoA.description || "No description provided."}</p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-500" /> External PR Merge Rate</span>
                  <strong className="text-white font-bold">{(repoA.external_pr_merge_rate || 0).toFixed(1)}%</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Review Latency (p50)</span>
                  <strong className="text-white font-bold">{(repoA.response_p50_hours || 0).toFixed(1)}h</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-500" /> 90-Day Bus Factor</span>
                  <strong className="text-white font-bold">{repoA.bus_factor ?? 0} Maintainers</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-500" /> Onboarding Readiness</span>
                  <strong className="text-white font-bold">{repoA.onboarding_score || 0}/100</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.1]">
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
          <div className="rounded-3xl border border-white/[0.1] glass-panel p-6 shadow-xs flex flex-col justify-between">
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
              <p className="text-xs text-zinc-300 line-clamp-2 mb-6">{repoB.description || "No description provided."}</p>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-blue-500" /> External PR Merge Rate</span>
                  <strong className="text-white font-bold">{(repoB.external_pr_merge_rate || 0).toFixed(1)}%</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Review Latency (p50)</span>
                  <strong className="text-white font-bold">{(repoB.response_p50_hours || 0).toFixed(1)}h</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-purple-500" /> 90-Day Bus Factor</span>
                  <strong className="text-white font-bold">{repoB.bus_factor ?? 0} Maintainers</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-white/[0.1]">
                  <span className="text-zinc-300 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-500" /> Onboarding Readiness</span>
                  <strong className="text-white font-bold">{repoB.onboarding_score || 0}/100</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.1]">
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
      </main>

      <Footer />
    </div>
  );
}
