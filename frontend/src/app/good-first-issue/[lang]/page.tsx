import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Sparkles, Code2, ArrowLeft, ShieldCheck, Sprout } from "lucide-react";
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
  if (s === "golang" || s === "go") return "Go";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const languageName = formatLangName(lang);

  const title = `Good First Issues in ${languageName} (Beginner Friendly) - Opendoor`;
  const description = `Find open-source ${languageName} repositories with active Good First Issues, beginner-friendly labels, fast review response times, and high first-timer merge rates on Opendoor.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://opendoor.abhishekco.de/good-first-issue/${lang.toLowerCase()}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://opendoor.abhishekco.de/good-first-issue/${lang.toLowerCase()}`,
      siteName: "Opendoor",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function getGFIRepos(languageName: string): Promise<Repo[]> {
  try {
    const queryParams = new URLSearchParams({
      language: languageName,
      sort: "c_rank_score",
      order: "desc",
      per_page: "20",
    });
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${queryParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Repo[] = data.data || data.repos || [];
    // Prioritize repos with active good first issues
    return list.filter((r) => (r.good_first_issue_count || 0) > 0).concat(list.filter((r) => (r.good_first_issue_count || 0) === 0));
  } catch (e) {
    console.error("Failed to fetch GFI repos during SSR", e);
    return [];
  }
}

export default async function GoodFirstIssuePage({ params }: PageProps) {
  const { lang } = await params;
  const languageName = formatLangName(lang);
  const repos = await getGFIRepos(languageName);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Good First Issues in ${languageName}`,
    description: `Browse beginner-friendly open-source ${languageName} repositories with open good first issues on Opendoor.`,
    url: `https://opendoor.abhishekco.de/good-first-issue/${lang.toLowerCase()}`,
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full text-zinc-800 font-sans">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/70 text-xs text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors mb-6 font-sans border border-zinc-200/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10 border border-zinc-100">
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border-2 border-emerald-900 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 font-space shadow-[2px_2px_0px_#065f46] rotate-1">
              <Sprout className="h-3.5 w-3.5 text-emerald-700" /> Beginner Friendly Open-Source
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border-2 border-blue-900 px-3.5 py-1.5 text-xs font-extrabold text-blue-950 font-space shadow-[2px_2px_0px_#1e3a8a] -rotate-1">
              <Code2 className="h-3.5 w-3.5 text-blue-900" /> {languageName}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Good First Issues in {languageName}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Looking for your first open-source contribution in <strong>{languageName}</strong>? Opendoor indexes repositories with active beginner labels (<code>good first issue</code>, <code>beginner-friendly</code>, <code>first-timers-only</code>, <code>up-for-grabs</code>) combined with real maintainer review response telemetry.
          </p>
        </div>

        {/* Repositories Grid */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200/40 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Top {languageName} Repositories with Beginner Issues ({repos.length})
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
            No {languageName} repositories indexed yet. Check back soon!
          </div>
        )}

        {/* SEO Article Module */}
        <section className="rounded-2xl bg-zinc-100/50 p-6 sm:p-8 font-sans shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            How to make your first {languageName} open-source pull request
          </h3>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3 text-xs sm:text-sm font-sans">
            <p>
              Finding approachable <strong>Good First Issues in {languageName}</strong> allows you to build real-world software engineering experience. Instead of submitting PRs to abandoned repositories, Opendoor verifies maintainer review speeds and first-timer acceptance rates before you write a single line of code.
            </p>
            <p>
              Select any repository above to inspect maintainer response times, view active beginner issue tags, and click through to claim your issue on GitHub!
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
