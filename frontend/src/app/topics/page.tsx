import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopicDirectoryGrid } from "@/components/TopicDirectoryGrid";
import { API_BASE_URL } from "@/lib/api";
import { Tag, ArrowLeft, ArrowRight, Compass } from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

const INITIAL_TOPIC_LIMIT = 100;

async function fetchTopics(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/topics`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.topics || data.data || [];
  } catch (err) {
    console.error("fetchTopics error:", err);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Browse Open Source Repositories by Topic & Stack | GetMerged";
  const description =
    "Explore indexed open-source repositories by topic and tag. Discover active projects scored by C-Rank™, PR merge velocity, and contributor responsiveness.";

  return {
    title,
    description,
    alternates: {
      canonical: "https://getmerged.abhishekco.de/topics",
    },
    openGraph: {
      title,
      description,
      url: "https://getmerged.abhishekco.de/topics",
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export default async function TopicsIndexPage() {
  const topics = await fetchTopics();
  const initialTopics = topics.slice(0, INITIAL_TOPIC_LIMIT);

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
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 transition-colors mb-6 font-sans shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        {/* Hero Header Section */}
        <div className="mb-8 border-b border-zinc-200/80 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono font-bold mb-3">
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
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-zinc-200/80 shadow-xs max-w-lg mx-auto my-8">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-4">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all shadow-xs"
            >
              Explore Repositories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          /* Topic Directory Grid with on-demand remainder expansion */
          <TopicDirectoryGrid
            initialTopics={initialTopics}
            totalCount={topics.length}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
