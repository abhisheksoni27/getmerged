import { test, expect } from "@playwright/test";
import {
  generateCompareMarkdown,
  generateCompareShareText,
  generateCompareShareUrl,
} from "../../src/lib/compare-export";
import { Repo } from "../../src/types/opendoor";

const mockRepoA: Repo = {
  id: 1,
  full_name: "facebook/react",
  language: "JavaScript",
  stars: 220000,
  description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
  c_rank_tier: "S",
  c_rank_score: 95.4,
  external_pr_merge_rate: 68.5,
  response_p50_hours: 4.2,
  bus_factor: 12,
  onboarding_score: 90,
};

const mockRepoB: Repo = {
  id: 2,
  full_name: "vercel/next.js",
  language: "JavaScript",
  stars: 120000,
  description: "The React Framework for the Web",
  c_rank_tier: "A",
  c_rank_score: 84.1,
  external_pr_merge_rate: 52.3,
  response_p50_hours: 12.0,
  bus_factor: 8,
  onboarding_score: 85,
};

test.describe("generateCompareMarkdown serializer unit tests (IDEA-20260819-03)", () => {
  test("generates standard GFM comparison table with all metrics and canonical link", () => {
    const md = generateCompareMarkdown(mockRepoA, mockRepoB);

    // Markdown Table header
    expect(md).toContain("| Metric | [facebook/react](https://getmerged.abhishekco.de/facebook/react) | [vercel/next.js](https://getmerged.abhishekco.de/vercel/next.js) |");
    expect(md).toContain("| :--- | :--- | :--- |");

    // Metrics rows
    expect(md).toContain("| **C-Rank™ Tier** | S (95%) | A (84%) |");
    expect(md).toContain("| **External PR Merge Rate** | 68.5% | 52.3% |");
    expect(md).toContain("| **Review Latency (p50)** | 4.2h | 12.0h |");
    expect(md).toContain("| **90-Day Bus Factor** | 12 Maintainers | 8 Maintainers |");
    expect(md).toContain("| **Onboarding Readiness** | 90/100 | 85/100 |");

    // Canonical link back to comparison route
    expect(md).toContain("https://getmerged.abhishekco.de/compare/facebook/react/vs/vercel/next.js");
  });

  test("handles missing or fallback metric fields gracefully without leaking undefined or NaN", () => {
    const minimalRepoA: Repo = {
      id: 10,
      full_name: "org/repo-a",
      language: "Go",
      stars: 100,
      description: "Test repo",
    };

    const minimalRepoB: Repo = {
      id: 11,
      full_name: "org/repo-b",
      language: "Rust",
      stars: 200,
      description: "Test repo 2",
    };

    const md = generateCompareMarkdown(minimalRepoA, minimalRepoB);
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("NaN");
    expect(md).not.toContain("[object Object]");
    expect(md).toContain("| **C-Rank™ Tier** | A (0%) | A (0%) |");
    expect(md).toContain("| **External PR Merge Rate** | 0.0% | 0.0% |");
  });
});

test.describe("generateCompareShareText and generateCompareShareUrl unit tests (IDEA-20260819-03)", () => {
  test("generates human-readable share text for social media", () => {
    const text = generateCompareShareText(mockRepoA, mockRepoB);
    expect(text).toContain("facebook/react");
    expect(text).toContain("vercel/next.js");
    expect(text).toContain("S Tier");
    expect(text).toContain("69% merge rate");
  });

  test("generates valid twitter/x intent URL with encoded query parameters", () => {
    const shareUrl = generateCompareShareUrl(mockRepoA, mockRepoB);
    expect(shareUrl).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
    expect(shareUrl).toContain("url=https%3A%2F%2Fgetmerged.abhishekco.de%2Fcompare%2Ffacebook%2Freact%2Fvs%2Fvercel%2Fnext.js");
    expect(shareUrl).toContain("text=");
  });
});
