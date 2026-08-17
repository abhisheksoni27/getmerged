import { test, expect } from "@playwright/test";

test.describe("Badge and Prompt Integration (GH-70)", () => {
  test("AC1 & AC4: Exactly one Copy Markdown button is rendered on /facebook/react with accessible title", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    
    // Exactly one Copy Markdown button should exist on the page
    const copyButtons = page.getByRole("button", { name: /Copy Markdown/i });
    await expect(copyButtons).toHaveCount(1);
    await expect(copyButtons.first()).toBeVisible();
    await expect(copyButtons.first()).toHaveAttribute("title", "Copy markdown badge embed code for GitHub README");
  });

  test("AC1 & AC4: Copy Markdown button handles click, copies to clipboard, and shows transient feedback", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    const copyButton = page.getByRole("button", { name: /Copy Markdown/i }).first();
    await copyButton.click();

    // Tolerant to transient label transition
    await expect(page.getByRole("button", { name: /Copied Markdown!/i })).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("badge/facebook/react.svg");
    expect(clipboardText).toContain("getmerged.abhishekco.de/facebook/react");
  });

  test("AC3: Copy AI Prompt button has accessible title and is visible in RepoBadgeGenerator", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const copyPromptBtn = page.getByRole("button", { name: /Copy AI Prompt/i });
    await expect(copyPromptBtn).toBeVisible();
    await expect(copyPromptBtn).toHaveAttribute("title", "Copy AI prompt to add GetMerged badge to your repo README via Cursor, Copilot, or Claude");
  });

  test("AC2: Copy AI Prompt button copies repo details and badge markdown", async ({ page, context }) => {
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
    expect(clipboardText).toContain("badge/facebook/react.svg");
  });
});
