import { test, expect } from "@playwright/test";

const NINE_MONTHS_MS = 9 * 30.4375 * 24 * 60 * 60 * 1000;

test.describe("GH-76: Good First Issue freshness (last 9 months only)", () => {
  test("every rendered GFI card on /good-first-issue/go shows a created date within the last 9 months", async ({ page }) => {
    await page.goto("/good-first-issue/go", { waitUntil: "domcontentloaded" });

    const cards = page.locator("[data-created-at]");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const iso = await card.getAttribute("data-created-at");
      expect(iso).toBeTruthy();
      const ts = new Date(iso as string).getTime();
      expect(Number.isNaN(ts)).toBe(false);
      expect(now - ts).toBeLessThanOrEqual(NINE_MONTHS_MS);
      expect(ts).toBeLessThanOrEqual(now + 60_000);

      await expect(card.locator("[data-freshness]")).toBeVisible();
    }
  });
});