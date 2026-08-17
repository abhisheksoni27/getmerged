import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { getLanguageFromSlug } from "@/lib/languageSlug";
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Lock,
  Compass,
} from "lucide-react";

export const revalidate = 3600;

interface ContributeLangPageProps {
  params: Promise<{ language: string }>;
}

async function fetchRankedRepos(language: string): Promise<Repo[]> {
  try {
    const rawLang = getLanguageFromSlug(language);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?language=${encodeURIComponent(rawLang)}&has_good_first_issue=true&per_page=15&sort=c_rank_score&order=desc`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (err) {
    console.error("fetchRankedRepos error:", err);
    return [];
  }
}

export async function generateMetadata({ params }: ContributeLangPageProps): Promise<Metadata> {
  const { language } = await params;
  const canonicalLang = getLanguageFromSlug(language);

  return {
    title: `Best ${canonicalLang} Open Source Repositories to Contribute To | GetMerged`,
    description: `Discover top-rated ${canonicalLang} GitHub repositories that welcome contributors with sub-24h review turnarounds, high merge rates, and active Good First Issues.`,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/contribute/${language}`,
    },
    openGraph: {
      title: `Best ${canonicalLang} Open Source Repositories to Contribute To | GetMerged`,
      description: `Find active ${canonicalLang} repositories with verified Good First Issues and fast maintainer response times.`,
      url: `https://getmerged.abhishekco.de/contribute/${language}`,
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export default async function ContributeLangPage({ params }: ContributeLangPageProps) {
  const { language } = await params;
  const canonicalLang = getLanguageFromSlug(language);
  const repos = await fetchRankedRepos(language);

  if (!repos || repos.length === 0) {
    notFound();
  }

  // Showcase Top 3, gate remaining behind GitHub OAuth
  const visibleRepos = repos.slice(0, 3);
  const gatedCount = Math.max(0, repos.length - 3);

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
        name: "Contribute Hub",
        item: "https://getmerged.abhishekco.de/contribute",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${canonicalLang} Opportunities`,
        item: `https://getmerged.abhishekco.de/contribute/${language}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top ${canonicalLang} Contributor-Friendly Repositories`,
    description: `Curated ${canonicalLang} repositories ranked by objective maintainer responsiveness and pull request merge likelihood.`,
    itemListElement: visibleRepos.map((repo, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: repo.full_name,
      url: `https://getmerged.abhishekco.de/${repo.full_name}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 border-b border-zinc-200/80 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono font-bold mb-3">
            <Compass className="h-3.5 w-3.5" /> Curated Ecosystem Match
          </div>
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Top {canonicalLang} Repositories Ready for Your PRs
          </h1>
          <p className="text-sm text-zinc-600 font-sans mt-2 max-w-2xl">
            Vetted {canonicalLang} open-source repositories with active maintainers, rapid review cycles, and verified Good First Issues.
          </p>
        </div>

        {/* Visible Top 3 Matched Repos */}
        <div className="space-y-4 mb-6">
          {visibleRepos.map((repo) => (
            <div
              key={repo.id}
              className="p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-emerald-500/80 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {repo.c_rank_tier || repo.class_rank || "A"} Tier
                  </span>
                  <span className="text-xs font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-medium">
                    {repo.language || "Multi-language"}
                  </span>
                  {(repo.good_first_issue_count ?? 0) > 0 && (
                    <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-emerald-200/60">
                      <Sparkles className="h-3 w-3" /> {repo.good_first_issue_count} GFIs
                    </span>
                  )}
                </div>
                <h2 className="font-space text-lg font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                  <Link
                    href={`/${repo.full_name}`}
                    title={`View contributor metrics for ${repo.full_name}`}
                    className="hover:underline flex items-center gap-1.5"
                  >
                    {repo.full_name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </Link>
                </h2>
                {repo.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-zinc-500 flex-wrap">
                  <span>Merge Rate: <strong className="text-zinc-900">{(repo.external_pr_merge_rate || 0).toFixed(1)}%</strong></span>
                  <span>Response: <strong className="text-zinc-900">{(repo.response_p50_hours || repo.time_to_first_response_hours || 0).toFixed(1)}h</strong></span>
                  <span>Maintainers: <strong className="text-zinc-900">{repo.bus_factor || 1} active</strong></span>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <Link
                  href={`/${repo.full_name}`}
                  title={`Open full scorecard for ${repo.full_name}`}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  View Scorecard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion Gate: Unlock Full Dataset */}
        {gatedCount > 0 && (
          <div className="rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center mb-8">
            <Lock className="h-6 w-6 text-emerald-700 mx-auto mb-2" />
            <h3 className="font-space text-lg font-bold text-zinc-900">
              Unlock {gatedCount}+ More {canonicalLang} Opportunities
            </h3>
            <p className="text-xs text-zinc-600 font-sans mt-1 max-w-md mx-auto">
              Sign in with GitHub to view your personalized Contributor Fit Radar, tailored issue matchmaker, and weekly digest alerts.
            </p>
            <div className="mt-4">
              <Link
                href="/repos"
                title={`Explore all ranked ${canonicalLang} repositories on GetMerged`}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs"
              >
                Browse All Ranked {canonicalLang} Repositories <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
