'use strict';

/**
 * GetMerged: GitHub C-Rank™ & Contributor Telemetry
 * Background Service Worker (Manifest V3)
 *
 * Handles API queries to https://getmerged.abhishekco.de, in-memory & local storage
 * caching with 10-minute TTL, LRU eviction guards, and error resilience.
 */

const API_BASE = 'https://getmerged.abhishekco.de';
const CACHE_PREFIX = 'gm_telemetry:';
const INDEX_KEY = 'gm_telemetry_index';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL
const MAX_CACHE_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 6000;

function getStorage() {
  try {
    const api = globalThis.browser || globalThis.chrome;
    if (api && api.storage && api.storage.local) return api.storage.local;
  } catch (_) {}
  return null;
}

async function sGet(key) {
  const s = getStorage();
  if (!s) return null;
  return new Promise((resolve) => {
    s.get(key, (items) => resolve(items ? items[key] : null));
  });
}

async function sSet(key, value) {
  const s = getStorage();
  if (!s) return;
  return new Promise((resolve) => {
    s.set({ [key]: value }, resolve);
  });
}

async function sRemove(keys) {
  const s = getStorage();
  if (!s) return;
  return new Promise((resolve) => {
    s.remove(keys, resolve);
  });
}

async function getCachedTelemetry(repoKey) {
  const key = CACHE_PREFIX + repoKey.toLowerCase();
  const cached = await sGet(key);
  if (!cached || !cached.payload) return { fresh: null, stale: null };
  const age = Date.now() - (cached.fetched_at || 0);
  if (age < CACHE_TTL_MS) {
    return { fresh: cached.payload, stale: cached.payload };
  }
  return { fresh: null, stale: cached.payload };
}

async function putCachedTelemetry(repoKey, payload) {
  const key = CACHE_PREFIX + repoKey.toLowerCase();
  const entry = { fetched_at: Date.now(), payload };

  let idx = (await sGet(INDEX_KEY)) || [];
  if (!Array.isArray(idx)) idx = [];
  idx = idx.filter((k) => k !== key);
  idx.push(key);

  if (idx.length > MAX_CACHE_ENTRIES) {
    const overflow = idx.slice(0, idx.length - MAX_CACHE_ENTRIES);
    idx = idx.slice(idx.length - MAX_CACHE_ENTRIES);
    await sRemove(overflow);
  }

  await sSet(key, entry);
  await sSet(INDEX_KEY, idx);
}

function parseTelemetryPayload(item) {
  if (!item || typeof item !== 'object') return null;

  const cRank = typeof item.c_rank_tier === 'string' ? item.c_rank_tier.toUpperCase() : null;
  const score = typeof item.c_rank_score === 'number' ? Math.round(item.c_rank_score) : null;
  const mergeRate = typeof item.external_pr_merge_rate === 'number' ? Math.round(item.external_pr_merge_rate * 10) / 10 : null;
  
  const rawHours = typeof item.time_to_first_response_hours === 'number' ? item.time_to_first_response_hours : null;
  let responseTimeFormatted = 'N/A';
  if (rawHours !== null) {
    if (rawHours < 1) {
      responseTimeFormatted = `${Math.round(rawHours * 60)}m`;
    } else if (rawHours < 48) {
      responseTimeFormatted = `${Math.round(rawHours * 10) / 10}h`;
    } else {
      responseTimeFormatted = `${Math.round((rawHours / 24) * 10) / 10}d`;
    }
  }

  const rawMergeHours = typeof item.time_to_merge_hours === 'number' ? item.time_to_merge_hours : null;
  let mergeTimeFormatted = 'N/A';
  if (rawMergeHours !== null) {
    if (rawMergeHours < 48) {
      mergeTimeFormatted = `${Math.round(rawMergeHours * 10) / 10}h`;
    } else {
      mergeTimeFormatted = `${Math.round((rawMergeHours / 24) * 10) / 10}d`;
    }
  }

  const firstTimerRate = typeof item.first_timer_success_rate === 'number' ? Math.round(item.first_timer_success_rate * 10) / 10 : null;
  const maintainers = typeof item.distinct_maintainer_count === 'number' ? Math.round(item.distinct_maintainer_count) : null;
  const busFactor = typeof item.bus_factor === 'number' ? Math.round(item.bus_factor) : null;
  const gfi = typeof item.good_first_issue_count === 'number' ? item.good_first_issue_count : 0;
  const stars = typeof item.stars === 'number' ? item.stars : null;
  const language = item.language || 'Unknown';
  const stalenessFlag = Boolean(item.staleness_flag);

  return {
    fullName: item.full_name || '',
    cRank,
    score,
    mergeRate,
    responseTimeFormatted,
    rawHours,
    mergeTimeFormatted,
    firstTimerRate,
    maintainers,
    busFactor,
    goodFirstIssues: gfi,
    stars,
    language,
    stalenessFlag
  };
}

async function fetchTelemetry(repoKey) {
  const cached = await getCachedTelemetry(repoKey);
  if (cached.fresh) {
    return { type: 'TELEMETRY_RESULT', payload: cached.fresh, error: null, cached: true };
  }

  try {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;

    const url = `${API_BASE}/api/v1/repos?name=${encodeURIComponent(repoKey)}`;
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined
    });

    if (timer) clearTimeout(timer);

    if (!resp.ok) {
      if (resp.status === 404) {
        return { type: 'TELEMETRY_RESULT', payload: null, error: 'NOT_FOUND' };
      }
      if (cached.stale) {
        return { type: 'TELEMETRY_RESULT', payload: cached.stale, error: null, stale: true };
      }
      return { type: 'TELEMETRY_RESULT', payload: null, error: `HTTP_${resp.status}` };
    }

    const body = await resp.json();
    let item = null;
    if (body && Array.isArray(body.data) && body.data.length > 0) {
      item = body.data[0];
    } else if (Array.isArray(body) && body.length > 0) {
      item = body[0];
    } else if (body && typeof body === 'object' && body.id) {
      item = body;
    }

    if (!item) {
      if (cached.stale) return { type: 'TELEMETRY_RESULT', payload: cached.stale, error: null, stale: true };
      return { type: 'TELEMETRY_RESULT', payload: null, error: 'NOT_FOUND' };
    }

    const payload = parseTelemetryPayload(item);
    await putCachedTelemetry(repoKey, payload);
    return { type: 'TELEMETRY_RESULT', payload, error: null, cached: false };

  } catch (err) {
    const isTimeout = err && (err.name === 'AbortError' || err.code === 'API_TIMEOUT');
    const errorCode = isTimeout ? 'API_TIMEOUT' : 'OFFLINE';
    if (cached.stale) {
      return { type: 'TELEMETRY_RESULT', payload: cached.stale, error: null, stale: true };
    }
    return { type: 'TELEMETRY_RESULT', payload: null, error: errorCode };
  }
}

// Listen for incoming extension requests
const api = globalThis.browser || globalThis.chrome;
if (api && api.runtime && api.runtime.onMessage) {
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return false;

    if (msg.type === 'GET_TELEMETRY') {
      const repo = String(msg.repo || '').trim();
      if (!repo || !/^[^/]+\/[^/]+$/.test(repo)) {
        sendResponse({ type: 'TELEMETRY_RESULT', payload: null, error: 'INVALID_REPO' });
        return false;
      }

      fetchTelemetry(repo)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ type: 'TELEMETRY_RESULT', payload: null, error: 'INTERNAL_ERROR' }));
      return true; // Keep message channel open for async sendResponse
    }

    return false;
  });
}
