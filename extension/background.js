'use strict';

const GM_BASE = 'https://getmerged.abhishekco.de';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CHIP_TTL_MS = 5 * 60 * 1000;
const CHIP_BATCH_MAX = 20;
const CHIP_FETCH_GAP_MS = 120;
const FETCH_TIMEOUT_MS = 15000;
const memStore = new Map();

function storageArea() {
  try {
    const api = globalThis.chrome || globalThis.browser;
    if (api && api.storage && api.storage.local) return api.storage.local;
  } catch (_) {}
  return null;
}

async function cacheGet(key) {
  const area = storageArea();
  if (!area) return memStore.get(key) || null;
  try {
    const res = await area.get(key);
    const hit = res ? res[key] : null;
    return hit || null;
  } catch (_) {
    return memStore.get(key) || null;
  }
}

async function cacheSet(key, value) {
  const area = storageArea();
  if (!area) {
    memStore.set(key, value);
    return;
  }
  try {
    await area.set({ [key]: value });
  } catch (_) {
    memStore.set(key, value);
  }
}

async function fetchJSON(url) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, Object.assign(
      { headers: { Accept: 'application/json' } },
      ctrl ? { signal: ctrl.signal } : {}
    ));
    if (!res.ok) {
      const err = new Error('http_' + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function failureReason(err) {
  const status = err && err.status;
  if (status === 403 || status === 429) return 'rate_limited';
  return 'unavailable';
}

async function getHeadSha(owner, repo, number) {
  const url =
    'https://api.github.com/repos/' +
    encodeURIComponent(owner) + '/' + encodeURIComponent(repo) +
    '/pulls/' + Number(number);
  const pr = await fetchJSON(url);
  if (!pr || Number(pr.number) !== Number(number)) throw new Error('pr_mismatch');
  const head = pr.head || {};
  const fullName = (head.repo && head.repo.full_name) || owner + '/' + repo;
  return { fullName: String(fullName), sha: String(head.sha || '') };
}

async function handlePRData(msg) {
  const number = Number(msg.number);
  let fullName = String(msg.owner) + '/' + String(msg.repo);
  let sha = '';
  try {
    const head = await getHeadSha(String(msg.owner), String(msg.repo), number);
    fullName = head.fullName;
    sha = head.sha;
  } catch (err) {
    return { ok: false, reason: failureReason(err) };
  }
  if (!sha) return { ok: false, reason: 'unavailable' };

  const key = fullName.toLowerCase() + '@' + sha;
  try {
    const hit = await cacheGet(key);
    if (
      hit &&
      hit.data &&
      typeof hit.fetched_at === 'number' &&
      Date.now() - hit.fetched_at < CACHE_TTL_MS
    ) {
      return { ok: true, data: hit.data, cached: true };
    }
  } catch (_) {}

  try {
    const url = GM_BASE + '/api/v1/pr-likelihood?name=' + encodeURIComponent(fullName);
    const data = await fetchJSON(url);
    if (!data || typeof data !== 'object') throw new Error('bad_payload');
    await cacheSet(key, { fetched_at: Date.now(), data });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, reason: failureReason(err) };
  }
}

function safeRepoPart(value) {
  try {
    const v = String(value == null ? '' : value).trim();
    if (!v || v.length > 128 || /[/?#\\%]/.test(v)) return '';
    return v;
  } catch (_) {
    return '';
  }
}

async function chipScore(owner, repo) {
  const fullName = owner + '/' + repo;
  const key = 'gmchip:' + fullName.toLowerCase();
  try {
    const hit = await cacheGet(key);
    if (
      hit &&
      typeof hit.tier === 'string' &&
      hit.tier &&
      typeof hit.fetched_at === 'number' &&
      Date.now() - hit.fetched_at < CHIP_TTL_MS
    ) {
      return { tier: hit.tier, net: false };
    }
  } catch (_) {}
  const url = GM_BASE + '/api/v1/pr-likelihood?name=' + encodeURIComponent(fullName);
  const data = await fetchJSON(url);
  const tier = data && typeof data.c_rank_tier === 'string' ? data.c_rank_tier.toUpperCase() : '';
  if (!tier) return { tier: '', net: true };
  await cacheSet(key, { fetched_at: Date.now(), tier });
  return { tier, net: true };
}

async function handleRepoScores(msg) {
  let input = [];
  try {
    input = Array.isArray(msg && msg.repos) ? msg.repos.slice(0, CHIP_BATCH_MAX) : [];
  } catch (_) {
    input = [];
  }
  const scores = {};
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    const owner = safeRepoPart(item && item.owner);
    const repo = safeRepoPart(item && item.repo);
    if (!owner || !repo) continue;
    let res = null;
    try {
      res = await chipScore(owner, repo);
    } catch (_) {
      res = null;
    }
    scores[owner + '/' + repo] = res && res.tier ? { tier: res.tier } : null;
    if (res && res.net && i < input.length - 1) {
      try {
        await new Promise((resolve) => setTimeout(resolve, CHIP_FETCH_GAP_MS));
      } catch (_) {}
    }
  }
  return { ok: true, scores };
}

function wire() {
  try {
    const api = globalThis.chrome || globalThis.browser;
    if (!api || !api.runtime || !api.runtime.onMessage) return;
    api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg.type !== 'string') return undefined;
      if (msg.type === 'gm_pr_data') {
        handlePRData(msg)
          .then(sendResponse)
          .catch(() => sendResponse({ ok: false, reason: 'unavailable' }));
        return true;
      }
      if (msg.type === 'gm_repo_scores') {
        handleRepoScores(msg)
          .then(sendResponse)
          .catch(() => sendResponse({ ok: false }));
        return true;
      }
      return undefined;
    });
  } catch (_) {}
}

wire();
