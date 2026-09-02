import { createRequire } from "node:module";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const require = createRequire(path.resolve("playwright.config.ts"));
const axePath = require.resolve("axe-core/axe.min.js");
const browserRuntimeFailures = new WeakMap<Page, string[]>();

async function assertBrowserAxe(page: Page, testInfo: TestInfo) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context?: unknown, options?: unknown) => Promise<{ violations: Array<{
      id: string;
      impact: string | null;
      nodes: Array<{ target: string[]; failureSummary: string }>;
    }> }> } }).axe;
    const result = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
    }));
  });
  testInfo.annotations.push({ type: "axe", description: "real-browser all WCAG-tagged violations gate" });
  expect(violations).toEqual([]);
}

function stableScreenshotOptions(page: Page) {
  return {
    animations: "disabled" as const,
    mask: [page.locator(".quality-summary"), page.locator(".evidence-provenance")],
    maskColor: "#fdfdfd",
  };
}

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  browserRuntimeFailures.set(page, failures);
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`response: ${response.status()} ${response.url()}`);
    }
  });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TreatmentCard" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(
    browserRuntimeFailures.get(page) ?? [],
    "The production preview must not emit page errors, console errors, or HTTP error responses.",
  ).toEqual([]);
  browserRuntimeFailures.delete(page);
});

test("matches the approved coral desktop composition", async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: "snapshot", description: "coral desktop" });
  await expect(page).toHaveScreenshot("studio-coral-1440x1024.png", stableScreenshotOptions(page));
});

test("renders the ocean theme from the same semantic contract", async ({ page }, testInfo) => {
  await page.getByRole("combobox", { name: "Preview theme" }).selectOption("ocean");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "ocean");
  testInfo.annotations.push({ type: "snapshot", description: "ocean desktop" });
  await expect(page).toHaveScreenshot("studio-ocean-1440x1024.png", stableScreenshotOptions(page));
});

test("captures the Figma review and local rehearsal states", async ({ page }, testInfo) => {
  await page.getByRole("complementary", { name: "Component browser" })
    .getByRole("button", { name: "Button", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  await page.locator(".sync-strip").getByRole("button", { name: "Review changes" }).click();
  await expect(page.getByRole("dialog", { name: "Semantic tokens · v12" })).toBeVisible();
  testInfo.annotations.push({ type: "snapshot", description: "figma diff" });
  await expect(page).toHaveScreenshot("figma-diff-1440x1024.png", stableScreenshotOptions(page));
  await assertBrowserAxe(page, testInfo);
  await page.getByRole("button", { name: "Complete review" }).click();

  await page.getByRole("button", { name: "Run rehearsal" }).click();
  await expect(page.getByRole("dialog", { name: /Release rehearsal/ })).toBeVisible();
  testInfo.annotations.push({ type: "snapshot", description: "local rehearsal" });
  await expect(page).toHaveScreenshot("release-rehearsal-1440x1024.png", stableScreenshotOptions(page));
  await assertBrowserAxe(page, testInfo);
});

test("covers every shipped component preview in Chrome", async ({ page }, testInfo) => {
  await assertBrowserAxe(page, testInfo);

  for (const componentName of ["Alert", "Badge", "Button", "Tabs", "TextField"] as const) {
    await page.getByRole("complementary", { name: "Component browser" })
      .getByRole("button", { name: componentName, exact: true })
      .click();
    await expect(page.getByRole("heading", { name: componentName, exact: true })).toBeVisible();
    testInfo.annotations.push({
      type: "snapshot",
      description: `${componentName} component preview`,
    });
    await expect(page).toHaveScreenshot(
      `component-${componentName.toLowerCase()}-1440x1024.png`,
      stableScreenshotOptions(page),
    );
    await assertBrowserAxe(page, testInfo);
  }
});

test("keeps tab semantics live only for the visible preview", async ({ page }) => {
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await previewTab.focus();
  await previewTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "API", exact: true }).first()).toBeFocused();
  await expect(page.getByRole("heading", { name: "TreatmentCardProps" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "iOS" })).toHaveCount(0);
  await assertBrowserAxe(page, test.info());
});

test("survives a 200 percent equivalent viewport and mobile flow", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 512 });
  await expect(page.getByRole("heading", { name: "TreatmentCard" })).toBeVisible();
  const overflowAtZoom = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflowAtZoom).toBeLessThanOrEqual(1);
  test.info().annotations.push({ type: "snapshot", description: "200 percent equivalent viewport" });
  await expect(page).toHaveScreenshot("zoom-equivalent-720x512.png", stableScreenshotOptions(page));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open component browser" }).click();
  const componentDialog = page.getByRole("dialog", { name: "Component browser" });
  await expect(componentDialog).toHaveClass(/is-open/);
  await expect(componentDialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(page.locator(".inspector")).toHaveAttribute("inert", "");
  await expect(page.locator(".topbar__brand")).toHaveAttribute("inert", "");
  await expect(page.locator(".topbar__nav")).toHaveAttribute("inert", "");
  await expect(page.locator(".topbar__actions")).toHaveAttribute("inert", "");
  await assertBrowserAxe(page, test.info());
  await componentDialog.getByRole("button", { name: "Close component browser" }).click();
  test.info().annotations.push({ type: "snapshot", description: "mobile component lab" });
  await expect(page).toHaveScreenshot("studio-mobile-390x844.png", stableScreenshotOptions(page));
  await assertBrowserAxe(page, test.info());
});

test("keeps status content inside the workspace at a common 1280 desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const measurements = await page.evaluate(() => {
    const main = document.querySelector("main");
    const strip = document.querySelector(".sync-strip");
    if (!main || !strip) throw new Error("Workspace status strip was not rendered.");
    const mainRect = main.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stripRightOverflow: stripRect.right - mainRect.right,
    };
  });
  expect(measurements.documentOverflow).toBeLessThanOrEqual(1);
  expect(measurements.stripRightOverflow).toBeLessThanOrEqual(1);
});

test("retains visible selection and focus in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await previewTab.focus();
  await expect(previewTab).toBeFocused();
  await expect(previewTab).toHaveCSS("outline-style", "solid");
});
