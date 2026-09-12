import React from "react";
import { Metadata } from "next";
import { PRSimulatorClient } from "./PRSimulatorClient";

export const metadata: Metadata = {
  title: "PR Simulator: Test Pull Request Merge Likelihood | GetMerged",
  description:
    "Simulate your GitHub pull request before submission. Check diff size, title conventions, and description depth against repo merge patterns.",
  alternates: {
    canonical: "https://getmerged.abhishekco.de/pr-simulator",
  },
  openGraph: {
    title: "PR Simulator: Test Pull Request Merge Likelihood | GetMerged",
    description:
      "Predict pull request acceptance probability and estimate reviewer turnaround time before you PR.",
    url: "https://getmerged.abhishekco.de/pr-simulator",
    siteName: "GetMerged",
  },
};

export default function PRSimulatorPage() {
  return <PRSimulatorClient />;
}
