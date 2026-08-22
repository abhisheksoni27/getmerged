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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#fafafa] flex items-center justify-center font-mono text-sm text-zinc-500">
            Loading comparison hub...
          </div>
        }
      >
        <CompareClient />
      </Suspense>
    </>
  );
}
