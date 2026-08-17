import { test, expect } from "@playwright/test";

test.describe("Hall of Fame Category Pre-Selection (GH-71)", () => {
  test("AC1 & AC2: Hall of Fame category chip is active on initial load and requests tier=S", async ({ page }) => {
    const reposRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/v1/repos")) {
        reposRequests.push(url);
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify a request containing tier=S was made on initial load
    await expect.poll(() => reposRequests.some((url) => url.includes("tier=S"))).toBe(true);

    // Verify Hall of Fame chip is rendered in its active state
    const hallOfFameChip = page.getByRole("button", { name: /Hall of Fame/i });
    await expect(hallOfFameChip).toBeVisible();
    await expect(hallOfFameChip).toHaveAttribute("aria-pressed", "true");
    await expect(hallOfFameChip).toHaveClass(/bg-amber-600/);

    // Verify S-Tier repository card is displayed
    const repoCards = page.locator("article, div").filter({ hasText: /S Tier|S-Tier|👑/i });
    await expect(repoCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("AC3: Switching to Welcoming chip and back restores Hall of Fame pre-selection", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hallOfFameChip = page.getByRole("button", { name: /Hall of Fame/i });
    const welcomingChip = page.getByRole("button", { name: /Welcoming/i });

    await expect(hallOfFameChip).toHaveAttribute("aria-pressed", "true");

    // Click Welcoming category chip
    const welcomingRequestPromise = page.waitForRequest((req) => req.url().includes("/api/v1/repos") && req.url().includes("tier=A"));
    await welcomingChip.click();
    await welcomingRequestPromise;

    await expect(welcomingChip).toHaveAttribute("aria-pressed", "true");
    await expect(welcomingChip).toHaveClass(/bg-emerald-700/);
    await expect(hallOfFameChip).toHaveAttribute("aria-pressed", "false");

    // Click back to Hall of Fame category chip
    const hofRequestPromise = page.waitForRequest((req) => req.url().includes("/api/v1/repos") && req.url().includes("tier=S"));
    await hallOfFameChip.click();
    await hofRequestPromise;

    await expect(hallOfFameChip).toHaveAttribute("aria-pressed", "true");
    await expect(hallOfFameChip).toHaveClass(/bg-amber-600/);
    await expect(welcomingChip).toHaveAttribute("aria-pressed", "false");
  });
});
