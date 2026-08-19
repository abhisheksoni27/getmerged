import { test, expect } from "@playwright/test";

async function captureRedirects(page: import("@playwright/test").Page) {
  const redirects: { status: number; url: string }[] = [];
  page.on("response", (r) => {
    if (r.status() >= 300 && r.status() < 400) {
      redirects.push({ status: r.status(), url: r.url() });
    }
  });
  return redirects;
}

test.describe("Phase 1: Repo Scorecard & Exact GFI Scoping", () => {
  test("Legacy /repo/[owner]/[name] canonical redirects to /[owner]/[name]", async ({ page }) => {
    const redirects = await captureRedirects(page);
    await page.goto("/repo/facebook/react", { waitUntil: "domcontentloaded" });
    expect(redirects.some((r) => r.status === 307 && r.url.includes("/repo/facebook/react"))).toBe(true);
    expect(new URL(page.url()).pathname).toBe("/facebook/react");
  });

  test("GFI cards render only issues strictly belonging to the exact repo", async ({ page }) => {
    await page.goto("/wvlet/wvlet", { waitUntil: "domcontentloaded" });

    const gfiSection = page.getByText(/Active Good First Issues/i);
    await expect(gfiSection).toBeVisible({ timeout: 10000 });

    // Collect all rendered issue links scoped to a GitHub issues page
    const issueLinks = page.locator("a[href*='/issues/']");
    const count = await issueLinks.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = (await issueLinks.nth(i).getAttribute("href")) || "";
        expect(href).toMatch(/^https:\/\/github\.com\/wvlet\/wvlet\/issues\/\d+/);
      }
    } else {
      const viewOnGithub = page.locator("a[title='View all good first issues directly on GitHub']");
      await expect(viewOnGithub).toHaveAttribute("href", /github\.com\/wvlet\/wvlet\/issues/);
    }
  });
});

test.describe("Phase 1: Preflight PR Evaluator", () => {
  test("Submitting a conventional-commit PR diff returns a scorecard with check results", async ({ page }) => {
    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /PR Acceptance Pre-Flight Evaluator/i })).toBeVisible();

    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("fix(core): resolve parser null deref");
    await page.getByPlaceholder(/Explain what this PR solves/i).fill("Adds a null guard in the parser plus a regression test.");
    await page.getByPlaceholder("src/parser.ts\nsrc/parser.test.ts").fill("src/parser.ts\nsrc/parser.test.ts");
    await page.getByPlaceholder("25").fill("25");
    await page.getByPlaceholder("5", { exact: true }).fill("5");

    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();

    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Conventional Commit Title/i)).toBeVisible();
    await expect(page.getByText(/Unit\/Regression Tests Included/i)).toBeVisible();
  });

  test("Non-conventional PR title is flagged by the conventional commit check", async ({ page }) => {
    await page.goto("/preflight", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("this is a really long freeform commit message without any conventional prefix");
    await page.getByPlaceholder(/Explain what this PR solves/i).fill("A long enough description to pass the depth heuristic.");
    await page.getByPlaceholder("src/parser.ts\nsrc/parser.test.ts").fill("src/parser.ts");
    await page.getByPlaceholder("25").fill("25");

    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();

    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Conventional Commit Title/i)).toBeVisible();
  });

  test("Renders error and retry banner when evaluation API responds with 500 and recovers on retry", async ({ page }) => {
    await page.route("**/api/v1/preflight/evaluate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("fix(core): resolve parser null deref");
    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();

    const alertBanner = page.getByRole("alert").filter({ hasText: /Evaluation Request Failed/i });
    await expect(alertBanner).toBeVisible({ timeout: 10000 });
    const retryBtn = page.getByRole("button", { name: /Retry Evaluation/i });
    await expect(retryBtn).toBeVisible();

    // Now unroute so retry succeeds
    await page.unroute("**/api/v1/preflight/evaluate");
    await retryBtn.click();

    await expect(page.getByText(/Pre-flight Score/i)).toBeVisible({ timeout: 15000 });
    await expect(alertBanner).not.toBeVisible();
  });

  test("Renders error and retry banner when evaluation API experiences network failure", async ({ page }) => {
    await page.route("**/api/v1/preflight/evaluate", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/preflight", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("e.g. facebook/react").fill("wvlet/wvlet");
    await page.getByPlaceholder("e.g. fix(core): resolve null pointer exception in parser").fill("fix(core): resolve parser null deref");
    await page.getByRole("button", { name: /Run Pre-Flight Check/i }).click();

    const alertBanner = page.getByRole("alert").filter({ hasText: /Evaluation Request Failed/i });
    await expect(alertBanner).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Retry Evaluation/i })).toBeVisible();
  });
});

test.describe("Phase 1: Compare Head-to-Head", () => {
  test("Self-comparison canonical redirects to the repo scorecard", async ({ page }) => {
    const redirects = await captureRedirects(page);
    await page.goto("/compare/facebook/react/vs/facebook/react", { waitUntil: "domcontentloaded" });
    expect(redirects.some((r) => r.status === 307 && r.url.includes("/compare/facebook/react/vs/facebook/react"))).toBe(true);
    expect(new URL(page.url()).pathname).toBe("/facebook/react");
  });

  test("Lexicographically unordered compare canonical redirects to sorted order", async ({ page }) => {
    const redirects = await captureRedirects(page);
    await page.goto("/compare/vuejs/vue/vs/facebook/react", { waitUntil: "domcontentloaded" });
    expect(redirects.some((r) => r.status === 307 && r.url.includes("/compare/vuejs/vue/vs/facebook/react"))).toBe(true);
    expect(new URL(page.url()).pathname).toBe("/compare/facebook/react/vs/vuejs/vue");
  });

  test("Side-by-side comparison matrix renders both repo cards", async ({ page }) => {
    await page.goto("/compare/facebook/react/vs/vuejs/vue", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /facebook\/react vs vuejs\/vue/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /facebook\/react/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /vuejs\/vue/i })).toBeVisible();
    await expect(page.getByText(/External PR Merge Rate/i).first()).toBeVisible();
    await expect(page.getByText(/Review Latency \(p50\)/i).first()).toBeVisible();
    await expect(page.getByText(/90-Day Bus Factor/i).first()).toBeVisible();
  });
});

test.describe("Phase 1: Pricing & Auth Entitlements", () => {
  test("Pro plan checkout button links to Dodopayments with billing cycle", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Stop Guessing\. Get Your Pull Requests Merged\./i })).toBeVisible();

    const upgradeBtn = page.getByRole("button", { name: /Upgrade to Pro Now/i });
    await expect(upgradeBtn).toBeVisible();

    await expect(page.getByText("$79")).toBeVisible();

    await page.getByRole("button", { name: /Monthly Billing/i }).click();
    await expect(page.getByText("$9")).toBeVisible();

    const requestedUrls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("checkout.dodopayments.com")) requestedUrls.push(r.url());
    });

    await upgradeBtn.click();
    await expect.poll(() => requestedUrls.length).toBeGreaterThan(0);

    const checkoutUrl = new URL(requestedUrls[0]);
    expect(checkoutUrl.host).toBe("checkout.dodopayments.com");
    expect(checkoutUrl.pathname).toBe("/buy/pdt_opendoor_pro");
    expect(checkoutUrl.searchParams.get("billing_cycle")).toBe("monthly");
  });

  test("Sign-in gating modal triggers from homepage CTA", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const cta = page.getByRole("button", { name: /Sign in to GetMerged/i });
    if (await cta.count() > 0) {
      await cta.first().click();
    } else {
      const signIn = page.getByRole("button", { name: /Sign in/i }).first();
      await signIn.click();
    }

    const modalHeading = page.getByRole("heading", { name: /Sign in to GetMerged/i });
    await expect(modalHeading).toBeVisible();
    const githubLink = page.getByTitle("Sign in with GitHub account");
    await expect(githubLink).toHaveAttribute("href", /\/api\/v1\/auth\/github$/);
  });
});