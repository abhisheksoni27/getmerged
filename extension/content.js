'use strict';

(() => {
  const GM_BASE = 'https://getmerged.abhishekco.de';
  const WIDGET_ID = 'gm-pr-widget';
  const api = globalThis.chrome || globalThis.browser;
  if (!api || !api.runtime || !api.runtime.id) return;

  const TIER_COLORS = {
    S: '#059669',
    A: '#16a34a',
    B: '#d97706',
    C: '#ea580c',
    D: '#dc2626'
  };

  let lastKey = '';
  let pending = 0;

  function parsePRPath(pathname) {
    try {
      const m = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/.exec(String(pathname || ''));
      if (!m) return null;
      const number = parseInt(m[3], 10);
      if (!number || m[1] === 'pulls' || !m[1] || !m[2]) return null;
      return { owner: m[1], repo: m[2], number };
    } catch (_) {
      return null;
    }
  }

  function currentTarget() {
    let target = null;
    try {
      const canon = document.querySelector('link[rel="canonical"]');
      if (canon && canon.href && canon.href.indexOf('https://github.com/') === 0) {
        target = parsePRPath(new URL(canon.href).pathname);
      }
    } catch (_) {}
    return target || parsePRPath(location.pathname);
  }

  function removeWidget() {
    try {
      const existing = document.getElementById(WIDGET_ID);
      if (existing) existing.remove();
    } catch (_) {}
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmtHours(h) {
    const v = Number(h);
    if (!isFinite(v) || v <= 0) return null;
    if (v < 1) return Math.round(v * 60) + 'm';
    if (v < 48) return v.toFixed(1).replace(/\.0$/, '') + 'h';
    return (v / 24).toFixed(1).replace(/\.0$/, '') + 'd';
  }

  function fmtPct(v) {
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return null;
    return Math.round(n) + '%';
  }

  function buildShell(target, prUrl) {
    const root = el('div', 'gm-widget');
    root.id = WIDGET_ID;
    root.dataset.gmOwner = target.owner;
    root.dataset.gmRepo = target.repo;
    root.dataset.gmNumber = String(target.number);

    const head = el('div', 'gm-head');
    const brand = el('a', 'gm-brand', 'GetMerged');
    brand.href = GM_BASE;
    brand.target = '_blank';
    brand.rel = 'noopener noreferrer';
    head.appendChild(brand);

    const btn = el('a', 'gm-analyze-btn', 'Analyze this PR');
    btn.href =
      GM_BASE + '/preflight?pr_url=' + encodeURIComponent(prUrl);
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    head.appendChild(btn);
    root.appendChild(head);

    const body = el('div', 'gm-body');
    root.appendChild(body);
    return { root, body };
  }

  function statRow(label, value, valueClass) {
    const row = el('div', 'gm-row');
    row.appendChild(el('span', 'gm-label', label));
    row.appendChild(el('span', 'gm-value' + (valueClass ? ' ' + valueClass : ''), value));
    return row;
  }

  function renderLoading(target, prUrl) {
    const shell = mount(target, prUrl);
    if (!shell) return;
    shell.body.appendChild(el('div', 'gm-status gm-muted', 'Checking C-Rank™…'));
  }

  function renderUnavailable(target, prUrl) {
    const shell = mount(target, prUrl);
    if (!shell) return;
    shell.body.appendChild(
      el('div', 'gm-status gm-muted', 'GetMerged data unavailable for this repo right now.')
    );
  }

  function renderData(target, prUrl, data) {
    const shell = mount(target, prUrl);
    if (!shell) return;

    const tier = typeof data.c_rank_tier === 'string' ? data.c_rank_tier.toUpperCase() : '';
    const odds = fmtPct(data.overall_acceptance_rate);
    const speed = fmtHours(data.response_time_p50_hours);
    const merge = fmtHours(data.median_time_to_merge_hours);

    if (!tier && !odds && !speed) {
      renderUnavailable(target, prUrl);
      return;
    }

    const top = el('div', 'gm-top');
    const badge = el('span', 'gm-badge');
    badge.textContent = tier ? 'C-Rank™ ' + tier : 'C-Rank™ unranked';
    badge.style.backgroundColor = TIER_COLORS[tier] || '#9ca3af';
    top.appendChild(badge);
    if (odds) {
      top.appendChild(el('span', 'gm-odds', odds + ' acceptance'));
    }
    shell.body.appendChild(top);

    if (speed) shell.body.appendChild(statRow('First review (p50)', '~' + speed));
    if (merge) shell.body.appendChild(statRow('Median time to merge', '~' + merge));
    const firstTimer = fmtPct(data.first_timer_acceptance_rate);
    if (firstTimer) {
      shell.body.appendChild(statRow('First-timer merge rate', firstTimer));
    }
    if (data.staleness_flag) {
      shell.body.appendChild(
        el('div', 'gm-note', 'Telemetry for this repo may be stale.')
      );
    }

    const list = el('ul', 'gm-checklist');
    [
      'Read CONTRIBUTING.md and recent merged PRs',
      'Link the related issue in the description',
      'Include/adjust tests for your change',
      'Keep the diff small and focused'
    ].forEach((item) => {
      const li = el('li', 'gm-check-item', item);
      list.appendChild(li);
    });
    shell.body.appendChild(list);
  }

  function mount(target, prUrl) {
    removeWidget();
    try {
      const anchors = [
        document.querySelector('#partial-discussion-header .gh-header-meta'),
        document.querySelector('.gh-header-meta'),
        document.querySelector('#partial-discussion-header'),
        document.querySelector('.gh-header')
      ];
      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        if (anchor && anchor.parentNode) {
          const shell = buildShell(target, prUrl);
          try {
            anchor.parentNode.insertBefore(shell.root, anchor.nextSibling);
          } catch (_) {
            continue;
          }
          return shell;
        }
      }
    } catch (_) {}

    try {
      const shell = buildShell(target, prUrl);
      shell.root.classList.add('gm-fallback');
      document.body.appendChild(shell.root);
      return shell;
    } catch (_) {
      return null;
    }
  }

  async function getData(target) {
    try {
      const resp = await api.runtime.sendMessage({
        type: 'gm_pr_data',
        owner: target.owner,
        repo: target.repo,
        number: target.number
      });
      if (resp && typeof resp === 'object') return resp;
    } catch (_) {}
    return { ok: false, reason: 'unavailable' };
  }

  async function refresh() {
    let target = null;
    try {
      target = currentTarget();
    } catch (_) {
      target = null;
    }
    if (!target) {
      lastKey = '';
      removeWidget();
      return;
    }
    const prUrl =
      'https://github.com/' + target.owner + '/' + target.repo + '/pull/' + target.number;
    const key = target.owner + '/' + target.repo + '#' + target.number;
    if (key === lastKey) return;
    lastKey = key;

    renderLoading(target, prUrl);
    const resp = await getData(target);
    if (lastKey !== key) return;
    if (resp && resp.ok && resp.data) {
      renderData(target, prUrl, resp.data);
    } else {
      renderUnavailable(target, prUrl);
    }
  }

  // ---------- C-Rank™ chips: repo home, search results, trending/explore ----------

  const CHIP_CLASS = 'gm-chip';
  const CHIP_ROW_ATTR = 'data-gm-chip-row';
  const CHIP_HOME_ID = 'gm-home-chip';
  const CHIP_TTL_MS = 5 * 60 * 1000;
  const CHIP_MAX_PER_PAGE = 20;
  const NON_REPO_ROOTS =
    /^(features|security|premium-support|enterprise|teams|pricing|topics|trending|collections|events|marketplace|sponsors|customer-stories|readme|about|site|orgs|organizations|settings|notifications|inbox|watch|login|join|session|search|issues|pulls|explore|codespaces|copilot|apps|install|new|import|dashboard|account|users|developer|git|contact|gist)$/i;
  let chipGen = 0;

  function parseTwoSegment(pathname) {
    try {
      const m = /^\/([^/]+)\/([^/]+?)\/?$/.exec(String(pathname || ''));
      if (!m) return null;
      const owner = decodeURIComponent(m[1]);
      const repo = decodeURIComponent(m[2]);
      if (!owner || !repo || NON_REPO_ROOTS.test(owner)) return null;
      return { owner, repo };
    } catch (_) {
      return null;
    }
  }

  function parseRepoRef(href) {
    try {
      const u = new URL(String(href || ''), location.origin);
      if (u.hostname !== 'github.com') return null;
      return parseTwoSegment(u.pathname);
    } catch (_) {
      return null;
    }
  }

  function chipCacheRead(full) {
    try {
      const raw = globalThis.localStorage.getItem('gm_chip:' + full.toLowerCase());
      if (!raw) return '';
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.t !== 'number' || typeof obj.tier !== 'string' || !obj.tier) return '';
      if (Date.now() - obj.t > CHIP_TTL_MS) return '';
      return obj.tier;
    } catch (_) {
      return '';
    }
  }

  function chipCacheWrite(full, tier) {
    try {
      globalThis.localStorage.setItem(
        'gm_chip:' + full.toLowerCase(),
        JSON.stringify({ t: Date.now(), tier })
      );
    } catch (_) {}
  }

  function buildChip(owner, repo, tier) {
    const chip = el('a', CHIP_CLASS, 'C-Rank™ ' + tier);
    chip.href = GM_BASE + '/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
    chip.target = '_blank';
    chip.rel = 'noopener noreferrer';
    chip.title = 'C-Rank™ ' + tier + ' · open on GetMerged';
    chip.style.backgroundColor = TIER_COLORS[tier] || '#6e7781';
    return chip;
  }

  function findRepoLink(node, target) {
    let links = null;
    try {
      links = node.querySelectorAll('a[href]');
    } catch (_) {
      return null;
    }
    for (let i = 0; i < links.length; i++) {
      const p = parseRepoRef(links[i].getAttribute('href'));
      if (!p) continue;
      if (!target) return { anchor: links[i], target: p };
      if (
        p.owner.toLowerCase() === target.owner.toLowerCase() &&
        p.repo.toLowerCase() === target.repo.toLowerCase()
      ) {
        return { anchor: links[i], target: p };
      }
    }
    return null;
  }

  function collectChipRows() {
    const out = [];
    try {
      const scopes = document.querySelectorAll(
        'article.Box-row, ul .Box-row, [data-testid="results-list"] > div, .repo-list-item'
      );
      scopes.forEach((node) => {
        try {
          if (!node || node.getAttribute(CHIP_ROW_ATTR)) return;
          if (node.closest && node.closest('[' + CHIP_ROW_ATTR + ']')) return;
          const found = findRepoLink(node, null);
          if (!found) return;
          node.setAttribute(CHIP_ROW_ATTR, '1');
          out.push(found);
        } catch (_) {}
      });
    } catch (_) {}
    return out;
  }

  function paintChip(anchor, owner, repo, tier) {
    try {
      const parent = anchor.parentNode;
      if (!parent) return;
      let existing = null;
      try {
        existing = parent.querySelector(':scope > .' + CHIP_CLASS);
      } catch (_) {}
      if (!tier) {
        if (existing) existing.remove();
        return;
      }
      if (existing) {
        existing.textContent = 'C-Rank™ ' + tier;
        existing.style.backgroundColor = TIER_COLORS[tier] || '#6e7781';
        return;
      }
      const chip = buildChip(owner, repo, tier);
      try {
        anchor.insertAdjacentElement('afterend', chip);
      } catch (_) {}
    } catch (_) {}
  }

  function paintRows(rows, scores) {
    rows.forEach((r) => {
      try {
        const s = scores[(r.target.owner + '/' + r.target.repo).toLowerCase()];
        paintChip(r.anchor, r.target.owner, r.target.repo, s && s.tier ? s.tier : '');
      } catch (_) {}
    });
  }

  function paintHomeChip(home, tier) {
    try {
      const old = document.getElementById(CHIP_HOME_ID);
      if (old) old.remove();
    } catch (_) {}
    if (!tier) return;
    const hosts = [
      '#repository-container-header strong[itemprop="name"]',
      '#repository-container-header h1',
      '[data-testid="app-header"] .AppHeader-context-full',
      '.AppHeader-context-full'
    ];
    for (let i = 0; i < hosts.length; i++) {
      let host = null;
      try {
        host = document.querySelector(hosts[i]);
      } catch (_) {}
      if (!host) continue;
      try {
        const chip = buildChip(home.owner, home.repo, tier);
        chip.id = CHIP_HOME_ID;
        host.appendChild(chip);
      } catch (_) {}
      return;
    }
  }

  async function requestScores(repos) {
    try {
      const resp = await api.runtime.sendMessage({ type: 'gm_repo_scores', repos: repos });
      if (resp && typeof resp === 'object') return resp;
    } catch (_) {}
    return { ok: false };
  }

  async function refreshChips() {
    const gen = ++chipGen;
    let home = null;
    try {
      home = parseTwoSegment(location.pathname);
    } catch (_) {
      home = null;
    }

    if (home) {
      const full = home.owner + '/' + home.repo;
      const cached = chipCacheRead(full);
      if (cached) {
        paintHomeChip(home, cached);
        return;
      }
      paintHomeChip(home, '');
      const resp = await requestScores([{ owner: home.owner, repo: home.repo }]);
      if (gen !== chipGen) return;
      const s = resp && resp.ok && resp.scores ? resp.scores[full] : null;
      if (s && s.tier) chipCacheWrite(full, s.tier);
      paintHomeChip(home, s && s.tier ? s.tier : '');
      return;
    }

    const rows = collectChipRows();
    if (!rows.length) return;

    const scores = {};
    const missing = [];
    const seen = {};
    rows.forEach((r) => {
      try {
        const full = (r.target.owner + '/' + r.target.repo).toLowerCase();
        if (seen[full]) return;
        seen[full] = true;
        const cached = chipCacheRead(full);
        if (cached) {
          scores[full] = { tier: cached };
        } else if (
          missing.length < CHIP_MAX_PER_PAGE &&
          !missing.some((m) => m.full === full)
        ) {
          missing.push({
            full: full,
            owner: r.target.owner,
            repo: r.target.repo
          });
        }
      } catch (_) {}
    });

    paintRows(rows, scores);
    if (!missing.length) return;

    const resp = await requestScores(
      missing.map((m) => ({ owner: m.owner, repo: m.repo }))
    );
    if (gen !== chipGen || !resp || !resp.ok || !resp.scores) return;
    Object.keys(resp.scores).forEach((k) => {
      try {
        const v = resp.scores[k];
        const lk = String(k || '').toLowerCase();
        if (v && v.tier) {
          chipCacheWrite(lk, v.tier);
          scores[lk] = { tier: v.tier };
        }
      } catch (_) {}
    });
    paintRows(rows, scores);
  }

  function schedule() {
    if (pending) return;
    pending = setTimeout(() => {
      pending = 0;
      try {
        refresh().catch(() => {});
      } catch (_) {}
      try {
        refreshChips().catch(() => {});
      } catch (_) {}
    }, 150);
  }

  ['turbo:load', 'turbo:render', 'pjax:end', 'popstate'].forEach((evtName) => {
    try {
      addEventListener(evtName, schedule, true);
    } catch (_) {}
  });

  try {
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement || document, { childList: true, subtree: true });
  } catch (_) {}

  try {
    refresh().catch(() => {});
  } catch (_) {}
  try {
    refreshChips().catch(() => {});
  } catch (_) {}
})();
