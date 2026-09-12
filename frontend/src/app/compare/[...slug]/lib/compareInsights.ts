import { Repo } from "@/types/opendoor";

export interface PRSizeCategory {
  label: string;
  line_range: string;
  median_merge_hours: number;
  merge_rate: number;
  review_likelihood: string;
}

export interface PRSizeSweetSpotData {
  sweet_spot_threshold?: string;
  speed_multiplier?: number;
  actionable_advice?: string;
  small_pr?: PRSizeCategory;
  medium_pr?: PRSizeCategory;
  large_pr?: PRSizeCategory;
}

export interface OptimalTimeData {
  optimal_time?: {
    primary_start_hour_utc?: number;
    primary_end_hour_utc?: number;
    secondary_start_hour_utc?: number;
    secondary_end_hour_utc?: number;
    peak_hour_utc?: number;
    active_maintainer_count?: number;
    hourly_heatmap?: number[];
    recommended_day_window?: string;
    confidence_score?: number;
  };
  repository?: string;
}

export interface PRLikelihoodData {
  repository?: string;
  c_rank_tier?: string;
  overall_acceptance_rate?: number | null;
  first_timer_acceptance_rate?: number | null;
  repeat_contributor_acceptance_rate?: number | null;
  response_time_p50_hours?: number | null;
  response_time_p90_hours?: number | null;
  median_time_to_merge_hours?: number | null;
  bus_factor?: number | null;
  staleness_flag?: boolean;
}

export function formatHours(h: number | null | undefined): string {
  if (h === null || h === undefined || isNaN(h)) return " - ";
  if (h === 0) return "< 1h";
  if (h < 1) return `${(h * 60).toFixed(0)}m`;
  if (h >= 100) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return " - ";
  return `${val.toFixed(1)}%`;
}

export type ParsedSlug =
  | { kind: "single"; repo: string }
  | { kind: "invalid" }
  | { kind: "self"; repo: string }
  | { kind: "canonical-swap"; swapUrl: string }
  | { kind: "ok"; repoNameA: string; repoNameB: string };

export function parseCompareSlug(slug: string[]): ParsedSlug {
  if (slug.length === 2) {
    return { kind: "single", repo: `${slug[0]}/${slug[1]}` };
  }
  if (slug.length !== 5 || slug[2] !== "vs") {
    return { kind: "invalid" };
  }
  const repoNameA = `${slug[0]}/${slug[1]}`;
  const repoNameB = `${slug[3]}/${slug[4]}`;
  if (repoNameA.toLowerCase() === repoNameB.toLowerCase()) {
    return { kind: "self", repo: repoNameA };
  }
  if (repoNameA.toLowerCase() > repoNameB.toLowerCase()) {
    return {
      kind: "canonical-swap",
      swapUrl: `/compare/${slug[3]}/${slug[4]}/vs/${slug[0]}/${slug[1]}`,
    };
  }
  return { kind: "ok", repoNameA, repoNameB };
}

export interface CompareInsights {
  mergeRateA: number;
  mergeRateB: number;
  latencyA: number;
  latencyB: number;
  busA: number;
  busB: number;
  mergeWinner: Repo;
  latencyWinner: Repo;
  busWinner: Repo;
}

export function computeCompareInsights(repoA: Repo, repoB: Repo): CompareInsights {
  const mergeRateA = repoA.external_pr_merge_rate ?? 0;
  const mergeRateB = repoB.external_pr_merge_rate ?? 0;
  const latencyA = repoA.response_p50_hours || repoA.time_to_first_response_hours || 0;
  const latencyB = repoB.response_p50_hours || repoB.time_to_first_response_hours || 0;
  const busA = repoA.bus_factor ?? repoA.distinct_maintainer_count ?? 1;
  const busB = repoB.bus_factor ?? repoB.distinct_maintainer_count ?? 1;
  return {
    mergeRateA,
    mergeRateB,
    latencyA,
    latencyB,
    busA,
    busB,
    mergeWinner: mergeRateA >= mergeRateB ? repoA : repoB,
    latencyWinner: latencyA <= latencyB ? repoA : repoB,
    busWinner: busA >= busB ? repoA : repoB,
  };
}

export function buildItemListJsonLd(repoA: Repo, repoB: Repo) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${repoA.full_name} vs ${repoB.full_name} Comparison`,
    description: `Side-by-side maintainer responsiveness, pull request sweet spot, and contributor acceptance comparison.`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: repoA.full_name,
        url: `https://getmerged.abhishekco.de/${repoA.full_name}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: repoB.full_name,
        url: `https://getmerged.abhishekco.de/${repoB.full_name}`,
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(repoA: Repo, repoB: Repo) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getmerged.abhishekco.de",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Compare Repositories",
        item: "https://getmerged.abhishekco.de/compare",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${repoA.full_name} vs ${repoB.full_name}`,
        item: `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`,
      },
    ],
  };
}
