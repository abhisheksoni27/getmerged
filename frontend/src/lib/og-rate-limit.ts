// AC5: fixed-window per-IP limiter for the public-profile OG endpoint.
// In-memory (per instance) is sufficient as a first guard; 429 on exceed.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number.parseInt(process.env.OG_RATE_LIMIT_MAX || "", 10) || 30;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function trustedProxyEnabled(): boolean {
  return ["1", "true", "yes"].includes((process.env.TRUST_PROXY || "").trim().toLowerCase());
}

/**
 * Resolves the client IP. Only honours x-forwarded-for (leftmost entry = original
 * client) when TRUST_PROXY is enabled, otherwise falls back to x-real-ip / a
 * shared bucket so spoofed headers cannot bypass the limit.
 */
export function clientIpFromRequest(req: Request): string {
  if (trustedProxyEnabled()) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const leftmost = forwarded.split(",")[0]?.trim();
      if (leftmost) return leftmost;
    }
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(ip: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [key, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(key);
      }
    }
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
