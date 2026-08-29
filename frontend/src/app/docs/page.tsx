import React from "react";
import type { Metadata } from "next";
import { DocsClient } from "./DocsClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Public API Documentation - C-Rank™ Data for Bots, Dashboards & CI | GetMerged",
  description:
    "REST API reference for GetMerged C-Rank data: repositories, rankings, and PR forecasts. Authenticate with a free API key (60 req/hour) or Pro access (600 req/hour).",
  alternates: { canonical: "https://getmerged.abhishekco.de/docs" },
};

export default function PublicDocsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "GetMerged Public API Reference",
    description: "REST API reference for GetMerged C-Rank repository scores, rankings, and PR forecasts.",
    publisher: {
      "@type": "Organization",
      name: "GetMerged",
      url: "https://getmerged.abhishekco.de",
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Semantic Crawl Floor */}
      <section className="sr-only" aria-label="API Documentation Overview">
        <h2>GetMerged Public REST API Documentation</h2>
        <p>
          Automate repository insights, fetch C-Rank scores, query ecosystem rankings, and simulate PR acceptance probabilities programmatically.
        </p>
        <div>
          <h2>Core Endpoints</h2>
          <ul>
            <li>GET /api/v1/repos - Query repositories by language, stars, tier, and merge rates</li>
            <li>GET /api/v1/repos/:id - Retrieve deep C-Rank breakdown, telemetry, and maintainer persona</li>
            <li>GET /api/v1/rankings - Fetch language ecosystem leaderboards</li>
            <li>GET /api/v1/stats/macro - Global platform indexing statistics</li>
          </ul>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 py-12 pb-24 flex-1 w-full">
        <DocsClient />
      </main>
      <Footer />
    </div>
  );
}
