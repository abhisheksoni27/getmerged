import { test, expect } from "@playwright/test";

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImRldnVzZXIiLCJleHAiOjE5MDAwMDAwMDB9.mockSignature";

test("debug watchlist AC1 with network monitor", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "opendoor_token",
      value: MOCK_TOKEN,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  const requests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/v1/")) {
      requests.push(`${req.method()} ${url}`);
    }
  });

  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/v1/")) {
      console.log(`RESPONSE ${res.status()} ${url}`);
    }
  });

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
    console.log("MOCK watchlist called, method:", route.request().method(), "url:", route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ watchlist: ["facebook/react", "vuejs/vue"] }),
    });
  });

  await page.route("**/api/v1/repos/facebook/react", async (route) => {
    console.log("MOCK react called");
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
    console.log("MOCK react history called");
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
    console.log("MOCK vue called");
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
    console.log("MOCK vue history called");
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
  await page.waitForTimeout(5000);
  
  console.log("=== REQUESTS ===");
  requests.forEach(r => console.log(r));
  console.log("=== END REQUESTS ===");
  
  const allText = await page.evaluate(() => document.body.innerText);
  console.log("BODY TEXT (first 3000 chars):", allText.substring(0, 3000));
});
