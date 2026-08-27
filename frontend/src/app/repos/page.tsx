import React from "react";
import { Metadata } from "next";
import { ReposClient } from "./ReposClient";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";

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

function getStarBounds(bucket?: string) {
  switch (bucket) {
    case "<5k":
      return { max: "5000" };
    case "5k-20k":
      return { min: "5000", max: "20000" };
    case "20k-50k":
      return { min: "20000", max: "50000" };
    case "50k+":
      return { min: "50000" };
    default:
      return {};
  }
}

async function getReposSSR(paramsObj: {
  page?: string;
  lang?: string;
  tier?: string;
  stars?: string;
  merge_rate?: string;
  first_timer?: string;
  trending?: string;
  q?: string;
}): Promise<{ repos: Repo[]; total: number }> {
  const page = parseInt(paramsObj.page || "1", 10) || 1;
  const perPage = 24;

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("per_page", perPage.toString());
  params.set("sort", "stars");
  params.set("order", "desc");

  if (paramsObj.q?.trim()) params.set("name", paramsObj.q.trim());
  if (paramsObj.lang && paramsObj.lang !== "All") params.set("language", paramsObj.lang);
  if (paramsObj.tier && paramsObj.tier !== "All") params.set("tier", paramsObj.tier);
  if (paramsObj.trending === "true") params.set("trending", "true");
  if (paramsObj.merge_rate && paramsObj.merge_rate !== "All") params.set("min_merge_rate", paramsObj.merge_rate);
  if (paramsObj.first_timer && paramsObj.first_timer !== "All") params.set("min_first_timer_success_rate", paramsObj.first_timer);

  const bounds = getStarBounds(paramsObj.stars);
  if (bounds.min) params.set("min_stars", bounds.min);
  if (bounds.max) params.set("max_stars", bounds.max);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { repos: [], total: 0 };
    const data = await res.json();
    const rawList = data.data || data.repos || [];
    const total = data.meta?.total ?? data.total ?? (Array.isArray(rawList) ? rawList.length : 0);

    if (Array.isArray(rawList)) {
      const mappedList: Repo[] = rawList.map((r: Record<string, unknown>) => ({
        ...(r as unknown as Repo),
        c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "A",
        first_timer_success_rate:
          (r.first_timer_success_rate as number) !== undefined
            ? (r.first_timer_success_rate as number)
            : (r.first_timer_rate as number),
      }));
      return { repos: mappedList, total };
    }
    return { repos: [], total: 0 };
  } catch (e) {
    console.error("SSR fetch failed for /repos", e);
    return { repos: [], total: 0 };
  }
}

export async function generateMetadata({ searchParams }: ReposPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const pageNum = parseInt(resolvedParams.page || "1", 10);
  const isPaged = !isNaN(pageNum) && pageNum > 1;

  const canonicalUrl = isPaged
    ? `https://getmerged.abhishekco.de/repos?page=${pageNum}`
    : "https://getmerged.abhishekco.de/repos";

  const title = isPaged
    ? `Open-Source Repositories Directory - Page ${pageNum} | GetMerged`
    : "Open-Source Repositories Directory & Filter Index | GetMerged";

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
    robots: isPaged ? { index: false, follow: true } : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "GetMerged",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ReposPage({ searchParams }: ReposPageProps) {
  const resolvedParams = await searchParams;
  const { repos: initialRepos, total: initialTotal } = await getReposSSR(resolvedParams);

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
        name: "Repositories Directory",
        item: "https://getmerged.abhishekco.de/repos",
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Indexed Open-Source Repositories",
    description: "Curated open-source repositories scored by PR merge velocity and maintainer responsiveness.",
    itemListElement: initialRepos.slice(0, 24).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.full_name,
      url: `https://getmerged.abhishekco.de/${r.full_name}`,
    })),
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open-Source Repository Explorer & Directory",
    url: "https://getmerged.abhishekco.de/repos",
    description:
      "Comprehensive directory of open-source repositories scored by PR merge velocity and maintainer responsiveness.",
    mainEntity: itemListJsonLd,
    isPartOf: {
      "@type": "WebSite",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
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
          text: "Yes, completely free. GetMerged is built for the global developer and contributor community to make open-source contribution transparent and frictionless. You can browse, filter, inspect maintainer turnaround velocity, and track repository health without paywalls.",
        },
      },
      {
        "@type": "Question",
        name: "How does GetMerged help first-time open-source contributors?",
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
        name: "Does GetMerged track private code or require repository write access?",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-900 border-t-transparent animate-spin" />
          </div>
        }
      >
        <ReposClient initialRepos={initialRepos} initialTotal={initialTotal} />
      </React.Suspense>
    </>
  );
}
