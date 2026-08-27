import { backendBase } from "./eval-outcome-client";

// Reserved usernames collide with first-party routes (AC4). Blocked at
// signup (backend slug generation) AND at route level (/u page + OG endpoint).
export const RESERVED_USERNAMES = [
  "api",
  "og",
  "u",
  "dashboard",
  "login",
  "settings",
  "static",
  "public",
  "assets",
  "images",
  "_next",
  "favicon.ico",
] as const;

const RESERVED_SET = new Set<string>(RESERVED_USERNAMES);

export function isReservedUsername(username: string): boolean {
  return RESERVED_SET.has(username.trim().toLowerCase());
}

// AC2: case-insensitive [a-z0-9-_]{1,39} match.
const USERNAME_RE = /^[a-z0-9_-]{1,39}$/i;

export function isValidUsername(username: string): boolean {
  const clean = username?.trim() ?? "";
  return USERNAME_RE.test(clean);
}

export interface PublicProfileRepoTier {
  full_name: string;
  c_rank_tier: string;
}

export interface PublicProfileEval {
  repository_full_name: string;
  pr_number?: number | null;
  predicted_score: number;
  outcome: string;
  created_at: string;
}

export interface PublicProfile {
  slug: string;
  username: string;
  avatar_url?: string;
  member_since: string;
  is_public: boolean;
  total_evals: number;
  accuracy_rate: number | null;
  accuracy_n: number;
  merged_count: number;
  // Contributor XP season (optional fields degrade to zero-state dashes).
  season?: string;
  total_xp?: number;
  season_xp?: number;
  level?: number;
  xp_to_next_level?: number;
  streak_weeks?: number;
  season_rank?: number | null;
  percentile?: number | null;
  repos: PublicProfileRepoTier[];
  evals?: PublicProfileEval[];
  // DNA powers the persona banner. Optional - the API omits it when
  // the user hasn't consented to profiling or has no completed analysis.
  dna?: import("@/types/opendoor").ContributorDNA;
}

/**
 * Fetches a public contributor profile from the backend. Returns null on any
 * failure (unknown user, private profile, backend down) so callers render 404
 * instead of crashing or leaking data. The privacy gate lives server-side:
 * the API 404s unless user.is_public=true.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const clean = username?.trim();
  if (!clean || !isValidUsername(clean) || isReservedUsername(clean)) return null;
  try {
    // AC3: never cache profile reads so an is_public flip takes effect
    // immediately on both the page and the OG endpoint.
    const res = await fetch(`${backendBase()}/api/v1/u/${encodeURIComponent(clean)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PublicProfile;
    if (!data || !data.is_public) return null;
    return data;
  } catch {
    return null;
  }
}
