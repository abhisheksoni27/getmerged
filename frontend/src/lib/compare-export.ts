import { Repo } from "@/types/opendoor";

/**
 * Generates a GitHub-Flavored Markdown comparison table for two repositories.
 */
export function generateCompareMarkdown(repoA: Repo, repoB: Repo): string {
  const tierA = repoA.c_rank_tier || repoA.class_rank || "A";
  const tierB = repoB.c_rank_tier || repoB.class_rank || "A";
  const scoreA = (repoA.c_rank_score ?? repoA.score ?? 0).toFixed(0);
  const scoreB = (repoB.c_rank_score ?? repoB.score ?? 0).toFixed(0);
  const mergeRateA = (repoA.external_pr_merge_rate ?? 0).toFixed(1);
  const mergeRateB = (repoB.external_pr_merge_rate ?? 0).toFixed(1);
  const latencyA = (repoA.response_p50_hours ?? repoA.time_to_first_response_hours ?? 0).toFixed(1);
  const latencyB = (repoB.response_p50_hours ?? repoB.time_to_first_response_hours ?? 0).toFixed(1);
  const busA = repoA.bus_factor ?? repoA.distinct_maintainer_count ?? 1;
  const busB = repoB.bus_factor ?? repoB.distinct_maintainer_count ?? 1;
  const onboardingA = repoA.onboarding_score ?? 0;
  const onboardingB = repoB.onboarding_score ?? 0;

  const compareUrl = `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`;

  return `### 📊 [${repoA.full_name}](https://getmerged.abhishekco.de/${repoA.full_name}) vs [${repoB.full_name}](https://getmerged.abhishekco.de/${repoB.full_name}) Comparison

| Metric | [${repoA.full_name}](https://getmerged.abhishekco.de/${repoA.full_name}) | [${repoB.full_name}](https://getmerged.abhishekco.de/${repoB.full_name}) |
| :--- | :--- | :--- |
| **C-Rank™ Tier** | ${tierA} (${scoreA}%) | ${tierB} (${scoreB}%) |
| **External PR Merge Rate** | ${mergeRateA}% | ${mergeRateB}% |
| **Review Latency (p50)** | ${latencyA}h | ${latencyB}h |
| **90-Day Bus Factor** | ${busA} Maintainers | ${busB} Maintainers |
| **Onboarding Readiness** | ${onboardingA}/100 | ${onboardingB}/100 |

*Generated via [GetMerged Comparison](${compareUrl})*`;
}

/**
 * Generates human-readable summary text for social sharing.
 */
export function generateCompareShareText(repoA: Repo, repoB: Repo): string {
  const tierA = repoA.c_rank_tier || repoA.class_rank || "A";
  const tierB = repoB.c_rank_tier || repoB.class_rank || "A";
  const rateA = (repoA.external_pr_merge_rate ?? 0).toFixed(0);
  const rateB = (repoB.external_pr_merge_rate ?? 0).toFixed(0);
  return `Comparing @${repoA.full_name} (${tierA} Tier, ${rateA}% merge rate) vs @${repoB.full_name} (${tierB} Tier, ${rateB}% merge rate) on GetMerged C-Rank™:`;
}

/**
 * Generates pre-filled Twitter / X share intent URL.
 */
export function generateCompareShareUrl(repoA: Repo, repoB: Repo): string {
  const text = generateCompareShareText(repoA, repoB);
  const url = `https://getmerged.abhishekco.de/compare/${repoA.full_name}/vs/${repoB.full_name}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
