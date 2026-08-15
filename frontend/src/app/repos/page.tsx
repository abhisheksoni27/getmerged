import React from "react";
import { Metadata } from "next";
import { ReposClient } from "./ReposClient";

interface ReposPageProps {
  searchParams: Promise<{
    page?: string;
    lang?: string;
    tier?: string;
    stars?: string;
    merge_rate?: string;
    first_timer?: string;
    trending?: string;
    q?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ReposPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const pageNum = parseInt(resolvedParams.page || "1", 10);
  const isPaged = !isNaN(pageNum) && pageNum > 1;

  // Build canonical URL for each page or clean /repos
  const canonicalUrl = isPaged
    ? `https://opendoor.abhishekco.de/repos?page=${pageNum}`
    : "https://opendoor.abhishekco.de/repos";

  const title = isPaged
    ? `Open-Source Repositories Directory - Page ${pageNum} | Opendoor`
    : "Open-Source Repositories Directory & Filter Index | Opendoor";

  const description = isPaged
    ? `Explore page ${pageNum} of 1,400+ public GitHub repositories evaluated by C-Rank™ on PR merge rate, maintainer response speed, and first-time contributor friendliness.`
    : "Explore 1,400+ public GitHub repositories evaluated by C-Rank™ on PR merge rate, maintainer response speed, and first-time contributor friendliness.";

  return {
    title,
    description,
    keywords: [
      "open source repositories",
      "github repository list",
      "open source contributor projects",
      "c-rank repositories",
      "good first issue repositories",
      "high merge rate github projects",
      "fast maintainer response time",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "Opendoor",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ReposPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open-Source Repository Explorer & Directory",
    url: "https://opendoor.abhishekco.de/repos",
    description:
      "Comprehensive directory of open-source repositories scored by PR merge velocity and maintainer responsiveness.",
    isPartOf: {
      "@type": "WebSite",
      name: "Opendoor",
      url: "https://opendoor.abhishekco.de",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are these open-source metrics and rankings 100% free to access?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, completely free. Opendoor is built for the global developer and contributor community to make open-source contribution transparent and frictionless. You can browse, filter, inspect maintainer turnaround velocity, and track repository health without paywalls.",
        },
      },
      {
        "@type": "Question",
        name: "How does Opendoor help first-time open-source contributors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We measure the First-Timer PR Acceptance Rate and scan for active beginner-friendly issues (good first issue, help wanted). This allows new contributors to identify projects where maintainers actively review and mentor external submissions rather than leaving PRs untouched.",
        },
      },
      {
        "@type": "Question",
        name: "Why should I use C-Rank™ instead of just sorting by GitHub stars?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GitHub stars reflect historical popularity rather than current maintainer availability. Many famous 50k+ star repositories suffer from maintainer burnout with massive unreviewed PR backlogs. C-Rank™ measures live reviewer responsiveness, external merge rates, and review turnaround times.",
        },
      },
      {
        "@type": "Question",
        name: "How many welcoming repositories do you index across different languages?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We actively evaluate over 1,400+ repositories across 20+ programming ecosystems. Our S-Tier (Super Welcoming) and A-Tier (Welcoming) catalog includes 350+ JavaScript & TypeScript projects, 280+ Python repos, 190+ Go tools, 120+ Rust systems, alongside high-velocity repositories in Java, C++, PHP, Kotlin, Swift, and more.",
        },
      },
      {
        "@type": "Question",
        name: "Does Opendoor track private code or require repository write access?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. All telemetry is calculated strictly from public GitHub GraphQL events and public pull request activity without requesting code access or write permissions.",
        },
      },
      {
        "@type": "Question",
        name: "How are repositories evaluated in this directory?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every repository is benchmarked continuously using our proprietary C-Rank™ telemetry algorithm. We track real maintainer PR response turnaround, external merge rates, first-timer acceptance rates, and review friction across thousands of GitHub projects.",
        },
      },
      {
        "@type": "Question",
        name: "What does the C-Rank™ tier (S, A, B, C, D) mean?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tier S repositories are Super Welcoming with fast maintainer response (< 24h) and high merge rates. Tier A is Welcoming, Tier B is Standard, Tier C is Selective, and Tier D indicates unmaintained backlogs or slow review times.",
        },
      },
      {
        "@type": "Question",
        name: "How often is telemetry updated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our automated pipeline syncs daily GraphQL and event stream snapshots. Every repository page reflects the latest snapshot timestamp directly from GitHub.",
        },
      },
      {
        "@type": "Question",
        name: "Can I request my repository to be indexed or re-scored?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Any public GitHub repository can be submitted directly through the search bar on the homepage or via our fast-track indexing queue.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ReposClient />
    </>
  );
}
