'use strict';

// OpenDoor Contribution Readiness — Content Script (GitHub)
// AC1: injects badges into repo header + PR pages via MutationObserver with
// resilient [data-selector] fallbacks; retries up to 3x, then skips silently.
// AC3: sends { type:'GET_TELEMETRY', repo } and renders { TELEMETRY_RESULT }.
// AC5: null metric fields render as 'N/A'.
// AC6: badge deep-links to https://opendoor.dev/repo/{owner}/{name}.

(() => {
  const api = globalThis.browser || globalThis.chrome;
  if (!api || !api.runtime) return;

  const DEEP_BASE = 'https://getmerged.abhishekco.de';
  const WIDGET_ID = 'od-readiness';
  const MAX_ATTEMPTS = 3;
  const TIER_COLORS = {
    S: '#059669',
    A: '#16a34a',
    B: '#d97706',
    C: '#ea580c',
    D: '#dc2626'
  };

  let lastKey = '';
  let attempts = 0;
  let scheduled = false;

  // Resilient anchor resolution: prefer data-* attributes, fall back to stable
  // class/role hooks that GitHub uses across redesigns.
  const HEADER_SELECTORS = [
    '[data-testid="repository-heading"]',
    '#repository-container-header',
    'h1 strong[itemprop="name"]',
    '.repohead h1',
    '.AppHeader-context-full',
    'main h1',
    '#repo-title'
  ];

  function parseRepo() {
    try {
      const m = /^\/([^/]+)\/([^/]+)/.exec(location.pathname || '');
      if (!m) return null;
      const owner = decodeURIComponent(m[1]);
      const repo = decodeURIComponent(m[2]);
      if (!owner || !repo) return null;
      if (
        /^(pulls|issues|orgs|settings|notifications|search|explore|topics|sponsors|marketplace|login|join|about|contact|gist|users|dashboard|new|import|codespaces|copilot|apps|session|watch|enterprise|features|security|pricing|collections|events|customer-stories|readme|site|organizations|account|developer|git|trending)$/i.test(
          owner
        )
      ) {
        return null;
      }
      return { owner, repo };
    } catch (_) {
      return null;
    }
  }

  function findAnchor() {
    for (let i = 0; i < HEADER_SELECTORS.length; i++) {
      try {
        const node = document.querySelector(HEADER_SELECTORS[i]);
        if (node) return node;
      } catch (_) {}
    }
    return null;
  }

  function removeWidget() {
    try {
      const w = document.getElementById(WIDGET_ID);
      if (w) w.remove();
    } catch (_) {}
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function pct(v) {
    if (typeof v !== 'number' || !isFinite(v)) return 'N/A';
    return Math.round(v * 100) + '%';
  }
  function days(v) {
    if (typeof v !== 'number' || !isFinite(v)) return 'N/A';
    return Math.round(v * 10) / 10 + 'd';
  }
  function na(v) {
    return v == null ? 'N/A' : String(v);
  }
  function metric(label, value) {
    const s = el('span', 'od-m');
    s.appendChild(el('span', 'od-ml', label));
    s.appendChild(el('span', 'od-mv', na(value)));
    return s;
  }

  function render(target, metrics) {
    removeWidget();
    const anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;

    const cRank =
      metrics && typeof metrics.cRank === 'string'
        ? metrics.cRank.toUpperCase()
        : null;

    const root = el('div', 'od-badge');
    root.id = WIDGET_ID;
    root.dataset.odOwner = target.owner;
    root.dataset.odRepo = target.repo;

    const badge = el('span', 'od-crank', cRank ? 'C-Rank ' + cRank : 'C-Rank N/A');
    badge.style.backgroundColor = (cRank && TIER_COLORS[cRank]) || '#6e7781';
    root.appendChild(badge);

    const vals = el('span', 'od-metrics');
    vals.appendChild(metric('Merge', metrics ? pct(metrics.mergeRate) : null));
    vals.appendChild(metric('Ghost', metrics ? pct(metrics.ghostRate) : null));
    vals.appendChild(metric('Review', metrics ? days(metrics.reviewVelocityDays) : null));
    vals.appendChild(
      metric('GFI', metrics && typeof metrics.goodFirstIssues === 'number' ? metrics.goodFirstIssues : null)
    );
    root.appendChild(vals);

    const link = el('a', 'od-link', 'OpenDoor');
    link.href =
      DEEP_BASE +
      '/repo/' +
      encodeURIComponent(target.owner) +
      '/' +
      encodeURIComponent(target.repo);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    root.appendChild(link);

    try {
      anchor.parentNode.insertBefore(root, anchor.nextSibling);
    } catch (_) {
      try {
        anchor.appendChild(root);
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  async function run() {
    scheduled = false;
    let target = null;
    try {
      target = parseRepo();
    } catch (_) {}
    if (!target) {
      lastKey = '';
      attempts = 0;
      removeWidget();
      return;
    }
    const key = target.owner + '/' + target.repo;
    if (key !== lastKey) {
      lastKey = key;
      attempts = 0;
      removeWidget();
    }

    const anchor = findAnchor();
    if (!anchor) {
      if (attempts < MAX_ATTEMPTS) {
        attempts++;
        schedule(); // retry 3x, then skip silently
      }
      return;
    }
    if (document.getElementById(WIDGET_ID)) return; // already injected

    let metrics = null;
    try {
      const resp = await api.runtime.sendMessage({
        type: 'GET_TELEMETRY',
        repo: key
      });
      if (resp && typeof resp === 'object' && resp.type === 'TELEMETRY_RESULT') {
        metrics = resp.payload || null;
      }
    } catch (_) {
      metrics = null;
    }
    render(target, metrics); // never hangs; shows N/A empty state if no payload
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      try {
        run();
      } catch (_) {}
    }, 120);
  }

  ['turbo:load', 'turbo:render', 'pjax:end', 'popstate', 'hashchange'].forEach(
    (ev) => {
      try {
        addEventListener(ev, schedule, true);
      } catch (_) {}
    }
  );

  try {
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement || document, {
      childList: true,
      subtree: true
    });
  } catch (_) {}

  try {
    run();
  } catch (_) {}
})();
