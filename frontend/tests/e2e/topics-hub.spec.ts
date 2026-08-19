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
});
