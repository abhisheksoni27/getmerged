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
          className="relative overflow-hidden rounded-none border-2 border-black bg-white p-6 h-[280px] shadow-[4px_4px_0px_0px_#000] flex flex-col justify-between"
        >
          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-neutral-100 animate-pulse" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-neutral-200 border border-black" />
              <div className="h-5 w-16 bg-neutral-200 border border-black" />
            </div>
            <div className="h-3 w-full bg-neutral-200 mb-2" />
            <div className="h-3 w-3/4 bg-neutral-200 mb-5" />
            <div className="h-10 w-full bg-neutral-100 border-2 border-black mb-4" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t-2 border-black">
            <div className="h-4 w-20 bg-neutral-200" />
            <div className="h-4 w-16 bg-neutral-200" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-black flex items-center gap-2 font-display uppercase tracking-tight">
            <Flame className="h-6 w-6 text-black fill-[#FACC15]" /> Today&apos;s Open Doors
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 font-mono mt-1">Verified active maintainers merging community contributions right now.</p>
        </div>
        <Link prefetch={false}
          href="/hall-of-fame"
          title="View S-Tier Hall of Fame repositories"
          className="text-xs font-mono font-black text-black hover:bg-[#FACC15] border-2 border-black bg-white px-3.5 py-1.5 shadow-[2px_2px_0px_0px_#000] inline-flex items-center gap-1.5 shrink-0 uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
