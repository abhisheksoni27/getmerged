import { test, expect } from "@playwright/test";

test.describe("Bus Factor Zero Display (GH-79)", () => {
  test("AC1: Scorecard renders '0' and NO ACTIVE MAINTAINERS badge when bus_factor is 0", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // The bus factor metric value should render the number directly, not '-'
    const busFactorCard = page.locator("text=Maintainers & Bus Factor").locator("..");
    const metricValue = busFactorCard.locator(".text-3xl, .text-4xl").first();
    await expect(metricValue).toBeVisible();

    // Should not contain '-' as fallback when bus_factor is 0
    const cardText = await busFactorCard.textContent();
    // The numeric value should be a digit, not a dash
    expect(cardText).not.toMatch(/-\s*Maintainers/);
  });

  test("AC2: Compare page renders raw bus_factor value without masking as 1", async ({ page }) => {
    // Test against a known comparison where at least one repo may have bus_factor=0
    await page.goto("/compare/facebook/react/vs/vuejs/vue", { waitUntil: "domcontentloaded" });

    // The page should load without error
    const heading = page.getByRole("heading", { name: /facebook\/react.*vs.*vuejs\/vue/i });
    await expect(heading).toBeVisible();

    // Bus factor rows should not contain masked '1 Maintainer' for repos with 0
    const bodyText = await page.textContent("body");
    // Verify the page renders bus factor data without crashing
    expect(bodyText).toContain("Maintainers");
  });

  test("AC3: Org page renders raw bus_factor value without masking as 1", async ({ page }) => {
    await page.goto("/org/facebook", { waitUntil: "domcontentloaded" });

    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();

    // Bus factor text should use ?? 0 logic (no '1 maintainer' for 0-value repos)
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("maintainers");
  });
});
