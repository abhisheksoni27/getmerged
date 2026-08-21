import { test, expect } from "@playwright/test";

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImRldnVzZXIiLCJleHAiOjE5MDAwMDAwMDB9.mockSignature";

test.describe("Watchlist Dashboard (IDEA-20260820-03)", () => {
  test("AC3: Unauthenticated visit to /watchlist redirects to the sign-in flow", async ({ page, context }) => {
    // Ensure no auth cookie is present
    await context.clearCookies();

    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });
    // In server component, redirect to /api/v1/auth/github occurs
    expect(page.url()).toMatch(/(\/api\/v1\/auth\/github|github\.com\/login\/oauth)/);
  });

  test("AC3: Empty watchlist shows empty state card with CTA to browse /repos", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "opendoor_token",
        value: MOCK_TOKEN,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            slug: "devuser",
            username: "devuser",
            avatar_url: "https://github.com/devuser.png",
            profiling_consent: true,
            auth_provider: "github",
            has_github: true,
          },
        }),
      });
    });

    await page.route("**/api/v1/user/watchlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ watchlist: [] }),
      });
    });

    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /My Watchlist/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/0 saved/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your Watchlist is Empty/i })).toBeVisible();
    
    // Check primary and secondary CTAs
    const browseCta = page.getByRole("link", { name: /Browse Repositories/i });
    await expect(browseCta).toBeVisible();
    await expect(browseCta).toHaveAttribute("href", "/repos");

    const gfiCta = page.getByRole("link", { name: /Explore Good First Issues/i });
    await expect(gfiCta).toBeVisible();
    await expect(gfiCta).toHaveAttribute("href", "/good-first-issue");
  });

  test("AC1 & AC2: Signed-in user with watched repos sees cards with live C-Rank tier/score and tier-change delta chips", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "opendoor_token",
        value: MOCK_TOKEN,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            slug: "devuser",
            username: "devuser",
            avatar_url: "https://github.com/devuser.png",
            profiling_consent: true,
            auth_provider: "github",
            has_github: true,
          },
        }),
      });
    });

    await page.route("**/api/v1/user/watchlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ watchlist: ["facebook/react", "vuejs/vue"] }),
      });
    });

    await page.route("**/api/v1/repos/facebook/react", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "repo-react-uuid",
          full_name: "facebook/react",
          owner: "facebook",
          name: "react",
          language: "JavaScript",
          stars: 225000,
          description: "The library for web and native user interfaces.",
          github_url: "https://github.com/facebook/react",
          c_rank_tier: "S",
          c_rank_score: 96.5,
          external_pr_merge_rate: 88.0,
          time_to_first_response_hours: 4.2,
          time_to_merge_hours: 48.0,
          first_timer_success_rate: 75.0,
          good_first_issue_count: 5,
          snapshot_date: "2026-08-20",
          topics: ["javascript", "react", "ui"],
        }),
      });
    });

    await page.route("**/api/v1/repos/facebook/react/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          repository_id: "repo-react-uuid",
          full_name: "facebook/react",
          history: [
            { snapshot_date: "2026-08-18", c_rank_score: 84.0, c_rank_tier: "A" },
            { snapshot_date: "2026-08-19", c_rank_score: 96.5, c_rank_tier: "S" },
          ],
        }),
      });
    });

    await page.route("**/api/v1/repos/vuejs/vue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "repo-vue-uuid",
          full_name: "vuejs/vue",
          owner: "vuejs",
          name: "vue",
          language: "TypeScript",
          stars: 207000,
          description: "Progressive JavaScript Framework.",
          github_url: "https://github.com/vuejs/vue",
          c_rank_tier: "A",
          c_rank_score: 86.0,
          external_pr_merge_rate: 79.0,
          time_to_first_response_hours: 8.5,
          time_to_merge_hours: 72.0,
          first_timer_success_rate: 60.0,
          good_first_issue_count: 2,
          snapshot_date: "2026-08-20",
          topics: ["typescript", "vue", "framework"],
        }),
      });
    });

    await page.route("**/api/v1/repos/vuejs/vue/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          repository_id: "repo-vue-uuid",
          full_name: "vuejs/vue",
          history: [
            { snapshot_date: "2026-08-18", c_rank_score: 86.0, c_rank_tier: "A" },
            { snapshot_date: "2026-08-19", c_rank_score: 86.0, c_rank_tier: "A" },
          ],
        }),
      });
    });

    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    // Header assertions
    await expect(page.getByRole("heading", { name: /My Watchlist/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/2 saved/i)).toBeVisible();

    // AC1: Live C-Rank tier/score rendered
    await expect(page.getByRole("heading", { name: "facebook/react" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "vuejs/vue" })).toBeVisible();
    await expect(page.getByText("96.5")).toBeVisible();
    await expect(page.getByText("86.0")).toBeVisible();

    // AC2: Delta indicator chips
    // For facebook/react (improved from A to S): emerald up chip
    const upDeltaChip = page.getByTestId("tier-delta-chip-facebook-react");
    await expect(upDeltaChip).toBeVisible();
    await expect(upDeltaChip).toHaveText(/A → S|Improved/i);

    // For vuejs/vue (unchanged A to A): neutral stable chip
    const neutralDeltaChip = page.getByTestId("tier-delta-chip-vuejs-vue");
    await expect(neutralDeltaChip).toBeVisible();
    await expect(neutralDeltaChip).toHaveText(/Stable|Unchanged/i);
  });

  test("AC4: 'My Watchlist' entry is present in header auth menu and links to /watchlist", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "opendoor_token",
        value: MOCK_TOKEN,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            slug: "devuser",
            username: "devuser",
            avatar_url: "https://github.com/devuser.png",
            profiling_consent: true,
            auth_provider: "github",
            has_github: true,
          },
        }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const watchlistLink = page.getByRole("link", { name: /My Watchlist/i });
    await expect(watchlistLink).toBeVisible({ timeout: 10000 });
    await expect(watchlistLink).toHaveAttribute("href", "/watchlist");
  });

  test("Unwatch interaction removes repo card and transitions to empty state", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "opendoor_token",
        value: MOCK_TOKEN,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            slug: "devuser",
            username: "devuser",
            avatar_url: "https://github.com/devuser.png",
            profiling_consent: true,
            auth_provider: "github",
            has_github: true,
          },
        }),
      });
    });

    await page.route("**/api/v1/user/watchlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ watchlist: ["facebook/react"] }),
      });
    });

    await page.route("**/api/v1/repos/facebook/react", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "repo-react-uuid",
          full_name: "facebook/react",
          owner: "facebook",
          name: "react",
          language: "JavaScript",
          stars: 225000,
          description: "The library for web and native user interfaces.",
          github_url: "https://github.com/facebook/react",
          c_rank_tier: "S",
          c_rank_score: 96.5,
          external_pr_merge_rate: 88.0,
          time_to_first_response_hours: 4.2,
          time_to_merge_hours: 48.0,
          first_timer_success_rate: 75.0,
          good_first_issue_count: 5,
          snapshot_date: "2026-08-20",
          topics: ["javascript", "react"],
        }),
      });
    });

    await page.route("**/api/v1/repos/facebook/react/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          repository_id: "repo-react-uuid",
          full_name: "facebook/react",
          history: [
            { snapshot_date: "2026-08-19", c_rank_score: 96.5, c_rank_tier: "S" },
          ],
        }),
      });
    });

    let deleteCalled = false;
    await page.route("**/api/v1/user/watchlist/*", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "repository removed from watchlist" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/watchlist", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "facebook/react" })).toBeVisible({ timeout: 10000 });

    const unwatchButton = page.getByRole("button", { name: /Unwatch facebook\/react|Remove facebook\/react from watchlist/i });
    await expect(unwatchButton).toBeVisible();
    await unwatchButton.click();

    expect(deleteCalled).toBe(true);
    await expect(page.getByRole("heading", { name: /Your Watchlist is Empty/i })).toBeVisible();
  });
});
