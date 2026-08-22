import { test, expect } from "@playwright/test";

test.describe("Topic Hub and Discovery (IDEA-20260818-03)", () => {
  test("Topics index /topics loads HTTP 200 with directory grid and metadata", async ({ page }) => {
    const res = await page.goto("/topics", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    // Title and heading check
    await expect(page).toHaveTitle(/Topic/i);
    await expect(page.getByRole("heading", { name: /Explore Repositories by Topic/i })).toBeVisible();

    // Verify presence of topic link cards
    const topicLinks = page.locator('main a[href^="/topics/"]');
    const count = await topicLinks.count();
    expect(count).toBeGreaterThan(0);

    // Verify back to explorer link
    await expect(page.getByText("Back to Explorer")).toBeVisible();
  });

  test("Topic landing page /topics/rust loads HTTP 200 with repository cards and metadata", async ({ page }) => {
    const res = await page.goto("/topics/rust", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    // Title and heading check
    await expect(page).toHaveTitle(/Rust/i);
    await expect(page.getByRole("heading", { name: /#rust/i })).toBeVisible();

    // Verify repository cards are rendered
    const repoCards = page.locator("main .space-y-4 > div");
    const count = await repoCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify stats cards
    await expect(page.getByText("Topic Avg Merge Rate")).toBeVisible();
    await expect(page.getByText("Avg Review Latency")).toBeVisible();

    // Verify breadcrumb JSON-LD points position 2 to /topics (DEFECT-1 fix)
    const breadcrumbScript = page.locator('script[type="application/ld+json"]').first();
    const jsonContent = await breadcrumbScript.textContent();
    expect(jsonContent).toContain("https://getmerged.abhishekco.de/topics");
  });

  test("Footer contains Topics Directory link pointing to /topics", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footerLink = page.locator('footer a[href="/topics"]');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveText("Topics Directory");
  });

  test("Repo cards render topic chips without illegal nested anchor elements", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Assert there are no nested anchors anywhere on the page (valid HTML5)
    const nestedAnchors = await page.locator("a a").count();
    expect(nestedAnchors).toBe(0);

    // Verify topic chips exist inside RepoCards
    const topicChips = page.locator('[data-testid="topic-chip"], [aria-label^="Filter by topic"]');
    if ((await topicChips.count()) > 0) {
      const firstChip = topicChips.first();
      await expect(firstChip).toBeVisible();
      // Ensure the chip is a span or button, not an <a> tag
      const tagName = await firstChip.evaluate((el) => el.tagName.toLowerCase());
      expect(["span", "button"]).toContain(tagName);
    }
  });

  test("Topics index /topics SSR payload is bounded and supports on-demand remainder expansion", async ({ page, request }) => {
    // Check raw SSR payload size
    const rawRes = await request.get("/topics");
    expect(rawRes.status()).toBe(200);
    const body = await rawRes.body();
    // SSR payload must be bounded under 512KB (previously 11.7MB)
    expect(body.byteLength).toBeLessThan(512 * 1024);

    // Navigate to /topics
    await page.goto("/topics", { waitUntil: "domcontentloaded" });
    // Trending strip and grid are separate; bound applies to the grid itself
    const initialTopicCards = page.locator('#topics-grid a[href^="/topics/"]');
    const initialCount = await initialTopicCards.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThanOrEqual(100);

    // Verify 'Show more topics' button exists and expands on click (lazy, on-demand)
    const showMoreButton = page.getByRole("button", { name: /Show more topics/i });
    if (await showMoreButton.isVisible()) {
      await showMoreButton.click();
      await expect
        .poll(
          async () => {
            const updatedCount = await initialTopicCards.count();
            return updatedCount;
          },
          { timeout: 15000 }
        )
        .toBeGreaterThan(initialCount);
    }
  });

  test("Topics index renders Trending strip, card repo counts, and search-as-you-type filter (IDEA-20260820-01)", async ({ page }) => {
    await page.goto("/topics", { waitUntil: "domcontentloaded" });

    // 1. Trending topics strip
    const trendingStrip = page.getByRole("region", { name: /Trending Topics/i }).or(page.getByText(/Trending Topics/i));
    await expect(trendingStrip.first()).toBeVisible();

    // 2. Cards show repo counts
    const firstCard = page.locator('main a[href^="/topics/"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toContainText(/repo/i);

    // 3. Search-as-you-type
    const searchInput = page.getByPlaceholder(/Search topics/i).or(page.getByLabel(/Search topics/i));
    await expect(searchInput).toBeVisible();
    await searchInput.fill("rust");

    // After typing 'rust', #rust card should be visible
    const rustCard = page.locator('main a[href="/topics/rust"]');
    await expect(rustCard).toBeVisible();
    await expect(rustCard).toContainText(/repo/i);
  });

  test("Show more topics dynamically updates ?page=2 query param (GH-84)", async ({ page }) => {
    await page.goto("/topics", { waitUntil: "domcontentloaded" });
    const showMoreButton = page.getByRole("button", { name: /Show more topics/i });
    if (await showMoreButton.isVisible()) {
      await showMoreButton.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test("Topic detail page /topics/rust renders language filter and cross-link to rankings (IDEA-20260820-01)", async ({ page }) => {
    await page.goto("/topics/rust", { waitUntil: "domcontentloaded" });

    // Language filter container
    const langFilterBar = page.getByRole("region", { name: /Language filter/i }).or(page.getByText(/Filter by language/i).or(page.locator('[data-testid="language-filter"]')));
    await expect(langFilterBar.first()).toBeVisible();

    // Cross-link to rankings exists for language(s) present on page
    const rankingsLink = page.locator('main a[href^="/rankings/"]');
    const linkCount = await rankingsLink.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

