# GetMerged Chrome Extension

> **Know before you code.** Injects live GetMerged C-Rank™ (S→D), median review turnaround, external PR merge probability, and maintainer bus factor directly into GitHub repository headers and pull request pages.

---

## ⚡ Features

1. **Repository Header Scorecard**:
   - Injects an unobtrusive telemetry card directly under any repository title on GitHub.
   - Displays live C-Rank tier badge (S, A, B, C, D), score / 100, median review response time, external merge rate, and active maintainer count.
   - 1-click deep link to full multi-variable telemetry on [GetMerged](https://getmerged.abhishekco.de).
2. **Contextual PR Page Banner**:
   - When viewing `github.com/:owner/:repo/pull/:id`, gives you an instant reality check:
     - **S/A-Tier**: *"🌟 Welcoming Repo: ~75% merge rate, reviews in under 4 hours."*
     - **D-Tier**: *"⚠️ Ghost Town Alert: Only 12% merge rate, 40+ days turnaround."*
3. **Interactive Toolbar Popup**:
   - Click the extension icon in Chrome to view the active tab's scorecard or query any open-source repo on the fly.
4. **Resilient Offline & Caching Layer**:
   - Backed by an in-memory and `chrome.storage.local` cache with 10-minute TTL and LRU eviction to ensure zero layout latency when browsing GitHub.

---

## 🛠️ Quick Installation (Developer Mode)

You can load this extension into any Chromium browser (Google Chrome, Brave, Arc, Edge) in under 30 seconds:

1. Clone or download this repository:
   ```bash
   git clone git@github.com:getmergedapp/getmerged.git
   cd getmerged/extension
   ```
2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the `extension/` folder.
6. Navigate to any GitHub repo (e.g. `https://github.com/facebook/react` or `https://github.com/gin-gonic/gin`) and see the live scorecard appear immediately!

---

## 📦 Packaging for Chrome Web Store

Run the included automated build script:
```bash
./build.sh
```
This validates manifest syntax, checks asset contracts, and outputs a ready-to-upload ZIP at `dist/getmerged-chrome-extension.zip`.
