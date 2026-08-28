import React from "react";
import { Metadata } from "next";
import { ReposClient } from "./ReposClient";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { GemojiText } from "@/lib/gemoji";
import { gemojiToUnicode } from "@/lib/gemoji";

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

  const starBounds = getStarBounds(paramsObj.stars);
  if (starBounds.min) params.set("min_stars", starBounds.min);
  if (starBounds.max) params.set("max_stars", starBounds.max);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { repos: [], total: 0 };
    const data = await res.json();
    return {
      repos: data.data || data.repos || [],
      total: data.meta?.total ?? data.total ?? 0,
    };
  } catch (err) {
    console.error("SSR repo directory fetch failed:", err);
    return { repos: [], total: 0 };
  }
}

export async function generateMetadata({ searchParams }: ReposPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const { lang, tier, trending, q } = resolvedParams;

  let title = "Open Source Repository Directory & C-Rank™ Explorer | GetMerged";
  let description =
    "Explore 53,000+ open-source GitHub repositories ranked by objective C-Rank™ telemetry: pull request merge rates, maintainer response time, and first-timer success rates.";

  if (lang && lang !== "All") {
    title = `Top Welcoming ${lang} Repositories & Good First Issues | GetMerged`;
    description = `Discover high-acceptance ${lang} GitHub projects with fast maintainer response velocity, high PR merge rates, and beginner-friendly issues.`;
  } else if (tier && tier !== "All") {
    title = `Tier ${tier} Welcoming Repositories | GetMerged Open Source Index`;
    description = `Browse Tier ${tier} open-source repositories verified for contributor friendliness and maintainer responsiveness.`;
  } else if (trending === "true") {
    title = "Trending Welcoming Open Source Repositories | GetMerged";
    description =
      "Trending GitHub repositories that are actively accepting and merging pull requests from community contributors today.";
  } else if (q?.trim()) {
    title = `Search Results for "${q.trim()}" | GetMerged Repository Directory`;
    description = `Compare maintainer response rates and PR merge metrics for "${q.trim()}" on GetMerged.`;
  }

  const canonicalUrl = "https://getmerged.abhishekco.de/repos";

  return {
    title,
    description,
    keywords: [
      "open source repository directory",
      "contributor friendly repos",
      "c-rank",
      "pull request merge rate",
      "maintainer response time",
      "good first issue",
      "developer portfolio",
      "github open source",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "GetMerged",
      type: "website",
      images: [
        {
          url: "https://getmerged.abhishekco.de/opengraph-image",
          width: 1200,
          height: 630,
          alt: "GetMerged Open Source Repository Directory",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://getmerged.abhishekco.de/opengraph-image"],
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
        name: "Repositories",
        item: "https://getmerged.abhishekco.de/repos",
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open Source Repository Directory",
    description: "Explore 53,000+ open-source GitHub repositories scored on objective contributor friendliness telemetry.",
    url: "https://getmerged.abhishekco.de/repos",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: initialRepos.slice(0, 24).map((repo, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: repo.full_name,
        url: `https://getmerged.abhishekco.de/${repo.full_name}`,
        description: gemojiToUnicode(repo.description) || undefined,
      })),
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How are open-source repositories scored on GetMerged?",
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

      {/* Semantic Server-Rendered Content Crawl Floor */}
      <section className="sr-only" aria-label="Scored Open Source Repositories Index">
        <h2>All Scored Open Source GitHub Repositories</h2>
        <p>Browse {initialTotal.toLocaleString()} repositories benchmarked with C-Rank™ review metrics.</p>
        <ul>
          {initialRepos.map((r) => (
            <li key={r.full_name}>
              <Link href={`/${r.full_name}`} title={`View ${r.full_name} C-Rank scorecard`}>
                {r.full_name} ({r.language || "Code"}) - Tier {r.class_rank || r.c_rank_tier || "A"} ({r.external_pr_merge_rate ? `${Math.round(r.external_pr_merge_rate)}% merge rate` : ""})
              </Link>
              <p><GemojiText>{r.description}</GemojiText></p>
            </li>
          ))}
        </ul>
      </section>

      <React.Suspense
        fallback={
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-white/[0.12] border-t-transparent animate-spin" />
          </div>
        }
      >
        <ReposClient initialRepos={initialRepos} initialTotal={initialTotal} />
      </React.Suspense>
    </>
  );
}
