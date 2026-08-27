import React from "react";
import HomeClient from "./HomeClient";
import type { MacroStats, Repo } from "@/types/opendoor";

async function getMacroStats(): Promise<MacroStats | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/stats/macro`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.stats || null;
  } catch {
    return null;
  }
}

async function getInitialRepos(): Promise<Repo[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/repos?page=1&per_page=15&sort=stars&order=desc&tier=S`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawList = data.data || data.repos || [];
    if (Array.isArray(rawList)) {
      return rawList.map((r: Record<string, unknown>) => ({
        ...(r as unknown as Repo),
        c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "S",
        class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "S",
        first_timer_success_rate:
          (r.first_timer_success_rate as number) !== undefined
            ? (r.first_timer_success_rate as number)
            : (r.first_timer_rate as number),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function getInitialSpotlightRepos(): Promise<Repo[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(
      `${baseUrl}/api/v1/repos?scored_today=true&max_last_activity_days=7&exclude_stale=true&exclude_fallback=true&min_tier=B&sort=c_rank_score&order=desc&per_page=30`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rawList = data?.data || data?.repos;
    if (Array.isArray(rawList) && rawList.length > 0) {
      const mapped: Repo[] = rawList.map((r: Record<string, unknown>) => ({
        ...(r as unknown as Repo),
        c_rank_tier: (r.c_rank_tier as string) || (r.class_rank as string) || "",
        class_rank: (r.class_rank as string) || (r.c_rank_tier as string) || "",
        first_timer_success_rate:
          (r.first_timer_success_rate as number) !== undefined
            ? (r.first_timer_success_rate as number)
            : (r.first_timer_rate as number),
      }));

      const distinctLangRepos: Repo[] = [];
      const seenLangs = new Set<string>();

      for (const repo of mapped) {
        const lang = repo.language || "Other";
        if (!seenLangs.has(lang)) {
          seenLangs.add(lang);
          distinctLangRepos.push(repo);
        }
        if (distinctLangRepos.length === 3) break;
      }

      return distinctLangRepos.length === 3 ? distinctLangRepos : mapped.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [initialStats, initialRepos, initialSpotlightRepos] = await Promise.all([
    getMacroStats(),
    getInitialRepos(),
    getInitialSpotlightRepos(),
  ]);

  const graphJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://getmerged.abhishekco.de/#website",
        name: "GetMerged",
        url: "https://getmerged.abhishekco.de",
        description: "Glassdoor for open-source repositories. Objective metrics on PR merge rates and maintainer response times.",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://getmerged.abhishekco.de/repos?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
        publisher: {
          "@id": "https://getmerged.abhishekco.de/#organization",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://getmerged.abhishekco.de/#organization",
        name: "GetMerged",
        url: "https://getmerged.abhishekco.de",
        logo: "https://getmerged.abhishekco.de/icon.svg",
        sameAs: ["https://github.com/abhisheksoni27/getmerged"],
      },
      {
        "@type": "WebApplication",
        "@id": "https://getmerged.abhishekco.de/#webapp",
        name: "GetMerged",
        url: "https://getmerged.abhishekco.de",
        description: "Glassdoor for open-source repositories. Objective C-Rank™ metrics on PR merge rates and response times.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "All",
        browserRequirements: "Requires modern web browser with JavaScript enabled",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        keywords: "open source contribution, good first issue, github repositories, github profile, developer portfolio, pull request merge rate, maintainer response time",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graphJsonLd) }}
      />
      <HomeClient
        initialStats={initialStats}
        initialRepos={initialRepos}
        initialSpotlightRepos={initialSpotlightRepos}
      />
    </>
  );
}
