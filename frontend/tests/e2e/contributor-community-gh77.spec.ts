import { test, expect } from "@playwright/test";

test.describe("Contributor Community Updates (GH-77)", () => {
  test("AC1: Narrow mobile viewport (320px) renders with zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // Assert zero horizontal scrollbar on 320px
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);

    // Assert rating buttons are accessible
    const maintainerRatingBtn = page.getByRole("button", { name: /Maintainer helpfulness: 5 stars/i });
    await expect(maintainerRatingBtn).toBeVisible();
  });

  test("AC2: Unauthenticated session renders 'Sign in to verify' badge", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    const verifyBadge = page.locator("#auth-provider-badge, [data-testid='auth-provider-badge']").or(page.getByText("Sign in to verify"));
    await expect(verifyBadge.first()).toBeVisible();
  });

  test("AC3: Post-submission & home copy contains plain-English without buzzwords", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("weighted maintainer sentiment points");
  });

  test("AC4: FAQ section in DOM renders at most 5 items and JSON-LD FAQPage mirrors count", async ({ page }) => {
    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // Check JSON-LD FAQ count
    const faqJsonLdCount = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent || "{}");
          if (data["@type"] === "FAQPage" && Array.isArray(data.mainEntity)) {
            return data.mainEntity.length;
          }
        } catch {}
      }
      return 0;
    });

    expect(faqJsonLdCount).toBeGreaterThan(0);
    expect(faqJsonLdCount).toBeLessThanOrEqual(5);

    // Check visible FAQ cards in FAQ section
    const faqSection = page.locator("section:has-text('Frequently Asked Questions')");
    await expect(faqSection).toBeVisible();
    const faqItems = faqSection.locator("h3");
    const count = await faqItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBe(faqJsonLdCount);
  });
});
