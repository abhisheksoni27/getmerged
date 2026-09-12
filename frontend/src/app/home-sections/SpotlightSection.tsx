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
          className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#141414] p-5 h-[260px] flex flex-col justify-between"
        >
          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-[#1c1c1c] animate-pulse" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 rounded bg-[#1c1c1c]" />
              <div className="h-5 w-16 rounded bg-[#1c1c1c]" />
            </div>
            <div className="h-3 w-full rounded bg-[#1c1c1c] mb-2" />
            <div className="h-3 w-3/4 rounded bg-[#1c1c1c] mb-5" />
            <div className="h-10 w-full rounded bg-[#1c1c1c] border border-white/[0.04] mb-4" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <div className="h-4 w-20 rounded bg-[#1c1c1c]" />
            <div className="h-4 w-16 rounded bg-[#1c1c1c]" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 font-sans">
            <Flame className="h-5 w-5 text-[#ff6b00] fill-[#ff6b00]" /> Today&apos;s Open Doors
          </h2>
          <p className="text-xs text-[#737373] font-sans mt-0.5">Verified active maintainers merging community contributions right now.</p>
        </div>
        <Link
          href="/hall-of-fame"
          title="View S-Tier Hall of Fame repositories"
          className="text-xs font-mono font-bold text-[#10b981] hover:text-[#a3a3a3] inline-flex items-center gap-1 shrink-0"
        >
          View S-Tier Hall of Fame <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SpotlightBody spotlightVisible={spotlightVisible} loading={loading} isLoggedIn={isLoggedIn} />
      </div>
    </HomeSection>
  );
}
