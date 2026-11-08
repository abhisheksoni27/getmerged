"use client";

import Link from "next/link";
import { RepoCard } from "@/components/RepoCard";
import { Repo } from "@/types/opendoor";

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
          className="repo-card h-[280px] animate-pulse"
        >
          <div>
            <div className="h-5 w-32 bg-white/10 rounded mb-3" />
            <div className="h-3 w-full bg-white/5 rounded mb-2" />
            <div className="h-3 w-3/4 bg-white/5 rounded mb-5" />
          </div>
          <div className="h-20 bg-black/40 rounded-lg" />
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
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-12">
      <div className="sec-header">
        <div>
          <h2 className="sec-title">
            <span className="live-dot" />
            <span>Today&apos;s Open Doors</span>
          </h2>
          <p className="sec-desc">
            Verified active maintainers merging community contributions right now (100–2,500 stars, &lt;12h turnaround).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill pill-green">Verified Today</span>
          <Link
            prefetch={false}
            href="/repos"
            title="Explore All Scored Repositories"
            className="pill pill-purple hover:bg-[rgba(163,113,247,0.2)] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Explore All 153k Repos →</span>
          </Link>
        </div>
      </div>

      <div className="grid-3">
        <SpotlightBody spotlightVisible={spotlightVisible} loading={loading} isLoggedIn={isLoggedIn} />
      </div>
    </section>
  );
}
