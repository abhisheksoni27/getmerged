import React from "react";
import HomeClient from "./HomeClient";
import type { MacroStats } from "@/types/opendoor";

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

export default async function HomePage() {
  const initialStats = await getMacroStats();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GetMerged",
    url: "https://getmerged.abhishekco.de",
    description: "Glassdoor for open-source repositories. Objective metrics on PR merge rates and maintainer response times.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://getmerged.abhishekco.de/?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GetMerged",
    url: "https://getmerged.abhishekco.de",
    logo: "https://getmerged.abhishekco.de/icon.svg",
    sameAs: ["https://github.com/abhisheksoni27/opendoor"],
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GetMerged",
    url: "https://getmerged.abhishekco.de",
    description: "Glassdoor for open-source repositories. Objective C-Rank™ metrics on PR merge rates and response times.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "All",
    keywords: "open source contribution, good first issue, github repositories, github profile, developer portfolio, pull request merge rate, maintainer response time",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <HomeClient initialStats={initialStats} />
    </>
  );
}
