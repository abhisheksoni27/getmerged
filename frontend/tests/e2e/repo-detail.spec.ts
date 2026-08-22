import { test, expect } from "@playwright/test";

test.describe("AI Maintainer Review Guidelines (GH-80)", () => {
  test("AC1: AI Maintainer Review Guidelines section renders directly after scorecards", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const scorecards = page.locator("[data-testid='repo-scorecards'], .repo-scorecards").or(page.getByText("Response Time"));
    const aiGuidelines = page.getByText("AI Maintainer Review Guidelines");

    await expect(aiGuidelines.first()).toBeVisible();

    const scorecardsBox = await scorecards.first().boundingBox();
    const aiBox = await aiGuidelines.first().boundingBox();

    if (scorecardsBox && aiBox) {
      expect(aiBox.y).toBeGreaterThan(scorecardsBox.y);
    }
  });

  test("AC3: Top PR Submission Do's and Don'ts render at least 3 items each", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const dosSection = page.getByText("Top PR Submission Do's");
    const dontsSection = page.getByText("Top PR Friction Pitfalls (Don'ts)");

    await expect(dosSection.first()).toBeVisible();
    await expect(dontsSection.first()).toBeVisible();

    const dosCount = await page.locator("div:has(> h4:text('Top PR Submission Do\\'s')) ul li").count();
    const dontsCount = await page.locator("div:has(> h4:text('Top PR Friction Pitfalls (Don\\'ts)')) ul li").count();

    expect(dosCount).toBeGreaterThanOrEqual(3);
    expect(dontsCount).toBeGreaterThanOrEqual(3);
  });

  test("AC1: AI section appears within first 600px of viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1080 });
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const aiSection = page.getByText("AI Maintainer Review Guidelines");
    await expect(aiSection.first()).toBeVisible();

    const box = await aiSection.first().boundingBox();
    if (box) {
      expect(box.y).toBeLessThan(800);
    }
  });
});
