import { test, expect } from "@playwright/test";
import { GET } from "../../src/app/robots.txt/route";
import * as fs from "fs";
import * as path from "path";

test.describe("robots.txt Content Signals", () => {
  test("route handler returns Content-Signal directives for all crawler user-agents", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");

    const text = await response.text();

    expect(text).toContain("Content-Signal: search=yes, ai-train=no, ai-input=yes");
    expect(text).toContain("User-agent: *");
    expect(text).toContain("User-agent: GPTBot");
    expect(text).toContain("User-agent: ClaudeBot");
    expect(text).toContain("User-agent: PerplexityBot");
    expect(text).toContain("User-agent: Anthropic-ai");
    expect(text).toContain("Sitemap: https://getmerged.abhishekco.de/sitemap.xml");
  });

  test("public/robots.txt contains valid Content-Signal directives matching route", () => {
    const filePath = path.resolve(__dirname, "../../public/robots.txt");
    expect(fs.existsSync(filePath)).toBe(true);

    const text = fs.readFileSync(filePath, "utf-8");
    expect(text).toContain("Content-Signal: search=yes, ai-train=no, ai-input=yes");
    expect(text).toContain("ai-train=");
    expect(text).toContain("search=");
    expect(text).toContain("ai-input=");
  });
});
