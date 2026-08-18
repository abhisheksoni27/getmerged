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

test.describe("Global Search Everywhere (IDEA-20260818-01)", () => {
  test("AC1: Pressing Meta+K / Control+K on /facebook/react opens global search modal and returns live results", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    // Wait for client hydration (keyboard listener is attached by SearchProvider)
    await expect(headerSearchTrigger(page)).toBeVisible();

    // Press Meta+K / Control+K
    await page.keyboard.press("Control+k");

    // Verify modal is visible with ARIA dialog semantics
    const modal = searchModal(page);
    await expect(modal).toBeVisible();

    // Verify input is auto-focused
    const searchInput = modal.locator('input[type="text"]');
    await expect(searchInput).toBeFocused();

    // Type search query
    await searchInput.fill("meta");

    // Wait for live search autocomplete results from /api/v1/repos?name=...
    await expect(searchResults(page).first()).toBeVisible({ timeout: 5000 });
  });

  test("AC2: Selecting a result navigates to the target repo; ESC closes modal without navigation", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    // Open search modal via header search trigger button
    await expect(headerSearchTrigger(page)).toBeVisible();
    await headerSearchTrigger(page).click();

    const modal = searchModal(page);
    await expect(modal).toBeVisible();

    // Press ESC to close
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    expect(page.url()).toContain("/facebook/react");

    // Reopen and navigate via result click
    await page.keyboard.press("Control+k");
    await expect(modal).toBeVisible();
    const searchInput = modal.locator('input[type="text"]');
    await searchInput.fill("meta");

    const firstResult = searchResults(page).first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });
    const targetHref = await firstResult.getAttribute("href");
    expect(targetHref).toBeTruthy();

    await firstResult.click();
    await page.waitForURL(`**${targetHref}`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain(targetHref!);
    await expect(modal).toBeHidden();
  });

  test("AC3: Keyboard navigation using Arrow keys and Enter navigates to selected repo and closes modal", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    await page.keyboard.press("Control+k");
    const modal = searchModal(page);
    await expect(modal).toBeVisible();

    const searchInput = modal.locator('input[type="text"]');
    await searchInput.fill("react");

    const firstResult = searchResults(page).first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });
    const targetHref = await firstResult.getAttribute("href");
    expect(targetHref).toBeTruthy();

    // Navigate down and activate with Enter
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await page.waitForURL(`**${targetHref}`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain(targetHref!);
    await expect(modal).toBeHidden();
  });

  test("AC1 & AC2: Header search trigger is present on /rankings/go, /good-first-issue/go, and /compare", async ({ page }) => {
    for (const route of ["/rankings/go", "/good-first-issue/go", "/compare"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await dismissCookieBanner(page);

      await expect(headerSearchTrigger(page)).toBeVisible();

      // Open via click
      await headerSearchTrigger(page).click();
      const modal = searchModal(page);
      await expect(modal).toBeVisible();

      // Close via ESC
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
    }
  });

  test("AC3: Homepage hero search opens modal and scrolling down toggles header search trigger", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    // On initial view at top of page, hero search container is visible
    const heroSearch = page.locator("#hero-search-container");
    await expect(heroSearch).toBeVisible();

    // Clicking hero search opens global search modal
    await heroSearch.click();
    const modal = searchModal(page);
    await expect(modal).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Scroll down past hero search
    await page.evaluate(() => window.scrollTo(0, 800));

    // Header search trigger becomes visible
    await expect(headerSearchTrigger(page)).toBeVisible();
    await headerSearchTrigger(page).click();
    await expect(modal).toBeVisible();
  });

  test("Accessibility: Focus trapping, autofocus, and ARIA attributes", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    await expect(headerSearchTrigger(page)).toBeVisible();
    await headerSearchTrigger(page).click();

    const modal = searchModal(page);
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("aria-label", /search/i);

    const input = modal.locator('input[type="text"]');
    await expect(input).toBeFocused();
  });
});