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
      <HomeClient initialStats={initialStats} />
    </>
  );
}
