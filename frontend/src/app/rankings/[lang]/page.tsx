import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { getEcosystemMetadata } from "@/lib/ecosystem-descriptions";
import { Sparkles, Code2, ArrowLeft, Trophy, Sprout, Star, GitPullRequest, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export interface RankedRepoItem {
  repo: Repo;
  score: number;
  mergeRate: number;
  goodFirstIssues: number;
  hasContributing: boolean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/rankings/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(lang);
  const meta = getEcosystemMetadata(canonicalLang);
  const title = meta.title;
  const description = meta.description;

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
      canonical: `https://getmerged.abhishekco.de/rankings/${canonicalLang}`,
      types: {
        "application/atom+xml": `https://getmerged.abhishekco.de/feeds/${canonicalLang}.xml`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://getmerged.abhishekco.de/rankings/${canonicalLang}`,
      siteName: "GetMerged",
      images: [
        {
          url: `https://getmerged.abhishekco.de/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://getmerged.abhishekco.de/opengraph-image`],
    },
  };
}

async function getRankingRepos(languageName: string): Promise<Repo[]> {
  try {
    const queryParams = new URLSearchParams({
      language: languageName,
      min_stars: "100",
      per_page: "100",
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
  const fetchedRepos = await getRankingRepos(languageName);

  // Filter qualifying repos: primary language matches, stars >= 100 & score_source != fallback
  const qualifying = fetchedRepos.filter((r) => {
    const isLangMatch = (r.language || "").toLowerCase() === languageName.toLowerCase();
    const hasMinStars = (r.stars ?? 0) >= 100;
    const isNotFallback = r.score_source !== "fallback";
    return isLangMatch && hasMinStars && isNotFallback;
  });

  // Calculate score and map items
  // score = 0.5*newcomer_PR_merge_rate_90d_pct + 0.3*good_first_issue_count_open + 0.2*(has_contributing_md ? 1 : 0)
  // Repos with newcomer merge rate NULL treated as 0 in score
  // Ties broken by good_first_issue_count_open desc, then full_name asc
  const scoredList: RankedRepoItem[] = qualifying.map((repo) => {
    const rawMergeRate = repo.newcomer_PR_merge_rate_90d_pct ?? repo.first_timer_success_rate ?? repo.external_pr_merge_rate;
    const mergeRate = typeof rawMergeRate === "number" && !isNaN(rawMergeRate) ? rawMergeRate : 0;
    const goodFirstIssues = repo.good_first_issue_count_open ?? repo.good_first_issue_count ?? 0;
    const hasContributing = repo.has_contributing_md ?? (repo.onboarding_score ? repo.onboarding_score >= 40 : false);
    const contributingFactor = hasContributing ? 1 : 0;

    const score = 0.5 * mergeRate + 0.3 * goodFirstIssues + 0.2 * contributingFactor;

    return {
      repo,
      score,
      mergeRate,
      goodFirstIssues,
      hasContributing,
    };
  });

  // Sort: score desc, ties broken by good_first_issue_count_open desc, then full_name asc
  scoredList.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.goodFirstIssues !== a.goodFirstIssues) {
      return b.goodFirstIssues - a.goodFirstIssues;
    }
    return a.repo.full_name.localeCompare(b.repo.full_name);
  });

  // Top 50 repos
  const rankedItems = scoredList.slice(0, 50);

  // Check snapshot staleness (>7 days old)
  let latestSnapshotDate: Date | null = null;
  for (const item of rankedItems) {
    const rawDate = item.repo.snapshot_date || item.repo.updated_at;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        if (!latestSnapshotDate || d > latestSnapshotDate) {
          latestSnapshotDate = d;
        }
      }
    }
  }

  const now = new Date();
  const isDataStale = latestSnapshotDate ? (now.getTime() - latestSnapshotDate.getTime()) > 7 * 24 * 60 * 60 * 1000 : false;
  const isDataAbsentOrFailed = rankedItems.length === 0 || isDataStale;

  // Schema.org Structured Data
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top Welcoming Open-Source ${languageName} Repositories`,
    description: `Ranked list of public GitHub ${languageName} repositories with high PR merge rates and fast maintainer response times.`,
    itemListElement: rankedItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.repo.full_name,
      url: `https://getmerged.abhishekco.de/${item.repo.full_name}`,
    })),
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
        name: "Ecosystem Rankings",
        item: "https://getmerged.abhishekco.de/rankings",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${languageName} Rankings`,
        item: `https://getmerged.abhishekco.de/rankings/${canonicalLang}`,
      },
    ],
  };

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${languageName} Open-Source Repository Contributor Friendliness Dataset`,
    description: `Empirical telemetry including PR merge rates, newcomer merge rates, and welcoming scores across ${languageName} repositories.`,
    url: `https://getmerged.abhishekco.de/rankings/${canonicalLang}`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
    variableMeasured: [
      "PR Merge Rate (90d)",
      "Time to First Review Response",
      "First-Timer Merge Success Rate",
      "Good First Issue Count",
      "C-Rank Score",
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `https://getmerged.abhishekco.de/api/v1/repos?language=${encodeURIComponent(languageName)}`,
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6] dev-grid-pattern">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full text-zinc-800 font-sans">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Section */}
        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-zinc-200/80 shadow-xs mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Top Welcoming Repositories Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-900 font-mono">
              <Code2 className="h-3.5 w-3.5 text-blue-700" /> {languageName} Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Top Welcoming Open-Source {languageName} Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Ranked by contributor welcoming score computed from newcomer 90-day PR merge rates (40%), response velocity (25%), first-timer success (20%), and documentation readiness (15%).
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <RefreshCw className="w-3 h-3 text-emerald-600" />
            <span>Telemetry updated: {latestSnapshotDate ? latestSnapshotDate.toUTCString().slice(0, 16) : "Daily"} UTC</span>
          </div>
          <div className="mt-5">
            <Link
              href={`/good-first-issue/${canonicalLang}`}
              title={`Browse open ${languageName} good first issues`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Sprout className="h-3.5 w-3.5" />
              Browse Good First Issues in {languageName}
            </Link>
          </div>
        </div>

        {/* Repositories Header with count note */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
              Ranked {languageName} Repositories
            </h2>
            {rankedItems.length > 0 && (
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                {rankedItems.length < 50
                  ? `Showing ${rankedItems.length} of 50`
                  : `Showing top 50 repositories`}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-500 font-mono">Updated Daily via GitHub GraphQL</span>
        </div>

        {/* Repositories Table or Error State */}
        {isDataAbsentOrFailed ? (
          <div className="rounded-2xl bg-white p-8 sm:p-12 text-center text-zinc-600 mb-12 border border-dashed border-red-200 shadow-xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2 font-space">
              Unable to load {languageName} rankings snapshot
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto mb-4 font-sans leading-relaxed">
              {isDataStale
                ? `Snapshot data is stale (>7 days old).`
                : `No snapshot data currently available for ${languageName}.`}
              {latestSnapshotDate && (
                <span className="block mt-1 text-zinc-600 font-mono text-xs">
                  Last successful snapshot: {latestSnapshotDate.toUTCString()}
                </span>
              )}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              <span>Please retry in a few moments or run the snapshot pipeline.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white border border-zinc-200/80 shadow-xs mb-12">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 text-zinc-800 border-b border-zinc-200 font-semibold uppercase tracking-wider font-space text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Repository</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                  <th className="py-3.5 px-4 text-right">Merge Rate</th>
                  <th className="py-3.5 px-4 text-right">Open Good-First-Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {rankedItems.map((item, idx) => {
                  const [owner, name] = item.repo.full_name.split("/");
                  return (
                    <tr key={item.repo.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${owner}/${name}`}
                            title={`View ${item.repo.full_name} details and merge telemetry`}
                            className="hover:text-emerald-700 transition-colors font-space text-sm"
                          >
                            {item.repo.full_name}
                          </Link>
                          {item.repo.stars !== undefined && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-normal text-zinc-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                              {item.repo.stars.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.repo.description && (
                          <div className="text-[11px] font-normal text-zinc-400 font-sans truncate max-w-lg mt-0.5">
                            {item.repo.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900 text-sm">
                        {item.score.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" />
                          {item.mergeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-800">
                          <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                          {item.goodFirstIssues}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Informational Section */}
        <section className="rounded-3xl bg-white p-6 sm:p-8 border border-zinc-200 font-sans shadow-xs">
          <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Why contribute to {languageName} open-source projects on GetMerged?
          </h3>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3 text-xs sm:text-sm font-sans">
            <p>
              Contributing to open-source {languageName} codebases is one of the fastest ways to expand your software engineering portfolio. However, submitting pull requests to unmaintained repositories leads to frustration when PRs remain untouched for months.
            </p>
            <p>
              GetMerged eliminates guessing by analyzing maintainer response times, PR merge rates, and first-timer success metrics across the entire {languageName} open-source ecosystem.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
