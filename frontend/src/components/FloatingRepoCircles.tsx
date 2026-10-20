"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Repo } from "@/types/opendoor";
import { LangLogo } from "@/components/LangLogo";
import { useReducedMotion } from "@/lib/motion";
import { Star, GitPullRequest, ExternalLink } from "lucide-react";
import posthog from "posthog-js";

interface FloatingRepoCirclesProps {
  repos?: Repo[];
}

interface OrbItem {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  stars: number;
  mergeRate?: number;
  language?: string;
  avatarUrl: string;
  tier: string;
  slot: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    mobileHide?: boolean;
    size: number;
    align: "left" | "right";
    vAlign: "top" | "bottom";
  };
  animation: {
    y: number[];
    x: number[];
    rotate: number[];
    duration: number;
    delay: number;
  };
}

// Curated high-reputation S-tier open source repos pool (used only as fallback if initialRepos is empty)
const CURATED_S_TIER_REPOS: Array<{
  fullName: string;
  owner: string;
  name: string;
  stars: number;
  mergeRate: number;
  language: string;
}> = [
  { fullName: "facebook/react", owner: "facebook", name: "react", stars: 228000, mergeRate: 92, language: "JavaScript" },
  { fullName: "vercel/next.js", owner: "vercel", name: "next.js", stars: 125000, mergeRate: 89, language: "TypeScript" },
  { fullName: "vuejs/core", owner: "vuejs", name: "core", stars: 49000, mergeRate: 94, language: "TypeScript" },
  { fullName: "golang/go", owner: "golang", name: "go", stars: 124000, mergeRate: 96, language: "Go" },
  { fullName: "rust-lang/rust", owner: "rust-lang", name: "rust", stars: 98000, mergeRate: 91, language: "Rust" },
  { fullName: "oven-sh/bun", owner: "oven-sh", name: "bun", stars: 74000, mergeRate: 88, language: "Zig" },
  { fullName: "tailwindlabs/tailwindcss", owner: "tailwindlabs", name: "tailwindcss", stars: 83000, mergeRate: 93, language: "TypeScript" },
  { fullName: "astral-sh/uv", owner: "astral-sh", name: "uv", stars: 46000, mergeRate: 95, language: "Rust" },
  { fullName: "shadcn/ui", owner: "shadcn", name: "ui", stars: 72000, mergeRate: 90, language: "TypeScript" },
  { fullName: "supabase/supabase", owner: "supabase", name: "supabase", stars: 73000, mergeRate: 87, language: "TypeScript" },
  { fullName: "huggingface/transformers", owner: "huggingface", name: "transformers", stars: 136000, mergeRate: 86, language: "Python" },
  { fullName: "django/django", owner: "django", name: "django", stars: 81000, mergeRate: 94, language: "Python" },
  { fullName: "flutter/flutter", owner: "flutter", name: "flutter", stars: 167000, mergeRate: 90, language: "Dart" },
  { fullName: "microsoft/vscode", owner: "microsoft", name: "vscode", stars: 163000, mergeRate: 88, language: "TypeScript" },
  { fullName: "godotengine/godot", owner: "godotengine", name: "godot", stars: 92000, mergeRate: 93, language: "C++" },
  { fullName: "elastic/elasticsearch", owner: "elastic", name: "elasticsearch", stars: 71000, mergeRate: 85, language: "Java" },
];

// Pre-defined spatial slots orbiting around the hero content with directional tooltip anchoring
const ORB_SLOTS = [
  // Left flank (open rightward so tooltip never overflows left edge)
  { top: "6%", left: "3%", mobileHide: false, size: 54, align: "left" as const, vAlign: "bottom" as const },
  { top: "28%", left: "1.5%", mobileHide: true, size: 62, align: "left" as const, vAlign: "bottom" as const },
  { top: "54%", left: "5%", mobileHide: false, size: 50, align: "left" as const, vAlign: "bottom" as const },
  { top: "78%", left: "2%", mobileHide: true, size: 58, align: "left" as const, vAlign: "top" as const },
  { top: "42%", left: "12%", mobileHide: true, size: 46, align: "left" as const, vAlign: "bottom" as const },

  // Right flank (open leftward so tooltip never overflows right edge)
  { top: "8%", right: "3%", mobileHide: false, size: 58, align: "right" as const, vAlign: "bottom" as const },
  { top: "30%", right: "1.5%", mobileHide: false, size: 52, align: "right" as const, vAlign: "bottom" as const },
  { top: "56%", right: "6%", mobileHide: true, size: 62, align: "right" as const, vAlign: "bottom" as const },
  { top: "80%", right: "2%", mobileHide: true, size: 48, align: "right" as const, vAlign: "top" as const },
  { top: "40%", right: "12%", mobileHide: true, size: 56, align: "right" as const, vAlign: "bottom" as const },
];

// Deterministic PRNG seeded by day
function createSeededPrng(seedString: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
  }
  let s = h >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function FloatingRepoCircles({ repos = [] }: FloatingRepoCirclesProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [hoveredRepo, setHoveredRepo] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const orbs: OrbItem[] = useMemo(() => {
    // Generate daily seed string based on UTC date (e.g. "2026-08-29")
    const today = new Date().toISOString().slice(0, 10);
    const prng = createSeededPrng(`getmerged-hero-s-tier-${today}`);

    const candidateMap = new Map<string, {
      fullName: string;
      owner: string;
      name: string;
      stars: number;
      mergeRate?: number;
      language?: string;
      tier: string;
    }>();

    // Prioritize live S-tier repos from DB props
    const liveSTierRepos = repos.filter((r) => {
      const tier = (r.c_rank_tier || r.class_rank || "").toUpperCase();
      return tier === "S";
    });

    if (liveSTierRepos.length > 0) {
      for (const r of liveSTierRepos) {
        const fullName = r.full_name || `${r.owner}/${r.name}`;
        candidateMap.set(fullName.toLowerCase(), {
          fullName,
          owner: r.owner || fullName.split("/")[0],
          name: r.name || fullName.split("/")[1] || fullName,
          stars: r.stars || 0,
          mergeRate: r.external_pr_merge_rate,
          language: r.language,
          tier: "S",
        });
      }
    } else {
      // Fallback only if no live S-tier repos are provided
      for (const c of CURATED_S_TIER_REPOS) {
        candidateMap.set(c.fullName.toLowerCase(), {
          fullName: c.fullName,
          owner: c.owner,
          name: c.name,
          stars: c.stars,
          mergeRate: c.mergeRate,
          language: c.language,
          tier: "S",
        });
      }
    }

    const allCandidates = Array.from(candidateMap.values());

    // Shuffle candidates deterministically
    const shuffled = [...allCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick random number between 5 and 10
    const count = Math.min(
      Math.floor(prng() * 6) + 5, // 5 to 10
      shuffled.length,
      ORB_SLOTS.length
    );

    // Shuffle slot assignments so positions change daily
    const shuffledSlots = [...ORB_SLOTS];
    for (let i = shuffledSlots.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j], shuffledSlots[i]];
    }

    const selected = shuffled.slice(0, count);

    return selected.map((item, idx) => {
      const slot = shuffledSlots[idx % shuffledSlots.length];
      
      // Floating physics variations
      const yDist = 8 + Math.floor(prng() * 8); // 8px to 15px float
      const xDist = 3 + Math.floor(prng() * 6); // 3px to 8px drift
      const duration = 5.5 + prng() * 3.5; // 5.5s to 9s period
      const delay = prng() * 2; // staggered initial offset
      const rot = 2 + Math.floor(prng() * 4); // 2deg to 5deg tilt

      return {
        id: item.fullName,
        fullName: item.fullName,
        owner: item.owner,
        name: item.name,
        stars: item.stars,
        mergeRate: item.mergeRate,
        language: item.language,
        avatarUrl: `https://github.com/${item.owner}.png?size=128`,
        tier: item.tier,
        slot,
        animation: {
          y: [0, -yDist, 0, yDist * 0.7, 0],
          x: [0, xDist, 0, -xDist, 0],
          rotate: [0, rot, 0, -rot, 0],
          duration,
          delay,
        },
      };
    });
  }, [repos]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 select-none overflow-visible"
    >
      {orbs.map((orb) => {
        const isHovered = hoveredRepo === orb.id;
        const hasImgError = imageErrors[orb.id];

        // Compute safe in-bounds tooltip alignment
        const isLeftAligned = orb.slot.align === "left";
        const isTopAligned = orb.slot.vAlign === "top";

        return (
          <motion.div
            key={orb.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1,
              ...(reduceMotion
                ? {}
                : {
                    y: isHovered ? 0 : orb.animation.y,
                    x: isHovered ? 0 : orb.animation.x,
                    rotate: isHovered ? 0 : orb.animation.rotate,
                  }),
            }}
            transition={{
              opacity: { duration: 0.6, delay: orb.animation.delay },
              scale: { duration: 0.6, delay: orb.animation.delay },
              y: {
                repeat: Infinity,
                duration: orb.animation.duration,
                ease: "easeInOut",
                repeatType: "mirror",
              },
              x: {
                repeat: Infinity,
                duration: orb.animation.duration * 1.2,
                ease: "easeInOut",
                repeatType: "mirror",
              },
              rotate: {
                repeat: Infinity,
                duration: orb.animation.duration * 1.5,
                ease: "easeInOut",
                repeatType: "mirror",
              },
            }}
            style={{
              position: "absolute",
              top: orb.slot.top,
              bottom: orb.slot.bottom,
              left: orb.slot.left,
              right: orb.slot.right,
              width: orb.slot.size,
              height: orb.slot.size,
            }}
            className={`pointer-events-auto ${
              orb.slot.mobileHide ? "hidden sm:block" : "block"
            }`}
            onMouseEnter={() => setHoveredRepo(orb.id)}
            onMouseLeave={() => setHoveredRepo(null)}
          >
            <div className="relative group flex items-center justify-center">
              {/* Floating Circle Button */}
              <Link prefetch={false}
                href={`/${orb.fullName}`}
                onClick={() => {
                  posthog.capture("hero_floating_orb_clicked", {
                    repo_full_name: orb.fullName,
                    tier: orb.tier,
                  });
                }}
                className={`relative flex items-center justify-center rounded-full bg-[#18181b]/80 dark:bg-[#18181b]/90 backdrop-blur-xl border border-white/[0.18] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-all duration-300 transform group-hover:scale-115 group-hover:border-emerald-500/70 group-hover:shadow-[0_0_28px_rgba(16,185,129,0.4)] ${
                  isHovered ? "z-50 ring-2 ring-emerald-400/80" : "z-10"
                }`}
                style={{
                  width: orb.slot.size,
                  height: orb.slot.size,
                }}
                title={`${orb.fullName} (S-Tier)`}
                aria-label={`View ${orb.fullName} S-tier C-Rank metrics`}
              >
                {/* Logo or Fallback */}
                {!hasImgError ? (
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                    <Image
                      src={orb.avatarUrl}
                      alt={orb.fullName}
                      width={orb.slot.size}
                      height={orb.slot.size}
                      priority={!orb.slot.mobileHide}
                      loading={orb.slot.mobileHide ? "lazy" : "eager"}
                      className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, [orb.id]: true }));
                      }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {orb.language ? (
                      <LangLogo language={orb.language} className="h-4 w-4" />
                    ) : (
                      orb.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                )}

                {/* S-Tier Mini Glow Badge */}
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-emerald-500 px-1 py-0.5 text-[9px] font-black text-black shadow-[0_0_8px_rgba(16,185,129,0.8)] border border-emerald-300/40 leading-none">
                  S
                </div>
              </Link>

              {/* Interactive Tooltip Card on Hover - Strictly in-bounds */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: isTopAligned ? -6 : 6,
                      scale: 0.95,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: isTopAligned ? -4 : 4,
                      scale: 0.95,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`absolute w-48 rounded-xl border border-white/[0.18] bg-[#121214]/95 backdrop-blur-2xl p-2.5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.65)] z-50 pointer-events-none ${
                      isTopAligned ? "bottom-full mb-2.5" : "top-full mt-2.5"
                    } ${
                      isLeftAligned
                        ? "left-0 origin-top-left"
                        : "right-0 origin-top-right"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        TOP S-TIER
                      </span>
                      {orb.language && (
                        <span className="text-[11px] text-zinc-400 truncate font-mono">
                          {orb.language}
                        </span>
                      )}
                    </div>
                    
                    <p className="font-semibold text-xs text-white truncate font-sans">
                      {orb.fullName}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-300 font-mono">
                      {orb.stars > 0 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400" />
                          {(orb.stars >= 1000 ? `${(orb.stars / 1000).toFixed(0)}k` : orb.stars)}
                        </span>
                      )}
                      {orb.mergeRate !== undefined && orb.mergeRate > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <GitPullRequest className="h-3 w-3" />
                          {Math.round(orb.mergeRate)}% merge
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-400 font-medium font-sans">
                      <span>View C-Rank</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
