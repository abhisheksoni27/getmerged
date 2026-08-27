import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { LeagueClient, LeagueRepo, ContributorMVP } from "./LeagueClient";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Monthly Open-Source Contributor League & Welcoming Repositories | GetMerged",
  description:
    "Join the active monthly open-source sprint. Merge pull requests into top-ranked C-Rank™ welcoming repositories, level up from Bronze to Gold, and earn verified Proof-of-Merge resume badges.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/league",
  },
  openGraph: {
    title: "Monthly Open-Source Contributor League - GetMerged",
    description:
      "Compete in monthly contributor sprints, track your merged pull requests live, and level up on welcoming open-source repositories.",
    url: "https://getmerged.abhishekco.de/league",
    siteName: "GetMerged",
  },
};

async function getLeagueLeaderboard(): Promise<{ repos: LeagueRepo[]; contributors: ContributorMVP[]; monthName: string; currentMonth: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/league/leaderboard?limit=50`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { repos: [], contributors: [], monthName: "Active Monthly Sprint", currentMonth: "2026-08" };
    }
    const data = await res.json();
    return {
      repos: data.repos || [],
      contributors: data.contributors || [],
      monthName: data.month_name || "Active Monthly Sprint",
      currentMonth: data.month || "2026-08",
    };
  } catch (e) {
    console.error("Failed to fetch league leaderboard:", e);
    return { repos: [], contributors: [], monthName: "Active Monthly Sprint", currentMonth: "2026-08" };
  }
}

export default async function MonthlyLeaguePage() {
  const { repos, contributors, monthName, currentMonth } = await getLeagueLeaderboard();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${monthName} Welcoming Repositories Leaderboard`,
    description: "Ranked list of newcomer-friendly open-source repositories for the active monthly league sprint.",
    itemListElement: repos.map((r, i) => ({
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
    <div className="flex min-h-screen flex-col bg-black text-white font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* Semantic SSR Crawl Floor */}
      <section className="sr-only" aria-label="Monthly League Overview">
        <h2>{monthName} - Monthly Open-Source Contributor League</h2>
        <p>
          Discover beginner-friendly GitHub repositories with high PR merge acceptance rates, active maintainer review teams, and open issues during the {monthName}.
        </p>
        <ul>
          {repos.map((r) => (
            <li key={r.full_name}>
              <Link href={`/${r.full_name}`} title={`View ${r.full_name} monthly metrics`}>
                {r.full_name} ({r.language || "Code"}) - Tier {r.c_rank_tier || "A"} ({r.first_timer_success_rate ? `${Math.round(r.first_timer_success_rate)}% first-timer success` : ""})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <main className="flex-1">
        <LeagueClient initialRepos={repos} contributors={contributors} monthName={monthName} currentMonth={currentMonth} />
      </main>
      <Footer />
    </div>
  );
}
