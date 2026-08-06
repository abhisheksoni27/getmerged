import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { Metadata } from "next";
import { ClientRepoDetail } from "@/components/ClientRepoDetail";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://opendoor.abhishekco.de";

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
    ? `${fullName} C-Rank™ (${repo.c_rank_tier || "A"} Tier) - Opendoor`
    : `${fullName} - Opendoor Open Source Explorer`;

  const description = repo?.description
    ? `${repo.description} Scored ${repo.c_rank_score?.toFixed(1) || 75.0}/100 on Opendoor C-Rank™. View maintainer response times, PR merge rates, and first-timer success metrics.`
    : `Find out if ${fullName} welcomes external pull requests. View response times and maintainer review speed metrics.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://opendoor.abhishekco.de/${owner}/${name}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://opendoor.abhishekco.de/${owner}/${name}`,
      siteName: "Opendoor",
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

  // Schema.org JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: fullName,
    description: repo?.description || "Public open-source repository",
    programmingLanguage: repo?.language || "Multi-Language",
    codeRepository: repo?.github_url || `https://github.com/${fullName}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (repo?.c_rank_score || 75.0) / 20, // 1 to 5 scale
      bestRating: "5",
      worstRating: "1",
      ratingCount: repo?.stars || 100,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How fast do maintainers respond in ${fullName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Maintainers in ${fullName} have an average response time of ~${(repo?.time_to_first_response_hours || 0).toFixed(1)} hours for pull requests.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the PR merge rate for ${fullName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The external pull request merge rate for ${fullName} is ${((repo?.external_pr_merge_rate || 0) * 100).toFixed(1)}%.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen dot-pattern flex flex-col bg-[#faf9f6] overflow-x-hidden">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <link rel="alternate" type="text/markdown" href={`/${owner}/${name}/raw`} />
      <ClientRepoDetail repo={repo} fullName={fullName} />
      <Footer />
    </div>
  );
}
