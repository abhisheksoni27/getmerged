'use strict';

// OpenDoor Contribution Readiness — Service Worker
// Fetches OpenDoor telemetry, caches it in chrome.storage.local with TTL +
// eviction guards, and answers GET_TELEMETRY messages from the content script.
//
// Message contract (AC3):
//   content -> SW : { type: 'GET_TELEMETRY', repo: 'owner/name' }
//   SW -> content : { type: 'TELEMETRY_RESULT', payload | null, error | null }
//   error is one of 'API_TIMEOUT' | 'OFFLINE' | 'NOT_FOUND'.

const API_BASE = 'https://api.opendoor.dev';
const CACHE_PREFIX = 'od_telemetry:';
const INDEX_KEY = 'od_telemetry_index';
const CACHE_TTL_MS = 10 * 60 * 1000; // AC4: TTL 10min
const MAX_ENTRIES = 500; // AC4: max 500 entries
const FETCH_TIMEOUT_MS = 5000; // AC2: timeout 5s
const QUOTA_GUARD_BYTES = 5 * 1024 * 1024;

// ---- storage helpers (promise-based across Chrome + Firefox MV3) ----
function storage() {
  try {
    const api = globalThis.browser || globalThis.chrome;
    if (api && api.storage && api.storage.local) return api.storage.local;
  } catch (_) {}
  return null;
}
function sGet(keys) {
  const s = storage();
  if (!s) return Promise.resolve({});
  return Promise.resolve(s.get(keys));
}
function sSet(obj) {
  const s = storage();
  if (!s) return Promise.resolve();
  return Promise.resolve(s.set(obj));
}
function sRemove(keys) {
  const s = storage();
  if (!s) return Promise.resolve();
  return Promise.resolve(s.remove(keys));
}
async function sBytes() {
  const s = storage();
  if (!s || !s.getBytesInUse) return 0;
  try {
    return await s.getBytesInUse(null);
  } catch (_) {
    return 0;
  }
}

// ---- cache with TTL + eviction guards (AC4) ----
async function cacheGet(repo) {
  const key = CACHE_PREFIX + repo.toLowerCase();
  const res = await sGet(key);
  const hit = res ? res[key] : null;
  if (!hit || !hit.payload) return { fresh: null, stale: null };
  const age = Date.now() - (hit.fetched_at || 0);
  if (age < CACHE_TTL_MS) return { fresh: hit.payload, stale: hit.payload };
  return { fresh: null, stale: hit.payload }; // stale-while-revalidate
}

async function cachePut(repo, payload) {
  const key = CACHE_PREFIX + repo.toLowerCase();
  const entry = { fetched_at: Date.now(), payload };

  let idx = [];
  try {
    const r = await sGet(INDEX_KEY);
    idx = (r && r[INDEX_KEY]) || [];
  } catch (_) {}
  idx = idx.filter((k) => k !== key);
  idx.push(key);

  let overflow = idx.slice(0, Math.max(0, idx.length - MAX_ENTRIES));
  idx = idx.slice(Math.max(0, idx.length - MAX_ENTRIES));

  // quota check on setItem: if we are near the quota ceiling, drop oldest too.
  try {
    const used = await sBytes();
    if (used > QUOTA_GUARD_BYTES && overflow.length === 0) {
      const forced = idx.shift();
      if (forced) overflow.push(forced);
    }
  } catch (_) {}

  if (overflow.length) {
    try {
      await sRemove(overflow);
    } catch (_) {}
  }
  try {
    await sSet({ [key]: entry, [INDEX_KEY]: idx });
  } catch (_) {}
}

// ---- metrics schema (AC5) ----
function clamp01(v) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.min(1, Math.max(0, v));
}
function num(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function buildMetrics(item) {
  if (!item || typeof item !== 'object') return null;
  const mergeRate = clamp01(num(item.external_pr_merge_rate));
  const cRank =
    typeof item.c_rank_tier === 'string' && item.c_rank_tier
      ? String(item.c_rank_tier).toUpperCase()
      : null;
  const ghostRate = mergeRate == null ? null : clamp01(1 - mergeRate);
  const hours = num(item.time_to_first_response_hours);
  const reviewVelocityDays = hours == null ? null : Math.round((hours / 24) * 100) / 100;
  let gfi = num(item.good_first_issue_count);
  if (gfi == null || gfi <= 0) gfi = null; // null fields render as 'N/A'
  return { cRank, mergeRate, ghostRate, reviewVelocityDays, goodFirstIssues: gfi };
}

function result(payload, error) {
  return {
    type: 'TELEMETRY_RESULT',
    payload: payload || null,
    error: error || null
  };
}

async function getTelemetry(repo) {
  const cached = await cacheGet(repo);
  if (cached.fresh) return result(cached.fresh, null); // fresh cache hit

  try {
    if (globalThis.navigator && navigator.onLine === false) {
      throw { code: 'OFFLINE' };
    }
    const url =
      API_BASE + '/api/v1/repos?name=' + encodeURIComponent(repo);
    const ctrl =
      typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;

    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: ctrl ? ctrl.signal : undefined
      });
    } catch (e) {
      if (timer) clearTimeout(timer);
      throw { code: e && e.name === 'AbortError' ? 'API_TIMEOUT' : 'OFFLINE' };
    }
    if (timer) clearTimeout(timer);

    if (res.status === 404) throw { code: 'NOT_FOUND' };
    if (!res.ok) throw { code: 'NOT_FOUND' };

    const data = await res.json().catch(() => null);
    const item = Array.isArray(data)
      ? data[0] || null
      : data && typeof data === 'object'
        ? data
        : null;
    const payload = buildMetrics(item);

    if (!payload) {
      // 200 but empty/null body -> cached fallback
      if (cached.stale) return result(cached.stale, null);
      throw { code: 'NOT_FOUND' };
    }

    await cachePut(repo, payload); // stale-while-revalidate refresh
    return result(payload, null);
  } catch (err) {
    const code = (err && err.code) || 'OFFLINE';
    if (cached.stale) return result(cached.stale, code); // serve stale + flag
    return result(null, code);
  }
}

function wire() {
  const api = globalThis.browser || globalThis.chrome;
  if (!api || !api.runtime || !api.runtime.onMessage) return;
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (!msg || msg.type !== 'GET_TELEMETRY') return undefined;
      const repo = String(msg.repo || '').trim();
      if (!repo || !/^[^/]+\/[^/]+$/.test(repo)) {
        sendResponse(result(null, 'NOT_FOUND'));
        return false;
      }
      getTelemetry(repo)
        .then((r) => sendResponse(r))
        .catch(() => sendResponse(result(null, 'OFFLINE')));
      return true; // keep channel open for async sendResponse
    } catch (_) {
      sendResponse(result(null, 'OFFLINE'));
      return false;
    }
  });
}

wire();
