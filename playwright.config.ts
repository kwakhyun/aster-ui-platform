import { defineConfig } from "@playwright/test";

const snapshotPlatform = process.platform;

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/playwright",
  snapshotPathTemplate: `{testDir}/__screenshots__/${snapshotPlatform}/{arg}{ext}`,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.003 },
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["line"], ["./tests/visual/evidence-reporter.mjs"]],
  use: {
    baseURL: "http://127.0.0.1:4180",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm --filter @aster-ui/studio preview --host 127.0.0.1 --port 4180 --strictPort",
    port: 4180,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
