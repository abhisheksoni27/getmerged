export interface PREvaluationPayload {
  id: string;
  repo: string;
  pr_number?: number | null;
  score: number;
  verdict: string; // e.g. "PRE-FLIGHT READY" | "ADJUSTMENTS RECOMMENDED"
  referrer_id?: string | null;
  timestamp: number;
}

// Global in-memory KV store with 90-day TTL (AC2)
declare global {
  var __prEvalStore: Map<string, { data: PREvaluationPayload; expiresAt: number }> | undefined;
}

const store = globalThis.__prEvalStore ?? new Map<string, { data: PREvaluationPayload; expiresAt: number }>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__prEvalStore = store;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function saveEvaluation(payload: PREvaluationPayload): void {
  const expiresAt = (payload.timestamp || Date.now()) + NINETY_DAYS_MS;
  store.set(payload.id, {
    data: payload,
    expiresAt,
  });
}

export function getEvaluation(id: string): PREvaluationPayload | null {
  const item = store.get(id);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(id);
    return null;
  }
  return item.data;
}

export function validateReferrerId(referrerId?: string | null): string | null {
  if (!referrerId) return null;
  const clean = referrerId.trim();
  if (clean.length > 0 && clean.length <= 64 && /^[a-zA-Z0-9_\-\.]+$/.test(clean)) {
    return clean;
  }
  return null;
}
