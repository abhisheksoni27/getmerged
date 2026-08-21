import { describe, it, expect } from "vitest";

describe("Watchlist OAuth redirect regex (spec_BUG-20260821-3efb45)", () => {
  const oauthRedirectRegex = /(\/api\/v1\/auth\/github|github\.com\/(login|login\/oauth))/;

  it("AC2: matches backend OAuth redirect path /api/v1/auth/github", () => {
    expect("https://api.example.com/api/v1/auth/github").toMatch(oauthRedirectRegex);
  });

  it("AC2: matches github.com/login/oauth authorize URL", () => {
    expect("https://github.com/login/oauth/authorize?client_id=abc&redirect_uri=...").toMatch(oauthRedirectRegex);
  });

  it("AC2: matches github.com/login bounce URL with return_to containing oauth", () => {
    const bounceUrl =
      "https://github.com/login?client_id=abc&return_to=%2Flogin%2Foauth%2Fauthorize%3Fclient_id%3Dabc";
    expect(bounceUrl).toMatch(oauthRedirectRegex);
  });

  it("AC2: matches github.com/login without query params", () => {
    expect("https://github.com/login").toMatch(oauthRedirectRegex);
  });

  it("rejects non-auth URLs", () => {
    expect("https://github.com/dashboard").not.toMatch(oauthRedirectRegex);
    expect("https://example.com/auth/github").not.toMatch(oauthRedirectRegex);
  });
});
