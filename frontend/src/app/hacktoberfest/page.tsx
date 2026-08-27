import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { HacktoberfestClient, LeaderboardRepo } from "./HacktoberfestClient";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hacktoberfest 2026 Welcome Hub: Ranked Leaderboard & Live Merge Tracker - GetMerged",
  description:
    "Track live Hacktoberfest 2026 PR merge progress (X of 4) and explore newcomer-welcoming repositories ranked by C-Rank™ (S/A/B) and Good First Issue quality.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/hacktoberfest",
  },
  openGraph: {
    title: "Hacktoberfest 2026 Welcome Hub & Live Merge Tracker - GetMerged",
    description:
      "Find beginner-friendly open source repositories and track your Hacktoberfest PR merges live with verified completion cards.",
    url: "https://getmerged.abhishekco.de/hacktoberfest",
    siteName: "GetMerged",
  },
};

async function getHacktoberfestLeaderboard(): Promise<LeaderboardRepo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/hacktoberfest/leaderboard?limit=50`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.repos || [];
  } catch (e) {
    console.error("Failed to fetch hacktoberfest leaderboard:", e);
    return [];
  }
}

export default async function HacktoberfestPage() {
  const initialRepos = await getHacktoberfestLeaderboard();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hacktoberfest 2026 Welcoming Repositories Leaderboard",
    description: "Ranked list of newcomer-friendly open-source repositories for Hacktoberfest 2026.",
    itemListElement: initialRepos.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.full_name,
      item: {
        "@type": "SoftwareSourceCode",
        name: r.full_name,
        url: `https://getmerged.abhishekco.de/${r.full_name}`,
        programmingLanguage: r.language || "Other",
        codeRepository: `https://github.com/${r.full_name}`,
      },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100 font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* Semantic SSR Crawl Floor */}
      <section className="sr-only" aria-label="Hacktoberfest Welcoming Leaderboard">
        <h1>Hacktoberfest 2026 Welcoming Repositories & Live Merge Tracker</h1>
        <p>
          Discover beginner-friendly GitHub repositories actively participating in Hacktoberfest 2026 with high PR merge acceptance rates and responsive maintainers.
        </p>
        <ul>
          {initialRepos.map((r) => (
            <li key={r.full_name}>
              <Link href={`/${r.full_name}`} title={`View ${r.full_name} Hacktoberfest metrics`}>
                {r.full_name} ({r.language || "Code"}) - Tier {r.c_rank_tier || "A"} ({r.first_timer_success_rate ? `${Math.round(r.first_timer_success_rate)}% first-timer success` : ""})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <main className="flex-1">
        <HacktoberfestClient initialRepos={initialRepos} />
      </main>
      <Footer />
    </div>
  );
}
