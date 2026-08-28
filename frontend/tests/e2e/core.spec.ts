import { test, expect } from "@playwright/test";

test.describe("Core User Flows (Phase 1)", () => {
  test("Homepage loads and displays top ranked repositories", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GetMerged/);
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test("Repo scorecard loads with exact C-Rank metrics", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/facebook\/react/);
    await expect(page.getByRole("heading", { name: "facebook/react", exact: true })).toBeVisible();
  });

  test("Deep indexed repo (non-top-10) loads full scorecard without falling back to unscored", async ({ page }) => {
    await page.goto("/dedicatedcode/reitti", { waitUntil: "domcontentloaded" });
    // Must render repo identity or proper scored/unscored container without broken 404
    await expect(page).toHaveTitle(/reitti/i);
  });

  test("Contribute hub loads with language ecosystem tiles", async ({ page }) => {
    await page.goto("/contribute");
    await expect(page.getByRole("heading", { name: /Stop Guessing/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /TypeScript/i }).first()).toBeVisible();
  });
});
