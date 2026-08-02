import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Sparkles, Code2, ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const formatLangName = (slug: string) => {
  const s = slug.toLowerCase();
  if (s === "typescript") return "TypeScript";
  if (s === "javascript") return "JavaScript";
  if (s === "cpp" || s === "cplusplus") return "C++";
  if (s === "csharp") return "C#";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const languageName = formatLangName(lang);

  const title = `Top Welcoming Open-Source ${languageName} Projects (C-Rank™) — Opendoor`;
  const description = `Discover high-ranking open-source ${languageName} repositories with fast maintainer response times and high PR merge rates on Opendoor.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://opendoor.abhishekco.de/rankings/${lang.toLowerCase()}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://opendoor.abhishekco.de/rankings/${lang}`,
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
  const languageName = formatLangName(lang);
  const repos = await getRankingRepos(languageName);

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full font-mono">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section for Language Rankings */}
        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white p-6 sm:p-8 shadow-xs mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Trophy className="h-3.5 w-3.5 text-emerald-600" /> Top Welcoming Repositories Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              <Code2 className="h-3.5 w-3.5" /> {languageName} Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Top Welcoming Open-Source {languageName} Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Ranked by Opendoor&apos;s proprietary <strong>C-Rank™</strong> score. These public GitHub {languageName} projects feature high external pull request merge rates, rapid maintainer review turnarounds, and constructive contributor vibes.
          </p>
        </div>

        {/* Repositories Grid */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
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
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 text-xs mb-12">
            No {languageName} repositories indexed yet. Check back after next seed run!
          </div>
        )}

        {/* SEO Article Module */}
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 sm:p-8 font-sans">
          <h3 className="text-base font-mono font-bold text-zinc-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Why contribute to {languageName} open-source projects on Opendoor?
          </h3>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3 text-xs sm:text-sm">
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
