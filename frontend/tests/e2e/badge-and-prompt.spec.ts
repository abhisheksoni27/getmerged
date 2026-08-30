import { test, expect } from "@playwright/test";

test.describe("Badge and Prompt Integration (GH-70)", () => {
  test("AC1: Badge generator renders live badge preview and Copy button on repo page", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    
    const copyButton = page.getByRole("button", { name: /Copy Markdown/i });
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveAttribute("title", /Copy markdown badge embed code/i);

    // Verify the live SVG badge image is rendered with correct API URL
    const badgeImg = page.locator('img[alt="GetMerged C-Rank badge for facebook/react"]');
    await expect(badgeImg).toBeVisible();
    await expect(badgeImg).toHaveAttribute("src", "https://getmerged.abhishekco.de/api/badge/facebook/react");
  });

  test("AC2: Copy Markdown button handles click and copies valid badge markdown", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    const copyButton = page.getByRole("button", { name: /Copy Markdown/i });
    await copyButton.click();

    // Verify transient feedback
    await expect(page.getByText(/Copied!/i)).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("/api/badge/facebook/react");
    expect(clipboardText).toContain("getmerged.abhishekco.de/facebook/react");
  });

  test("AC3: Copy AI Prompt button has accessible title and is visible in RepoBadgeGenerator", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const copyPromptBtn = page.getByRole("button", { name: /Copy AI Prompt/i });
    await expect(copyPromptBtn).toBeVisible();
    await expect(copyPromptBtn).toHaveAttribute("title", /Copy AI prompt to add GetMerged badge to your repo README/i);
  });

  test("AC4: Copy AI Prompt button copies repo details and badge markdown", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const copyPromptBtn = page.getByRole("button", { name: /Copy AI Prompt/i });
    await expect(copyPromptBtn).toBeVisible();
    await copyPromptBtn.click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("facebook/react");
    expect(clipboardText).toContain("https://getmerged.abhishekco.de/facebook/react");
    expect(clipboardText).toContain("/api/badge/facebook/react");
  });
});

