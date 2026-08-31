import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo, AIInsights, GoodFirstIssueItem, PRSizeSweetSpotData, OptimalTimeResult } from "@/types/opendoor";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientRepoDetail } from "@/components/ClientRepoDetail";
import { InstantScanPanel } from "@/components/InstantScanPanel";
import { getLanguageSlug } from "@/lib/languageSlug";
import { buildRepoMetadata, buildRepoFaqList } from "@/lib/repo-metadata";
import { getGradeColor } from "@/components/CRankBadge";
import { PRLikelihoodData } from "@/components/PRAcceptanceWidget";
import { TrendPoint } from "@/components/RepoTrendChart";
import { API_BASE_URL, PUBLIC_API_URL } from "@/lib/api";
import { getTierCacheConfig } from "@/lib/cache-tier";

// Owner/name shapes GitHub itself allows; anything else stays a hard 404.
const VALID_SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

async function getRepoInsights(targetIdOrName: string | number, revalidate = 86400): Promise<AIInsights | null> {
  try {
    const target = String(targetIdOrName);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(target)}/insights`,
      {
        next: { revalidate },
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

async function getRelatedRepos(targetIdOrName: string | number, revalidate = 86400): Promise<Repo[]> {
  try {
    const target = String(targetIdOrName);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(target)}/related?limit=3`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.repos || [];
  } catch (e) {
    console.error("SSR fetch failed for related repos:", targetIdOrName, e);
  }
  return [];
}

async function getGoodFirstIssues(targetIdOrName: string | number, revalidate = 86400): Promise<GoodFirstIssueItem[]> {
  try {
    const target = String(targetIdOrName);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(target)}/good-first-issues`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.issues || [];
  } catch (e) {
    console.error("SSR fetch failed for good first issues:", targetIdOrName, e);
  }
  return [];
}

async function getPRSizeSweetSpot(targetIdOrName: string | number, revalidate = 86400): Promise<PRSizeSweetSpotData | null> {
  try {
    const target = String(targetIdOrName);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(target)}/pr-size-sweetspot`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("SSR fetch failed for pr size sweet spot:", targetIdOrName, e);
  }
  return null;
}

async function getPRLikelihood(fullName: string, revalidate = 86400): Promise<PRLikelihoodData | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/pr-likelihood?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("SSR fetch failed for pr likelihood:", fullName, e);
  }
  return null;
}

async function getOptimalTime(fullName: string, revalidate = 86400): Promise<OptimalTimeResult | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/optimal-time?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("SSR fetch failed for optimal time:", fullName, e);
  }
  return null;
}

async function getRepoTrend(fullName: string, revalidate = 86400): Promise<TrendPoint[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}/trend?days=90`,
      {
        next: { revalidate },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.trend || [];
  } catch (e) {
    console.error("SSR fetch failed for repo trend:", fullName, e);
  }
  return [];
}

async function getRepoData(fullName: string): Promise<Repo | null> {
  try {
    // 1. Direct path lookup
    const directRes = await fetch(
      `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.repo) return data.repo;
      if (data?.id) return data as Repo;
    }

    // 2. Query param lookup
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`,
      {
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawList = data.data || data.repos;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return (
        rawList.find(
          (r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()
        ) || rawList[0]
      );
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
            url: `${PUBLIC_API_URL}/og/scan/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
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
        images: [`${PUBLIC_API_URL}/og/scan/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`],
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
      <div className="relative min-h-screen dev-grid-pattern flex flex-col bg-transparent text-white font-sans">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
          <h1 className="font-space text-2xl font-extrabold text-white">
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
  const tierConfig = getTierCacheConfig(repo.c_rank_tier || repo.class_rank);
  const dynamicTtl = tierConfig.revalidate;
  
  // Parallel Server Fetch: insights, related repos, good first issues, pr size sweet spot, likelihood, optimal time, and 90d trend
  const [insights, relatedRepos, gfiList, sweetSpot, likelihood, optimalTime, trend] = await Promise.all([
    getRepoInsights(targetInsightKey, dynamicTtl),
    getRelatedRepos(targetInsightKey, dynamicTtl),
    getGoodFirstIssues(targetInsightKey, dynamicTtl),
    getPRSizeSweetSpot(targetInsightKey, dynamicTtl),
    getPRLikelihood(fullName, dynamicTtl),
    getOptimalTime(fullName, dynamicTtl),
    getRepoTrend(fullName, dynamicTtl),
  ]);

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
  const mergeRate = repo.external_pr_merge_rate ? `${Math.round(repo.external_pr_merge_rate)}%` : " - ";
  const responseTime = repo.time_to_first_response_hours
    ? repo.time_to_first_response_hours < 1
      ? "<1h"
      : repo.time_to_first_response_hours < 24
      ? `${Math.round(repo.time_to_first_response_hours)}h`
      : `${Math.round(repo.time_to_first_response_hours / 24)}d`
    : " - ";
  const firstTimerRate = repo.first_timer_success_rate ? `${Math.round(repo.first_timer_success_rate)}%` : " - ";

  return (
    <div className="relative min-h-screen dev-grid-pattern flex flex-col bg-transparent text-white font-sans">
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
      <section className="sr-only" aria-label="Repository Telemetry Overview">
        <h2>{fullName} - Open Source PR Review Scorecard</h2>
        <p>{repo.description}</p>
        <p>C-Rank Grade: {rank} ({rankInfo.label}) - {score}/100</p>
        <p>External PR Merge Rate: {mergeRate}</p>
        <p>Response Time: {responseTime}</p>
        <p>First Timer Success: {firstTimerRate}</p>
        <div>
          <h2>Frequently Asked Questions</h2>
          {faqList.map((faq, i) => (
            <article key={i}>
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Main Interactive React Surface */}
      <ClientRepoDetail
        repo={repo}
        fullName={fullName}
        initialInsights={insights}
        initialRelatedRepos={relatedRepos}
        initialGfiList={gfiList}
        initialSweetSpot={sweetSpot}
        initialLikelihood={likelihood}
        initialOptimalTime={optimalTime}
        initialTrend={trend}
      />

      <Footer />
    </div>
  );
}
