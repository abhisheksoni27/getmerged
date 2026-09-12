"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Scale } from "lucide-react";
import posthog from "posthog-js";
import { useCompareSelection } from "./hooks/useCompareSelection";
import { RepoSlotPicker } from "./components/RepoSlotPicker";
import { CompareActionRow } from "./components/CompareActionRow";
import { PopularComparisonsGrid } from "./components/PopularComparisonsGrid";

export default function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialA = searchParams.get("a") || searchParams.get("repoA") || "";
  const initialB = searchParams.get("b") || searchParams.get("repoB") || "";

  const {
    repoA,
    setRepoA,
    repoB,
    setRepoB,
    queryA,
    setQueryA,
    queryB,
    setQueryB,
    resultsA,
    resultsB,
    loadingA,
    loadingB,
    openDropdownA,
    setOpenDropdownA,
    openDropdownB,
    setOpenDropdownB,
    dropdownRefA,
    dropdownRefB,
    handleSelectA,
    handleSelectB,
  } = useCompareSelection(initialA, initialB);

  const handleCompare = () => {
    if (!repoA || !repoB) return;
    const nameA = repoA.full_name.toLowerCase();
    const nameB = repoB.full_name.toLowerCase();

    posthog.capture("compare_submitted", {
      repo_a: repoA.full_name,
      repo_b: repoB.full_name,
    });

    if (nameA === nameB) {
      router.push(`/${repoA.full_name}`);
      return;
    }

    if (nameA > nameB) {
      router.push(`/compare/${repoB.full_name}/vs/${repoA.full_name}`);
    } else {
      router.push(`/compare/${repoA.full_name}/vs/${repoB.full_name}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 sm:py-16">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300/80 text-emerald-300 text-xs font-mono font-bold mb-4">
            <Scale className="h-3.5 w-3.5" /> Repository Head-to-Head Picker
          </div>
          <h1 className="font-space text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Compare Open Source Repositories
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 font-sans leading-relaxed">
            Benchmark two projects side-by-side across pull request turnaround, maintainer responsiveness, 90-day bus factor, and newcomer merge likelihood.
          </p>
        </div>

        {/* Dual Repo Picker Box */}
        <div className="glass-panel border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-xs mb-14">
          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
            <RepoSlotPicker
              slotLabel="Repository A"
              testId="repo-picker-a"
              placeholder="Search repository A (e.g. facebook/react)..."
              selected={repoA}
              query={queryA}
              results={resultsA}
              loading={loadingA}
              dropdownOpen={openDropdownA}
              dropdownRef={dropdownRefA}
              onQueryChange={setQueryA}
              onDropdownOpen={() => setOpenDropdownA(true)}
              onSelect={handleSelectA}
              onClear={() => setRepoA(null)}
            />

            {/* VS Badge */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full glass-card border border-white/[0.1] flex items-center justify-center font-mono text-xs font-black text-zinc-300 uppercase shadow-2xs">
                VS
              </div>
            </div>

            <RepoSlotPicker
              slotLabel="Repository B"
              testId="repo-picker-b"
              placeholder="Search repository B (e.g. vuejs/vue)..."
              selected={repoB}
              query={queryB}
              results={resultsB}
              loading={loadingB}
              dropdownOpen={openDropdownB}
              dropdownRef={dropdownRefB}
              onQueryChange={setQueryB}
              onDropdownOpen={() => setOpenDropdownB(true)}
              onSelect={handleSelectB}
              onClear={() => setRepoB(null)}
            />
          </div>

          <CompareActionRow repoA={repoA} repoB={repoB} onCompare={handleCompare} />
        </div>

        {/* Popular Head-to-Head Comparisons Section */}
        <PopularComparisonsGrid />
      </main>

      <Footer />
    </div>
  );
}
