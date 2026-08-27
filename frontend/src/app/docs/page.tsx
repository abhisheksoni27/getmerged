import React from "react";
import type { Metadata } from "next";
import { DocsClient } from "./DocsClient";

export const metadata: Metadata = {
  title: "Public API Documentation - C-Rank™ Data for Bots, Dashboards & CI | GetMerged",
  description:
    "REST API reference for GetMerged C-Rank data: repositories, rankings, and PR forecasts. Authenticate with a free API key (60 req/hour) or Pro access (600 req/hour).",
  alternates: { canonical: "/docs" },
};

export default function PublicDocsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <main className="max-w-5xl mx-auto px-4 py-12 pb-24">
        <DocsClient />
      </main>
    </div>
  );
}
