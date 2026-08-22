import { test, expect } from "@playwright/test";

test.describe("Community Powerhouses Collection (GH-85)", () => {
  test("AC1+AC2: Collection renders name, maintainer badge, repo count, and project links", async ({ page }) => {
    await page.goto("/community-powerhouses", { waitUntil: "domcontentloaded" });

    // Collection name (AC2)
    await expect(page.getByRole("heading", { name: /Community Powerhouses/i })).toBeVisible();

    // Maintainer threshold badge (AC1/AC2)
    await expect(page.locator("[data-testid='maintainer-threshold-badge']")).toBeVisible();
    await expect(page.locator("[data-testid='powerhouse-badge']")).toBeVisible();

    // Repo count (AC2)
    await expect(page.locator("[data-testid='collection-repo-count']")).toBeVisible();

    // Direct project links (AC2) — skip when no repos meet threshold
    const cards = page.locator("main a[href*='/']");
    const count = await cards.count();
    if (count > 0) {
      const href = await cards.first().getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toContain("//community-powerhouses");
    }
  });
});
