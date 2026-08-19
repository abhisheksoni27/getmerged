import { test, expect } from "@playwright/test";

const likelihoodMock = {
  repository: "facebook/react",
  c_rank_tier: "A",
  overall_acceptance_rate: 68.5,
  first_timer_acceptance_rate: 45.0,
  repeat_contributor_acceptance_rate: 75.0,
  response_time_p50_hours: 4.5,
  response_time_p90_hours: 24.0,
  median_time_to_merge_hours: 48.0,
  bus_factor: 5,
  staleness_flag: false,
  calculated_at: new Date().toISOString(),
};

test.describe("PR Pre-Flight Deep-Link & Query Param Pre-population (IDEA-20260819-02)", () => {
  test("AC1: Navigating to /preflight?repo=facebook/react pre-fills the Target Repository input", async ({ page }) => {
    await page.goto("/preflight?repo=facebook/react", { waitUntil: "domcontentloaded" });

    const repoInput = page.getByPlaceholder("e.g. facebook/react");
    await expect(repoInput).toBeVisible();
    await expect(repoInput).toHaveValue("facebook/react");
  });

  test("AC1: Navigating to /preflight?repo_full_name=vercel/next.js pre-fills the Target Repository input", async ({ page }) => {
    await page.goto("/preflight?repo_full_name=vercel/next.js", { waitUntil: "domcontentloaded" });

    const repoInput = page.getByPlaceholder("e.g. facebook/react");
    await expect(repoInput).toBeVisible();
    await expect(repoInput).toHaveValue("vercel/next.js");
  });

  test("AC2: PRAcceptanceWidget renders 'Run Pre-flight PR Check' link and navigates with prefilled query param", async ({ page }) => {
    await page.route("**/api/v1/pr-likelihood*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(likelihoodMock),
      });
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const preflightLink = page.getByTestId("pr-preflight-cta");
    await expect(preflightLink).toBeVisible();
    await expect(preflightLink).toHaveAttribute("href", "/preflight?repo=facebook%2Freact");
    await expect(preflightLink).toHaveAttribute("aria-label", "Run pre-flight evaluation for facebook/react");
    await expect(preflightLink).toHaveAttribute("title", "Run pre-flight evaluation for facebook/react");
    await expect(preflightLink).toContainText("Run Pre-flight PR Check");

    // Click link and verify navigation to preflight page with prefilled repo
    await preflightLink.click();
    await expect(page).toHaveURL(/\/preflight\?repo=facebook%2Freact/);

    const repoInput = page.getByPlaceholder("e.g. facebook/react");
    await expect(repoInput).toBeVisible();
    await expect(repoInput).toHaveValue("facebook/react");
  });

  test("AC3: Form submission on prefilled /preflight evaluates PR correctly", async ({ page }) => {
    await page.route("**/api/v1/preflight/evaluate", async (route) => {
      const requestData = JSON.parse(route.request().postData() || "{}");
      expect(requestData.repo_full_name).toBe("facebook/react");
      expect(requestData.pr_title).toBe("feat: add hook support");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          overall_score: 95,
          ready_to_merge: true,
          summary: "Excellent PR structure with conventional commit and tests",
          checks: [
            {
              key: "conventional_commit",
              title: "Conventional Commit Title",
              passed: true,
              description: "Title matches standard conventional commit prefixes",
              severity: "info",
              suggestion: "Maintain standard conventional commit format",
            },
          ],
        }),
      });
    });

    await page.goto("/preflight?repo=facebook/react", { waitUntil: "domcontentloaded" });

    const repoInput = page.getByPlaceholder("e.g. facebook/react");
    await expect(repoInput).toHaveValue("facebook/react");

    // Fill title
    const titleInput = page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser");
    await titleInput.fill("feat: add hook support");

    // Submit form
    const submitButton = page.getByRole("button", { name: /Run Pre-Flight Check/i });
    await submitButton.click();

    // Verify results
    const readyBadge = page.getByText("PRE-FLIGHT READY");
    await expect(readyBadge).toBeVisible();
    await expect(page.getByText("95")).toBeVisible();
  });
});
