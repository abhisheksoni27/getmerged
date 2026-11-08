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
  PRSizeSweetSpotData,
  OptimalTimeData,
  PRLikelihoodData,
  parseCompareSlug,
  buildItemListJsonLd,
  buildBreadcrumbJsonLd,
} from "./lib/compareInsights";
import { VsColumn } from "./components/VsColumn";
import { PrSizeSection } from "./components/PrSizeSection";
import { OptimalTimeSection } from "./components/OptimalTimeSection";
import { DecisionFrameworkSection } from "./components/DecisionFrameworkSection";
import { PopularLinksSection } from "./components/PopularLinksSection";

export type {
  PRSizeCategory,
  PRSizeSweetSpotData,
  OptimalTimeData,
  PRLikelihoodData,
} from "./lib/compareInsights";

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
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { slug = [] } = await params;

  const parsed = parseCompareSlug(slug);

  // Single repo handling: /compare/owner/repo -> Redirect to picker with ?a=owner/repo
  if (parsed.kind === "single") {
    redirect(`/compare?a=${encodeURIComponent(parsed.repo)}`);
  }

  // Expected format: /compare/[orgA]/[repoA]/vs/[orgB]/[repoB] -> 5 segments
  if (parsed.kind === "invalid") {
    notFound();
  }

  // 1. Self-comparison redirect
  if (parsed.kind === "self") {
    redirect(`/${parsed.repo}`);
  }

  // 2. Lexicographical canonical redirect
  if (parsed.kind === "canonical-swap") {
    redirect(parsed.swapUrl);
  }

  if (parsed.kind !== "ok") {
    notFound();
  }

  const { repoNameA, repoNameB } = parsed;

  // 3. Fetch primary repo telemetry in parallel SSR
  const [repoA, repoB] = await Promise.all([
    fetchRepoData(repoNameA),
    fetchRepoData(repoNameB),
  ]);

  const hasBothRepos = repoA !== null && repoB !== null;
  if (!hasBothRepos || !repoA || !repoB) {
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

  const itemListJsonLd = buildItemListJsonLd(repoA, repoB);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(repoA, repoB);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans">
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
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
          <Link prefetch={false} href="/" title="Home" className="hover:text-[var(--text-primary)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link prefetch={false} href="/compare" title="All Comparisons" className="hover:text-[var(--text-primary)] transition-colors">
            Compare
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-semibold">{`${repoA.full_name} vs ${repoB.full_name}`}</span>
        </nav>

        {/* Header */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="hero-badge">
            <span className="dot" />
            <span>SIDE-BY-SIDE BENCHMARK</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            {`${repoA.full_name} `}
            <span className="text-[var(--text-tertiary)] font-normal">vs</span>
            {` ${repoB.full_name}`}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl">
            Objective C-Rank™ telemetry comparison benchmarked across PR merge rates, reviewer latency, PR size sweet spots, maintainer availability, and newcomer hospitality.
          </p>
        </div>

        {/* Compare Share & Export Bar */}
        <CompareShareBar repoA={repoA} repoB={repoB} />

        {/* Should I Contribute? Repo vs Repo Showdown */}
        <VsShowdownCard repoA={repoA} repoB={repoB} />

        {/* Side-by-Side High-Level Overview Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <VsColumn repo={repoA} firstTimerRate={likelihoodA?.first_timer_acceptance_rate} />
          <VsColumn repo={repoB} firstTimerRate={likelihoodB?.first_timer_acceptance_rate} />
        </div>

        <PrSizeSection
          repoNameA={repoA.full_name}
          repoNameB={repoB.full_name}
          sweetSpotA={sweetSpotA}
          sweetSpotB={sweetSpotB}
        />

        <OptimalTimeSection
          repoA={repoA}
          repoB={repoB}
          optimalTimeA={optimalTimeA}
          optimalTimeB={optimalTimeB}
        />

        <DecisionFrameworkSection repoA={repoA} repoB={repoB} />

        <PopularLinksSection />
      </main>

      <Footer />
    </div>
  );
}
