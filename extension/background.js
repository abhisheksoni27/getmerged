'use strict';

const GM_BASE = 'https://getmerged.abhishekco.de';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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

function wire() {
  try {
    const api = globalThis.chrome || globalThis.browser;
    if (!api || !api.runtime || !api.runtime.onMessage) return;
    api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || msg.type !== 'gm_pr_data') return undefined;
      handlePRData(msg)
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false, reason: 'unavailable' }));
      return true;
    });
  } catch (_) {}
}

wire();
