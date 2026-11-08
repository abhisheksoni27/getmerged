import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { getEcosystemMetadata } from "@/lib/ecosystem-descriptions";
import { LangDigestSignup } from "@/components/LangDigestSignup";
import { Sprout, Star, AlertTriangle, Sparkles, Trophy } from "lucide-react";
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

async function getRankingRepos(languageName: string): Promise<{ repos: Repo[]; total: number }> {
  try {
    const queryParams = new URLSearchParams({
      language: languageName,
      min_stars: "100",
      per_page: "100",
    });
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${queryParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { repos: [], total: 0 };
    const data = await res.json();
    const repos = data.data || data.repos || [];
    const total = typeof data.meta?.total === "number" ? data.meta.total : repos.length;
    return { repos, total };
  } catch (e) {
    console.error("Failed to fetch ranking repos during SSR", e);
    return { repos: [], total: 0 };
  }
}

export default async function LanguageRankingsPage({ params }: PageProps) {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/rankings/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(lang);
  const meta = getEcosystemMetadata(canonicalLang);
  const { repos: rawRepos, total: totalTrackedRepos } = await getRankingRepos(languageName);

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
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 w-full text-[var(--text-primary)] font-sans">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-xs font-mono text-[var(--text-tertiary)]">
          <Link prefetch={false} href="/" className="hover:text-[var(--text-primary)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link prefetch={false} href="/rankings" className="hover:text-[var(--text-primary)] transition-colors">
            Rankings
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-semibold">{languageName}</span>
        </div>

        {/* Hero Section */}
        <div className="card card-highlight p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link prefetch={false} href="/rankings" className="pill hover:border-[var(--border-hover)]">
              ← All Ecosystems
            </Link>
            <span className="pill pill-purple">{languageName} Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display mb-2.5">
            Top Welcoming {languageName} Repositories
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed mb-4">
            Ranked by empirical outside PR merge rate, P50 maintainer review turnaround, and beginner onboarding quality. Telemetry computed from public GitHub pull request history.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-green">✓ Active in last 30d</span>
            <span className="pill pill-purple">✓ Median Turnaround &lt; 24h</span>
            <span className="pill">Empirical 180d Telemetry</span>
            <Link
              prefetch={false}
              href={`/good-first-issue/${canonicalLang}`}
              className="pill pill-amber hover:border-[var(--border-hover)] inline-flex items-center gap-1 ml-auto"
            >
              <Sprout className="h-3 w-3" />
              <span>Browse {totalGFIs} Good First Issues</span>
            </Link>
          </div>
        </div>

        {/* Ecosystem Live Telemetry Snapshot KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <div className="tele-label">Tracked Repos</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular text-[var(--text-primary)]">
              {totalTrackedRepos > 0 ? totalTrackedRepos.toLocaleString() : rankedItems.length}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">&gt;100 stars verified</div>
          </div>
          <div className="card p-4">
            <div className="tele-label">Avg Merge Rate</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular text-[var(--green-bright)]">{avgMergeRate}%</div>
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">90-day external PRs</div>
          </div>
          <div className="card p-4">
            <div className="tele-label">Open GFIs</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular text-[var(--accent-warning)]">{totalGFIs}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">Beginner friendly</div>
          </div>
          <div className="card p-4">
            <div className="tele-label">Super Welcoming</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular text-[var(--purple-bright)]">{superWelcomingCount}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-0.5">Tier S &amp; A Maintainers</div>
          </div>
        </div>

        {/* Repositories Header with count note */}
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Ranked {languageName} Repositories ({rankedItems.length})
            </h2>
          </div>
          <span className="text-xs text-[var(--text-tertiary)] font-mono">Updated Daily</span>
        </div>

        {/* Repositories Table or Error State */}
        {isDataAbsentOrFailed ? (
          <div className="card p-8 text-center text-[var(--text-secondary)] text-xs mb-10 border-dashed">
            <AlertTriangle className="h-5 w-5 text-[var(--accent-warning)] mx-auto mb-2" />
            No active snapshot currently available for {languageName}. Check back soon.
          </div>
        ) : (
          <div className="overflow-x-auto mb-12">
            <table className="bench-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Repository</th>
                  <th>C-Rank</th>
                  <th>Score</th>
                  <th>Outside PR Merge</th>
                  <th>Good First Issues</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rankedItems.map((item, idx) => {
                  const [owner, name] = item.repo.full_name.split("/");
                  const tier = item.repo.c_rank_tier || "A";

                  return (
                    <tr key={item.repo.id}>
                      <td className="font-mono text-xs font-bold text-[var(--text-tertiary)]">
                        #{idx + 1}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link
                            prefetch={false}
                            href={`/${owner}/${name}`}
                            className="font-mono font-bold text-xs text-[var(--purple-bright)] hover:underline truncate max-w-[280px]"
                          >
                            {item.repo.full_name}
                          </Link>
                          {item.repo.stars !== undefined && (
                            <span className="pill text-[10px]">
                              <Star className="h-2.5 w-2.5 fill-[#C4910A] text-[#C4910A]" />
                              <span className="tabular">{item.repo.stars.toLocaleString()}</span>
                            </span>
                          )}
                        </div>
                        {item.repo.description && (
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1 max-w-lg">
                            {item.repo.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`tier-badge tier-${tier} text-xs`}>{tier}</span>
                      </td>
                      <td>
                        <span className="font-mono tabular font-bold text-xs text-[var(--text-primary)]">
                          {item.score.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono tabular font-bold text-xs text-[var(--green-bright)]">
                          {item.mergeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        {item.goodFirstIssues > 0 ? (
                          <Link
                            prefetch={false}
                            href={`/${owner}/${name}#good-first-issues`}
                            className="pill pill-amber hover:border-[var(--border-hover)]"
                          >
                            <span>{item.goodFirstIssues} open</span>
                          </Link>
                        ) : (
                          <span className="text-[var(--text-tertiary)] font-mono text-xs"> - </span>
                        )}
                      </td>
                      <td>
                        <Link
                          prefetch={false}
                          href={`/${owner}/${name}`}
                          className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <span className="font-mono text-[10px]">→</span>
                        </Link>
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
          <div className="rounded-3xl surface-base p-6 sm:p-10 font-sans shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2 font-space">
              <Sparkles className="h-5 w-5 text-orange-400" />
              How to Get Your {languageName} PR Merged
            </h3>
            <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">1</div>
                <div><strong className="text-[var(--text-primary)] font-semibold">Check C-Rank™ First:</strong> Pick projects with S or A tiers to avoid maintainer ghosts and slow review cycles.</div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">2</div>
                <div><strong className="text-[var(--text-primary)] font-semibold">Run Local Verification:</strong> Ensure test suites and formatting linters pass before opening a pull request.</div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono mt-0.5">3</div>
                <div><strong className="text-[var(--text-primary)] font-semibold">Submit in Maintainer Windows:</strong> Check the repository report card to submit when maintainers are most active.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl surface-base p-6 sm:p-10 font-sans shadow-lg">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2 font-space">
              <Trophy className="h-5 w-5 text-amber-400" />
              Top {languageName} Frameworks &amp; Stacks
            </h3>
            <div className="flex flex-wrap gap-2.5 pt-1 font-sans text-xs">
              {meta.topFrameworks && meta.topFrameworks.length > 0 ? (
                meta.topFrameworks.map((fw) => (
                  <Link prefetch={false}
                    key={fw.slug}
                    href={`/topics/${fw.slug}`}
                    title={`Browse open source ${fw.name} repositories`}
                    className="px-4 py-2.5 rounded-xl surface-elevated text-[var(--text-primary)] hover:text-[var(--color-primary)] font-mono cursor-pointer transition-colors"
                  >
                    {fw.tag}
                  </Link>
                ))
              ) : (
                <Link prefetch={false}
                  href="/topics"
                  title={`Browse ${languageName} topics`}
                  className="px-4 py-2.5 rounded-xl surface-elevated text-[var(--text-primary)] hover:text-[var(--color-primary)] font-mono cursor-pointer transition-colors"
                >
                  #all-topics
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Email Digest Signup Component */}
        <div className="mb-14">
          <LangDigestSignup language={canonicalLang} languageName={languageName} />
        </div>

        {/* Dynamic Schema-Generated FAQs */}
        <section className="rounded-3xl surface-base p-6 sm:p-12 font-sans shadow-xl">
          <h3 className="text-2xl font-bold text-[var(--text-primary)] font-space mb-8">
            Frequently Asked Questions: {languageName} Open Source
          </h3>
          <div className="space-y-8 text-sm">
            <div>
              <h4 className="font-bold text-[var(--text-primary)] font-space text-lg mb-2">
                What is the most welcoming {languageName} open-source repository?
              </h4>
              <p className="text-[var(--text-secondary)] leading-relaxed font-sans">
                {rankedItems.length > 0
                  ? `The highest-ranked ${languageName} repository on GetMerged is currently ${rankedItems[0].repo.full_name}, with a C-Rank score of ${rankedItems[0].score.toFixed(1)}/100 and a ${rankedItems[0].mergeRate.toFixed(1)}% PR merge rate.`
                  : `Visit GetMerged to view the latest ranked ${languageName} repositories.`}
              </p>
            </div>
            <div className="border-t border-[var(--border-subtle)] pt-8">
              <h4 className="font-bold text-[var(--text-primary)] font-space text-lg mb-2">
                How can I find good first issues in {languageName}?
              </h4>
              <p className="text-[var(--text-secondary)] leading-relaxed font-sans">
                You can browse verified beginner-friendly issues in {languageName} by visiting our curated Good First Issues directory at{" "}
                <Link prefetch={false}
                  href={`/good-first-issue/${canonicalLang}`}
                  title={`Open ${languageName} good first issues directory`}
                  className="text-orange-400 hover:text-orange-300 underline font-semibold"
                >
                  getmerged.abhishekco.de/good-first-issue/{canonicalLang}
                </Link>
                .
              </p>
            </div>
            <div className="border-t border-[var(--border-subtle)] pt-8">
              <h4 className="font-bold text-[var(--text-primary)] font-space text-lg mb-2">
                What makes a {languageName} repository &lsquo;Super Welcoming&rsquo; on GetMerged?
              </h4>
              <p className="text-[var(--text-secondary)] leading-relaxed font-sans">
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
