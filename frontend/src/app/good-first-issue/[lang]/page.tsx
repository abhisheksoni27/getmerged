import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RepoCard } from "@/components/RepoCard";
import { Repo, GoodFirstIssueItem } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { canonicalizeSlug, displayNameFromSlug } from "@/lib/languageSlug";
import { formatFreshness } from "@/lib/freshness";
import { LangDigestSignup } from "@/components/LangDigestSignup";
import { IssueSniperTrigger } from "@/components/IssueSniperTrigger";
import { ClaimIssueButton } from "@/components/ClaimIssueButton";
import { Code2, ShieldCheck, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const ALL_LANGUAGES = [
  { name: "Python", slug: "python" },
  { name: "TypeScript", slug: "typescript" },
  { name: "JavaScript", slug: "javascript" },
  { name: "Go", slug: "go" },
  { name: "Rust", slug: "rust" },
  { name: "Java", slug: "java" },
  { name: "C#", slug: "csharp" },
  { name: "C++", slug: "cpp" },
  { name: "Ruby", slug: "ruby" },
  { name: "PHP", slug: "php" },
  { name: "Kotlin", slug: "kotlin" },
  { name: "Swift", slug: "swift" },
];

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
      "github repositories",
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
      per_page: "12",
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

async function getGFIIssues(languageName: string): Promise<GoodFirstIssueItem[]> {
  try {
    const params: Record<string, string> = {
      language: languageName,
      limit: "30",
    };
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

export default async function GoodFirstIssuePage({ params }: PageProps) {
  const { lang } = await params;
  const canonicalLang = canonicalizeSlug(lang);
  if (lang !== canonicalLang) {
    redirect(`/good-first-issue/${canonicalLang}`);
  }

  const languageName = displayNameFromSlug(canonicalLang);
  const [repos, rawIssues] = await Promise.all([
    getGFIRepos(languageName),
    getGFIIssues(languageName),
  ]);

  // Enforce 3-issue cap per repository to eliminate repo flooding (Issue #119 Point 1)
  const repoCounts = new Map<string, number>();
  const issues: GoodFirstIssueItem[] = [];
  for (const iss of rawIssues) {
    const key = iss.repo_full_name || iss.repository_id;
    const count = repoCounts.get(key) || 0;
    if (count < 3) {
      repoCounts.set(key, count + 1);
      issues.push(iss);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full font-sans">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-xs font-mono text-[var(--text-tertiary)]">
          <Link prefetch={false} href="/" className="hover:text-[var(--text-primary)] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link prefetch={false} href="/good-first-issue" className="hover:text-[var(--text-primary)] transition-colors">
            Good First Issues
          </Link>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-semibold">{languageName}</span>
        </div>

        {/* Hero Section */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="hero-badge">
            <span className="dot" />
            <span>CURATED CONTRIBUTOR QUEUE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display mb-2.5">
            Good First Issues in {languageName}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed mb-4">
            Curated beginner tickets strictly indexed from verified Tier S, A, and B <strong>{languageName}</strong> repositories. Every listed issue has live maintainer telemetry confirming active review turnaround and high external PR landing rates.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-green">✓ High PR Acceptance (&gt;75%)</span>
            <span className="pill pill-purple">✓ Median Review &lt; 24h</span>
            <span className="pill pill-amber">✓ No Stale Tickets</span>
            <span className="pill font-mono">{issues.length} Open Tickets</span>
          </div>
        </div>

        {/* 2-Column DevEx Workbench Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          {/* Left Column: Sidebar Filters */}
          <div className="lg:col-span-1 space-y-5">
            {/* Language Switcher */}
            <div className="card p-4">
              <div className="tele-label mb-2.5 flex items-center gap-1.5 text-xs">
                <Code2 className="h-3.5 w-3.5 text-[var(--purple-bright)]" />
                <span>Ecosystems</span>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-1.5">
                {ALL_LANGUAGES.map((l) => {
                  const isActive = l.slug === canonicalLang;
                  return (
                    <Link
                      key={l.slug}
                      prefetch={false}
                      href={`/good-first-issue/${l.slug}`}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-[rgba(163,113,247,0.18)] text-[var(--purple-bright)] border border-[var(--border-accent)] font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                      }`}
                    >
                      <span>{l.name}</span>
                      {isActive && <span className="text-[10px]">•</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quality Standard */}
            <div className="card p-4">
              <div className="tele-label mb-2 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--green-bright)]" />
                <span>Verification Policy</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Tickets are capped at 2–3 per repository to prevent farmable spam. If maintainers become inactive, their tickets are pruned automatically.
              </p>
            </div>

            {/* Issue Sniper Trigger */}
            <IssueSniperTrigger language={languageName} />

            {/* Weekly Digest Signup */}
            <LangDigestSignup language={canonicalLang} languageName={languageName} />
          </div>

          {/* Right Column: Live Issues Card Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Live Available Issues ({issues.length})
                </h2>
              </div>
              <span className="text-xs text-[var(--text-tertiary)] font-mono">Live GitHub Sync</span>
            </div>

            {issues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issues.map((iss) => {
                  let parsedLabels: { name: string; color: string }[] = [];
                  try {
                    parsedLabels = JSON.parse(iss.labels_json || "[]");
                  } catch {
                    parsedLabels = [];
                  }
                  const tier = iss.c_rank_tier || "A";

                  return (
                    <div
                      key={`${iss.repository_id}-${iss.issue_number}`}
                      className="card p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--border-accent)] transition-all group"
                    >
                      <div>
                        {/* Header: Repo link, Tier badge, Stars */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Link
                            prefetch={false}
                            href={`/${iss.repo_full_name}`}
                            className="font-mono text-xs font-semibold text-[var(--purple-bright)] hover:underline truncate max-w-[200px]"
                          >
                            {iss.repo_full_name}
                          </Link>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {iss.stars > 0 && (
                              <span className="pill text-[10px]">
                                <Star className="h-2.5 w-2.5 fill-[#C4910A] text-[#C4910A]" />
                                <span className="tabular">{iss.stars.toLocaleString()}</span>
                              </span>
                            )}
                            <span className={`tier-badge tier-${tier} text-[11px] h-6 w-6`}>
                              {tier}
                            </span>
                          </div>
                        </div>

                        {/* Issue Number & Freshness */}
                        <div className="flex items-center gap-2 mb-1.5 text-[11px] font-mono text-[var(--text-tertiary)]">
                          <span>#{iss.issue_number}</span>
                          <span>•</span>
                          <span className="text-[var(--green-bright)]">{formatFreshness(iss.created_at)}</span>
                          {iss.has_linked_pr && (
                            <span className="pill pill-amber text-[10px]">PR in progress</span>
                          )}
                        </div>

                        {/* Issue Title */}
                        <a
                          href={iss.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--purple-bright)] transition-colors line-clamp-2 mb-2 block"
                        >
                          {iss.title}
                        </a>

                        {iss.body_text && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                            {iss.body_text}
                          </p>
                        )}

                        {/* Labels */}
                        {parsedLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {parsedLabels.slice(0, 3).map((l, idx) => (
                              <span key={idx} className="pill text-[10px]">
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                        <ClaimIssueButton
                          issue={{
                            id: `${iss.repository_id}-${iss.issue_number}`,
                            repo_name: iss.repo_full_name,
                            issue_number: iss.issue_number,
                            title: iss.title,
                            url: iss.url,
                            c_rank_tier: iss.c_rank_tier,
                            has_linked_pr: iss.has_linked_pr,
                            linked_pr_number: iss.linked_pr_number,
                          }}
                        />

                        <a
                          href={iss.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
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
              <div className="card p-8 text-center text-xs text-[var(--text-tertiary)] border-dashed">
                No active good first issues currently open for {languageName}. Check back soon or browse high-scoring repositories below.
              </div>
            )}

            {/* Welcoming Repositories Grid */}
            {repos.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--green-bright)]" />
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      Welcoming {languageName} Repositories ({repos.length})
                    </h2>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] font-mono">Ranked by C-Rank™</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.slice(0, 6).map((repo) => (
                    <RepoCard key={repo.id} repo={repo} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
