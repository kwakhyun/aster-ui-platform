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

async function assertNoHorizontalOverflow(
  page: Page,
  label: string,
  selectors: readonly string[],
) {
  const overflows = await page.evaluate((selectorsToCheck) => {
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0;
    };
    const measurements = selectorsToCheck.flatMap((selector) => (
      [...document.querySelectorAll<HTMLElement>(selector)]
        .filter(isVisible)
        .flatMap((element) => {
          const overflow = element.scrollWidth - element.clientWidth;
          return overflow > 1 ? [{ selector, overflow }] : [];
        })
    ));
    const documentOverflow = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ) - document.documentElement.clientWidth;

    if (documentOverflow > 1) {
      measurements.unshift({ selector: "document", overflow: documentOverflow });
    }
    return measurements;
  }, selectors);

  expect(overflows, label).toEqual([]);
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

test("resolves swatches and compares pending changes independently of the preview theme", async ({ page }, testInfo) => {
  const focusChange = page.locator(".token-changes__list > button").filter({ hasText: "color.focus.ring" });
  await expect(focusChange.locator(".token-swatch").nth(0)).toHaveCSS("background-color", "rgb(255, 170, 161)");
  await expect(focusChange.locator(".token-swatch").nth(1)).toHaveCSS("background-color", "rgb(37, 99, 235)");
  await focusChange.click();
  const drawerChange = page.locator(".diff-drawer__changes article").filter({ hasText: "color.focus.ring" });
  await expect(drawerChange.locator(".token-swatch").nth(1)).toHaveCSS("background-color", "rgb(37, 99, 235)");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("tab", { name: "Tokens", exact: true }).click();
  await page.getByRole("combobox", { name: "Preview theme" }).selectOption("ocean");
  const before = page.locator('[data-phase="before"] .token-comparison__sample');
  const after = page.locator('[data-phase="after"] .token-comparison__sample');
  await expect(before.locator("button")).toHaveCSS("background-color", "rgb(255, 98, 87)");
  await expect(after.locator("button")).toHaveCSS("background-color", "rgb(190, 51, 45)");
  await expect(before.locator("button")).toHaveCSS("outline-color", "rgb(255, 170, 161)");
  await expect(after.locator("button")).toHaveCSS("outline-color", "rgb(37, 99, 235)");
  await expect(before).toHaveAttribute("inert", "");
  await assertBrowserAxe(page, testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(page, "mobile comparison", [".token-comparison", ".token-comparison__phase"]);
  await testInfo.attach("token-comparison-mobile", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});

test("keeps component browsing available when browser storage access is denied", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Access denied", "SecurityError"); },
    });
  });
  await page.reload();
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "TextField", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Search clinics" })).toBeVisible();
  await page.getByRole("button", { name: "Review changes", exact: true }).click();
  await page.getByRole("button", { name: "Complete review" }).click();
  await expect(page.getByText("The Figma review could not be saved.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Semantic tokens · v12" })).toBeVisible();
  await assertBrowserAxe(page, testInfo);
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

test("covers every shipped component preview in the browser", async ({ page }, testInfo) => {
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
  await expect(page.locator(".topbar__actions")).toHaveAttribute("inert", "");
  await assertBrowserAxe(page, test.info());
  await componentDialog.getByRole("button", { name: "Close component browser" }).click();
  test.info().annotations.push({ type: "snapshot", description: "mobile component lab" });
  await expect(page).toHaveScreenshot("studio-mobile-390x844.png", stableScreenshotOptions(page));
  await assertBrowserAxe(page, test.info());
});

test("keeps every status item inside the workspace across desktop breakpoints", async ({ page }) => {
  const viewportWidths = [
    821, 900, 1060, 1061, 1099, 1100, 1101, 1280, 1360, 1361, 1440, 1536, 1600,
  ];

  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 720 });
    const measurements = await page.evaluate(() => {
      const main = document.querySelector("main");
      const strip = document.querySelector<HTMLElement>(".sync-strip");
      if (!main || !strip) throw new Error("Workspace status strip was not rendered.");
      const mainRect = main.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      const visibleChildren = [...strip.children].filter((child) => {
        const style = getComputedStyle(child);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      const childRightOverflow = Math.max(
        0,
        ...visibleChildren.map((child) => child.getBoundingClientRect().right - stripRect.right),
      );
      const childLeftOverflow = Math.max(
        0,
        ...visibleChildren.map((child) => stripRect.left - child.getBoundingClientRect().left),
      );

      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        stripRightOverflow: stripRect.right - mainRect.right,
        stripContentOverflow: strip.scrollWidth - strip.clientWidth,
        childRightOverflow,
        childLeftOverflow,
      };
    });

    for (const [name, overflow] of Object.entries(measurements)) {
      expect(overflow, `${name} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

for (const width of [320, 390, 720, 820, 821, 900, 1024, 1100, 1101, 1280, 1361, 1440]) {
  test(`keeps component and reference panels inside a ${width}px workspace`, async ({ page }) => {
    const workspaceTabs = page.locator(".workspace__tabs");
    const platformTabs = page.locator(".workspace__platforms");

    await page.setViewportSize({ width, height: width <= 720 ? 844 : 900 });
    await workspaceTabs.getByRole("tab", { name: "Preview", exact: true }).click();
    await platformTabs.getByRole("tab", { name: "Web", exact: true }).click();
    await page.getByRole("button", { name: "Preview default state" }).click();
    await assertNoHorizontalOverflow(page, `web preview at ${width}px`, [
      ".main",
      ".workspace__toolbar",
      ".workspace__toolbar-actions",
      ".workspace__platforms",
      ".preview-canvas",
      ".preview-canvas__state-preview > .aster-treatment-card",
    ]);

    await workspaceTabs.getByRole("tab", { name: "API", exact: true }).click();
    await assertNoHorizontalOverflow(page, `API panel at ${width}px`, [
      ".main",
      ".api-panel",
      ".api-panel__grid",
    ]);

    await workspaceTabs.getByRole("tab", { name: "Tokens", exact: true }).click();
    await assertNoHorizontalOverflow(page, `token panel at ${width}px`, [
      ".main",
      ".token-map",
    ]);

    await workspaceTabs.getByRole("tab", { name: "Quality", exact: true }).click();
    await assertNoHorizontalOverflow(page, `quality panel at ${width}px`, [
      ".main",
      ".quality-panel",
    ]);

    await workspaceTabs.getByRole("tab", { name: "Preview", exact: true }).click();
    await platformTabs.getByRole("tab", { name: "iOS", exact: true }).click();
    await assertNoHorizontalOverflow(page, `native preview at ${width}px`, [
      ".main",
      ".workspace__toolbar",
      ".workspace__platforms",
      ".preview-canvas",
      ".native-artifact",
    ]);
  });
}

test("retains visible selection and focus in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await previewTab.focus();
  await expect(previewTab).toBeFocused();
  await expect(previewTab).toHaveCSS("outline-style", "solid");
});

test("workspace deep links survive reload and browser history", async ({ page }) => {
  await page.goto("/?component=Button&tab=tokens&theme=ocean&platform=ios");
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tokens", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("combobox", { name: "Preview theme" })).toHaveValue("ocean");
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("tab", { name: "iOS", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Preview theme" })).toHaveValue("ocean");
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Tokens", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(page.getByRole("tab", { name: "Preview", exact: true })).toHaveAttribute("aria-selected", "true");
});

for (const width of [390, 780, 1440]) {
  test(`overlays keep shortcuts and focus contained at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1024 });
    for (const name of ["Review changes", "Run rehearsal", "View details"]) {
      const trigger = page.getByRole("button", { name, exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveCount(1);
      await page.keyboard.press("Meta+k");
      await page.keyboard.press("Control+k");
      await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      await assertNoHorizontalOverflow(page, `${name} at ${width}px`, ["[role=dialog]"]);
      if (name === "View details") await assertBrowserAxe(page, testInfo);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });
}

test("quality details exposes inspectable evidence and downloads", async ({ page }) => {
  await page.getByRole("button", { name: "View details", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Quality details" });
  await expect(dialog.getByRole("heading", { name: "Recorded checks" })).toBeVisible();
  await dialog.getByText("Full evidence identifiers", { exact: true }).click();
  await expect(dialog.locator(".quality-details__identifiers dd").first()).toContainText("workspace:");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("link", { name: "Download all quality evidence (JSON)" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("aster-quality-evidence.json");
  expect(await download.failure()).toBeNull();
});
