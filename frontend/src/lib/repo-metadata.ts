import { Repo } from "@/types/opendoor";
import {
  formatMetaLatency,
  formatNarrativeLatency,
  getPositiveResponseHours,
} from "./format-latency";

export function isRepoScored(repo: Repo | null): boolean {
  if (!repo) return false;
  if (typeof repo.is_scored === "boolean") {
    return repo.is_scored;
  }
  return typeof repo.c_rank_score === "number" && repo.c_rank_score > 0;
}

export interface RepoMetadataResult {
  title: string;
  description: string;
}

export function buildRepoMetadata(fullName: string, repo: Repo | null): RepoMetadataResult {
  const scored = isRepoScored(repo);

  if (!repo || !scored) {
    const title = `${fullName} Review Speed & PR Merge Stats: Unscored | GetMerged`;
    const description = `${fullName} currently has no public pull request activity recorded on GitHub. View active, welcoming open source projects on GetMerged.`;
    return { title, description };
  }

  const score = repo.c_rank_score !== undefined ? repo.c_rank_score.toFixed(1) : "0.0";
  const tier = repo.c_rank_tier || "D";
  const mergeRate = (repo.external_pr_merge_rate || 0).toFixed(0);
  const positiveResponseHours = getPositiveResponseHours(repo);
  const metaLatency = formatMetaLatency(positiveResponseHours);

  // Dynamic Title Construction (Strictly <= 60 chars)
  const repoName = repo.name || fullName.split("/")[1] || fullName;
  const titleCandidates = [
    `${fullName} • ${score}/100 C-Rank (${tier}-Tier) | GetMerged`,
    `${fullName} (${tier}-Tier ${score}) • ${mergeRate}% Merge | GM`,
    `${fullName} (${tier}-Tier ${score}) | GetMerged`,
    `${repoName} • ${score}/100 (${tier}-Tier) | GetMerged`,
    `${repoName} (${tier}-Tier ${score}) | GetMerged`,
    `${fullName.slice(0, 48)} | GetMerged`,
  ];
  const title = titleCandidates.find((t) => t.length <= 60) || `${fullName.slice(0, 48)} | GetMerged`;

  // Dynamic Description Construction (Strictly <= 154 chars)
  const descCandidates = metaLatency
    ? [
        `Will ${fullName} merge your PR? ${score}/100 C-Rank (${tier}-Tier) with ${mergeRate}% merge rate & ${metaLatency} response time. Check review speed on GetMerged.`,
        `Will ${fullName} merge your PR? ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate & ${metaLatency} response. Check review speed on GetMerged.`,
        `Will ${repoName} merge your PR? ${score}/100 C-Rank (${tier}-Tier) with ${mergeRate}% merge rate & ${metaLatency} response time. Check review speed on GetMerged.`,
        `Will ${repoName} merge your PR? ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate & ${metaLatency} response. Check review speed on GetMerged.`,
        `${fullName} PR stats: ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate. View maintainer review speed on GetMerged.`,
        `${repoName} PR stats: ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate. View maintainer review speed on GetMerged.`,
      ]
    : [
        `Will ${fullName} merge your PR? ${score}/100 C-Rank (${tier}-Tier) with ${mergeRate}% merge rate telemetry. Check review speed & benchmarks on GetMerged.`,
        `${fullName} PR stats: ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate. View maintainer review speed on GetMerged.`,
        `${repoName} PR stats: ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate. View maintainer review speed on GetMerged.`,
      ];
  let description = descCandidates.find((d) => d.length <= 154) || "";
  if (!description) {
    const base = `PR stats for ${fullName}: ${score}/100 C-Rank (${tier}-Tier), ${mergeRate}% merge rate. Review speed on GetMerged.`;
    description = base.length <= 154 ? base : base.slice(0, 151) + "...";
  }

  return { title, description };
}

export interface RepoFaqItem {
  q: string;
  a: string;
}

export function buildRepoFaqList(fullName: string, repo: Repo | null): RepoFaqItem[] {
  const scored = isRepoScored(repo);
  const positiveResponseHours = getPositiveResponseHours(repo);

  if (!repo || !scored) {
    return [
      {
        q: "What does the Unscored status represent?",
        a: "This repository currently has no indexed public pull request reviews or activity on GitHub. Some large projects conduct code reviews via external tooling (e.g. Gerrit, Phabricator) or internal monorepos. As soon as public PR review activity is recorded, scores are computed automatically.",
      },
      {
        q: "Is this project welcoming to external pull requests?",
        a: "No public review history has been recorded on GitHub for this project yet. Check the project CONTRIBUTING guide or explore active, welcoming alternatives in the same language ecosystem.",
      },
      {
        q: `What is the external contributor pull request merge rate for ${fullName}?`,
        a: `No public pull request merge data is recorded on GitHub for ${fullName}. Review workflows may be hosted externally or restricted to core teams.`,
      },
      {
        q: `How fast can I expect code review feedback on my pull request?`,
        a: `Review speed is currently unmeasured due to no public GitHub PR activity. Refer to the repository's contributing guidelines for team workflow norms.`,
      },
      {
        q: `Are there Good First Issues available in ${fullName}?`,
        a: (repo?.good_first_issue_count || 0) > 0
          ? `${fullName} currently has ${repo?.good_first_issue_count} active issue(s) tagged with beginner-friendly labels like "good first issue", "beginner", or "up-for-grabs".`
          : `${fullName} does not currently have active "good first issue" tags indexed, but accepts external contributions through standard GitHub issue tracking.`,
      },
    ];
  }

  return [
    {
      q: `Is ${fullName} welcoming to first-time open-source contributors?`,
      a: `${fullName} has a recorded first-timer success rate of ${(repo.first_timer_success_rate || 0).toFixed(1)}%. Repositories ranked ${repo.c_rank_tier || "A"} typically provide actionable feedback during code reviews and actively nurture new community contributors.`,
    },
    {
      q: `How fast can I expect code review feedback on my pull request?`,
      a: positiveResponseHours
        ? `Maintainers in ${fullName} respond to incoming external pull requests in approximately ${formatNarrativeLatency(positiveResponseHours)}. Keeping PRs focused on single tasks and ensuring tests pass helps maintainers review faster.`
        : `Median maintainer response time is not yet recorded for ${fullName}. Keeping PRs focused on single tasks and ensuring tests pass helps maintainers review faster.`,
    },
    {
      q: `What does the ${(repo.c_rank_score || 0).toFixed(1)} C-Rank™ score (${repo.c_rank_tier || "A"} Tier) represent?`,
      a: `The C-Rank™ system evaluates GitHub projects on a 0–100 scale using real data: PR merge rates, review turnaround time, active maintainer presence, and first-time contributor success. A score of ${(repo.c_rank_score || 0).toFixed(1)} places ${fullName} in the ${repo.c_rank_tier || "A"} tier.`,
    },
    {
      q: `What is the external contributor pull request merge rate for ${fullName}?`,
      a: `The external contributor pull request merge rate for ${fullName} is ${(repo.external_pr_merge_rate || 0).toFixed(1)}%, based on public PR activity from non-core contributors.`,
    },
    {
      q: `Are there Good First Issues available in ${fullName}?`,
      a: (repo.good_first_issue_count || 0) > 0
        ? `${fullName} currently has ${repo.good_first_issue_count} active issue(s) tagged with beginner-friendly labels like "good first issue", "beginner", or "up-for-grabs".`
        : `${fullName} does not currently have active "good first issue" tags indexed, but accepts external contributions through standard GitHub issue tracking.`,
    },
  ];
}
