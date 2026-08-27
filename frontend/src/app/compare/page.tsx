import React, { Suspense } from "react";
import { Metadata } from "next";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Open Source Repositories | GetMerged",
  description:
    "Compare open-source repositories side-by-side on PR merge rates, maintainer response time, C-Rank™, and contributor hospitality.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/compare",
  },
};

export default function CompareHubPage() {
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
        name: "Compare Repositories",
        item: "https://getmerged.abhishekco.de/compare",
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Compare Open Source Repositories | GetMerged",
    description:
      "Compare open-source repositories side-by-side on PR merge rates, maintainer response time, C-Rank™, and contributor hospitality.",
    url: "https://getmerged.abhishekco.de/compare",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Semantic Crawl Floor */}
      <section className="sr-only" aria-label="Compare Open Source Repositories">
        <h2>Compare Open Source Repositories Side-by-Side</h2>
        <p>
          Evaluate two repositories against each other on PR merge rates, code review turnaround time, maintainer responsiveness, and first-time contributor success rates.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="min-h-screen bg-black flex items-center justify-center font-mono text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              Loading Compare Tool...
            </div>
          </div>
        }
      >
        <CompareClient />
      </Suspense>
    </>
  );
}
