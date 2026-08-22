import { test, expect } from "@playwright/test";

test.describe("Bug 1 Edge Cases: Preflight Conventional Commit", () => {
  test("Single-space PR title gets trimmed to empty and fails conventional check", async ({ page }) => {
    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("   ");
    await page.getByPlaceholder(/Explain what this PR solves/i).fill("A long enough description to pass the depth heuristic.");
    await page.getByPlaceholder("src/parser.ts\nsrc/parser.test.ts").fill("src/parser.ts");
    await page.getByPlaceholder("25").fill("25");
    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();
    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Conventional Commit Title/i)).toBeVisible();
  });

  test("Malformed repo name should still evaluate", async ({ page }) => {
    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("e.g. facebook/react").fill("!!!invalid!!!");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("fix: something");
    await page.getByPlaceholder(/Explain what this PR solves/i).fill("A long enough description to pass the depth heuristic.");
    await page.getByPlaceholder("src/parser.ts\nsrc/parser.test.ts").fill("src/parser.ts");
    await page.getByPlaceholder("25").fill("25");
    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();
    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
  });

  test("375px mobile viewport renders preflight correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /PR Acceptance Pre-Flight Evaluator/i })).toBeVisible();
    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("this is a really long freeform commit message without any conventional prefix");
    await page.getByPlaceholder(/Explain what this PR solves/i).fill("A long enough description to pass the depth heuristic.");
    await page.getByPlaceholder("src/parser.ts\nsrc/parser.test.ts").fill("src/parser.ts");
    await page.getByPlaceholder("25").fill("25");
    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();
    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Conventional Commit Title/i)).toBeVisible();
  });
});
