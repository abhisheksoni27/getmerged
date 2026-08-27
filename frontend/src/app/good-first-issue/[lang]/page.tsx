import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { Repo, GoodFirstIssueItem } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { formatFreshness } from "@/lib/freshness";
import { LangDigestSignup } from "@/components/LangDigestSignup";
import { Sparkles, Code2, ArrowLeft, ShieldCheck, Sprout, ExternalLink, MessageSquare, Star, Award } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

const TIER_CHIP_STYLES: Record<string, string> = {
  S: "bg-emerald-50 text-emerald-800 border-emerald-300",
  A: "bg-blue-50 text-blue-800 border-blue-300",
  B: "bg-amber-50 text-amber-800 border-amber-300",
  C: "bg-purple-50 text-purple-800 border-purple-300",
  D: "bg-rose-50 text-rose-800 border-rose-300",
};
const DEFAULT_TIER_CHIP_STYLE = "bg-zinc-100 text-zinc-700 border-zinc-200";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/good-first-issue/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(lang);
  const title = `Best ${languageName} Good First Issues | GetMerged`;
  const description = `Find top ${languageName} open-source repositories with active Good First Issues, beginner-friendly labels, fast review times, and high first-timer merge rates on GetMerged.`;

  return {
    title,
    description,
    keywords: [
      `good first issue ${languageName}`,
      "good first issue",
      "open source contribution",
      `beginner friendly ${languageName} repositories`,
      "first-timers-only",
      "up-for-grabs",
      "github repositories",
      "developer portfolio",
    ],
    alternates: {
      canonical: `https://getmerged.abhishekco.de/good-first-issue/${canonicalLang}`,
      types: {
        "application/atom+xml": `https://getmerged.abhishekco.de/feeds/${canonicalLang}.xml`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://getmerged.abhishekco.de/good-first-issue/${canonicalLang}`,
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

async function getGFIRepos(languageName: string): Promise<Repo[]> {
  try {
    const queryParams = new URLSearchParams({
      language: languageName,
      has_good_first_issue: "true",
      sort: "c_rank_score",
      order: "desc",
      per_page: "20",
    });
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${queryParams.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (e) {
    console.error("Failed to fetch GFI repos during SSR", e);
    return [];
  }
}

async function getGFIIssues(languageName: string, bountyOnly = false): Promise<GoodFirstIssueItem[]> {
  try {
    const params: Record<string, string> = {
      language: languageName,
      limit: "30",
    };
    if (bountyOnly) {
      params.bounty = "1";
    }
    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE_URL}/api/v1/issues/good-first?${queryParams.toString()}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Failed to fetch GFI issues list during SSR", e);
    return [];
  }
}

export default async function GoodFirstIssuePage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  const sp = searchParams ? await searchParams : {};
  const currentTab = sp?.tab === "paid" ? "paid" : "all";
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/good-first-issue/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(canonicalLang);
  const [repos, issues] = await Promise.all([
    getGFIRepos(languageName),
    getGFIIssues(languageName, currentTab === "paid"),
  ]);

  // Schema.org Structured Data
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Good First Issues in ${languageName}`,
    description: `Active beginner-friendly open-source ${languageName} repositories with high PR merge rates.`,
    itemListElement: (issues.length > 0
      ? issues.map((iss, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${iss.repo_full_name} #${iss.issue_number}: ${iss.title}`,
          url: iss.url,
        }))
      : repos.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.full_name,
          url: `https://getmerged.abhishekco.de/${r.full_name}`,
        }))
    ),
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
        name: "Good First Issues",
        item: "https://getmerged.abhishekco.de/good-first-issue",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${languageName} Starter Issues`,
        item: `https://getmerged.abhishekco.de/good-first-issue/${canonicalLang}`,
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
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-900 font-mono">
              <Sprout className="h-3.5 w-3.5 text-emerald-700" /> Beginner Friendly Open-Source
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-900 font-mono">
              <Code2 className="h-3.5 w-3.5 text-blue-700" /> {languageName}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Good First Issues in {languageName}
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            Explore curated starter issues in high-scoring <strong>{languageName}</strong> repositories. Every listed issue belongs to a welcoming repository scored by C-Rank™ on PR merge rates, review responsiveness, and first-timer acceptance.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Telemetry updated: {new Date().toUTCString().slice(0, 16)} UTC (Continuous Sync)</span>
          </div>
        </div>

        {/* Real Live Issues Feed (Audit H9 Target Shape) */}
        <div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
                <Sprout className="h-4 w-4 text-emerald-600" />
                Live Good First Issues ({issues.length})
              </h2>
              {/* Paid / All filter tabs (AC3) */}
              <div className="inline-flex rounded-xl bg-zinc-100 p-0.5 border border-zinc-200 text-xs font-mono">
                <Link
                  href={`/good-first-issue/${canonicalLang}`}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                    currentTab === "all"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  All Issues
                </Link>
                <Link
                  href={`/good-first-issue/${canonicalLang}?tab=paid`}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold flex items-center gap-1 ${
                    currentTab === "paid"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-zinc-500 hover:text-emerald-700"
                  }`}
                >
                  <span>💰 Paid Bounties</span>
                </Link>
              </div>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Real-Time Open GitHub Issues</span>
          </div>

          {issues.length > 0 ? (
            <div className="space-y-4 sm:space-y-5 mb-10">
              {issues.map((iss) => {
                let parsedLabels: { name: string; color: string }[] = [];
                try {
                  parsedLabels = JSON.parse(iss.labels_json || "[]");
                } catch {
                  parsedLabels = [];
                }
                const tierChipClass = TIER_CHIP_STYLES[iss.c_rank_tier] ?? DEFAULT_TIER_CHIP_STYLE;

                return (
                  <div
                    key={`${iss.repository_id}-${iss.issue_number}`}
                    data-created-at={iss.created_at}
                    className="group rounded-2xl bg-white p-5 sm:p-7 border border-zinc-200 shadow-xs hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-5"
                  >
                    <div>
                      {/* Prominent meta badges: repo, stars, level rank, bounty, boosted */}
                      <div className="flex flex-wrap items-center gap-2 mb-5">
                        <Link
                          href={`/${iss.repo_full_name}`}
                          title={`View ${iss.repo_full_name} contributor score breakdown`}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-900 text-white text-[11px] sm:text-xs font-mono font-bold hover:bg-emerald-700 transition-colors"
                        >
                          {iss.repo_full_name}
                        </Link>
                        {iss.stars > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-[11px] sm:text-xs font-mono font-bold text-amber-800">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {iss.stars.toLocaleString()}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] sm:text-xs font-mono font-bold ${tierChipClass}`}
                        >
                          <Award className="h-3.5 w-3.5" /> Tier {iss.c_rank_tier} · {iss.c_rank_score.toFixed(0)} pts
                        </span>

                        {/* Bounty badge (AC3) */}
                        {iss.is_bounty && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-[11px] sm:text-xs font-mono font-bold text-emerald-900 shadow-2xs">
                            💰 {iss.bounty_amount ? `$${iss.bounty_amount.toFixed(2)} Bounty` : "Cash Bounty"}
                          </span>
                        )}

                        {/* Boosted listing badge (AC4) */}
                        {iss.boosted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-300 text-[10px] sm:text-[11px] font-mono font-bold text-indigo-800">
                            🚀 Boosted
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[11px] font-mono text-zinc-400">
                        <span>#{iss.issue_number}</span>
                        <span
                          data-freshness
                          title={`Created ${new Date(iss.created_at).toISOString()}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {formatFreshness(iss.created_at)}
                        </span>
                      </div>

                      <a
                        href={iss.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open issue #${iss.issue_number} on GitHub: ${iss.title}`}
                        className="font-space text-base sm:text-lg font-bold text-zinc-900 hover:text-blue-700 transition-colors line-clamp-2"
                      >
                        {iss.title}
                      </a>

                      {iss.body_text && (
                        <p className="mt-2.5 text-xs sm:text-sm text-zinc-500 line-clamp-2 leading-relaxed font-sans">
                          {iss.body_text}
                        </p>
                      )}

                      {parsedLabels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {parsedLabels.slice(0, 4).map((l, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-medium border border-zinc-200 bg-zinc-50 text-zinc-700"
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                      {iss.comments_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500">
                          <MessageSquare className="h-3.5 w-3.5" /> {iss.comments_count}
                        </span>
                      )}

                      <a
                        href={iss.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Claim issue #${iss.issue_number} on GitHub`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-mono font-semibold hover:bg-zinc-800 shadow-2xs transition-colors"
                      >
                        <span>Claim on GitHub</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-zinc-500 text-xs mb-10 border border-dashed border-zinc-300 font-sans">
              {currentTab === "paid"
                ? `No cash-bounty issues currently open for ${languageName}. Check back soon!`
                : `No active good first issues found for ${languageName}.`}
            </div>
          )}
        </div>

        {/* Repositories Grid Header */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Top {languageName} Repositories with Beginner Issues ({repos.length})
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Updated Daily via GitHub GraphQL</span>
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center text-zinc-500 text-xs mb-12 border border-dashed border-zinc-300 font-sans">
            No {languageName} repositories indexed yet. Check back soon!
          </div>
        )}

        {/* Informational Section */}
        <section className="rounded-3xl bg-white p-6 sm:p-8 border border-zinc-200 font-sans shadow-xs">
          <h3 className="text-base font-bold text-zinc-900 mb-3 flex items-center gap-2 font-space">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            How to make your first {languageName} open-source pull request
          </h3>
          <div className="prose prose-sm text-zinc-600 leading-relaxed max-w-none space-y-3 text-xs sm:text-sm font-sans">
            <p>
              Finding approachable <strong>Good First Issues in {languageName}</strong> allows you to build real-world software engineering experience. Instead of submitting PRs to abandoned repositories, GetMerged verifies maintainer review speeds and first-timer acceptance rates before you write a single line of code.
            </p>
            <p>
              Select any issue above to claim it directly on GitHub, or click a repository to inspect full maintainer review turnaround metrics and triage guidance!
            </p>
          </div>
        </section>

        {/* Anonymous weekly language digest signup (AC1) */}
        <div className="mt-12">
          <LangDigestSignup language={canonicalLang} languageName={languageName} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

