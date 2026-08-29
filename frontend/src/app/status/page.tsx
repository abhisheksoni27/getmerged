import React from "react";
import { Metadata } from "next";
import { StatusClient } from "./StatusClient";

export const metadata: Metadata = {
  title: "System Status & API Health | GetMerged",
  description: "Real-time API operational status, latency metrics, and backend service health checks.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/status",
  },
  openGraph: {
    title: "System Status & API Health | GetMerged",
    description: "Real-time API operational status, latency metrics, and backend service health checks.",
    url: "https://getmerged.abhishekco.de/status",
    siteName: "GetMerged",
  },
};

export default function StatusPage() {
  return (
    <>
      <section className="sr-only" aria-label="System Status Overview">
        <h2>GetMerged Live System Status & Health Metrics</h2>
        <p>Operational health of GetMerged GraphQL indexing pipelines, database cluster, API endpoints, and caching servers.</p>
      </section>
      <StatusClient />
    </>
  );
}
