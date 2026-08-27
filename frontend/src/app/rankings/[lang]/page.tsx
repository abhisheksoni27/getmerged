import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { getEcosystemMetadata } from "@/lib/ecosystem-descriptions";
import { LangDigestSignup } from "@/components/LangDigestSignup";
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

  // Ecosystem aggregate telemetry KPIs
  const totalGFIs = rankedItems.reduce((acc, curr) => acc + curr.goodFirstIssues, 0);
  const avgMergeRate = rankedItems.length > 0
    ? Math.round(rankedItems.reduce((acc, curr) => acc + curr.mergeRate, 0) / rankedItems.length)
    : 0;
  const superWelcomingCount = rankedItems.filter((item) => item.repo.c_rank_tier === "S" || item.repo.c_rank_tier === "A").length;

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How does GetMerged calculate the best ${languageName} repositories to contribute to?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `GetMerged continuously monitors public GitHub telemetry across ${languageName} repositories, analyzing 90-day external PR merge rates, maintainer response velocity, first-time contributor acceptance rates, and active good first issues.`,
        },
      },
      {
        "@type": "Question",
        name: `Where can beginners find good first issues in ${languageName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `You can browse live, maintainer-verified Good First Issues on GetMerged's dedicated ${languageName} feed, or filter by beginner-friendly repositories in our leaderboard with high first-timer merge rates.`,
        },
      },
      {
        "@type": "Question",
        name: `What makes a ${languageName} repository 'Super Welcoming'?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `A 'Super Welcoming' (S-Tier) ${languageName} repository demonstrates an external PR merge rate above 80%, a median first response time within 24 to 48 hours, active review feedback, and clear onboarding documentation.`,
        },
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0f172a] dev-grid-pattern">
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full text-zinc-200 font-sans">
        {/* Navigation Breadcrumb */}
        <Link
          href="/rankings"
          title="Browse All Language Ecosystem Rankings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-zinc-400 hover:text-zinc-100 transition-colors mb-6 font-sans shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Ecosystems
        </Link>

        {/* Hero Section */}
        <div className="rounded-3xl bg-[#111827] p-6 sm:p-10 border border-white/[0.08] shadow-xs mb-8 border-b border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e293b] px-3 py-1 text-xs font-semibold text-white font-mono shadow-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Top Welcoming Repositories Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-950/70 border-blue-800/80 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-300 font-mono">
              <Code2 className="h-3.5 w-3.5 text-blue-700" /> {languageName} Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight font-space">
            Top Welcoming Open-Source {languageName} Repositories
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-sans">
            Empirical C-Rank™ telemetry for {languageName} projects. Scored from 90-day external PR merge rates, maintainer response velocity, first-timer success rates, and onboarding documentation.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <RefreshCw className="w-3 h-3 text-emerald-600" />
            <span>Telemetry verified daily • {latestSnapshotDate ? latestSnapshotDate.toUTCString().slice(0, 16) : "Live"} UTC</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/good-first-issue/${canonicalLang}`}
              title={`Browse open ${languageName} good first issues`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Sprout className="h-3.5 w-3.5" />
              Browse {totalGFIs > 0 ? `${totalGFIs} Good First Issues` : `Good First Issues`} in {languageName}
            </Link>
            <Link
              href="/compare"
              title="Compare repository maintainer velocity"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e293b] border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-200 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-zinc-400" />
              Compare Two {languageName} Repos
            </Link>
          </div>
        </div>

        {/* Ecosystem Live Telemetry Snapshot KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
          <div className="bg-[#111827] p-4 rounded-2xl border border-white/[0.08] shadow-2xs">
            <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Tracked Repos</div>
            <div className="mt-1 text-2xl font-bold font-space text-zinc-100">{rankedItems.length}</div>
            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">&gt;100 stars verified</div>
          </div>
          <div className="bg-[#111827] p-4 rounded-2xl border border-white/[0.08] shadow-2xs">
            <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Avg Merge Rate</div>
            <div className="mt-1 text-2xl font-bold font-space text-emerald-600">{avgMergeRate}%</div>
            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">90-day external PRs</div>
          </div>
          <div className="bg-[#111827] p-4 rounded-2xl border border-white/[0.08] shadow-2xs">
            <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Open GFIs</div>
            <div className="mt-1 text-2xl font-bold font-space text-zinc-100">{totalGFIs}</div>
            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">Beginner friendly issues</div>
          </div>
          <div className="bg-[#111827] p-4 rounded-2xl border border-white/[0.08] shadow-2xs">
            <div className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Welcoming Tier</div>
            <div className="mt-1 text-2xl font-bold font-space text-blue-600">{superWelcomingCount}</div>
            <div className="text-[11px] text-zinc-400 font-sans mt-0.5">S & A Tier maintainers</div>
          </div>
        </div>

        {/* Repositories Header with count note */}
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 font-space">
              Ranked {languageName} Repositories
            </h2>
            {rankedItems.length > 0 && (
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {rankedItems.length < 50
                  ? `Showing ${rankedItems.length} of 50 qualifying projects`
                  : `Showing top 50 ranked repositories`}
              </p>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">Telemetry Updated Daily</span>
        </div>

        {/* Repositories Table or Error State */}
        {isDataAbsentOrFailed ? (
          <div className="rounded-2xl bg-[#111827] p-8 sm:p-12 text-center text-zinc-400 mb-12 border border-dashed border-red-200 shadow-xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-100 mb-2 font-space">
              Unable to load {languageName} rankings snapshot
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-4 font-sans leading-relaxed">
              {isDataStale
                ? `Snapshot data is stale (>7 days old).`
                : `No snapshot data currently available for ${languageName}.`}
              {latestSnapshotDate && (
                <span className="block mt-1 text-zinc-400 font-mono text-xs">
                  Last successful snapshot: {latestSnapshotDate.toUTCString()}
                </span>
              )}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#1e293b] border border-white/[0.08] px-3 py-1.5 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              <span>Please retry in a few moments or run the snapshot pipeline.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-[#111827] border border-white/[0.08] shadow-xs mb-10 border-b-2 border-b-zinc-900">
            <table className="w-full text-left text-xs text-zinc-400">
              <thead className="bg-[#1e293b] text-zinc-200 border-b border-white/[0.08] font-semibold uppercase tracking-wider font-space text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Repository</th>
                  <th className="py-3.5 px-4 text-center">Tier</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                  <th className="py-3.5 px-4 text-right">Merge Rate</th>
                  <th className="py-3.5 px-4 text-right">Good First Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-mono">
                {rankedItems.map((item, idx) => {
                  const [owner, name] = item.repo.full_name.split("/");
                  const tier = item.repo.c_rank_tier || "A";
                  const tierColor =
                    tier === "S"
                      ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-300 border-emerald-300"
                      : tier === "A"
                      ? "bg-blue-950/80 border-blue-800/80 text-blue-300 border-blue-300"
                      : tier === "B"
                      ? "bg-amber-950/80 border-amber-800/80 text-amber-300 border-amber-300"
                      : "bg-[#1e293b] text-zinc-200 border-white/[0.12]";

                  return (
                    <tr key={item.repo.id} className="hover:bg-[#1e293b]/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-zinc-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-100 font-sans">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${owner}/${name}`}
                            title={`View ${item.repo.full_name} C-Rank scorecard and merge metrics`}
                            className="hover:text-emerald-400 transition-colors font-space text-sm underline-offset-2 hover:underline cursor-pointer"
                          >
                            {item.repo.full_name}
                          </Link>
                          {item.repo.stars !== undefined && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-normal text-zinc-400">
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
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${tierColor}`}>
                          Tier {tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-100 text-sm">
                        {item.score.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-300">
                        <span className="inline-flex items-center gap-1">
                          <GitPullRequest className="h-3.5 w-3.5 text-emerald-600" />
                          {item.mergeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-300">
                        {item.goodFirstIssues > 0 ? (
                          <Link
                            href={`/${owner}/${name}#good-first-issues`}
                            title={`View ${item.goodFirstIssues} open Good First Issues in ${item.repo.full_name}`}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                          >
                            <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                            {item.goodFirstIssues}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Contributing Strategy Guide for this Ecosystem */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-3xl bg-[#111827] p-6 sm:p-8 border border-white/[0.08] font-sans shadow-xs border-b border-white/[0.08]">
            <h3 className="text-base font-bold text-zinc-100 mb-3 flex items-center gap-2 font-space">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              How to Get Your {languageName} PR Merged
            </h3>
            <div className="space-y-3 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 border-emerald-800/80 text-[11px] font-bold text-emerald-300 font-mono mt-0.5">1</div>
                <div><strong>Check C-Rank™ First:</strong> Pick projects with S or A tiers to avoid maintainer ghosts and slow review cycles.</div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 border-emerald-800/80 text-[11px] font-bold text-emerald-300 font-mono mt-0.5">2</div>
                <div><strong>Run Local Verification:</strong> Ensure test suites and formatting linters pass before opening a pull request.</div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 border-emerald-800/80 text-[11px] font-bold text-emerald-300 font-mono mt-0.5">3</div>
                <div><strong>Submit in Maintainer Windows:</strong> Check the repository report card to submit when maintainers are most active.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-[#111827] p-6 sm:p-8 border border-white/[0.08] font-sans shadow-xs border-b border-white/[0.08]">
            <h3 className="text-base font-bold text-zinc-100 mb-3 flex items-center gap-2 font-space">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top {languageName} Frameworks
            </h3>
            <div className="flex flex-wrap gap-2 pt-1 font-sans text-xs">
              <Link
                href="/topics/android"
                title="Browse open source Android repositories"
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-white/[0.08] text-zinc-300 hover:bg-emerald-950/70 border-emerald-800/80 hover:text-emerald-300 hover:border-emerald-200 transition-colors font-mono cursor-pointer"
              >
                #android
              </Link>
              <Link
                href="/topics/compose"
                title="Browse open source Jetpack Compose repositories"
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-white/[0.08] text-zinc-300 hover:bg-emerald-950/70 border-emerald-800/80 hover:text-emerald-300 hover:border-emerald-200 transition-colors font-mono cursor-pointer"
              >
                #compose-multiplatform
              </Link>
              <Link
                href="/topics/ktor"
                title="Browse open source Ktor repositories"
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-white/[0.08] text-zinc-300 hover:bg-emerald-950/70 border-emerald-800/80 hover:text-emerald-300 hover:border-emerald-200 transition-colors font-mono cursor-pointer"
              >
                #ktor
              </Link>
              <Link
                href="/topics/spring"
                title="Browse open source Spring repositories"
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-white/[0.08] text-zinc-300 hover:bg-emerald-950/70 border-emerald-800/80 hover:text-emerald-300 hover:border-emerald-200 transition-colors font-mono cursor-pointer"
              >
                #spring-boot
              </Link>
              <Link
                href="/topics/coroutine"
                title="Browse open source Kotlin Coroutines repositories"
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-white/[0.08] text-zinc-300 hover:bg-emerald-950/70 border-emerald-800/80 hover:text-emerald-300 hover:border-emerald-200 transition-colors font-mono cursor-pointer"
              >
                #coroutines
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-400 leading-relaxed font-sans">
              Looking for specific sub-ecosystems? Filter repositories by tag to find modern UI components, coroutines, and backend architectures.
            </p>
          </div>
        </section>

        {/* SEO FAQ Section */}
        <section className="rounded-3xl bg-[#111827] p-6 sm:p-8 border border-white/[0.08] font-sans shadow-xs mb-10">
          <h3 className="text-base font-bold text-zinc-100 mb-4 font-space">
            Frequently Asked Questions about {languageName} Open Source
          </h3>
          <div className="space-y-4 text-xs sm:text-sm text-zinc-400 font-sans">
            <details className="group border-b border-white/[0.08] pb-3 cursor-pointer">
              <summary className="font-semibold text-zinc-100 flex justify-between items-center select-none">
                How does GetMerged calculate the best {languageName} projects to contribute to?
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-2 text-zinc-400 leading-relaxed">
                GetMerged analyzes 90-day external pull request merge rates, maintainer response velocity, first-timer success rates, and open Good First Issues. Repositories with responsive maintainers and documented onboarding rank highest.
              </p>
            </details>
            <details className="group border-b border-white/[0.08] pb-3 cursor-pointer">
              <summary className="font-semibold text-zinc-100 flex justify-between items-center select-none">
                Where can beginners find Good First Issues in {languageName}?
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-2 text-zinc-400 leading-relaxed">
                You can browse verified <Link href={`/good-first-issue/${canonicalLang}`} title={`Browse ${languageName} Good First Issues`} className="text-emerald-400 underline font-medium">open {languageName} Good First Issues</Link> directly on GetMerged, linking straight to repositories that actively review newcomer pull requests.
              </p>
            </details>
            <details className="group pb-1 cursor-pointer">
              <summary className="font-semibold text-zinc-100 flex justify-between items-center select-none">
                What makes a {languageName} project &quot;Super Welcoming&quot;?
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-2 text-zinc-400 leading-relaxed">
                A &quot;Super Welcoming&quot; (S-Tier) {languageName} repository maintains an external PR merge rate over 80%, responds to new PRs within 24 - 48 hours, and provides welcoming, constructive feedback to first-time contributors.
              </p>
            </details>
          </div>
        </section>

        {/* Anonymous weekly language digest signup (AC1) */}
        <div className="mt-8">
          <LangDigestSignup language={canonicalLang} languageName={languageName} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
