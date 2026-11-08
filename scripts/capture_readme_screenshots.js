const path = require('path');
const { chromium } = require(path.join(__dirname, '../frontend/node_modules/playwright'));

const TARGETS = [
  {
    name: 'hero-home.png',
    url: 'https://getmerged.abhishekco.de',
    viewport: { width: 1280, height: 850 },
    waitForSelector: 'main, h1',
    clip: { x: 0, y: 0, width: 1280, height: 850 }
  },
  {
    name: 'repo-scorecard.png',
    url: 'https://getmerged.abhishekco.de/rust-lang/rust',
    viewport: { width: 1280, height: 950 },
    waitForSelector: 'main, h1',
    clip: { x: 0, y: 0, width: 1280, height: 950 }
  },
  {
    name: 'good-first-issues.png',
    url: 'https://getmerged.abhishekco.de/good-first-issue',
    viewport: { width: 1280, height: 900 },
    waitForSelector: 'main, h1',
    clip: { x: 0, y: 0, width: 1280, height: 900 }
  },
  {
    name: 'compare-repos.png',
    url: 'https://getmerged.abhishekco.de/compare?repo1=rust-lang%2Frust&repo2=golang%2Fgo',
    viewport: { width: 1280, height: 850 },
    waitForSelector: 'main, h1',
    clip: { x: 0, y: 0, width: 1280, height: 850 }
  }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });

  for (const target of TARGETS) {
    console.log(`Capturing ${target.name} from ${target.url}...`);
    const page = await context.newPage();
    await page.setViewportSize(target.viewport);
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (target.waitForSelector) {
        await page.waitForSelector(target.waitForSelector, { timeout: 15000 });
      }
      await page.waitForTimeout(3000); // Allow fonts, charts, and hydrated components to render

      const outPath = path.join(__dirname, '..', 'docs', 'assets', target.name);
      await page.screenshot({ path: outPath, clip: target.clip });
      console.log(`Saved: ${outPath}`);
    } catch (err) {
      console.error(`Failed to capture ${target.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('All screenshots captured.');
})();
