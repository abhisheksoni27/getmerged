import React from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "My PR Tracker - Personal Pull Request Journey | GetMerged",
  description:
    "Track your open pull requests to C-Rank™ scored repositories with live status, time-in-review benchmarks, and acceptance forecasts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PRTrackerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("opendoor_token")?.value;

  if (!token) {
    redirect("/api/v1/auth/github");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFCFD]">
      <Header />
      <main className="flex-1 pt-8">
        <DashboardClient />
      </main>
      <Footer />
    </div>
  );
}
