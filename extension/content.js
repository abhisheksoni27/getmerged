'use strict';

/**
 * GetMerged: GitHub C-Rank™ & Contributor Telemetry
 * Content Script (GitHub DOM Injector)
 */

(() => {
  const api = globalThis.browser || globalThis.chrome;
  if (!api || !api.runtime) return;

  const BASE_URL = 'https://getmerged.abhishekco.de';
  const REPO_CARD_ID = 'gm-repo-telemetry-card';
  const PR_BANNER_ID = 'gm-pr-readiness-banner';

  const HEADER_SELECTORS = [
    '#repository-container-header',
    '[data-testid="repository-heading"]',
    '.AppHeader-context-full',
    '#repo-title-component',
    '.repohead h1',
    'h1 strong[itemprop="name"]',
    'main h1'
  ];

  const PR_CONTAINER_SELECTORS = [
    '#discussion_bucket',
    '.gh-header-meta',
    '[data-testid="issue-timeline-container"]'
  ];

  let currentRepoKey = '';
  let scheduled = false;

  function parseGitHubLocation() {
    const pathname = window.location.pathname || '';
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1];

    const reserved = new Set([
      'pulls', 'issues', 'orgs', 'settings', 'notifications', 'search',
      'explore', 'topics', 'sponsors', 'marketplace', 'login', 'join',
      'about', 'contact', 'gist', 'users', 'dashboard', 'new', 'import',
      'codespaces', 'copilot', 'apps', 'session', 'trending', 'features'
    ]);

    if (reserved.has(owner.toLowerCase())) return null;

    const isPR = parts[2] === 'pull' && parts[3];
    const prNumber = isPR ? parts[3] : null;

    return { owner, repo, key: `${owner}/${repo}`, isPR, prNumber };
  }

  function findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function createEl(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined && textContent !== null) node.textContent = textContent;
    return node;
  }

  function renderRepoCard(loc, data) {
    removeElement(REPO_CARD_ID);
    const anchor = findElement(HEADER_SELECTORS);
    if (!anchor || !anchor.parentNode) return;

    const card = createEl('div', 'gm-repo-card');
    card.id = REPO_CARD_ID;

    // Left cluster: Brand + C-Rank
    const left = createEl('div', 'gm-left-cluster');

    const brand = createEl('a', 'gm-brand');
    brand.href = `${BASE_URL}/repo/${encodeURIComponent(loc.owner)}/${encodeURIComponent(loc.repo)}`;
    brand.target = '_blank';
    brand.rel = 'noopener noreferrer';
    brand.title = 'GetMerged: Objective Open Source PR Telemetry';

    // Inlined SVG logo
    const logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    logoSvg.setAttribute('viewBox', '0 0 32 32');
    logoSvg.setAttribute('class', 'gm-brand-logo');
    logoSvg.innerHTML = `
      <rect width="32" height="32" rx="7" fill="#0a0f0d" stroke="rgba(16,185,129,0.4)" stroke-width="1.5" />
      <rect x="5" y="9" width="6" height="3" rx="0.5" fill="#10b981" />
      <rect x="12" y="11" width="4" height="3" rx="0.5" fill="#34d399" />
      <rect x="5" y="20" width="6" height="3" rx="0.5" fill="#ef4444" />
      <rect x="12" y="18" width="4" height="3" rx="0.5" fill="#f59e0b" />
      <rect x="17" y="13.5" width="7" height="5" rx="0.75" fill="#10b981" />
      <circle cx="26" cy="16" r="1.5" fill="#ffffff" />
    `;
    brand.appendChild(logoSvg);

    const brandName = createEl('span', 'gm-brand-text');
    const getSpan = createEl('span', null, 'Get');
    const mergedSpan = createEl('span', 'gm-brand-accent', 'Merged');
    brandName.appendChild(getSpan);
    brandName.appendChild(mergedSpan);
    brand.appendChild(brandName);
    left.appendChild(brand);

    const tier = data && data.cRank ? data.cRank : 'UNRANKED';
    const tierBadge = createEl('span', `gm-tier-badge gm-tier-${tier.toLowerCase()}`, `C-Rank ${tier}`);
    left.appendChild(tierBadge);

    if (data && data.score !== null) {
      const score = createEl('span', 'gm-score-pill', `(${data.score}/100)`);
      left.appendChild(score);
    }

    card.appendChild(left);

    // Metrics Strip
    const metrics = createEl('div', 'gm-metrics-strip');

    if (data) {
      // 1. Review turnaround
      const mReview = createEl('div', 'gm-metric-item');
      mReview.appendChild(createEl('span', 'gm-metric-label', '⚡ Review:'));
      mReview.appendChild(createEl('span', 'gm-metric-val', data.responseTimeFormatted));
      metrics.appendChild(mReview);

      // 2. PR Merge rate
      const mMerge = createEl('div', 'gm-metric-item');
      mMerge.appendChild(createEl('span', 'gm-metric-label', '🤝 Merge Rate:'));
      const mergeVal = data.mergeRate !== null ? `${data.mergeRate}%` : 'N/A';
      mMerge.appendChild(createEl('span', 'gm-metric-val', mergeVal));
      metrics.appendChild(mMerge);

      // 3. Maintainers / Bus factor
      const mBus = createEl('div', 'gm-metric-item');
      mBus.appendChild(createEl('span', 'gm-metric-label', '👥 Maintainers:'));
      if (data.busFactor === 1) {
        mBus.appendChild(createEl('span', 'gm-metric-val gm-metric-risk', '1 (Solo Risk)'));
      } else if (data.maintainers) {
        mBus.appendChild(createEl('span', 'gm-metric-val', `${data.maintainers} active`));
      } else {
        mBus.appendChild(createEl('span', 'gm-metric-val', 'N/A'));
      }
      metrics.appendChild(mBus);

      // 4. Good First Issues
      if (data.goodFirstIssues > 0) {
        const mGfi = createEl('div', 'gm-metric-item');
        mGfi.appendChild(createEl('span', 'gm-metric-label', '🌱 GFIs:'));
        mGfi.appendChild(createEl('span', 'gm-metric-val', String(data.goodFirstIssues)));
        metrics.appendChild(mGfi);
      }
    } else {
      const mPending = createEl('div', 'gm-metric-item');
      mPending.appendChild(createEl('span', 'gm-metric-label', 'Status:'));
      mPending.appendChild(createEl('span', 'gm-metric-val', 'Unindexed Repository'));
      metrics.appendChild(mPending);
    }

    card.appendChild(metrics);

    // Right CTA
    const cta = createEl('a', 'gm-cta-btn', data ? 'Deep Telemetry ↗' : 'Index Repo ↗');
    cta.href = `${BASE_URL}/repo/${encodeURIComponent(loc.owner)}/${encodeURIComponent(loc.repo)}`;
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    card.appendChild(cta);

    // Insert safely right below the header
    try {
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
    } catch (_) {
      try {
        anchor.appendChild(card);
      } catch (_) {}
    }
  }

  function renderPRBanner(loc, data) {
    removeElement(PR_BANNER_ID);
    if (!loc.isPR || !data) return;

    const container = findElement(PR_CONTAINER_SELECTORS);
    if (!container || !container.parentNode) return;

    const tier = data.cRank ? data.cRank.toUpperCase() : 'D';
    const banner = createEl('div', `gm-pr-banner gm-pr-banner-${tier.toLowerCase()}`);
    banner.id = PR_BANNER_ID;

    const content = createEl('div', 'gm-pr-banner-content');
    let icon = '⚡';
    let message = '';

    if (tier === 'S' || tier === 'A') {
      icon = '🌟';
      message = `High Responsiveness: This repo merges ~${data.mergeRate || 75}% of external PRs with median review in ${data.responseTimeFormatted}. Your PR is likely to receive timely attention.`;
    } else if (tier === 'B' || tier === 'C') {
      icon = '⏳';
      message = `Moderate Turnaround: External PRs merge at ~${data.mergeRate || 50}%. Median review takes ${data.responseTimeFormatted}.`;
    } else {
      icon = '⚠️';
      message = `Ghost Town Risk: This repo merges only ~${data.mergeRate || 10}% of external PRs. Turnaround averages ${data.responseTimeFormatted}. Maintainer response is very slow.`;
    }

    const iconEl = createEl('span', 'gm-pr-banner-icon', icon);
    const textEl = createEl('span', null, message);
    content.appendChild(iconEl);
    content.appendChild(textEl);
    banner.appendChild(content);

    const cta = createEl('a', 'gm-cta-btn', 'View Repo C-Rank ↗');
    cta.href = `${BASE_URL}/repo/${encodeURIComponent(loc.owner)}/${encodeURIComponent(loc.repo)}`;
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    banner.appendChild(cta);

    try {
      container.parentNode.insertBefore(banner, container);
    } catch (_) {}
  }

  async function updatePage() {
    scheduled = false;
    const loc = parseGitHubLocation();
    if (!loc) {
      removeElement(REPO_CARD_ID);
      removeElement(PR_BANNER_ID);
      currentRepoKey = '';
      return;
    }

    if (document.getElementById(REPO_CARD_ID) && currentRepoKey === loc.key && !loc.isPR) {
      return; // Already present and valid
    }

    currentRepoKey = loc.key;

    let telemetry = null;
    try {
      const resp = await new Promise((resolve) => {
        api.runtime.sendMessage({ type: 'GET_TELEMETRY', repo: loc.key }, (r) => {
          resolve(r || null);
        });
      });
      if (resp && resp.type === 'TELEMETRY_RESULT' && resp.payload) {
        telemetry = resp.payload;
      }
    } catch (_) {
      telemetry = null;
    }

    renderRepoCard(loc, telemetry);
    if (loc.isPR) {
      renderPRBanner(loc, telemetry);
    }
  }

  function triggerUpdate() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      try {
        updatePage();
      } catch (_) {}
    }, 150);
  }

  // GitHub SPA navigation listeners
  ['turbo:load', 'turbo:render', 'pjax:end', 'popstate', 'hashchange'].forEach((event) => {
    window.addEventListener(event, triggerUpdate, { passive: true });
  });

  try {
    const observer = new MutationObserver(triggerUpdate);
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch (_) {}

  // Run on initial load
  triggerUpdate();
})();
