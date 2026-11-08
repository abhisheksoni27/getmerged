"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 sm:py-16">
        {/* Header Hero */}
        <div className="card card-highlight p-6 sm:p-8 mb-8">
          <div className="hero-badge">
            <span className="dot" />
            <span>SIDE-BY-SIDE BENCHMARK</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2.5">
            Compare Contributor Experience
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl">
            Deciding where to spend your weekend contributing? Compare two repositories side-by-side with objective merge rates, maintainer response time, and first-timer acceptance.
          </p>
        </div>

        {/* Dual Repo Picker Box */}
        <div className="card p-6 sm:p-8 mb-12">
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
              <div className="h-10 w-10 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center font-mono text-xs font-black text-[var(--text-secondary)] uppercase shadow-xs">
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
