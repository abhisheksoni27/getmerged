import { test, expect } from "@playwright/test";

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImRldnVzZXIiLCJleHAiOjE5MDAwMDAwMDB9.mockSignature";

test("debug unwatch delete URL", async ({ page, context }) => {
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

  await page.route("**/api/v1/repos/facebook%2Freact", async (route) => {
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

  await page.route("**/api/v1/repos/facebook%2Freact/history", async (route) => {
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

  let deleteUrl = "";
  await page.route("**/api/v1/user/watchlist/*", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteUrl = route.request().url();
      console.log("DELETE intercepted:", deleteUrl);
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
  await page.waitForTimeout(2000);
  
  const unwatchButton = page.getByRole("button", { name: /Unwatch facebook\/react|Remove facebook\/react from watchlist/i });
  await expect(unwatchButton).toBeVisible({ timeout: 10000 });
  await unwatchButton.click();
  
  await page.waitForTimeout(2000);
  console.log("DELETE URL was:", deleteUrl);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("BODY CONTAINS Your Watchlist is Empty:", text.includes("Your Watchlist is Empty"));
  console.log("BODY CONTAINS facebook/react:", text.includes("facebook/react"));
});
