import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Widget = { name: string; path: string; route: string };

const inventoryPath = path.join(__dirname, "..", "..", "docs", "widgets.inventory.json");
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as {
  widgets: Widget[];
};
const baselineDir = path.join(__dirname, "__baselines__");

test.describe("GH-91 widget theme state matrix", () => {
  for (const widget of inventory.widgets) {
    test(`[${widget.name}] default/hover/focus/disabled`, async ({ page }) => {
      await page.goto(widget.route, { waitUntil: "domcontentloaded" });
      const host = page
        .locator(`text=${widget.name}`)
        .first()
        .or(page.locator("body"))
        .first();
      await expect(host).toBeVisible({ timeout: 5000 });

      const interactive = page.locator(
        "main button, main a[href], main input, header button"
      ).first();
      const hasInteractive = (await interactive.count()) > 0;

      await page.screenshot({
        path: path.join(baselineDir, `${widget.name}-default.png`),
        fullPage: false,
      });

      if (!hasInteractive) return;
      await interactive.hover();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(baselineDir, `${widget.name}-hover.png`),
      });

      await interactive.focus();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(baselineDir, `${widget.name}-focus.png`),
      });

      await interactive.evaluate((el) => {
        if ("disabled" in el) (el as HTMLButtonElement).disabled = true;
        else el.setAttribute("aria-disabled", "true");
      });
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(baselineDir, `${widget.name}-disabled.png`),
      });
    });
  }
});

test.describe("GH-91 axe-core accessibility scan", () => {
  for (const route of ["/", "/repos", "/topics", "/watchlist"]) {
    test(`no critical violations on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const critical = results.violations.filter((v) =>
        v.impact === "critical" || v.impact === "serious"
      );
      expect(critical.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
    });
  }
});
