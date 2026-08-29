import { test, expect } from "@playwright/test";

test.describe("Repo Deep-Audit Flow (/owner/name/audit)", () => {
  test("Unauthenticated user sees Sign in with GitHub gate", async ({ page }) => {
    // Intercept auth/me with 401
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({ status: 401, json: { error: "unauthenticated" } });
    });

    await page.goto("/facebook/react/audit", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sign in to view the Full Audit")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /Sign in with GitHub/i })).toBeVisible();
  });

  test("Authenticated user with unpurchased audit sees $19 checkout CTA, NOT repository not found", async ({ page }) => {
    // Mock logged in user
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 1, github_id: "123", username: "tester", avatar_url: "" },
      });
    });

    // Mock unpurchased audit report (403)
    await page.route("**/repo/facebook/react/audit", async (route) => {
      await route.fulfill({
        status: 403,
        json: { error: "audit not purchased", status: "none" },
      });
    });

    // Mock audit status poll
    await page.route("**/api/audit/status*", async (route) => {
      await route.fulfill({
        status: 200,
        json: { status: "pending" },
      });
    });

    // Mock existing repo lookup
    await page.route("**/api/v1/repos/*", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: "facebook/react",
          full_name: "facebook/react",
          language: "JavaScript",
          stars: 220000,
        },
      });
    });

    await page.goto("/facebook/react/audit", { waitUntil: "domcontentloaded" });

    // Ensure "Repository not found" is NOT shown
    await expect(page.getByText("Repository not found")).not.toBeVisible();

    // Verify the Unlock Full Deep-Audit paywall / CTA is visible
    await expect(page.getByText(/Unlock the Full Deep-Audit/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Unlock Deep-Audit/i })).toBeVisible();
  });

  test("Non-existent repo shows Repository not found", async ({ page }) => {
    // Mock logged in user
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 1, github_id: "123", username: "tester", avatar_url: "" },
      });
    });

    // Mock 404 on audit endpoint
    await page.route("**/repo/nonexistent/fake-repo/audit", async (route) => {
      await route.fulfill({
        status: 404,
        json: { error: "repository not found" },
      });
    });

    // Mock 404 on repo lookup
    await page.route("**/api/v1/repos/*", async (route) => {
      await route.fulfill({
        status: 404,
        json: { error: "repository not found" },
      });
    });

    await page.route("**/api/v1/repos?name=*", async (route) => {
      await route.fulfill({
        status: 200,
        json: { data: [] },
      });
    });

    await page.goto("/nonexistent/fake-repo/audit", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Repository not found")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("This repository is not indexed yet.")).toBeVisible();
  });
});
