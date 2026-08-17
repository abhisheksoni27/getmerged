# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: unit/prompt.spec.ts >> buildPrompt serializer unit tests >> returns prompt with guidelines when insights have pr_guidelines
- Location: tests/unit/prompt.spec.ts:6:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "You are contributing to facebook/react (https://getmerged.abhishekco.de/facebook/react)."
Received string:    "Add the GetMerged C-Rank™ maintainer badge to the top of our repository README.md (right below the main title/hero section):·
```markdown
[![GetMerged C-Rank]([object Object])](https://getmerged.abhishekco.de/facebook/react)
```·
Why:
- Shows contributors that our repo actively reviews and merges external pull requests.
- Displays our live C-Rank scorecard and response time metrics directly from https://getmerged.abhishekco.de/facebook/react."
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { buildPrompt } from "../../src/lib/prompt";
  3  | import { AIInsights } from "../../src/types/opendoor";
  4  | 
  5  | test.describe("buildPrompt serializer unit tests", () => {
  6  |   test("returns prompt with guidelines when insights have pr_guidelines", () => {
  7  |     const insights: Partial<AIInsights> = {
  8  |       pr_guidelines: [
  9  |         "Ensure all tests pass",
  10 |         "Sign the CLA before submitting PR",
  11 |       ],
  12 |     };
  13 | 
  14 |     const result = buildPrompt("facebook/react", insights as AIInsights);
> 15 |     expect(result).toContain("You are contributing to facebook/react (https://getmerged.abhishekco.de/facebook/react).");
     |                    ^ Error: expect(received).toContain(expected) // indexOf
  16 |     expect(result).toContain("Contribution guidelines:");
  17 |     expect(result).toContain("- Ensure all tests pass");
  18 |     expect(result).toContain("- Sign the CLA before submitting PR");
  19 |   });
  20 | 
  21 |   test("omits guideline section when pr_guidelines is empty array", () => {
  22 |     const insights: Partial<AIInsights> = {
  23 |       pr_guidelines: [],
  24 |     };
  25 | 
  26 |     const result = buildPrompt("facebook/react", insights as AIInsights);
  27 |     expect(result).toBe("You are contributing to facebook/react (https://getmerged.abhishekco.de/facebook/react).");
  28 |     expect(result).not.toContain("Contribution guidelines:");
  29 |   });
  30 | 
  31 |   test("omits guideline section when insights is null", () => {
  32 |     const result = buildPrompt("facebook/react", null);
  33 |     expect(result).toBe("You are contributing to facebook/react (https://getmerged.abhishekco.de/facebook/react).");
  34 |     expect(result).not.toContain("Contribution guidelines:");
  35 |   });
  36 | 
  37 |   test("omits guideline section when insights is undefined", () => {
  38 |     const result = buildPrompt("facebook/react", undefined);
  39 |     expect(result).toBe("You are contributing to facebook/react (https://getmerged.abhishekco.de/facebook/react).");
  40 |   });
  41 | });
  42 | 
```