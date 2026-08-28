import crypto from "crypto";

const SHARE_TOKEN_SECRET = process.env.PR_FORECAST_TOKEN_SECRET || process.env.JWT_SECRET || "opendoor-forecast-secret-key-default";
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface ForecastSnapshot {
  eval_id: string;
  repo_name: string;
  overall_score?: number | null;
  ready_to_merge?: boolean | null;
  status?: string; // "ready" | "pending" | "failed" | etc.
  saved_at: number;
}

// Global in-memory cache for server-side eval snapshot caching (24h TTL)
declare global {
  var __forecastSnapshotCache: Map<string, { snapshot: ForecastSnapshot; expiresAt: number }> | undefined;
}

const cache = globalThis.__forecastSnapshotCache ?? new Map<string, { snapshot: ForecastSnapshot; expiresAt: number }>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__forecastSnapshotCache = cache;
}

export function generateForecastToken(evalId: string, customExpiresAt?: number): { token: string; expiresAt: number } {
  const expiresAt = customExpiresAt ?? (Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS);
  const payload = `${evalId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", SHARE_TOKEN_SECRET);
  hmac.update(payload);
  const sig = hmac.digest("hex").slice(0, 32);
  const token = `${expiresAt}.${sig}`;
  return { token, expiresAt };
}

export function verifyForecastToken(evalId: string, token: string): boolean {
  if (!token || !evalId) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const expiresAt = parseInt(expStr, 10);
  if (isNaN(expiresAt) || Date.now() / 1000 > expiresAt) {
    return false;
  }
  const payload = `${evalId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", SHARE_TOKEN_SECRET);
  hmac.update(payload);
  const expectedSig = hmac.digest("hex").slice(0, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function setCachedSnapshot(evalId: string, data: Omit<ForecastSnapshot, "saved_at">): void {
  const now = Date.now();
  const ttlMs = 24 * 60 * 60 * 1000; // 24 hours TTL
  cache.set(evalId, {
    snapshot: {
      ...data,
      saved_at: now,
    },
    expiresAt: now + ttlMs,
  });
}

export function getCachedSnapshot(evalId: string): ForecastSnapshot | null {
  const entry = cache.get(evalId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(evalId);
    return null;
  }
  return entry.snapshot;
}

export function buildForecastShareUrl(evalId: string, repoFullName: string, token?: string, refCode?: string): string {
  const t = token ?? generateForecastToken(evalId).token;
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "https://getmerged.abhishekco.de");
  const refParam = refCode ? `&ref=${encodeURIComponent(refCode)}` : "";
  return `${origin}/og/pr-forecast/${encodeURIComponent(evalId)}?t=${encodeURIComponent(t)}&repo=${encodeURIComponent(repoFullName)}${refParam}`;
}

export function buildTwitterIntent(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function buildLinkedInIntent(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}
