import { test, expect } from "@playwright/test";

test.describe("Badge API Endpoints (GitHub Camo & Live Proxy)", () => {
  test("GET /api/badge/pulseaiclub/phi serves valid SVG with emerald S-Tier styling and GetMerged branding", async ({ request }) => {
    const res = await request.get("/api/badge/pulseaiclub/phi", {
      headers: {
        "User-Agent": "GitHub-Camo",
      },
    });

    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("image/svg+xml");

    const cacheControl = res.headers()["cache-control"];
    expect(cacheControl).toContain("public");

    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("</svg>");
    expect(body).toContain("GetMerged");
    expect(body).toContain("Tier S");
    expect(body).toContain("#10b981");
  });

  test("GET /api/badge/u/abhisheksoni27 serves valid user karma SVG badge", async ({ request }) => {
    const res = await request.get("/api/badge/u/abhisheksoni27", {
      headers: {
        "User-Agent": "GitHub-Camo",
      },
    });

    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("image/svg+xml");

    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("</svg>");
    expect(body).toContain("Karma");
    expect(body).toContain("GetMerged");
  });

  test("GET /api/badge/unknown-org/unknown-repo serves fallback SVG with 200 OK (never 500/404 on Camo)", async ({ request }) => {
    const res = await request.get("/api/badge/nonexistent-org-404/nonexistent-repo-404", {
      headers: {
        "User-Agent": "GitHub-Camo",
      },
    });

    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("image/svg+xml");

    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("</svg>");
    expect(body).toContain("GetMerged");
    expect(body).toContain("Welcoming");
  });
});

