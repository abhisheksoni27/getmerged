import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopicDirectoryGrid } from "@/components/TopicDirectoryGrid";
import { API_BASE_URL } from "@/lib/api";
import { TopicStat } from "@/types/opendoor";
import { Tag, ArrowLeft, ArrowRight, Compass } from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

const INITIAL_TOPIC_LIMIT = 100;

interface TopicsPayload {
  topics: string[];
  stats: TopicStat[];
}

async function fetchTopics(): Promise<TopicsPayload> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/topics`, {
      // Payload (~4.9MB) exceeds Next.js's 2MB data-cache entry limit, so
      // caching attempts fail loudly every request. Skip the data cache;
      // the CDN/edge layer still caches the response itself.
      cache: "no-store",
    });
    if (!res.ok) return { topics: [], stats: [] };
    const data = await res.json();
    const topics: string[] = data.topics || data.data || [];
    const stats: TopicStat[] = data.topic_stats || [];
    return { topics, stats };
  } catch (err) {
    console.error("fetchTopics error:", err);
    return { topics: [], stats: [] };
  }
}

interface TopicsPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: TopicsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const pageNum = parseInt(params.page || "1", 10);
  const validPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const canonicalUrl =
    validPage > 1
      ? `https://getmerged.abhishekco.de/topics?page=${validPage}`
      : "https://getmerged.abhishekco.de/topics";

  const title =
    validPage > 1
      ? `Browse Open Source Repositories by Topic & Stack (Page ${validPage}) | GetMerged`
      : "Browse Open Source Repositories by Topic & Stack | GetMerged";
  const description =
    "Explore indexed open-source repositories by topic and tag. Discover active projects scored by C-Rank™, PR merge velocity, and contributor responsiveness.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export default async function TopicsIndexPage({ searchParams }: TopicsPageProps) {
  const params = await searchParams;
  const pageNum = parseInt(params.page || "1", 10);
  const initialPage = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;

  const { topics, stats } = await fetchTopics();
  const initialLimit = Math.max(INITIAL_TOPIC_LIMIT, initialPage * INITIAL_TOPIC_LIMIT);
  const initialTopics = topics.slice(0, initialLimit);
  const initialStats = stats.slice(0, initialLimit);

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
        name: "Topics",
        item: "https://getmerged.abhishekco.de/topics",
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open Source Repository Topics Index",
    description:
      "Curated topic directories ranked by maintainer responsiveness and contributor merge odds.",
    numberOfItems: initialTopics.length,
    itemListElement: initialTopics.map((topic, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `#${topic}`,
      url: `https://getmerged.abhishekco.de/topics/${topic}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#FCFCFD] flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Navigation backlink */}
        <Link
          href="/"
          title="Return to GetMerged Explorer Home"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white border border-zinc-200/60 border-b-4 text-xs text-black hover:bg-zinc-100 transition-colors mb-6 font-sans font-bold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Header Section */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200/60">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-emerald-100 border border-zinc-200/60 text-black text-xs font-mono font-bold mb-3">
            <Tag className="h-3.5 w-3.5" /> Topic Directory
          </div>
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Explore Repositories by Topic{" "}
            {topics.length > 0 && (
              <span className="text-zinc-500 font-normal text-xl sm:text-2xl">
                ({topics.length.toLocaleString()} Topics)
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-600 font-sans mt-2 max-w-2xl">
            Browse developer-curated tags and open-source topics. Discover high-velocity projects with responsive maintainers and Good First Issues.
          </p>
        </div>

        {/* Empty State */}
        {topics.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-none border border-zinc-200/60 border-b-4 shadow-[4px_4px_0px_0px_#000] max-w-lg mx-auto my-8">
            <div className="h-12 w-12 rounded-none bg-zinc-100 text-black border border-zinc-200/60 flex items-center justify-center mx-auto mb-4">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="font-space text-lg font-bold text-zinc-900 mb-2">
              No Indexed Topics Found
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 font-sans leading-relaxed mb-6">
              No indexed topics are available at this time. Check back soon as new open-source repositories are crawled and indexed.
            </p>
            <Link
              href="/"
              title="Return to home page"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-black hover:bg-zinc-800 text-white border border-zinc-200/60 border-b-4 font-bold text-xs transition-all"
            >
              Explore Repositories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          /* Topic Directory Grid with on-demand remainder expansion */
          <TopicDirectoryGrid
            initialTopics={initialTopics}
            initialStats={initialStats}
            totalCount={topics.length}
            initialPage={initialPage}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
