'use strict';

/**
 * GetMerged: GitHub C-Rank™ Telemetry
 * Popup script
 */

const api = globalThis.browser || globalThis.chrome;
const BASE_URL = 'https://getmerged.abhishekco.de';

function parseRepoFromURL(urlStr) {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr);
    if (!u.hostname.includes('github.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    const reserved = new Set([
      'pulls', 'issues', 'orgs', 'settings', 'notifications', 'search',
      'explore', 'topics', 'sponsors', 'marketplace', 'login', 'join'
    ]);
    if (reserved.has(owner.toLowerCase())) return null;
    return `${owner}/${repo}`;
  } catch (_) {
    return null;
  }
}

function renderScorecard(container, repoKey, data) {
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'score-card';

  const top = document.createElement('div');
  top.className = 'card-top';

  const title = document.createElement('div');
  title.className = 'repo-name';
  title.textContent = repoKey;
  title.title = repoKey;
  top.appendChild(title);

  const tier = data && data.cRank ? data.cRank.toUpperCase() : 'UNRANKED';
  const badge = document.createElement('span');
  badge.className = `tier-badge tier-${tier.toLowerCase()}`;
  badge.textContent = `C-Rank ${tier}`;
  top.appendChild(badge);
  card.appendChild(top);

  if (data) {
    const grid = document.createElement('div');
    grid.className = 'metrics-grid';

    // 1. Review
    const b1 = document.createElement('div');
    b1.className = 'metric-box';
    b1.innerHTML = `<span class="metric-k">⚡ Median Review</span><span class="metric-v">${data.responseTimeFormatted}</span>`;
    grid.appendChild(b1);

    // 2. Merge rate
    const b2 = document.createElement('div');
    b2.className = 'metric-box';
    const mRate = data.mergeRate !== null ? `${data.mergeRate}%` : 'N/A';
    b2.innerHTML = `<span class="metric-k">🤝 Merge Rate</span><span class="metric-v">${mRate}</span>`;
    grid.appendChild(b2);

    // 3. Maintainers
    const b3 = document.createElement('div');
    b3.className = 'metric-box';
    const busRisk = data.busFactor === 1;
    const busText = busRisk ? '1 (Solo Risk)' : `${data.maintainers || 'N/A'} active`;
    b3.innerHTML = `<span class="metric-k">👥 Maintainers</span><span class="metric-v ${busRisk ? 'metric-risk' : ''}">${busText}</span>`;
    grid.appendChild(b3);

    // 4. Score
    const b4 = document.createElement('div');
    b4.className = 'metric-box';
    const scoreText = data.score !== null ? `${data.score}/100` : 'N/A';
    b4.innerHTML = `<span class="metric-k">🛡️ C-Rank Score</span><span class="metric-v">${scoreText}</span>`;
    grid.appendChild(b4);

    card.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const link = document.createElement('a');
    link.className = 'cta-button';
    link.href = `${BASE_URL}/repo/${repoKey}`;
    link.target = '_blank';
    link.textContent = 'View Full Breakdown on GetMerged ↗';
    actions.appendChild(link);
    card.appendChild(actions);
  } else {
    const unindexed = document.createElement('div');
    unindexed.className = 'card-loading';
    unindexed.textContent = 'Repository not yet indexed in GetMerged catalog.';
    card.appendChild(unindexed);
  }

  container.appendChild(card);
}

async function requestTelemetry(repoKey) {
  return new Promise((resolve) => {
    if (!api || !api.runtime) return resolve(null);
    api.runtime.sendMessage({ type: 'GET_TELEMETRY', repo: repoKey }, (resp) => {
      if (resp && resp.type === 'TELEMETRY_RESULT') {
        resolve(resp.payload);
      } else {
        resolve(null);
      }
    });
  });
}

// Initial active tab lookup
async function init() {
  const cardContent = document.getElementById('card-content');
  const contextLabel = document.getElementById('context-label');

  if (!api || !api.tabs) {
    cardContent.textContent = 'Search any repository below.';
    return;
  }

  api.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentTab = tabs && tabs[0];
    const repoKey = currentTab ? parseRepoFromURL(currentTab.url) : null;

    if (repoKey) {
      contextLabel.textContent = 'Current GitHub Repo';
      cardContent.textContent = `Analyzing ${repoKey}...`;
      const data = await requestTelemetry(repoKey);
      renderScorecard(cardContent, repoKey, data);
    } else {
      contextLabel.textContent = 'Quick Lookup';
      cardContent.innerHTML = `
        <div style="font-size:12px; color:#a1a1aa; line-height:1.5;">
          Navigate to any repository on <strong>GitHub.com</strong> or type an open-source repo above to view live merge odds and C-Rank.
        </div>
      `;
    }
  });

  // Handle search form
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const resultDiv = document.getElementById('search-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let query = (input.value || '').trim();
    if (!query) return;

    // Handle full URLs like https://github.com/facebook/react
    if (query.includes('github.com')) {
      const parsed = parseRepoFromURL(query);
      if (parsed) query = parsed;
    }

    if (!/^[^/]+\/[^/]+$/.test(query)) {
      alert('Please enter in format "owner/repo" (e.g. facebook/react)');
      return;
    }

    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `<div class="card-loading">Fetching telemetry for ${query}...</div>`;

    const data = await requestTelemetry(query);
    renderScorecard(resultDiv, query, data);
  });
}

document.addEventListener('DOMContentLoaded', init);
