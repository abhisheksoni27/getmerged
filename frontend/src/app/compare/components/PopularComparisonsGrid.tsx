"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { POPULAR_COMPARISONS } from "./compareTypes";

export function PopularComparisonsGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-space text-lg sm:text-xl font-bold text-white">
            Popular Head-to-Head Comparisons
          </h2>
          <p className="text-xs text-zinc-300 font-sans mt-0.5">
            Explore frequently referenced open-source benchmark pairings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POPULAR_COMPARISONS.map((item) => (
          <Link prefetch={false}
            key={`${item.repoA}-vs-${item.repoB}`}
            href={`/compare/${item.repoA}/vs/${item.repoB}`}
            title={`Compare ${item.repoA} vs ${item.repoB} maintainer review metrics`}
            className="group p-5 rounded-2xl glass-panel border border-white/[0.1] shadow-2xs hover:shadow-md hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
          >
            <div>
              <div className="text-[11px] font-mono text-zinc-300 font-semibold mb-2">
                {item.category}
              </div>
              <div className="font-space text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                <span>{item.repoA}</span>
                <span className="text-zinc-300 font-normal text-xs">vs</span>
                <span>{item.repoB}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.1] flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="text-[11px]">Compare scorecard</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
