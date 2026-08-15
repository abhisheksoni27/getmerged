import React from "react";
import { Metadata } from "next";
import { StatusClient } from "./StatusClient";

export const metadata: Metadata = {
  title: "System Status - GetMerged",
  description: "Real-time API operational status, latency metrics, and backend service health checks.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://getmerged.abhishekco.de/status",
  },
  openGraph: {
    title: "System Status - GetMerged",
    description: "Real-time API operational status, latency metrics, and backend service health checks.",
    url: "https://getmerged.abhishekco.de/status",
    siteName: "GetMerged",
  },
};

export default function StatusPage() {
  return <StatusClient />;
}
