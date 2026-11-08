"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";
import { HomeSection } from "./HomeSection";

interface SpotlightSectionProps {
  spotlightVisible: Repo[];
  loading: boolean;
  isLoggedIn: boolean;
}

function SpotlightSkeletons() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[rgba(17,24,39,0.7)] p-6 h-[280px] shadow-xs flex flex-col justify-between backdrop-blur-md"
        >
          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-white/5 animate-pulse" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-white/10 rounded-lg" />
              <div className="h-5 w-16 bg-white/10 rounded-lg" />
            </div>
            <div className="h-3 w-full bg-white/5 rounded mb-2" />
            <div className="h-3 w-3/4 bg-white/5 rounded mb-5" />
            <div className="h-10 w-full bg-black/40 rounded-xl mb-4" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

function SpotlightBody({ spotlightVisible, loading, isLoggedIn }: SpotlightSectionProps) {
  if (spotlightVisible.length > 0) {
    return (
      <>
        {spotlightVisible.map((r, idx) => (
          <RepoCard key={r.id || r.full_name} repo={r} isLoggedIn={isLoggedIn} isSpotlight={true} spotlightIndex={idx} />
        ))}
      </>
    );
  }
  if (loading) {
    return <SpotlightSkeletons />;
  }
  return null;
}

/** Today's Top Repos spotlight. */
export function SpotlightSection({ spotlightVisible, loading, isLoggedIn }: SpotlightSectionProps) {
  return (
    <HomeSection maxWidth="7xl" className="py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-8 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-display tracking-tight">
              Today&apos;s Open Doors
            </h2>
            <span className="pill pill-green ml-2">Active Today</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
            Verified Tier S &amp; A maintainers actively reviewing and merging community contributions right now.
          </p>
        </div>
        <Link prefetch={false}
          href="/repos"
          title="Explore All Scored Repositories"
          className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors px-3 py-1.5 self-start sm:self-auto inline-flex items-center gap-1.5 shrink-0"
        >
          <span>Explore All 153k Repos</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SpotlightBody spotlightVisible={spotlightVisible} loading={loading} isLoggedIn={isLoggedIn} />
      </div>
    </HomeSection>
  );
}
