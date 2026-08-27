import React from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";
import { WatchlistClient, WatchedRepoItem } from "./WatchlistClient";
import { ReferralCard } from "@/components/ReferralCard";

export const metadata: Metadata = {
  title: "My Watchlist - C-Rank™ Changes & Repository Monitoring | GetMerged",
  description:
    "Track live C-Rank™ tier shifts, maintainer response velocity, and telemetry changes for your saved open-source repositories.",
  robots: {
    index: false,
    follow: false,
  },
};

async function getWatchlistData(token: string): Promise<WatchedRepoItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/watchlist`, {
      headers: {
        Cookie: `opendoor_token=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const repoIds: string[] = data.watchlist || [];
    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return [];
    }

    const items = await Promise.all(
      repoIds.map(async (id) => {
        try {
          const [repoRes, historyRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}`, { cache: "no-store" }),
            fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(id)}/history`, { cache: "no-store" }),
          ]);

          const repo = repoRes.ok ? await repoRes.json() : null;
          const historyData = historyRes.ok ? await historyRes.json() : null;

          if (!repo) return null;

          return {
            repo,
            history: historyData?.history || [],
          };
        } catch (e) {
          console.error(`Failed to fetch watchlist repo ${id}`, e);
          return null;
        }
      })
    );

    return items.filter(Boolean) as WatchedRepoItem[];
  } catch (e) {
    console.error("Failed to load watchlist data", e);
    return [];
  }
}

export default async function WatchlistPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("opendoor_token")?.value;

  if (!token) {
    redirect("/api/v1/auth/github");
  }

  const initialItems = await getWatchlistData(token);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <main className="flex-1 pt-8">
        <ReferralCard />
        <WatchlistClient initialItems={initialItems} />
      </main>
      <Footer />
    </div>
  );
}
