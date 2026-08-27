import React from "react";
import { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pro Contributor Pricing & Plans | GetMerged",
  description:
    "Upgrade to GetMerged Pro for unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight reviews.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/pricing",
  },
  openGraph: {
    title: "Pro Contributor Pricing & Plans | GetMerged",
    description:
      "Upgrade to GetMerged Pro for unlimited repository acceptance forecasts, live maintainer vibe checks, and automated pre-flight reviews.",
    url: "https://getmerged.abhishekco.de/pricing",
  },
};

export default function PricingPage() {
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
        name: "Pricing",
        item: "https://getmerged.abhishekco.de/pricing",
      },
    ],
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "GetMerged Pro Contributor",
    description:
      "Unlimited open-source pull request acceptance forecasts, maintainer vibe checks, and automated pre-flight reviews.",
    offers: [
      {
        "@type": "Offer",
        name: "Community Free",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Pro Contributor (Monthly)",
        price: "9.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Pro Contributor (Annual)",
        price: "79.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header />
      <PricingClient />
      <Footer />
    </div>
  );
}
