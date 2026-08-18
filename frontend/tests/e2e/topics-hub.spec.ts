import { test, expect } from "@playwright/test";

test.describe("Topic Hub and Discovery (IDEA-20260818-03)", () => {
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
