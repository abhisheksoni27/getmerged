"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ loading, page, totalPages, totalCount, onPageChange }: PaginationBarProps) {
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    const total = totalPages;

    for (let i = Math.max(2, page - delta); i <= Math.min(total - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift(-1); // indicator for ellipsis
    }
    range.unshift(1);

    if (page + delta < total - 1) {
      range.push(-2); // indicator for ellipsis
    }
    if (total > 1) {
      range.push(total);
    }

    return range;
  }, [page, totalPages]);

  if (loading || totalPages <= 1) return null;

  const goToPage = (num: number) => {
    onPageChange(num);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.1] pt-8">
      <div className="text-xs font-mono text-zinc-300">
        Showing page <span className="text-white font-bold">{page}</span> of{" "}
        <span className="text-white font-bold">{totalPages}</span> ({totalCount.toLocaleString()} total repos)
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goToPage(Math.max(1, page - 1))}
          className="p-2 rounded-xl border border-white/[0.1] bg-black/60 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((num, idx) => {
            if (num < 0) {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-zinc-300 text-xs">
                  ...
                </span>
              );
            }
            const isCurrent = num === page;
            return (
              <button
                key={num}
                type="button"
                onClick={() => goToPage(num)}
                className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "bg-black/60 border border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/[0.2]"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => goToPage(Math.min(totalPages, page + 1))}
          className="p-2 rounded-xl border border-white/[0.1] bg-black/60 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          aria-label="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
