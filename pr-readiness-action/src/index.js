#!/usr/bin/env node
'use strict';

const fs = require('fs');

const MARKER_PREFIX = '<!-- opendoor-pr-readiness:v1:';
const MAX_COMMENT_BYTES = 60 * 1024;
const GH_API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
const TAG = '[opendoor-pr-readiness]';

function input(name, fallback) {
  const envKey = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
  const v = process.env[envKey];
  if (v !== undefined && v !== '') return v;
  return process.env[name] || fallback || '';
}

const apiKey = input('api-key');
const thresholdRaw = Number.parseInt(input('score-threshold', '70'), 10);
const threshold = Number.isFinite(thresholdRaw) ? thresholdRaw : 70;
const gate = /^true$/i.test(String(input('gate', 'false')).trim());
const instanceId = String(input('instance-id', 'default')).replace(/[>\r\n]/g, '').trim() || 'default';
const githubToken = input('github-token') || process.env.GITHUB_TOKEN || '';
const apiUrl = input('api-url', 'https://getmerged.abhishekco.de').replace(/\/+$/, '');
const appUrl = input('app-url', 'https://opendoor.abhishekco.de').replace(/\/+$/, '');
const marker = MARKER_PREFIX + instanceId + ' -->';

function info(msg) { console.log(`${TAG} ${msg}`); }
function warn(msg) { console.log(`::warning::${TAG} ${msg}`); }
function notice(msg) { console.log(`::notice::${TAG} ${msg}`); }

function setOutput(name, value) {
  try {
    fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `${name}=${value}\n`);
  } catch (e) {
    info(`could not write output ${name}: ${e.message}`);
  }
}

function exit0() { process.exit(0); }
function fatal(msg) {
  console.log(`::error::${TAG} ${msg}`);
  console.error(`${TAG} FATAL: ${msg}`);
  process.exit(1);
}

async function ghFetch(path, init) {
  return fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'opendoor-pr-readiness-action',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      ...(init && init.headers ? init.headers : {}),
    },
  });
}

function rankFor(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

async function fetchTelemetry(prHtmlUrl) {
  let res;
  try {
    res = await fetch(`${apiUrl}/api/v1/preflight/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'opendoor-pr-readiness-action',
      },
      body: JSON.stringify({ pr_url: prHtmlUrl }),
    });
  } catch (e) {
    throw new Error(`OpenDoor telemetry API unreachable at ${apiUrl}: ${e.message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `OpenDoor API rejected the credentials (HTTP ${res.status}). ` +
      'Check that the api-key input is a valid, non-expired OpenDoor PREFLIGHT_TOKEN ' +
      'and that it has quota remaining. Get one at https://opendoor.abhishekco.de/pricing.'
    );
  }
  if (!res.ok) {
    throw new Error(`OpenDoor telemetry API returned HTTP ${res.status} for ${prHtmlUrl}`);
  }
  return res.json();
}

async function listPRFiles(repo, prNumber) {
  try {
    const res = await ghFetch(`/repos/${repo}/pulls/${prNumber}/files?per_page=100`, {});
    if (!res.ok) {
      warn(`could not list PR files (HTTP ${res.status}); skipping diff-based checks`);
      return [];
    }
    return res.json();
  } catch (e) {
    warn(`could not list PR files: ${e.message}`);
    return [];
  }
}

const CONVENTIONAL_RE = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_\-./]+\))?:\s+.+$/i;

function checkGuidelines(pr, files) {
  const checks = [];
  const title = (pr.title || '').trim();
  if (!title) {
    checks.push({ name: 'Title present', status: 'fail', hint: 'Add a descriptive PR title.' });
  } else {
    checks.push({
      name: `Title length (${title.length}/72)`,
      status: title.length <= 72 ? 'pass' : 'warn',
      hint: title.length <= 72 ? '' : 'Shorten the title to 72 chars or fewer for readable changelogs.',
    });
    checks.push({
      name: 'Conventional commit style',
      status: CONVENTIONAL_RE.test(title) ? 'pass' : 'warn',
      hint: CONVENTIONAL_RE.test(title) ? '' : 'Prefer "feat: ...", "fix(scope): ..." prefixes.',
    });
  }

  const body = (pr.body || '').trim();
  const linksIssue = /(fixes|closes|resolves|refs)\s+#\d+|#\d+/i.test(body);
  checks.push({
    name: 'Description provided',
    status: body.length >= 30 || (body && linksIssue) ? 'pass' : 'warn',
    hint: body.length >= 30 || (body && linksIssue)
      ? ''
      : 'Describe what changed and why (30+ chars), and link related issues ("Fixes #123").',
  });

  const codeFiles = files.filter((f) => !/\.(md|txt|json|ya?ml|lock)$|(^|\/)\.|package-lock\.json/i.test(f.filename));
  const testFiles = files.filter((f) => /\.(test|spec)\.[jt]sx?$|_test\.(go|py|rb)$|(\/|^)(tests?|__tests__|spec)\//i.test(f.filename));
  if (codeFiles.length > 0 && testFiles.length === 0) {
    checks.push({ name: 'Tests included', status: 'warn', hint: 'Code changed but no test files touched — add or update tests.' });
  } else {
    checks.push({ name: 'Tests included', status: 'pass', hint: codeFiles.length === 0 ? 'No code changes detected.' : '' });
  }

  const totalChanges = files.reduce((acc, f) => acc + (f.additions || 0) + (f.deletions || 0), 0);
  if (files.length > 30 || totalChanges > 2000) {
    checks.push({ name: 'Diff size', status: 'warn', hint: `Large diff (${files.length} files, +${totalChanges} lines). Consider splitting into smaller PRs.` });
  } else {
    checks.push({ name: 'Diff size', status: 'pass', hint: '' });
  }

  if (pr.draft) {
    checks.push({ name: 'Not a draft', status: 'warn', hint: 'Mark ready for review when complete.' });
  }

  let score = 100;
  for (const c of checks) {
    if (c.status === 'fail') score -= 25;
    else if (c.status === 'warn') score -= 10;
  }
  return { checks, score: Math.max(0, score) };
}

function statusIcon(s) { return s === 'pass' ? '✅' : s === 'warn' ? '⚠️' : '❌'; }

function renderReport(ctx) {
  const { repoFullName, crank, grade, threshold, gateMode, guidelines, summaryLine } = ctx;
  const lines = [];

  lines.push(marker);
  lines.push('## 🚦 Opendoor PR Readiness & C-Rank™ Check');
  lines.push('');

  if (crank === null) {
    lines.push('**C-Rank™ Score:** N/A — API key unavailable');
    lines.push('');
    lines.push('> Add your free [OpenDoor API key](https://opendoor.abhishekco.de/pricing) as the `api-key` input to unlock merge-odds scoring and gating.');
  } else {
    const pass = crank >= threshold;
    const icon = pass ? '✅' : '❌';
    lines.push(`**C-Rank™ Score:** ${crank}/100 · Grade **${grade}** ${icon}`);
    if (gateMode) {
      lines.push('');
      lines.push(`Gate mode is on: this check ${pass ? '**passes**' : `**fails** (below threshold ${threshold})`}.`);
    }
  }
  lines.push('');
  lines.push(summaryLine);
  lines.push('');

  lines.push('### 📋 Submission Guidelines Compliance');
  lines.push('');
  lines.push('| Check | Status | Suggestion |');
  lines.push('|---|---|---|');
  for (const c of guidelines.checks) {
    lines.push(`| ${c.name} | ${statusIcon(c.status)} | ${c.hint || '—'} |`);
  }
  lines.push('');
  lines.push(`**Guidelines score:** ${guidelines.score}/100`);
  lines.push('');

  const fixes = guidelines.checks.filter((c) => c.hint && c.status !== 'pass');
  if (fixes.length > 0) {
    lines.push('### 🔧 Fix-first checklist');
    lines.push('');
    for (const f of fixes.slice(0, 5)) lines.push(`- [ ] ${f.hint}`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`📊 **[View the full Opendoor telemetry report for \`${repoFullName}\`](${appUrl}/repo/${repoFullName})** — merge rates, maintainer response times & first-timer success.`);
  lines.push('');
  lines.push(`<sub>Automated by \`opendoor/pr-readiness-action@v1\` · instance \`${instanceId}\`</sub>`);

  return lines.join('\n');
}

function capBytes(str, max) {
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= max) return str;
  let cut = str;
  while (Buffer.from(cut, 'utf8').length > max - 512 && cut.length > 0) {
    cut = cut.slice(0, Math.floor(cut.length * 0.95));
  }
  return cut + `\n\n…view full report: ${appUrl}`;
}

async function findExistingComment(repo, prNumber) {
  for (let page = 1; page <= 10; page++) {
    const res = await ghFetch(`/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`, {});
    if (!res.ok) {
      warn(`could not list existing comments (HTTP ${res.status}); will create a new comment`);
      return null;
    }
    const comments = await res.json();
    if (!Array.isArray(comments) || comments.length === 0) return null;
    const hit = comments.find((c) => typeof c.body === 'string' && c.body.includes(marker));
    if (hit) return hit;
    if (comments.length < 100) return null;
  }
  return null;
}

async function upsertComment(repo, prNumber, body) {
  const existing = githubToken ? await findExistingComment(repo, prNumber) : null;
  const payload = JSON.stringify({ body });

  let res;
  if (existing) {
    info(`updating existing readiness comment #${existing.id}`);
    res = await ghFetch(`/repos/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } else {
    res = await ghFetch(`/repos/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  }

  if (res.ok) {
    const created = await res.json().catch(() => ({}));
    const url = created.html_url || '';
    if (url) setOutput('comment-url', url);
    info(existing ? 'readiness comment updated (last-writer-wins, idempotent).' : 'readiness comment posted.');
    return true;
  }

  if (res.status === 403) {
    warn('comment write denied (fork PR with read-only GITHUB_TOKEN?). Falling back to step summary.');
    return false;
  }
  if (res.status === 404 || res.status === 422) {
    info(`PR closed/deleted mid-run (HTTP ${res.status}); skipping comment.`);
    return null;
  }
  throw new Error(`GitHub comment API returned HTTP ${res.status}`);
}

function writeStepSummary(report) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return false;
  try {
    fs.appendFileSync(p, report.replace(marker + '\n', '') + '\n');
    return true;
  } catch (e) {
    warn(`could not write $GITHUB_STEP_SUMMARY: ${e.message}`);
    return false;
  }
}

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  if (eventName !== 'pull_request' && eventName !== 'pull_request_target') {
    info(`event "${eventName}" is not a pull request event; nothing to do.`);
    exit0();
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  let pr;
  try {
    pr = JSON.parse(fs.readFileSync(eventPath, 'utf8')).pull_request;
  } catch (e) {
    fatal(`cannot read event payload from GITHUB_EVENT_PATH: ${e.message}`);
  }
  if (!pr || !pr.number) {
    info('no pull request in event payload; nothing to do.');
    exit0();
  }

  const repo = process.env.GITHUB_REPOSITORY;
  const repoFullName = repo || (pr.base && pr.base.repo && pr.base.repo.full_name) || 'unknown/unknown';
  setOutput('instance-id', instanceId);

  const files = await listPRFiles(repo, pr.number);
  const guidelines = checkGuidelines(pr, files);

  let crank = null;
  let grade = '';
  if (apiKey) {
    const result = await fetchTelemetry(pr.html_url || `https://github.com/${repoFullName}/pull/${pr.number}`);
    if (result && Number.isFinite(Number(result.overall_score))) {
      crank = Math.round(Number(result.overall_score));
      grade = rankFor(crank);
      setOutput('c-rank', String(crank));
      setOutput('grade', grade);
    } else {
      warn('telemetry response had no overall_score; rendering C-Rank as unavailable.');
    }
  } else {
    setOutput('c-rank', 'N/A');
    info('no api-key provided — C-Rank scoring skipped, guidelines-only advisory run.');
  }

  const pass = crank === null ? guidelines.score >= threshold : crank >= threshold;
  const verdict = crank === null ? 'advisory' : pass ? 'pass' : 'fail';
  setOutput('verdict', verdict);

  const summaryLine = crank !== null
    ? `**Merge odds:** ${pass ? '🟢 above' : '🔴 below'} the ${threshold}-point threshold. Guidelines score ${guidelines.score}/100.`
    : `**Merge odds:** guidelines score ${guidelines.score}/100 (local heuristics only).`;

  const rawReport = renderReport({
    repoFullName,
    crank,
    grade,
    threshold,
    gateMode: gate,
    guidelines,
    summaryLine,
  });
  const report = capBytes(rawReport, MAX_COMMENT_BYTES);

  if (!githubToken) {
    warn('no GitHub token available; writing the report to the job summary instead of a PR comment.');
    writeStepSummary(report);
    exit0();
  }

  let posted;
  try {
    posted = await upsertComment(repo, pr.number, report);
  } catch (e) {
    fatal(e.message);
  }

  if (posted === null) exit0();

  if (posted === false) {
    if (writeStepSummary(report)) {
      notice('full report written to $GITHUB_STEP_SUMMARY.');
    }
    exit0();
  }

  if (gate && crank !== null && crank < threshold) {
    console.log(`::error::${TAG} C-Rank ${crank} is below the required threshold of ${threshold}. Gate failed.`);
    process.exit(1);
  }
  exit0();
}

main().catch((e) => fatal(e && e.stack ? e.stack : String(e)));
