#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".css"]);

function walkAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndReplace(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        let content = fs.readFileSync(fullPath, "utf8");
        if (content.includes("—") || content.includes("&mdash;")) {
          const updated = content
            .replace(/\s*—\s*/g, " - ")
            .replace(/—/g, " - ")
            .replace(/&mdash;/g, " - ");
          fs.writeFileSync(fullPath, updated, "utf8");
          console.log(`[clean-em-dash] Cleaned: ${path.relative(process.cwd(), fullPath)}`);
        }
      }
    }
  }
}

walkAndReplace(SRC_DIR);
console.log("[clean-em-dash] Done.");
