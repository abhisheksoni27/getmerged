import { test, expect } from "@playwright/test";
import { buildPrompt } from "../../src/lib/prompt";

test.describe("buildPrompt serializer unit tests", () => {
  test("returns badge prompt with default badge URL when no badgeMarkdownUrl given", () => {
    const result = buildPrompt("facebook/react");
    expect(result).toContain("Add the GetMerged C-Rank™ maintainer badge to the top of our repository README.md");
    expect(result).toContain("[![GetMerged C-Rank](https://getmerged.abhishekco.de/badge/facebook/react.svg)](https://getmerged.abhishekco.de/facebook/react)");
    expect(result).toContain("https://getmerged.abhishekco.de/facebook/react");
  });

  test("uses custom badgeMarkdownUrl when provided", () => {
    const result = buildPrompt("facebook/react", "https://cdn.example.com/badges/react.svg");
    expect(result).toContain("[![GetMerged C-Rank](https://cdn.example.com/badges/react.svg)](https://getmerged.abhishekco.de/facebook/react)");
  });

  test("output is valid markdown with a fenced code block", () => {
    const result = buildPrompt("wvlet/wvlet");
    expect(result).toContain("```markdown\n");
    expect(result).toContain("\n```");
  });

  test("does not leak undefined or object placeholders", () => {
    const result = buildPrompt("facebook/react", undefined);
    expect(result).not.toContain("[object Object]");
    expect(result).not.toContain("undefined");
  });
});