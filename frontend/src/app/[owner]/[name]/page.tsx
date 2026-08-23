import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo, AIInsights } from "@/types/opendoor";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClientRepoDetail } from "@/components/ClientRepoDetail";
import { getLanguageSlug } from "@/lib/languageSlug";

import { buildRepoMetadata, buildRepoFaqList } from "@/lib/repo-metadata";

const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

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
      title: "Repository Not Found | GetMerged",
      description: "The requested repository is not indexed in GetMerged.",
      robots: {
        index: false,
        follow: true,
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
    notFound();
  }

  // Enforce canonical casing redirect (e.g., /Torvalds/Linux -> /torvalds/linux or exact casing)
  if (fullName !== repo.full_name) {
    redirect(`/${repo.full_name}`);
  }

  const insights = await getRepoInsights(repo.full_name);

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
      <ClientRepoDetail repo={repo} fullName={fullName} initialInsights={insights} />
      <Footer />
    </div>
  );
}
