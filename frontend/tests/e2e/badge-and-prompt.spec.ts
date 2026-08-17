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

  test("AC3 & AC4: Copy Prompt button has accessible title and disabled/loading state when unauthenticated/no insights", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // Open guideline drawer
    const drawerToggle = page.getByRole("button", { name: /Interactive Onboarding & Contribution Guidelines/i });
    await drawerToggle.click();

    const copyPromptBtn = page.getByRole("button", { name: /Copy Prompt/i });
    await expect(copyPromptBtn).toBeVisible();
    await expect(copyPromptBtn).toBeDisabled();
    await expect(copyPromptBtn).toHaveAttribute("title", "Copy paste-ready contribution prompt for LLMs");
  });

  test("AC2: Copy Prompt button copies repo details and PR guidelines when insights loaded", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000",
    });

    // Mock insights API
    await page.route("**/api/v1/repos/*/insights", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          insights: {
            repo_id: "1",
            maintainer_vibe: "welcoming",
            pr_guidelines: [
              "Always run test suite before submitting PR",
              "Keep PR descriptions concise and link issue tickets",
            ],
          },
        }),
      });
    });

    // Set cookie to simulate authenticated session
    await context.addCookies([
      {
        name: "opendoor_token",
        value: "mock_jwt_token",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // Open guideline drawer
    const drawerToggle = page.getByRole("button", { name: /Interactive Onboarding & Contribution Guidelines/i });
    await drawerToggle.click();

    const copyPromptBtn = page.getByRole("button", { name: /Copy Prompt/i });
    await expect(copyPromptBtn).toBeVisible();
    await expect(copyPromptBtn).toBeEnabled();

    await copyPromptBtn.click();

    // Verify feedback label
    await expect(page.getByRole("button", { name: /Copied Prompt!/i })).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("facebook/react");
    expect(clipboardText).toContain("https://getmerged.abhishekco.de/facebook/react");
    expect(clipboardText).toContain("Always run test suite before submitting PR");
    expect(clipboardText).toContain("Keep PR descriptions concise and link issue tickets");
  });
});
