import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { Metadata } from "next";
import { ClientRepoDetail } from "@/components/ClientRepoDetail";
import { getLanguageSlug } from "@/lib/languageSlug";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
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
      return (
        rawList.find((r: Repo) => r.full_name.toLowerCase() === fullName.toLowerCase()) ||
        rawList[0]
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

  const title = repo
    ? `${fullName} C-Rank™ (${repo.c_rank_tier || "A"} Tier) - GetMerged`
    : `${fullName} - GetMerged Open Source Explorer`;

  const description = repo?.description
    ? `${repo.description} Scored ${repo.c_rank_score?.toFixed(1) || 75.0}/100 on GetMerged C-Rank™. View maintainer response times, PR merge rates, and first-timer success metrics.`
    : `Find out if ${fullName} welcomes external pull requests. View response times and maintainer review speed metrics.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/${owner}/${name}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://getmerged.abhishekco.de/${owner}/${name}`,
      siteName: "GetMerged",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  // Server-Side Data Fetching -> Pure SSR
  const repo = await getRepoData(fullName);

  // Schema.org JSON-LD Structured Data (with AggregateRating and freshness dateModified for SEO)
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
    ...(repo?.c_rank_score ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: (repo.c_rank_score / 20).toFixed(1), // 0-5 star scale equivalent
        bestRating: "5",
        worstRating: "1",
        ratingCount: Math.max(10, Math.floor((repo.stars || 100) / 10)),
        reviewCount: Math.max(5, repo.good_first_issue_count || 5),
      },
    } : {}),
    ...(repo?.updated_at ? { dateModified: new Date(repo.updated_at).toISOString() } : {}),
  };

  // Generate 8 to 10 rich context-driven FAQs based on real repository telemetry
  const faqList = [
    {
      q: `How fast do maintainers respond to pull requests in ${fullName}?`,
      a: `Maintainers in ${fullName} respond to incoming external pull requests in approximately ${(repo?.time_to_first_response_hours || 0).toFixed(1)} hours on average.`,
    },
    {
      q: `What is the external PR merge rate for ${fullName}?`,
      a: `The external contributor pull request merge rate for ${fullName} is ${(repo?.external_pr_merge_rate || 0).toFixed(1)}%, based on public PR telemetry from non-core contributors.`,
    },
    {
      q: `Is ${fullName} friendly for first-time open-source contributors?`,
      a: `${fullName} has a first-timer success rate of ${(repo?.first_timer_success_rate || 0).toFixed(1)}%. Repositories scoring high on C-Rank™ feature active maintainers who label beginner-friendly issues and provide constructive code review guidance.`,
    },
    {
      q: `What does the ${fullName} C-Rank™ score (${repo?.c_rank_tier || "A"} Tier) mean?`,
      a: `The C-Rank™ system evaluates GitHub projects on a 0–100 scale using objective telemetry: PR merge velocity, first-comment latency, active maintainer count, and first-time contributor acceptance rates. A tier of ${repo?.c_rank_tier || "A"} indicates ${(repo?.c_rank_score || 75.0) >= 80 ? "elite responsiveness and strong contributor receptiveness" : "steady maintainer engagement with active reviews"}.`,
    },
    {
      q: `Are there Good First Issues available in ${fullName}?`,
      a: (repo?.good_first_issue_count || 0) > 0
        ? `${fullName} currently has ${repo?.good_first_issue_count} open issue(s) tagged with beginner-friendly labels like "good first issue", "beginner", or "up-for-grabs".`
        : `${fullName} does not currently have active "good first issue" tags indexed, but accepts external contributions through standard GitHub issue tracking.`,
    },
    {
      q: `What programming language and tech stack does ${fullName} use?`,
      a: `${fullName} is primarily built with ${repo?.language || "Open Source technologies"}, with ${repo?.stars?.toLocaleString() || "multiple"} GitHub stars and active development across the ${repo?.language || "developer"} ecosystem.`,
    },
    {
      q: `How long does it take for PRs to get merged in ${fullName}?`,
      a: `Once code review begins, pull requests in ${fullName} average ~${(repo?.time_to_merge_hours || 24.0).toFixed(1)} hours from submission to final merge.`,
    },
    {
      q: `How many active maintainers review code in ${fullName}?`,
      a: `${fullName} has approximately ${repo?.distinct_maintainer_count || 1} distinct maintainer(s) actively triaging and merging pull requests over recent release cycles.`,
    },
    {
      q: `How can I increase the chances of my PR getting merged into ${fullName}?`,
      a: `To maximize your merge rate in ${fullName}: link an open issue in your PR description, write comprehensive unit tests, ensure all CI workflow checks pass, and keep diffs atomic without mixing refactoring with bug fixes.`,
    },
    {
      q: `Is ${fullName} actively maintained or stale?`,
      a: repo?.staleness_flag
        ? `${fullName} shows signs of lower maintainer activity over the last 90 days. Contributors should review recent commit history before undertaking large feature PRs.`
        : `${fullName} is actively maintained with regular commit activity, issue discussions, and pull request reviews.`,
    },
  ];

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

  return (
    <div className="min-h-screen dev-grid-pattern flex flex-col bg-[#faf9f6] overflow-x-hidden">
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
      <ClientRepoDetail repo={repo} fullName={fullName} />
      <Footer />
    </div>
  );
}
