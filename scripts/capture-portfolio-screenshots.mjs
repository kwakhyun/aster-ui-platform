import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const projectRoot = process.cwd();
const baseUrl = "http://127.0.0.1:4181";
const preview = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["--filter", "@aster-ui/studio", "preview", "--host", "127.0.0.1", "--port", "4181", "--strictPort"],
  { cwd: projectRoot, stdio: "ignore" },
);

async function waitForPreview() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The preview process can take a moment to bind its local port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Studio preview did not become ready on port 4181.");
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  await waitForPreview();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "TreatmentCard" }).waitFor();
  await page.screenshot({
    path: path.join(projectRoot, "design/implementation-desktop-final.png"),
    animations: "disabled",
  });
  await page.screenshot({
    path: path.join(projectRoot, "design/implementation-desktop-1440x1024.png"),
    animations: "disabled",
  });

  const inspectorApiTab = page.getByRole("tab", { name: "API", exact: true }).last();
  await inspectorApiTab.focus();
  await inspectorApiTab.press("ArrowRight");
  await page.getByRole("tab", { name: "Tokens", exact: true }).last().press("ArrowLeft");
  await page.screenshot({
    path: path.join(projectRoot, "design/qa-focus-inspector-final.png"),
    animations: "disabled",
  });
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: "Preview default state" }).click();
  const saveButton = page.getByRole("button", { name: "Save Laser toning" });
  await saveButton.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const saveButtonHasKeyboardFocus = await saveButton.evaluate((element) =>
    element === element.ownerDocument.activeElement && element.matches(":focus-visible")
  );
  if (!saveButtonHasKeyboardFocus) throw new Error("Workspace keyboard focus was not visible during capture.");
  await page.screenshot({
    path: path.join(projectRoot, "design/qa-focus-workspace-final.png"),
    animations: "disabled",
  });

  await page.setViewportSize({ width: 820, height: 1024 });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(projectRoot, "design/implementation-tablet-820x1024.png"),
    animations: "disabled",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(projectRoot, "design/implementation-mobile-390x844.png"),
    animations: "disabled",
  });
  console.log("Captured current desktop, inspector, focus, tablet, and mobile portfolio images.");
} finally {
  await browser.close();
  if (!preview.killed) preview.kill("SIGTERM");
}
