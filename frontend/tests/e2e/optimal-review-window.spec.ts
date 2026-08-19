import { test, expect } from "@playwright/test";

const OPTIMAL_TIME_URL = "**/api/v1/optimal-time*";

const healthyPayload = {
  repository: "facebook/react",
  optimal_time: {
    primary_start_hour_utc: 14,
    primary_end_hour_utc: 18,
    peak_hour_utc: 16,
    active_maintainer_count: 3,
    hourly_heatmap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.5, 0.8, 1, 0.7, 0.3, 0.1, 0, 0, 0, 0],
    recommended_day_window: "Tuesday - Thursday",
    confidence_score: 0.6,
  },
};

const emptyPayload = {
  repository: "facebook/react",
  optimal_time: {
    primary_start_hour_utc: 14,
    primary_end_hour_utc: 18,
    peak_hour_utc: 16,
    active_maintainer_count: 0,
    hourly_heatmap: new Array(24).fill(0),
    recommended_day_window: "Tuesday - Thursday",
    confidence_score: 0.0,
  },
};

test.describe("Optimal PR Submission Window & Activity Heatmap (IDEA-20260819-01)", () => {
  test("AC1 & AC2: Optimal PR Submission Window is rendered on /facebook/react with heatmap, metrics, and explanatory copy", async ({ page }) => {
    await page.route(OPTIMAL_TIME_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(healthyPayload),
      });
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });

    // Header / Section presence
    const heading = page.getByRole("heading", { name: /Optimal PR Submission Window/i });
    await expect(heading).toBeVisible();

    // Recommended Day Window badge
    const dayWindowBadge = page.getByTestId("recommended-day-window");
    await expect(dayWindowBadge).toBeVisible();
    await expect(dayWindowBadge).toContainText("Tuesday - Thursday");

    // Peak Hour metric
    const peakHourMetric = page.getByTestId("peak-hour-metric");
    await expect(peakHourMetric).toBeVisible();

    // Heatmap bar container with 24 hourly bars
    const heatmapBars = page.locator("[data-testid^='heatmap-bar-']");
    await expect(heatmapBars).toHaveCount(24);

    // Each bar should have an accessible title and aria-label
    for (let h = 0; h < 24; h++) {
      const bar = page.getByTestId(`heatmap-bar-${h}`);
      await expect(bar).toHaveAttribute("title", new RegExp(`UTC|Activity`, "i"));
      await expect(bar).toHaveAttribute("aria-label", new RegExp(`UTC|Activity`, "i"));
    }

    // Timezone explanatory copy containing UTC information
    const explanation = page.getByTestId("optimal-time-explanation");
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText("UTC");
  });

  test("AC3: Low confidence / empty review window renders graceful fallback state without crashing", async ({ page }) => {
    // Intercept optimal-time API to simulate empty / low-confidence data
    await page.route(OPTIMAL_TIME_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyPayload),
      });
    });

    await page.goto("/facebook/react", { waitUntil: "domcontentloaded" });
    // Verify main page still stable
    const heading = page.getByRole("heading", { name: /Optimal PR Submission Window/i });
    await expect(heading).toBeVisible();

    // Low-confidence fallback badge rendered, not crashing the scorecard layout
    const lowConfidenceBadge = page.getByText("Low Data Confidence");
    await expect(lowConfidenceBadge).toBeVisible();

    // 24 bars still render with zero-activity heights
    const heatmapBars = page.locator("[data-testid^='heatmap-bar-']");
    await expect(heatmapBars).toHaveCount(24);
  });
});