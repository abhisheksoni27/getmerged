import { test, expect } from "@playwright/test";
import { Repo } from "../../src/types/opendoor";
import { buildRepoMetadata, buildRepoFaqList, isRepoScored } from "../../src/lib/repo-metadata";

const mockUnscoredRepo: Repo = {
  id: "unscored-1",
  full_name: "facebook/react",
  owner: "facebook",
  name: "react",
  language: "JavaScript",
  stars: 220000,
  description: "The library for web and native user interfaces.",
  c_rank_tier: "D",
  c_rank_score: 0,
  external_pr_merge_rate: 0,
  time_to_first_response_hours: 0,
  first_timer_success_rate: 0,
  good_first_issue_count: 0,
  is_scored: false,
};

const mockScoredRepo: Repo = {
  id: "scored-1",
  full_name: "vercel/next.js",
  owner: "vercel",
  name: "next.js",
  language: "JavaScript",
  stars: 120000,
  description: "The React Framework for the Web",
  c_rank_tier: "A",
  c_rank_score: 84.5,
  external_pr_merge_rate: 68.2,
  time_to_first_response_hours: 3.5,
  first_timer_success_rate: 55.0,
  good_first_issue_count: 5,
  is_scored: true,
};

test.describe("Repo Metadata & FAQ Unit Tests (IDEA-20260820-02)", () => {
  test("isRepoScored identifies scored vs unscored repos accurately", () => {
    expect(isRepoScored(mockUnscoredRepo)).toBe(false);
    expect(isRepoScored(mockScoredRepo)).toBe(true);
    expect(isRepoScored(null)).toBe(false);
    expect(isRepoScored({ ...mockUnscoredRepo, is_scored: undefined, c_rank_score: 0 })).toBe(false);
    expect(isRepoScored({ ...mockScoredRepo, is_scored: undefined, c_rank_score: 85.0 })).toBe(true);
  });

  test("buildRepoMetadata produces honest 'Unscored' title and description for unscored repo (zero score fabrication)", () => {
    const meta = buildRepoMetadata("facebook/react", mockUnscoredRepo);

    expect(meta.title).toBe("facebook/react Contributor Telemetry & C-Rank™: Unscored | GetMerged");
    expect(meta.title).not.toContain("75.0");
    expect(meta.title).not.toContain("A Tier");
    expect(meta.description).toContain("currently has no public PR telemetry recorded on GitHub");
    expect(meta.description).not.toContain("scored 75.0/100");
  });

  test("buildRepoMetadata produces rich telemetry description with all core metrics (regression guard)", () => {
    const meta = buildRepoMetadata("vercel/next.js", mockScoredRepo);

    expect(meta.title).toBe("vercel/next.js (A-Tier 84.5) | GetMerged");
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.description).toContain("Will vercel/next.js merge your PR?");
    expect(meta.description).toContain("84.5/100 C-Rank (A-Tier)");
    expect(meta.description).toContain("68% merge rate");
  });

  test("buildRepoFaqList creates honest contextual answers for unscored repo without asserting fabricated score/tier", () => {
    const faqs = buildRepoFaqList("facebook/react", mockUnscoredRepo);

    const scoreFaq = faqs.find((f) => f.q.includes("Unscored") || f.q.includes("C-Rank"));
    expect(scoreFaq).toBeDefined();
    expect(scoreFaq?.q).toBe("What does the Unscored status represent?");
    expect(scoreFaq?.a).toContain("currently has no indexed public pull request reviews or maintainer telemetry on GitHub");
    expect(scoreFaq?.a).not.toContain("places facebook/react in the A tier");
    expect(scoreFaq?.a).not.toContain("75.0");

    const welcomingFaq = faqs.find((f) => f.q.includes("welcoming"));
    expect(welcomingFaq).toBeDefined();
    expect(welcomingFaq?.a).toContain("No public review velocity has been recorded on GitHub for this project");
  });

  test("buildRepoFaqList keeps standard telemetry calculations for scored repo", () => {
    const faqs = buildRepoFaqList("vercel/next.js", mockScoredRepo);

    const scoreFaq = faqs.find((f) => f.q.includes("84.5"));
    expect(scoreFaq).toBeDefined();
    expect(scoreFaq?.a).toContain("A score of 84.5 places vercel/next.js in the A tier");

    const firstTimerFaq = faqs.find((f) => f.q.includes("first-time"));
    expect(firstTimerFaq?.a).toContain("55.0%");
  });
});
