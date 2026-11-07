"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
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
          className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 h-[280px] shadow-sm flex flex-col justify-between"
        >
          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-[var(--bg-elevated)] animate-pulse" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 rounded bg-[var(--bg-elevated)]" />
              <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]" />
            </div>
            <div className="h-3 w-full rounded bg-[var(--bg-elevated)] mb-2" />
            <div className="h-3 w-3/4 rounded bg-[var(--bg-elevated)] mb-5" />
            <div className="h-10 w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] mb-4" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <div className="h-4 w-20 rounded bg-[var(--bg-elevated)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-elevated)]" />
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
    <HomeSection maxWidth="7xl" className="py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2 font-display">
            <Flame className="h-5 w-5 text-[var(--color-primary)] fill-[var(--color-primary)]" /> Today&apos;s Open Doors
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-sans mt-1">Verified active maintainers merging community contributions right now.</p>
        </div>
        <Link prefetch={false}
          href="/hall-of-fame"
          title="View S-Tier Hall of Fame repositories"
          className="text-xs font-mono font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1.5 shrink-0"
        >
          View S-Tier Hall of Fame <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SpotlightBody spotlightVisible={spotlightVisible} loading={loading} isLoggedIn={isLoggedIn} />
      </div>
    </HomeSection>
  );
}
