import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import { RepoCard } from "@/components/RepoCard";

export const metadata: Metadata = {
  title: "Open Source Hall of Fame (S-Tier Repositories) — Opendoor",
  description: "The Hall of Fame showcases S-Tier public GitHub repositories with elite PR merge rates and rapid maintainer responses.",
  alternates: {
    canonical: "https://opendoor.abhishekco.de/hall-of-fame",
  },
  openGraph: {
    title: "Open Source Hall of Fame — Opendoor",
    description: "Featured showcase of top S-Tier open-source repositories welcoming contributors.",
    url: "https://opendoor.abhishekco.de/hall-of-fame",
    siteName: "Opendoor",
  },
};

async function getSTierRepos(): Promise<Repo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?tier=S&sort=c_rank_score&order=desc&per_page=30`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data.repos || [];
  } catch (e) {
    console.error("Failed to fetch S-tier repos:", e);
    return [];
  }
}

export default async function HallOfFamePage() {
  const repos = await getSTierRepos();

  return (
    <div className="relative min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full text-zinc-800">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/70 text-xs text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors mb-6 font-sans border border-zinc-200/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Explorer
        </Link>

        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cream border-2 border-brand-dark px-3.5 py-1.5 text-xs font-extrabold text-brand-dark font-space shadow-[2px_2px_0px_#222831] rotate-1">
              <Trophy className="h-3.5 w-3.5 text-brand-dark" /> S-Tier Showcase
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight font-space">
            Open Source Hall of Fame
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed font-sans">
            These elite repositories have earned an <strong>S-Tier C-Rank™</strong> score. Maintainers in the Hall of Fame merge external PRs rapidly, communicate constructively, and provide standard-setting onboarding for new contributors.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-zinc-200/40 pb-4">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-space">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            S-Tier Repositories ({repos.length})
          </h2>
          <span className="text-xs text-zinc-500 font-sans">Updated Daily</span>
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center text-zinc-500 text-xs mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.015)] font-sans">
            No S-Tier repositories indexed yet.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
