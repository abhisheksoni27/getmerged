import React from "react";
import { Metadata } from "next";
import { StatusClient } from "./StatusClient";

export const metadata: Metadata = {
  title: "System Status - Opendoor",
  description: "Real-time API operational status, latency metrics, and backend service health checks.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://opendoor.abhishekco.de/status",
  },
  openGraph: {
    title: "System Status - Opendoor",
    description: "Real-time API operational status, latency metrics, and backend service health checks.",
    url: "https://opendoor.abhishekco.de/status",
    siteName: "Opendoor",
  },
};

export default function StatusPage() {
  return <StatusClient />;
}
