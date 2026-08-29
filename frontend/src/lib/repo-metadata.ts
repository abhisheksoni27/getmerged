import { Repo } from "@/types/opendoor";

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
    const title = `${fullName} Contributor Telemetry & C-Rank™: Unscored | GetMerged`;
    const description = `${fullName} currently has no public PR telemetry recorded on GitHub (reviews may occur on internal tooling). View verified-welcoming alternative open-source projects on GetMerged.`;
    return { title, description };
  }

  const score = repo.c_rank_score !== undefined ? repo.c_rank_score.toFixed(1) : "0.0";
  const tier = repo.c_rank_tier || "D";
  const mergeRate = (repo.external_pr_merge_rate || 0).toFixed(1);
  const respHours = (repo.response_p50_hours && repo.response_p50_hours > 0 ? repo.response_p50_hours : (repo.time_to_first_response_hours || 0)).toFixed(1);
  const firstTimerRate = (repo.first_timer_success_rate || 0).toFixed(1);
  const busFactor = repo.bus_factor || 1;
  const gfiCount = repo.good_first_issue_count || 0;

  // Compelling title with high CTR & clear value proposition
  const title = `${fullName} | ${score}/100 C-Rank (${tier}-Tier) • ${mergeRate}% Merge Rate | GetMerged`;

  // Rich, punchy description highlighting actionable PR intelligence
  const descPrefix = `Will ${fullName} merge your PR? Rated ${tier}-Tier (${score}/100 C-Rank).`;
  const metricsHighlight = `${mergeRate}% external merge rate, ~${respHours}h response latency, ${firstTimerRate}% first-timer acceptance, bus factor of ${busFactor}${gfiCount > 0 ? `, and ${gfiCount} good first issues` : ""}.`;
  
  const description = repo.description
    ? `${descPrefix} ${metricsHighlight} "${repo.description.trim()}"`
    : `${descPrefix} Detailed maintainer turnaround, review bottlenecks, and acceptance odds on GetMerged: ${metricsHighlight}`;

  return { title, description };
}

export interface RepoFaqItem {
  q: string;
  a: string;
}

export function buildRepoFaqList(fullName: string, repo: Repo | null): RepoFaqItem[] {
  const scored = isRepoScored(repo);

  if (!repo || !scored) {
    return [
      {
        q: "What does the Unscored status represent?",
        a: "This repository currently has no indexed public pull request reviews or maintainer telemetry on GitHub. Some large projects conduct code reviews via external tooling (e.g. Gerrit, Phabricator) or internal monorepos. As soon as public PR review activity is recorded, C-Rank™ computes objective scores automatically.",
      },
      {
        q: "Is this project welcoming to external pull requests?",
        a: "No public review velocity has been recorded on GitHub for this project. Check the project CONTRIBUTING guide or explore our verified-welcoming alternatives in the same language ecosystem.",
      },
      {
        q: `What is the external contributor pull request merge rate for ${fullName}?`,
        a: `No public pull request merge telemetry is recorded on GitHub for ${fullName}. Review workflows may be hosted externally or restricted to core teams.`,
      },
      {
        q: `How fast can I expect code review feedback on my pull request?`,
        a: `Review latency is currently unmeasured due to zero public GitHub PR telemetry. Refer to the repository's contributing guidelines for team workflow norms.`,
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
      a: `Maintainers in ${fullName} respond to incoming external pull requests in approximately ${(repo.time_to_first_response_hours || 0).toFixed(1)} hours on average. Keeping PRs scoped to single concerns and ensuring CI checks succeed will optimize review turnaround.`,
    },
    {
      q: `What does the ${(repo.c_rank_score || 0).toFixed(1)} C-Rank™ score (${repo.c_rank_tier || "A"} Tier) represent?`,
      a: `The C-Rank™ system evaluates GitHub projects on a 0–100 scale using objective telemetry: PR merge velocity, first-comment latency, active maintainer count, and first-time contributor acceptance rates. A score of ${(repo.c_rank_score || 0).toFixed(1)} places ${fullName} in the ${repo.c_rank_tier || "A"} tier.`,
    },
    {
      q: `What is the external contributor pull request merge rate for ${fullName}?`,
      a: `The external contributor pull request merge rate for ${fullName} is ${(repo.external_pr_merge_rate || 0).toFixed(1)}%, based on public PR telemetry from non-core contributors.`,
    },
    {
      q: `Are there Good First Issues available in ${fullName}?`,
      a: (repo.good_first_issue_count || 0) > 0
        ? `${fullName} currently has ${repo.good_first_issue_count} active issue(s) tagged with beginner-friendly labels like "good first issue", "beginner", or "up-for-grabs".`
        : `${fullName} does not currently have active "good first issue" tags indexed, but accepts external contributions through standard GitHub issue tracking.`,
    },
  ];
}
