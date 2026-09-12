import Link from "next/link";
import { Bookmark, Compass, ArrowRight } from "lucide-react";

export function WatchlistEmptyState() {
  return (
    <div className="p-10 text-center glass-panel rounded-3xl border border-white/[0.1] shadow-2xs my-8 max-w-xl mx-auto flex flex-col items-center animate-fade-in">
      <div className="h-14 w-14 rounded-2xl glass-card flex items-center justify-center mb-4 text-zinc-300">
        <Bookmark className="h-8 w-8" />
      </div>
      <h2 className="font-space text-xl font-bold text-white mb-2">Your Watchlist is Empty</h2>
      <p className="text-sm text-zinc-300 font-sans mb-6 max-w-sm leading-relaxed">
        Save repositories to track live C-Rank™ tier shifts, maintainer response velocity, and telemetry changes in one place.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/repos"
          title="Browse all indexed open source repositories"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl glass-card text-white font-sans text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs no-underline"
        >
          <Compass className="h-4 w-4" />
          <span>Browse Repositories</span>
        </Link>
        <Link
          href="/good-first-issue"
          title="Explore beginner friendly good first issues"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-zinc-300 hover:text-white font-sans text-sm font-medium hover:glass-card transition-colors no-underline"
        >
          <span>Explore Good First Issues</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
