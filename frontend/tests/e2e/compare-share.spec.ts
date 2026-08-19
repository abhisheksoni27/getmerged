import { test, expect } from "@playwright/test";

test.describe("Compare Share & Export Actions (IDEA-20260819-03)", () => {
  test("AC1 & AC4: CompareShareBar container is rendered on /compare/facebook/react/vs/vercel/next.js with proper accessibility", async ({ page }) => {
    const res = await page.goto("/compare/facebook/react/vs/vercel/next.js", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    const shareBar = page.getByRole("region", { name: /Repository comparison sharing and export tools/i });
    await expect(shareBar).toBeVisible();

    const copyMarkdownBtn = page.getByRole("button", { name: /Copy Markdown/i });
    await expect(copyMarkdownBtn).toBeVisible();
    await expect(copyMarkdownBtn).toHaveAttribute("title", /Copy.*Markdown/i);

    const shareBtn = page.locator('button:has-text("Share"), a:has-text("Share")');
    await expect(shareBtn.first()).toBeVisible();
  });

  test("AC1 & AC3: 'Copy Markdown Summary' writes GFM table to clipboard and displays 2000ms visual confirmation", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    await page.goto("/compare/facebook/react/vs/vercel/next.js", { waitUntil: "domcontentloaded" });

    const copyBtn = page.getByRole("button", { name: /Copy Markdown/i }).first();
    await expect(copyBtn).toBeVisible();

    await copyBtn.click();

    // Visual confirmation state
    await expect(page.getByText(/Copied Markdown!|Copied!/i)).toBeVisible();

    // Verify clipboard content contains GFM table structure
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("facebook/react");
    expect(clipboardText).toContain("vercel/next.js");
    expect(clipboardText).toContain("| Metric |");
    expect(clipboardText).toContain("C-Rank™ Tier");
    expect(clipboardText).toContain("https://getmerged.abhishekco.de/compare/facebook/react/vs/vercel/next.js");
  });

  test("AC2: Share button exposes pre-filled comparison share action", async ({ page }) => {
    await page.goto("/compare/facebook/react/vs/vercel/next.js", { waitUntil: "domcontentloaded" });

    const shareBtn = page.locator('[data-testid="compare-share-button"], button:has-text("Share"), a:has-text("Share")').first();
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute("aria-label", /Share comparison/i);
  });

  test("AC4: Narrow mobile viewport (375px) renders share bar without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/compare/facebook/react/vs/vercel/next.js", { waitUntil: "domcontentloaded" });

    const shareBar = page.getByRole("region", { name: /Repository comparison sharing and export tools/i });
    await expect(shareBar).toBeVisible();

    // Assert zero horizontal scrolling on body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
