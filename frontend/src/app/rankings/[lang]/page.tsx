import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { getEcosystemMetadata } from "@/lib/ecosystem-descriptions";
import { LangDigestSignup } from "@/components/LangDigestSignup";
import { Sparkles, Code2, Trophy, Sprout, Star, GitPullRequest, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { CRankBadge } from "@/components/CRankBadge";
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

  const languageName = displayNameFromSlug(lang);
  const rawRepos = await getRankingRepos(languageName);

  // Filter and rank repos
  const scoredList: RankedRepoItem[] = rawRepos.map((repo) => {
    const mergeRate = repo.external_pr_merge_rate || 0;
    const score = repo.c_rank_score || repo.score || 0;
    const goodFirstIssues = repo.good_first_issue_count || 0;
    const hasContributing = Boolean(repo.has_contributing_md);

    return {
      repo,
      score,
      mergeRate,
      goodFirstIssues,
      hasContributing,
    };
  });

  // Sort descending by score, then mergeRate, then stars
  scoredList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.mergeRate !== a.mergeRate) return b.mergeRate - a.mergeRate;
    return (b.repo.stars || 0) - (a.repo.stars || 0);
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
        name: `What is the most welcoming ${languageName} open-source repository?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: rankedItems.length > 0
            ? `The highest-ranked ${languageName} repository on GetMerged is currently ${rankedItems[0].repo.full_name}, with a C-Rank score of ${rankedItems[0].score.toFixed(1)}/100 and a ${rankedItems[0].mergeRate.toFixed(1)}% PR merge rate.`
            : `Visit GetMerged to view the latest ranked ${languageName} repositories.`,
        },
      },
      {
        "@type": "Question",
        name: `How can I find good first issues in ${languageName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `You can browse verified beginner-friendly issues in ${languageName} by visiting our curated Good First Issues directory at https://getmerged.abhishekco.de/good-first-issue/${canonicalLang}.`,
        },
      },
      {
        "@type": "Question",
        name: `What makes a ${languageName} repository 'Super Welcoming' on GetMerged?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `A 'Super Welcoming' (S-Tier) ${languageName} repository demonstrates an external PR merge rate above 80%, a median first response time within 24 to 48 hours, active review feedback, and clear onboarding documentation.`,
        },
      },
    ],
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black text-white font-sans selection:bg-orange-500/30">
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 w-full text-zinc-100 font-sans">
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/" title="Home" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/rankings" title="All Ecosystem Rankings" className="hover:text-white transition-colors">
            Rankings
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">{languageName}</span>
        </nav>

        {/* Hero Section */}
        <div className="rounded-3xl glass-panel p-6 sm:p-12 shadow-2xl mb-12 relative overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.1] px-4 py-1.5 text-xs font-bold text-white font-mono shadow-sm">
              <Trophy className="h-4 w-4 text-amber-400" /> Welcoming Repositories Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-4 py-1.5 text-xs font-bold text-sky-300 font-mono">
              <Code2 className="h-4 w-4 text-sky-400" /> {languageName} Ecosystem
            </span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight font-space leading-[1.1] max-w-4xl">
            Top Welcoming Open-Source {languageName} Repositories
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-200 max-w-3xl leading-relaxed font-sans">
            Empirical C-Rank™ telemetry for {languageName} projects. Scored from 90-day external PR merge rates, maintainer response velocity, first-timer success rates, and onboarding documentation.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-zinc-400">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry verified daily • {latestSnapshotDate ? latestSnapshotDate.toUTCString().slice(0, 16) : "Live"} UTC</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/good-first-issue/${canonicalLang}`}
              title={`Browse open ${languageName} good first issues`}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-3.5 text-xs font-bold font-mono text-white transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer active:scale-[0.98]"
            >
              <Sprout className="h-4 w-4" />
              <span>Browse {totalGFIs > 0 ? `${totalGFIs} Good First Issues` : `Good First Issues`} in {languageName}</span>
            </Link>
            <Link
              href="/compare"
              title="Compare repository maintainer velocity"
              className="inline-flex items-center gap-2 rounded-xl glass-card px-6 py-3.5 text-xs font-bold font-mono text-zinc-200 hover:text-white transition-all shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <GitPullRequest className="h-4 w-4 text-orange-400" />
              <span>Compare Two {languageName} Repos</span>
            </Link>
          </div>
        </div>

        {/* Ecosystem Live Telemetry Snapshot KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
          <div className="glass-panel p-6 rounded-2xl shadow-md">
            <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">Tracked Repos</div>
            <div className="mt-2 text-3xl sm:text-4xl font-black font-space text-white">{rankedItems.length}</div>
            <div className="text-xs text-zinc-400 font-sans mt-1">&gt;100 stars verified</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl shadow-md">
            <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">Avg Merge Rate</div>
            <div className="mt-2 text-3xl sm:text-4xl font-black font-space text-emerald-400">{avgMergeRate}%</div>
            <div className="text-xs text-zinc-400 font-sans mt-1">90-day external PRs</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl shadow-md">
            <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">Open GFIs</div>
            <div className="mt-2 text-3xl sm:text-4xl font-black font-space text-amber-400">{totalGFIs}</div>
            <div className="text-xs text-zinc-400 font-sans mt-1">Beginner friendly issues</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl shadow-md">
            <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">Welcoming Tier</div>
            <div className="mt-2 text-3xl sm:text-4xl font-black font-space text-sky-400">{superWelcomingCount}</div>
            <div className="text-xs text-zinc-400 font-sans mt-1">S & A Tier maintainers</div>
          </div>
        </div>

        {/* Repositories Header with count note */}
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.1] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 font-space">
              <Activity className="h-5 w-5 text-orange-400" />
              Ranked {languageName} Repositories
            </h2>
            {rankedItems.length > 0 && (
              <p className="text-xs text-zinc-400 font-sans mt-1">
                {rankedItems.length < 50
                  ? `Showing ${rankedItems.length} of 50 qualifying projects`
                  : `Showing top 50 ranked repositories`}
              </p>
            )}
          </div>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">Telemetry Updated Daily</span>
        </div>

        {/* Repositories Table or Error State */}
        {isDataAbsentOrFailed ? (
          <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center text-zinc-200 mb-12 border border-dashed border-rose-500/30 shadow-md">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-space">
              Unable to load {languageName} rankings snapshot
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto mb-4 font-sans leading-relaxed">
              {isDataStale
                ? `Snapshot data is stale (>7 days old).`
                : `No snapshot data currently available for ${languageName}.`}
              {latestSnapshotDate && (
                <span className="block mt-1 text-zinc-400 font-mono text-xs">
                  Last successful snapshot: {latestSnapshotDate.toUTCString()}
                </span>
              )}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-900 border border-white/[0.08] px-3 py-1.5 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              <span>Please retry in a few moments or run the snapshot pipeline.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl glass-panel shadow-2xl mb-14 border border-white/[0.12]">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="bg-white/[0.04] text-zinc-200 border-b border-white/[0.1] font-bold uppercase tracking-wider font-space text-xs">
                <tr>
                  <th className="py-4.5 px-6 text-center w-16">Rank</th>
                  <th className="py-4.5 px-6">Repository</th>
                  <th className="py-4.5 px-6 text-center">Tier</th>
                  <th className="py-4.5 px-6 text-right">Score</th>
                  <th className="py-4.5 px-6 text-right">Merge Rate</th>
                  <th className="py-4.5 px-6 text-right">Good First Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono">
                {rankedItems.map((item, idx) => {
                  const [owner, name] = item.repo.full_name.split("/");
                  const tier = item.repo.c_rank_tier || "A";

                  return (
                    <tr key={item.repo.id} className="hover:bg-white/[0.04] transition-colors group">
                      <td className="py-5 px-6 text-center font-bold text-zinc-400 text-sm">
                        #{idx + 1}
                      </td>
                      <td className="py-5 px-6 font-bold text-white font-sans">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/${owner}/${name}`}
                            title={`View ${item.repo.full_name} C-Rank scorecard and merge metrics`}
                            className="text-white group-hover:text-orange-400 transition-colors font-space text-base font-bold underline-offset-2 hover:underline cursor-pointer"
                          >
                            {item.repo.full_name}
                          </Link>
                          {item.repo.stars !== undefined && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-zinc-300 bg-white/[0.08] px-2.5 py-0.5 rounded-md border border-white/[0.1]">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {item.repo.stars.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.repo.description && (
                          <div className="text-xs font-normal text-zinc-300 font-sans line-clamp-1 max-w-xl mt-1">
                            {item.repo.description}
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <CRankBadge rank={tier} size="sm" showLabel={true} />
                      </td>
                      <td className="py-5 px-6 text-right font-black text-white text-base">
                        {item.score.toFixed(1)}
                      </td>
                      <td className="py-5 px-6 text-right text-zinc-200">
                        <span className="inline-flex items-center gap-1.5 font-bold text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                          <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" />
                          {item.mergeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right text-zinc-200">
                        {item.goodFirstIssues > 0 ? (
                          <Link
                            href={`/${owner}/${name}#good-first-issues`}
                            title={`View ${item.goodFirstIssues} open Good First Issues in ${item.repo.full_name}`}
                            className="inline-flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer text-sm"
                          >
                            <Sprout className="h-3.5 w-3.5 text-amber-400" />
                            <span>{item.goodFirstIssues}</span>
                          </Link>
                        ) : (
                          <span className="text-zinc-500 text-sm font-mono"> - </span>
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
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-14">
          <div className="rounded-3xl glass-panel p-6 sm:p-10 font-sans shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-5 flex items-center gap-2 font-space">
              <Sparkles className="h-5 w-5 text-orange-400" />
              How to Get Your {languageName} PR Merged
            </h3>
            <div className="space-y-4 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">1</div>
                <div><strong className="text-white font-semibold">Check C-Rank™ First:</strong> Pick projects with S or A tiers to avoid maintainer ghosts and slow review cycles.</div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">2</div>
                <div><strong className="text-white font-semibold">Run Local Verification:</strong> Ensure test suites and formatting linters pass before opening a pull request.</div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">3</div>
                <div><strong className="text-white font-semibold">Submit in Maintainer Windows:</strong> Check the repository report card to submit when maintainers are most active.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl glass-panel p-6 sm:p-10 font-sans shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-5 flex items-center gap-2 font-space">
              <Trophy className="h-5 w-5 text-amber-400" />
              Top {languageName} Frameworks
            </h3>
            <div className="flex flex-wrap gap-2.5 pt-1 font-sans text-xs">
              <Link
                href="/topics/android"
                title="Browse open source Android repositories"
                className="px-4 py-2.5 rounded-xl glass-card text-zinc-100 hover:text-white font-mono cursor-pointer transition-colors"
              >
                #android
              </Link>
              <Link
                href="/topics/compose"
                title="Browse open source Jetpack Compose repositories"
                className="px-4 py-2.5 rounded-xl glass-card text-zinc-100 hover:text-white font-mono cursor-pointer transition-colors"
              >
                #compose-multiplatform
              </Link>
              <Link
                href="/topics/ktor"
                title="Browse open source Ktor repositories"
                className="px-4 py-2.5 rounded-xl glass-card text-zinc-100 hover:text-white font-mono cursor-pointer transition-colors"
              >
                #ktor
              </Link>
              <Link
                href="/topics/spring"
                title="Browse open source Spring repositories"
                className="px-4 py-2.5 rounded-xl glass-card text-zinc-100 hover:text-white font-mono cursor-pointer transition-colors"
              >
                #spring-boot
              </Link>
            </div>
          </div>
        </section>

        {/* Email Digest Signup Component */}
        <div className="mb-14">
          <LangDigestSignup language={canonicalLang} languageName={languageName} />
        </div>

        {/* Dynamic Schema-Generated FAQs */}
        <section className="rounded-3xl glass-panel p-6 sm:p-12 font-sans shadow-xl">
          <h3 className="text-2xl font-bold text-white font-space mb-8">
            Frequently Asked Questions: {languageName} Open Source
          </h3>
          <div className="space-y-8 text-sm">
            <div>
              <h4 className="font-bold text-white font-space text-lg mb-2">
                What is the most welcoming {languageName} open-source repository?
              </h4>
              <p className="text-zinc-200 leading-relaxed font-sans">
                {rankedItems.length > 0
                  ? `The highest-ranked ${languageName} repository on GetMerged is currently ${rankedItems[0].repo.full_name}, with a C-Rank score of ${rankedItems[0].score.toFixed(1)}/100 and a ${rankedItems[0].mergeRate.toFixed(1)}% PR merge rate.`
                  : `Visit GetMerged to view the latest ranked ${languageName} repositories.`}
              </p>
            </div>
            <div className="border-t border-white/[0.1] pt-8">
              <h4 className="font-bold text-white font-space text-lg mb-2">
                How can I find good first issues in {languageName}?
              </h4>
              <p className="text-zinc-200 leading-relaxed font-sans">
                You can browse verified beginner-friendly issues in {languageName} by visiting our curated Good First Issues directory at{" "}
                <Link
                  href={`/good-first-issue/${canonicalLang}`}
                  title={`Open ${languageName} good first issues directory`}
                  className="text-orange-400 hover:text-orange-300 underline font-semibold"
                >
                  getmerged.abhishekco.de/good-first-issue/{canonicalLang}
                </Link>
                .
              </p>
            </div>
            <div className="border-t border-white/[0.1] pt-8">
              <h4 className="font-bold text-white font-space text-lg mb-2">
                What makes a {languageName} repository &lsquo;Super Welcoming&rsquo; on GetMerged?
              </h4>
              <p className="text-zinc-200 leading-relaxed font-sans">
                A &lsquo;Super Welcoming&rsquo; (S-Tier) {languageName} repository demonstrates an external PR merge rate above 80%, a median first response time within 24 to 48 hours, active review feedback, and clear onboarding documentation.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
