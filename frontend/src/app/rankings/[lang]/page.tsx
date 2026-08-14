import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { Sparkles, Code2, ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/rankings/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(lang);
  const title = `Top Welcoming Open-Source ${languageName} Projects (C-Rank™) - Opendoor`;
  const description = `Discover high-ranking open-source ${languageName} repositories with fast maintainer response times and high PR merge rates on Opendoor.`;

  return {
    title,
    description,
    keywords: [
      `best open source ${languageName} projects`,
      `top ${languageName} repositories`,
      "github repositories",
      "developer portfolio",
      "open source contribution",
      "c-rank",
      "pull request merge rate",
      "maintainer response time",
    ],
    alternates: {
      canonical: `https://opendoor.abhishekco.de/rankings/${canonicalLang}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://opendoor.abhishekco.de/rankings/${canonicalLang}`,
      siteName: "Opendoor",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function getRankingRepos(languageName: string): Promise<Repo[]> {
  try {
    const queryParams = new URLSearchParams({
      language: languageName,
      sort: "c_rank_score",
      order: "desc",
      per_page: "15",
    });
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${queryParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (e) {
    console.error("Failed to fetch ranking repos during SSR", e);
    return [];
  }
}

export default async function LanguageRankingsPage({ params }: PageProps) {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/rankings/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(canonicalLang);
  const repos = await getRankingRepos(languageName);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full text-zinc-800 font-sans">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          title="Return to Opendoor Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/70 text-xs text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors mb-6 font-sans border border-zinc-200/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section for Language Rankings */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cream border-2 border-brand-dark px-3.5 py-1.5 text-xs font-extrabold text-brand-dark font-space shadow-[2px_2px_0px_#222831] rotate-1">
              <Trophy className="h-3.5 w-3.5 text-brand-dark" /> Top Welcoming Repositories Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border-2 border-blue-900 px-3.5 py-1.5 text-xs font-extrabold text-blue-950 font-space shadow-[2px_2px_0px_#1e3a8a] -rotate-1">
              <Code2 className="h-3.5 w-3.5 text-blue-900" /> {languageName} Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Top Welcoming Open-Source {languageName} Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Ranked by Opendoor&apos;s proprietary <strong>C-Rank™</strong> score. These public GitHub {languageName} projects feature high external pull request merge rates, rapid maintainer review turnarounds, and constructive contributor vibes.
          </p>
        </div>

        {/* Repositories Grid */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200/40 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Ranked {languageName} Repositories ({repos.length})
          </h2>
          <span className="text-xs text-zinc-500 font-sans">Updated Daily via GitHub GraphQL</span>
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center text-zinc-500 text-xs mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)] font-sans animate-pulse">
            No {languageName} repositories indexed yet. Check back after next seed run!
          </div>
        )}

        {/* SEO Article Module */}
        <section className="rounded-2xl bg-zinc-100/50 p-6 sm:p-8 font-sans shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Why contribute to {languageName} open-source projects on Opendoor?
          </h3>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3 text-xs sm:text-sm font-sans">
            <p>
              Contributing to open-source {languageName} codebases is one of the fastest ways to expand your software engineering portfolio. However, submitting pull requests to unmaintained repositories leads to frustration when PRs remain untouched for months.
            </p>
            <p>
              Opendoor eliminates guessing by analyzing maintainer response times, PR merge rates, and first-timer success metrics across the entire {languageName} open-source ecosystem.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
