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

  const score = repo?.c_rank_score ? repo.c_rank_score.toFixed(1) : "75.0";
  const tier = repo?.c_rank_tier || "A";

  const title = repo
    ? `${fullName} Contributor Review & C-Rank™: ${score}/100 (${tier} Tier) | GetMerged`
    : `${fullName} Contributor Review & C-Rank™ | GetMerged`;

  const description = repo?.description
    ? `${fullName} scored ${score}/100 (${tier} Tier) on C-Rank™. Maintainer response time: ${(repo.time_to_first_response_hours || 0).toFixed(1)}h, PR merge rate: ${(repo.external_pr_merge_rate || 0).toFixed(1)}%. ${repo.description}`
    : `Contributor reviews and open source health metrics for ${fullName}. View maintainer response times, PR merge rates, and first-timer success on GetMerged.`;

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

  // Schema.org JSON-LD Structured Data (SoftwareSourceCode & freshness dateModified)
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

  // Cap at top 5 high-signal context-driven FAQs based on real repository telemetry
  const faqList = [
    {
      q: `Is ${fullName} welcoming to first-time open-source contributors?`,
      a: `${fullName} has a recorded first-timer success rate of ${(repo?.first_timer_success_rate || 0).toFixed(1)}%. Repositories ranked ${repo?.c_rank_tier || "A"} typically provide actionable feedback during code reviews and actively nurture new community contributors.`,
    },
    {
      q: `How fast can I expect code review feedback on my pull request?`,
      a: `Maintainers in ${fullName} respond to incoming external pull requests in approximately ${(repo?.time_to_first_response_hours || 0).toFixed(1)} hours on average. Keeping PRs scoped to single concerns and ensuring CI checks succeed will optimize review turnaround.`,
    },
    {
      q: `What does the ${(repo?.c_rank_score || 0).toFixed(1)} C-Rank™ score (${repo?.c_rank_tier || "A"} Tier) represent?`,
      a: `The C-Rank™ system evaluates GitHub projects on a 0–100 scale using objective telemetry: PR merge velocity, first-comment latency, active maintainer count, and first-time contributor acceptance rates. A score of ${(repo?.c_rank_score || 0).toFixed(1)} places ${fullName} in the ${repo?.c_rank_tier || "A"} tier.`,
    },
    {
      q: `What is the external contributor pull request merge rate for ${fullName}?`,
      a: `The external contributor pull request merge rate for ${fullName} is ${(repo?.external_pr_merge_rate || 0).toFixed(1)}%, based on public PR telemetry from non-core contributors.`,
    },
    {
      q: `Are there Good First Issues available in ${fullName}?`,
      a: (repo?.good_first_issue_count || 0) > 0
        ? `${fullName} currently has ${repo?.good_first_issue_count} active issue(s) tagged with beginner-friendly labels like "good first issue", "beginner", or "up-for-grabs".`
        : `${fullName} does not currently have active "good first issue" tags indexed, but accepts external contributions through standard GitHub issue tracking.`,
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
