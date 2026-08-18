import { test, expect } from "@playwright/test";

test.describe("Compare Hub and Head-to-Head Picker (IDEA-20260818-02)", () => {
  test("Bare /compare route loads HTTP 200 and renders comparison picker hub", async ({ page }) => {
    const res = await page.goto("/compare", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    // Metadata title
    await expect(page).toHaveTitle(/Compare.*GetMerged/i);

    // Hero heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Dual repo search selectors
    const inputs = page.locator('input[placeholder*="Search" i], input[data-testid^="repo-picker-"]');
    await expect(inputs.first()).toBeVisible();

    // Action button
    const compareBtn = page.locator('button:has-text("Compare")');
    await expect(compareBtn.first()).toBeVisible();
  });

  test("Direct navigation to /compare?a=facebook/react pre-fills slot A", async ({ page }) => {
    await page.goto("/compare?a=facebook/react", { waitUntil: "domcontentloaded" });

    // Assert that repo A is selected / prefilled
    await expect(page.getByText("facebook/react")).toBeVisible();
  });

  test("RepoCard has Compare CTA navigating to /compare with prefilled param without illegal nested anchors", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Ensure valid DOM (no nested anchors)
    const nestedAnchors = await page.locator("a a").count();
    expect(nestedAnchors).toBe(0);

    // Find compare button on repo card
    const compareCta = page.locator('[data-testid="compare-cta"], button:has-text("Compare"), span[role="button"]:has-text("Compare")').first();
    await expect(compareCta).toBeVisible();

    // Click compare CTA
    await compareCta.click();
    await page.waitForURL(/\/compare\?a=/);
    expect(page.url()).toContain("/compare?a=");
  });

  test("Repo detail page exposes Compare action button", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const compareBtn = page.getByRole("link", { name: "Compare", exact: true });
    await expect(compareBtn).toBeVisible();
    await expect(compareBtn).toHaveAttribute("href", /\/compare\?a=facebook%2Freact|\/compare\?a=facebook\/react/);
  });

  test("Footer includes link to /compare under Curated & Platform", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const footerCompareLink = page.locator('footer a[href="/compare"]');
    await expect(footerCompareLink).toBeVisible();
    await expect(footerCompareLink).toHaveText(/Compare Repositories|Compare/i);
  });
});
