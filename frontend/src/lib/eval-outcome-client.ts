import { API_BASE_URL } from "./api";
import type { PREvalOutcome } from "./pr-verdict";

// AC6: short 60s TTL keeps shared pages fresh while bounding load; staleness
// is anyway capped by the backend sync cadence (15 min max).
const TTL_MS = 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __prEvalOutcomeCache: Map<string, { at: number; data: PREvalOutcome | null }> | undefined;
}

const cache =
  globalThis.__prEvalOutcomeCache ?? new Map<string, { at: number; data: PREvalOutcome | null }>();
globalThis.__prEvalOutcomeCache = cache;

export function backendBase(): string {
  return process.env.API_INTERNAL_URL || API_BASE_URL;
}

/**
 * Fetches the verified outcome for an eval with a small in-process cache.
 * Returns null on any failure (unknown eval, backend down, timeout) so callers
 * degrade to the static snapshot with 'Outcome unavailable' — never crash,
 * never show wrong data (AC4).
 */
export async function getEvalOutcome(id: string): Promise<PREvalOutcome | null> {
  if (!id) return null;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.data;
  }
  let data: PREvalOutcome | null = null;
  try {
    const res = await fetch(
      `${backendBase()}/api/v1/pr-evals/${encodeURIComponent(id)}/outcome`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      }
    );
    if (res.ok) {
      data = (await res.json()) as PREvalOutcome;
    }
  } catch {
    data = null;
  }
  cache.set(id, { at: Date.now(), data });
  return data;
}
