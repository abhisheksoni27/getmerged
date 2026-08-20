import { test, expect } from "@playwright/test";

test.describe("Unscored Repo Metadata Honesty & Alternatives (IDEA-20260820-02)", () => {
  test("AC1: Unscored repo (facebook/react) title/OG read 'Unscored', never '75.0', matching visible scorecard", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/Unscored/);
    const title = await page.title();
    expect(title).not.toContain("75.0");
    expect(title).not.toContain("A Tier");

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /no public PR telemetry/i);

    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveAttribute("content", /no public PR telemetry/i);

    // Visible scorecard remains honest 0/100 — consistent with metadata.
    await expect(page.getByRole("heading", { name: "facebook/react", exact: true })).toBeVisible();
    await expect(page.getByText("Unscored • No Public PR Telemetry").first()).toBeVisible();
  });

  test("AC2: Unscored repo shows explanatory 'no public telemetry' callout and up to 3 verified-welcoming alternatives", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const explainer = page.getByTestId("unscored-explainer");
    await expect(explainer).toBeVisible();
    await expect(explainer).toHaveAttribute("role", "region");
    await expect(explainer).toContainText(/no public PR telemetry|Gerrit|Phabricator|internal tooling/i);

    // Alternatives rail links straight to their scored profiles (no blank grid holes).
    const alternativesRail = page.getByTestId("similar-repos-rail");
    await expect(alternativesRail).toBeVisible();
    const cards = alternativesRail.locator("a.dev-card-glow");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThanOrEqual(3);
  });

  test("AC3: Scored repo (vercel/next.js) keeps current title/FAQ behavior unchanged (regression guard)", async ({ page }) => {
    await page.goto("/vercel/next.js", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(/vercel\/next\.js/);
    const title = await page.title();
    expect(title).not.toContain("Unscored");
    expect(title).toContain("C-Rank™");

    // Hero still renders the C-Rank score pill for scored repos.
    await expect(page.getByText("C-Rank Score:").first()).toBeVisible();
    // Explain callout must NOT appear on scored repos.
    await expect(page.getByTestId("unscored-explainer")).toHaveCount(0);
  });

  test("AC4: FAQ JSON-LD on unscored repos no longer asserts fabricated score/tier", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqLd = scripts.find((s) => s.includes('"@type":"FAQPage"'));
    expect(faqLd).toBeTruthy();

    expect(faqLd).toContain("Unscored");
    expect(faqLd).not.toContain("75.0");
    expect(faqLd).not.toContain("places facebook/react in the");
    expect(faqLd).toContain("no indexed public pull request reviews or maintainer telemetry on GitHub");
  });
});