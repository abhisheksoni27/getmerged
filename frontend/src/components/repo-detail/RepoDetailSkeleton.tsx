"use client";

export function RepoDetailSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full overflow-hidden font-sans">
      <div className="h-4 w-28 bg-white/[0.08] animate-pulse rounded mb-6" />

      <div className="flex flex-col gap-4 border-b border-white/[0.1] pb-6 mb-8">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-white/[0.08] animate-pulse rounded-lg" />
          <div className="h-6 w-32 bg-white/[0.08] animate-pulse rounded-lg" />
        </div>
        <div className="h-8 w-64 bg-white/[0.08] animate-pulse rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-white/[0.08] animate-pulse rounded" />
      </div>

      <div className="rounded-2xl glass-panel p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-10">
        <div className="h-4 w-48 bg-white/[0.08] animate-pulse rounded mb-6" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-white/[0.08] animate-pulse rounded" />
              <div className="h-8 w-24 bg-white/[0.08] animate-pulse rounded-lg" />
              <div className="h-3 w-28 bg-white/[0.08] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div className="h-5 w-56 bg-white/[0.08] animate-pulse rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-white/[0.08] animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-white/[0.08] animate-pulse rounded" />
        </div>
      </div>
    </main>
  );
}
