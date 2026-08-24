#!/usr/bin/env node
'use strict';

const fs = require('fs');

const API_TIMEOUT_MS = 10_000;
const GH_API = 'https://api.github.com';
const GH_API_VERSION = '2022-11-28';
const USER_AGENT = 'opendoor-preflight-action';
const CLIENT_ID = 'preflight-github-action/v1';

const env = (name, fallback = '') => String(process.env[name] || fallback).trim();

function setOutputs(map) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const blob = Object.entries(map)
    .map(([k, v]) => `${k}=${String(v ?? '')}\n`)
    .join('');
  try {
    fs.appendFileSync(file, blob);
  } catch {}
}

function appendStepSummary(text) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    fs.appendFileSync(file, `\n${text}\n`);
  } catch {}
}

function readEvent() {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function rankFor(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function conclusionFor(score) {
  if (score >= 70) return 'success';
  if (score >= 40) return 'neutral';
  return 'failure';
}

function severityLevel(severity) {
  if (severity === 'error') return 'failure';
  if (severity === 'warning') return 'warning';
  return 'notice';
}

function severityWeight(check) {
  if (!check.passed && check.severity === 'error') return 0;
  if (!check.passed && check.severity === 'warning') return 1;
  if (!check.passed) return 2;
  return 3;
}

async function gh(path, { method = 'GET', body, headers = {}, accept, timeoutMs = API_TIMEOUT_MS } = {}) {
  const token = env('INPUT_GITHUB_TOKEN');
  const res = await fetch(`${GH_API}${path}`, {
    method,
    headers: {
      Accept: accept || 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': GH_API_VERSION,
      'User-Agent': USER_AGENT,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    throw new Error(`github-api-unreachable:${err && err.name}`);
  });
  return res;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function checkRunBody({ name, sha, headBranch, status, conclusion, output }) {
  const now = new Date().toISOString();
  const body = { name, head_sha: sha, status, output };
  if (headBranch) body.head_branch = headBranch;
  if (status === 'completed') {
    body.conclusion = conclusion;
    body.completed_at = now;
    if (!output.started_at) body.started_at = now;
  }
  return body;
}

async function upsertCheckRun({ repo, sha, headBranch, prNumber, conclusion, output }) {
  const name = `preflight/${prNumber}`;
  const attempt = env('GITHUB_RUN_ATTEMPT', '1') || '1';
  const idempotencyKey = `${sha}-${attempt}`;

  let existing = null;
  try {
    const list = await gh(
      `/repos/${repo}/commits/${encodeURIComponent(sha)}/check-runs?check_name=${encodeURIComponent(name)}&per_page=1`,
    );
    if (list.ok) {
      const data = await safeJson(list);
      const runs = data && Array.isArray(data.check_runs) ? data.check_runs : [];
      existing = runs.find((r) => r.head_sha === sha) || runs[0] || null;
    }
  } catch {}

  if (existing) {
    const res = await gh(`/repos/${repo}/check-runs/${existing.id}`, {
      method: 'PATCH',
      body: { name, status: 'completed', conclusion, output, completed_at: new Date().toISOString() },
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    if (!res.ok) throw new Error(`check-run-update-failed:${res.status}`);
    return;
  }

  const res = await gh(`/repos/${repo}/check-runs`, {
    method: 'POST',
    body: checkRunBody({ name, sha, headBranch, status: 'completed', conclusion, output }),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  if (!res.ok) throw new Error(`check-run-create-failed:${res.status}`);
}

function outputPayload({ title, summary }) {
  return { title: String(title).slice(0, 250), summary };
}

function annotationsFor(result, changedFiles) {
  const failed = [...(result.checks || [])]
    .filter((c) => c && c.passed === false)
    .sort((a, b) => severityWeight(a) - severityWeight(b))
    .slice(0, 3);
  const path = (changedFiles[0] || 'README.md').replace(/^\/+/, '');
  return failed.map((c) => ({
    path,
    start_line: 1,
    end_line: 1,
    annotation_level: severityLevel(c.severity),
    title: String(c.title || 'Issue').slice(0, 250),
    message: [c.description, c.suggestion ? `Suggestion: ${c.suggestion}` : '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000),
  }));
}

function summaryText(score, rank, result) {
  const lines = [`**Preflight score: ${score}/100 (C-Rank ${rank})**`, '', result.summary || '', ''];
  for (const c of result.checks || []) {
    const mark = c.passed ? 'x' : ' ';
    lines.push(`- [${mark}] **${c.title}** — ${c.description}${c.suggestion ? ` _(💡 ${c.suggestion})_` : ''}`);
  }
  return lines.join('\n').slice(0, 60000);
}

async function main() {
  const apiUrl = env('INPUT_API_URL').replace(/\/+$/, '');
  const ownerToken = env('INPUT_TOKEN');
  const repo = env('GITHUB_REPOSITORY');
  const eventName = env('GITHUB_EVENT_NAME');
  const event = readEvent();

  const prFromInput = Number(env('INPUT_PR_NUMBER')) || 0;
  const prNumber = prFromInput || Number(event.pull_request && event.pull_request.number) || 0;

  if (!repo || !prNumber || (eventName !== 'pull_request' && !prFromInput)) {
    setOutputs({ score: '', rank: '', conclusion: 'skipped' });
    appendStepSummary('Preflight: no pull request context; nothing to evaluate.');
    process.exitCode = 0;
    return;
  }

  const metaRes = await gh(`/repos/${repo}/pulls/${prNumber}`);
  if (!metaRes.ok) throw new Error(`pr-meta-failed:${metaRes.status}`);
  const meta = await safeJson(metaRes);
  if (!meta || !meta.head || !meta.head.sha) throw new Error('pr-meta-malformed');

  const sha = meta.head.sha;
  const headBranch = meta.head.ref || '';
  const isFork = Boolean(meta.head.repo && meta.head.repo.fork);

  const filesRes = await gh(`/repos/${repo}/pulls/${prNumber}/files?per_page=100`);
  let changedFiles = [];
  if (filesRes.ok) {
    const files = await safeJson(filesRes);
    if (Array.isArray(files)) changedFiles = files.map((f) => f && f.filename).filter(Boolean);
  }

  const diffRes = await gh(`/repos/${repo}/pulls/${prNumber}`, {
    accept: 'application/vnd.github.diff',
  });
  const diff = diffRes.ok ? await diffRes.text() : '';

  if (!diff.trim()) {
    const output = outputPayload({
      title: 'Preflight skipped',
      summary: 'No PR diff available — Preflight was skipped.',
    });
    try {
      await upsertCheckRun({ repo, sha, headBranch, prNumber, conclusion: 'skipped', output });
    } catch {}
    setOutputs({ score: '', rank: '', conclusion: 'skipped' });
    process.exitCode = 0;
    return;
  }

  const issueMatch = typeof meta.body === 'string' ? meta.body.match(/#(\d+)/) : null;
  const linkedIssueUrl = issueMatch ? `https://github.com/${repo}/issues/${issueMatch[1]}` : '';

  const evalRes = await fetch(`${apiUrl}/api/v1/preflight/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'X-Preflight-Client': CLIENT_ID,
      'Idempotency-Key': `${sha}-${env('GITHUB_RUN_ATTEMPT', '1') || '1'}`,
      ...(ownerToken && !isFork ? { Authorization: `Bearer ${ownerToken}` } : {}),
    },
    body: JSON.stringify({
      repo_full_name: repo,
      pr_title: meta.title || '',
      pr_description: meta.body || '',
      changed_files: changedFiles,
      additions: Number(meta.additions) || 0,
      deletions: Number(meta.deletions) || 0,
      linked_issue_url: linkedIssueUrl,
      pr_url: meta.html_url || '',
      pr_diff: diff.slice(0, 500000),
      head_sha: sha,
    }),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (evalRes.status === 429) {
    const quota = await safeJson(evalRes);
    const resetAt = quota && quota.reset_at ? ` Resets at ${quota.reset_at}.` : '';
    const output = outputPayload({
      title: 'Preflight quota exhausted',
      summary: `**Quota exhausted — upgrade to Pro** for unlimited runs.${resetAt}`,
    });
    try {
      await upsertCheckRun({ repo, sha, headBranch, prNumber, conclusion: 'neutral', output });
    } catch {
      appendStepSummary(output.summary);
    }
    setOutputs({ score: '', rank: '', conclusion: 'neutral' });
    process.exitCode = 0;
    return;
  }

  if (!evalRes.ok) throw new Error(`forecast-api-error:${evalRes.status}`);

  const result = await safeJson(evalRes);
  if (
    !result ||
    !Number.isFinite(Number(result.overall_score)) ||
    !Array.isArray(result.checks) ||
    typeof result.summary !== 'string'
  ) {
    throw new Error('forecast-response-malformed');
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(result.overall_score))));
  const rank = rankFor(score);
  const conclusion = conclusionFor(score);
  const summary = summaryText(score, rank, result);
  const annotations = annotationsFor(result, changedFiles);

  const output = outputPayload({ title: `Preflight — C-Rank ${rank}`, summary });
  if (annotations.length) output.annotations = annotations;

  let publishedViaCheckRun = true;
  try {
    await upsertCheckRun({ repo, sha, headBranch, prNumber, conclusion, output });
  } catch {
    publishedViaCheckRun = false;
    appendStepSummary(summary);
  }

  if (!publishedViaCheckRun) {
    console.log('Preflight: check-run publishing unavailable (read-only token); wrote job summary instead.');
  }

  setOutputs({ score: String(score), rank, conclusion });
  process.exitCode = 0;
}

main().catch(async () => {
  const repo = env('GITHUB_REPOSITORY');
  const event = readEvent();
  const prNumber = Number(env('INPUT_PR_NUMBER')) || Number(event.pull_request && event.pull_request.number) || 0;
  const output = outputPayload({
    title: 'Preflight unavailable',
    summary: '**Forecast unavailable** — the Preflight service could not be reached. CI is not blocked.',
  });
  try {
    const metaRes = await gh(`/repos/${repo}/pulls/${prNumber}`);
    const meta = metaRes.ok ? await safeJson(metaRes) : null;
    if (repo && prNumber && meta && meta.head && meta.head.sha) {
      await upsertCheckRun({
        repo,
        sha: meta.head.sha,
        headBranch: meta.head.ref || '',
        prNumber,
        conclusion: 'neutral',
        output,
      });
    }
  } catch {
    appendStepSummary(output.summary);
  }
  setOutputs({ score: '', rank: '', conclusion: 'neutral' });
  process.exitCode = 0;
});
