import { test, expect } from "@playwright/test";

test("debug route pattern matching with encoded slashes", async ({ page }) => {
  let calledSlash = false;
  let calledEncoded = false;
  
  await page.route("**/api/v1/repos/facebook/react", async (route) => {
    calledSlash = true;
    console.log("MOCK slash pattern matched:", route.request().url());
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"id":"slash"}' });
  });
  
  await page.route("**/api/v1/repos/facebook%2Freact", async (route) => {
    calledEncoded = true;
    console.log("MOCK encoded pattern matched:", route.request().url());
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"id":"encoded"}' });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  
  const res1 = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/v1/repos/facebook/react");
      const text = await r.text();
      return { status: r.status, body: text };
    } catch (e) {
      return { error: String(e) };
    }
  });
  
  console.log("Fetch slash result:", JSON.stringify(res1), "calledSlash:", calledSlash);
  
  calledSlash = false;
  calledEncoded = false;
  
  const res2 = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/v1/repos/facebook%2Freact");
      const text = await r.text();
      return { status: r.status, body: text };
    } catch (e) {
      return { error: String(e) };
    }
  });
  
  console.log("Fetch encoded result:", JSON.stringify(res2), "calledEncoded:", calledEncoded);
});
