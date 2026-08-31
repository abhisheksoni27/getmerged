/**
 * Returns dynamic cache TTL parameters in seconds based on the repository's C-Rank tier.
 * Higher/active tiers (S, A) are refreshed on tighter cadences, while lower/dormant tiers
 * (B, C, D) are refreshed less frequently, allowing longer CDN cache lifetimes.
 */
export function getTierCacheConfig(tier?: string | null) {
  const normalized = (tier || "B").toUpperCase().trim();

  switch (normalized) {
    case "S":
      // S-tier repos refresh daily
      return {
        revalidate: 86400, // 1 day
        maxAge: 3600, // 1 hour browser max-age
        sMaxAge: 86400, // 1 day CDN s-maxage
        staleWhileRevalidate: 86400, // 1 day SWR
      };
    case "A":
      // A-tier repos refresh every 2-3 days
      return {
        revalidate: 172800, // 2 days
        maxAge: 3600,
        sMaxAge: 172800, // 2 days CDN s-maxage
        staleWhileRevalidate: 172800,
      };
    case "B":
      // B-tier repos refresh weekly
      return {
        revalidate: 432000, // 5 days
        maxAge: 3600,
        sMaxAge: 432000, // 5 days CDN s-maxage
        staleWhileRevalidate: 259200, // 3 days SWR
      };
    case "C":
    case "D":
    default:
      // C/D/Unranked repos refresh weekly to monthly
      return {
        revalidate: 604800, // 7 days
        maxAge: 3600,
        sMaxAge: 604800, // 7 days CDN s-maxage
        staleWhileRevalidate: 604800,
      };
  }
}

export function getTierCacheControlHeader(tier?: string | null): string {
  const cfg = getTierCacheConfig(tier);
  return `public, max-age=${cfg.maxAge}, s-maxage=${cfg.sMaxAge}, stale-while-revalidate=${cfg.staleWhileRevalidate}`;
}
