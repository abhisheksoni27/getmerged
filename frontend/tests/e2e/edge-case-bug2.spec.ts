import { test, expect, Page } from "@playwright/test";

async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole("button", { name: "Accept" });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

const headerSearchTrigger = (page: Page) =>
  page.locator('header button[aria-label*="Search" i], header button:has-text("Search")').first();

const searchModal = (page: Page) => page.locator('div[role="dialog"][aria-modal="true"]');
const searchResults = (page: Page) => page.locator('[data-testid="global-search-results"] a[href*="/"]');

test.describe("Bug 2 Edge Cases: Global Search Keyboard Nav", () => {
  test("1280px desktop viewport keyboard nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(headerSearchTrigger(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    const modal = searchModal(page);
    await expect(modal).toBeVisible();
    const searchInput = modal.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    await searchInput.fill("react");
    const firstResult = searchResults(page).first();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/facebook/react", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("facebook/react");
    await expect(modal).toBeHidden();
  });

  test("375px mobile viewport keyboard nav", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(headerSearchTrigger(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    const modal = searchModal(page);
    await expect(modal).toBeVisible();
    const searchInput = modal.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    await searchInput.fill("react");
    const firstResult = searchResults(page).first();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/facebook/react", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("facebook/react");
    await expect(modal).toBeHidden();
  });

  test("Empty search query does not navigate on Enter", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(headerSearchTrigger(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    const modal = searchModal(page);
    await expect(modal).toBeVisible();
    const searchInput = modal.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(modal).toBeVisible();
    expect(page.url()).toContain("/facebook/react");
  });

  test("Malformed query does not crash", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);
    await expect(headerSearchTrigger(page)).toBeVisible();
    await page.keyboard.press("Control+k");
    const modal = searchModal(page);
    await expect(modal).toBeVisible();
    const searchInput = modal.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();
    await searchInput.fill("<script>alert(1)</script>");
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();
  });
});
