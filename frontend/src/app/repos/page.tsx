import React from "react";
import { Metadata } from "next";
import { ReposClient } from "./ReposClient";

export const metadata: Metadata = {
  title: "Open-Source Repositories Directory & Filter Index | Opendoor",
  description:
    "Explore 1,400+ public GitHub repositories evaluated by C-Rank™ on PR merge rate, maintainer response speed, and first-time contributor friendliness.",
  keywords: [
    "open source repositories",
    "github repository list",
    "open source contributor projects",
    "c-rank repositories",
    "good first issue repositories",
    "high merge rate github projects",
    "fast maintainer response time",
  ],
  alternates: {
    canonical: "https://opendoor.abhishekco.de/repos",
  },
  openGraph: {
    title: "Open-Source Repositories Directory & Filter Index | Opendoor",
    description:
      "Explore 1,400+ public GitHub repositories evaluated by C-Rank™ on PR merge rate, maintainer response speed, and first-time contributor friendliness.",
    type: "website",
    url: "https://opendoor.abhishekco.de/repos",
    siteName: "Opendoor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open-Source Repositories Directory & Filter Index | Opendoor",
    description:
      "Filter 1,400+ GitHub open-source repositories by language, stars, responsiveness, and C-Rank™ tiers.",
  },
};

export default function ReposPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Open-Source Repository Explorer & Directory",
    url: "https://opendoor.abhishekco.de/repos",
    description:
      "Comprehensive directory of open-source repositories scored by PR merge velocity and maintainer responsiveness.",
    isPartOf: {
      "@type": "WebSite",
      name: "Opendoor",
      url: "https://opendoor.abhishekco.de",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <ReposClient />
    </>
  );
}
