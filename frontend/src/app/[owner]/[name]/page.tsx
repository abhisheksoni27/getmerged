import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo, AIInsights } from "@/types/opendoor";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientRepoDetail } from "@/components/ClientRepoDetail";
import { InstantScanPanel } from "@/components/InstantScanPanel";
import { getLanguageSlug } from "@/lib/languageSlug";
import { buildRepoMetadata, buildRepoFaqList } from "@/lib/repo-metadata";
import { getGradeColor } from "@/components/CRankBadge";
import { GitMerge, Clock, ShieldCheck, HelpCircle } from "lucide-react";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

// Owner/name shapes GitHub itself allows; anything else stays a hard 404.
const VALID_SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

async function getRepoInsights(targetIdOrName: string | number): Promise<AIInsights | null> {
  try {
    const target = String(targetIdOrName);
    const res = await fetch(
      `${INTERNAL_API_URL}/api/v1/repos/${encodeURIComponent(target)}/insights`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.insights || null;
  } catch (e) {
    console.error("SSR fetch failed for repo insights:", targetIdOrName, e);
  }
  return null;
}

async function getRepoData(fullName: string): Promise<Repo | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 }, // Cache on edge/ISR for 1 hour
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawList = data.data || data.repos;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) || null;
    }
  } catch (e) {
    console.error("SSR fetch failed for repo:", fullName, e);
  }
  return null;
}

// Generate SEO Metadata dynamically for search engines
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;
  const repo = await getRepoData(fullName);

  if (!repo) {
    return {
      title: `Scan ${fullName} - Instant C-Rank Check | GetMerged`,
      description: `${fullName} is not indexed yet. Run an instant C-Rank check to see merge rates, review turnaround and maintainer responsiveness before you PR.`,
      robots: {
        index: false,
        follow: true,
      },
      openGraph: {
        title: `Instant C-Rank check: ${fullName}`,
        description: `Score ${fullName} on demand from GitHub's public pull-request history.`,
        type: "website",
        url: `https://getmerged.abhishekco.de/${fullName}`,
        siteName: "GetMerged",
        images: [
          {
            url: `${INTERNAL_API_URL}/og/scan/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
            width: 1200,
            height: 630,
            alt: `${fullName} C-Rank verdict card`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `Instant C-Rank check: ${fullName}`,
        description: `Score ${fullName} on demand from GitHub's public pull-request history.`,
        images: [`${INTERNAL_API_URL}/og/scan/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`],
      },
    };
  }

  const { title, description } = buildRepoMetadata(repo.full_name, repo);

  return {
    title,
    description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/${repo.full_name}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://getmerged.abhishekco.de/${repo.full_name}`,
      siteName: "GetMerged",
      images: [
        {
          url: `https://getmerged.abhishekco.de/${repo.full_name}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${repo.full_name} C-Rank scorecard`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://getmerged.abhishekco.de/${repo.full_name}/opengraph-image`],
    },
  };
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  // Server-Side Data Fetching -> Pure SSR
  const repo = await getRepoData(fullName);
  if (!repo) {
    if (!VALID_SLUG_RE.test(owner) || !VALID_SLUG_RE.test(name)) {
      notFound();
    }
    return (
      <div className="relative min-h-screen dev-grid-pattern flex flex-col bg-black text-zinc-100 font-sans">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
          <h1 className="font-space text-2xl font-extrabold text-zinc-50">
            {fullName} is not scored yet
          </h1>
          <p className="mt-2 mb-6 font-sans text-sm text-zinc-300">
            Run an on-demand C-Rank check to get the full verdict - merge rate, review turnaround,
            first-timer success and maintainer responsiveness - before you open a PR.
          </p>
          <InstantScanPanel fullName={fullName} />
        </main>
        <Footer />
      </div>
    );
  }

  if (fullName !== repo.full_name) {
    redirect(`/${repo.full_name}`);
  }

  const targetInsightKey = repo?.id ? String(repo.id) : repo.full_name;
  const insights = await getRepoInsights(targetInsightKey);

  // Schema.org JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: fullName,
    description: repo?.description || "Public open-source repository",
    programmingLanguage: repo?.language || "Multi-Language",
    codeRepository: repo?.github_url || `https://github.com/${fullName}`,
    author: {
      "@type": "Organization",
      name: owner,
      url: `https://github.com/${owner}`,
    },
    ...(repo?.updated_at ? { dateModified: new Date(repo.updated_at).toISOString() } : {}),
  };

  const faqList = buildRepoFaqList(fullName, repo);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqList.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const langSlug = getLanguageSlug(repo?.language || "other");

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
        name: `${repo?.language || "Multi-Language"} Good First Issues`,
        item: `https://getmerged.abhishekco.de/good-first-issue/${langSlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: fullName,
        item: `https://getmerged.abhishekco.de/${fullName}`,
      },
    ],
  };

  const rank = repo.class_rank || repo.c_rank_tier || "A";
  const rankInfo = getGradeColor(rank);
  const score = Math.round(repo.c_rank_score || repo.score || 0);
  const mergeRate = repo.external_pr_merge_rate ? `${Math.round(repo.external_pr_merge_rate)}%` : "—";
  const responseTime = repo.time_to_first_response_hours
    ? repo.time_to_first_response_hours < 1
      ? "<1h"
      : repo.time_to_first_response_hours < 24
      ? `${Math.round(repo.time_to_first_response_hours)}h`
      : `${Math.round(repo.time_to_first_response_hours / 24)}d`
    : "—";
  const firstTimerRate = repo.first_timer_success_rate ? `${Math.round(repo.first_timer_success_rate)}%` : "—";

  return (
    <div className="relative min-h-screen dev-grid-pattern flex flex-col bg-black text-zinc-100 font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <link rel="alternate" type="text/markdown" href={`/${owner}/${name}/raw`} />

      {/* Semantic Server-Rendered Content for Search Engine Bots */}
      <noscript>
        <section className="mx-auto max-w-5xl px-4 py-8">
          <h1>{fullName} - Open Source PR Review Scorecard</h1>
          <p>{repo.description}</p>
          <p>C-Rank Grade: {rank} ({rankInfo.label}) - {score}/100</p>
          <p>External PR Merge Rate: {mergeRate}</p>
          <p>Response Time: {responseTime}</p>
          <p>First Timer Success: {firstTimerRate}</p>
        </section>
      </noscript>

      {/* Main Interactive React Surface */}
      <ClientRepoDetail repo={repo} fullName={fullName} initialInsights={insights} />
      
      {/* Static Semantic SEO Floor: Direct Server-Rendered HTML markup */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 w-full border-t border-white/[0.08] mt-8 font-sans">
        <div className="mb-6">
          <h2 className="text-xl font-bold font-space text-zinc-100 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-orange-400" />
            Everything You Need to Know Before Contributing to {fullName}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Empirical pull request review statistics, community acceptance rates, and maintainer responsiveness data for {fullName}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <GitMerge className="h-4 w-4 text-emerald-400" /> External PR Merge Rate
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{mergeRate}</div>
            <div className="text-xs text-zinc-400 mt-1">Of pull requests submitted by outside contributors are merged.</div>
          </div>

          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <Clock className="h-4 w-4 text-blue-400" /> Average Response Time
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{responseTime}</div>
            <div className="text-xs text-zinc-400 mt-1">Typical turnaround for a maintainer code review comment.</div>
          </div>

          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <ShieldCheck className="h-4 w-4 text-purple-400" /> First-Timer Success
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{firstTimerRate}</div>
            <div className="text-xs text-zinc-400 mt-1">Conversion rate for developers submitting their first PR.</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-bold font-space text-zinc-200">
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {faqList.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl glass-card border border-white/[0.06]">
                <h4 className="text-sm font-semibold text-zinc-100 mb-1.5 font-sans">
                  {faq.q}
                </h4>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
