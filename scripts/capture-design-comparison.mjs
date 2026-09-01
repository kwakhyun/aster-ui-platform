import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const projectRoot = process.cwd();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2920, height: 1104 } });
  await page.goto(pathToFileURL(path.join(projectRoot, "design/qa-comparison.html")).href);
  await page.screenshot({
    path: path.join(projectRoot, "design/qa-comparison-final.png"),
    fullPage: true,
  });
  console.log("Captured design/qa-comparison-final.png");
} finally {
  await browser.close();
}
