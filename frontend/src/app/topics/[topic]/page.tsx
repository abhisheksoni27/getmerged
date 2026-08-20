import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { TopicReposExplorer } from "@/components/TopicReposExplorer";
import {
  Tag,
  GitPullRequest,
  Clock,
} from "lucide-react";

export const revalidate = 3600; // Edge cache for 1 hour

interface TopicPageProps {
  params: Promise<{ topic: string }>;
}

async function fetchTopicRepos(topic: string): Promise<Repo[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?topic=${encodeURIComponent(topic)}&per_page=30&sort=c_rank_score&order=desc`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (err) {
    console.error("fetchTopicRepos error:", err);
    return [];
  }
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic } = await params;
  const repos = await fetchTopicRepos(topic);

  if (repos.length === 0) {
    return { title: "Topic Not Found | GetMerged" };
  }

  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  const title = `Best ${capitalizedTopic} Open Source Repositories & C-Rank™ | GetMerged`;
  const description = `Find active ${topic} open-source repositories with fast pull request review turnaround, high merge rates, and Good First Issues on GetMerged.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/topics/${topic}`,
    },
    openGraph: {
      title,
      description,
      url: `https://getmerged.abhishekco.de/topics/${topic}`,
      siteName: "GetMerged",
      type: "website",
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params;
  const repos = await fetchTopicRepos(topic);

  // Strict anti-DOS / empty route protection
  if (!repos || repos.length === 0) {
    notFound();
  }

  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  const avgMergeRate =
    repos.reduce((acc, r) => acc + (r.external_pr_merge_rate || 0), 0) / repos.length;
  const avgResponseHours =
    repos.reduce((acc, r) => acc + (r.response_p50_hours || r.time_to_first_response_hours || 0), 0) /
    repos.length;

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
      {
        "@type": "ListItem",
        position: 3,
        name: capitalizedTopic,
        item: `https://getmerged.abhishekco.de/topics/${topic}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${capitalizedTopic} Open Source Repositories Ranked by C-Rank™`,
    description: `Curated ${topic} repositories ranked by objective maintainer response time and external contributor merge odds.`,
    itemListElement: repos.map((repo, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: repo.full_name,
      url: `https://getmerged.abhishekco.de/${repo.full_name}`,
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="mb-8 border-b border-zinc-200/80 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono font-bold mb-3">
            <Tag className="h-3.5 w-3.5" /> Topic Hub
          </div>
          <h1 className="font-space text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            #{topic} <span className="text-zinc-500 font-normal text-xl sm:text-2xl">({repos.length} Repositories)</span>
          </h1>
          <p className="text-sm text-zinc-600 font-sans mt-2 max-w-2xl">
            Ranked open-source repositories tagged with <strong>#{topic}</strong>, scored by pull request acceptance likelihood and maintainer engagement velocity.
          </p>

          {/* Topic Aggregated Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5 text-blue-500" /> Topic Avg Merge Rate
              </span>
              <p className="font-space text-xl font-bold text-zinc-900 mt-1">{avgMergeRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
              <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Avg Review Latency
              </span>
              <p className="font-space text-xl font-bold text-zinc-900 mt-1">{avgResponseHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        {/* Repository Grid with language filter + rankings cross-links */}
        <TopicReposExplorer topic={topic} repos={repos} />
      </main>

      <Footer />
    </div>
  );
}
