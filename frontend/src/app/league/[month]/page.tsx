import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { LeagueClient, LeagueRepo, ContributorMVP } from "../LeagueClient";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ month: string }>;
}

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  if (!MONTH_REGEX.test(month)) {
    return { title: "Sprint Archive Not Found | GetMerged" };
  }

  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  const monthName = `${date.toLocaleString("default", { month: "long" })} ${year} Sprint`;

  return {
    title: `${monthName} Rankings & Contributor Champions | GetMerged`,
    description: `Archival rankings, top welcoming repositories, and contributor achievements for the ${monthName} on GetMerged.`,
    alternates: {
      canonical: `https://getmerged.abhishekco.de/league/${month}`,
    },
  };
}

async function getMonthlyLeaderboard(month: string): Promise<{ repos: LeagueRepo[]; contributors: ContributorMVP[]; monthName: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/league/leaderboard?month=${encodeURIComponent(month)}&limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return { repos: [], contributors: [], monthName: `${month} Sprint` };
    }
    const data = await res.json();
    return {
      repos: data.repos || [],
      contributors: data.contributors || [],
      monthName: data.month_name || `${month} Sprint`,
    };
  } catch (e) {
    console.error("Failed to fetch monthly league archive:", e);
    return { repos: [], contributors: [], monthName: `${month} Sprint` };
  }
}

export default async function MonthlyLeagueArchivePage({ params }: PageProps) {
  const { month } = await params;
  if (!MONTH_REGEX.test(month)) {
    notFound();
  }

  const { repos, contributors, monthName } = await getMonthlyLeaderboard(month);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${monthName} Archive Leaderboard`,
    description: `Archived list of welcoming open-source repositories for ${monthName}.`,
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
      <section className="sr-only" aria-label="Monthly League Archive Overview">
        <h1>{monthName} - Open Source Contributor League Archive</h1>
        <p>
          Historical open-source repository rankings and contributor leaderboard for {monthName}.
        </p>
        <ul>
          {repos.map((r) => (
            <li key={r.full_name}>
              <Link prefetch={false} href={`/${r.full_name}`} title={`View ${r.full_name} metrics`}>
                {r.full_name} ({r.language || "Code"}) - Tier {r.c_rank_tier || "A"}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <main className="flex-1">
        <LeagueClient initialRepos={repos} contributors={contributors} monthName={monthName} currentMonth={month} />
      </main>
      <Footer />
    </div>
  );
}
