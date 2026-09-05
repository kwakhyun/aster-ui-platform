import { expect, test } from "@playwright/test";

interface Sample {
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number;
}

test("measures cold-load rendering under a fixed desktop profile", async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const profile = {
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    cpuSlowdown: 4,
    latencyMs: 40,
    downloadBytesPerSecond: 1_250_000,
    uploadBytesPerSecond: 625_000,
    cache: "disabled",
    samples: 3,
    observationAfterAssetsMs: 1_000,
  };
  const budgets = { medianFcpMs: 3_000, medianLcpMs: 4_000, maxCls: 0.1 };
  const samples: Sample[] = [];
  for (let run = 0; run < profile.samples; run += 1) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      locale: "en-US",
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: profile.latencyMs,
        downloadThroughput: profile.downloadBytesPerSecond,
        uploadThroughput: profile.uploadBytesPerSecond,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuSlowdown });
      await page.addInitScript(() => {
        const metrics: Sample = { fcpMs: null, lcpMs: null, cls: 0 };
        const required = ["paint", "largest-contentful-paint", "layout-shift"];
        if (required.some((type) => !PerformanceObserver.supportedEntryTypes.includes(type))) {
          throw new Error("Required browser performance observers are unavailable.");
        }
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") metrics.fcpMs = entry.startTime;
          }
        }).observe({ type: "paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) metrics.lcpMs = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        let start = 0;
        let previous = 0;
        let session = 0;
        new PerformanceObserver((list) => {
          for (const item of list.getEntries()) {
            const entry = item as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (entry.hadRecentInput) continue;
            if (session > 0 && entry.startTime - previous < 1_000 && entry.startTime - start < 5_000) {
              session += entry.value;
            } else {
              start = entry.startTime;
              session = entry.value;
            }
            previous = entry.startTime;
            metrics.cls = Math.max(metrics.cls, session);
          }
        }).observe({ type: "layout-shift", buffered: true });
        Object.assign(window, { __asterLoadMetrics: metrics });
      });
      await page.goto(baseURL!);
      await expect(page.getByRole("heading", { name: "TreatmentCard", exact: true })).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode()));
      });
      // A defined observation window captures paint and late layout shifts after assets settle.
      await page.waitForTimeout(profile.observationAfterAssetsMs);
      const sample = await page.evaluate(() => (
        window as unknown as { __asterLoadMetrics: Sample }
      ).__asterLoadMetrics);
      expect(errors).toEqual([]);
      for (const value of [sample.fcpMs, sample.lcpMs]) {
        expect(typeof value).toBe("number");
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
      }
      expect(Number.isFinite(sample.cls)).toBe(true);
      samples.push(sample);
    } finally {
      await context.close();
    }
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[1]!;
  const actual = {
    medianFcpMs: median(samples.map((sample) => sample.fcpMs!)),
    medianLcpMs: median(samples.map((sample) => sample.lcpMs!)),
    maxCls: Math.max(...samples.map((sample) => sample.cls)),
  };
  const failures = (Object.keys(budgets) as Array<keyof typeof budgets>)
    .filter((metric) => actual[metric] > budgets[metric]);
  await testInfo.attach("browser-performance", {
    body: JSON.stringify({
      mode: "lab-initial-load",
      browserVersion: browser.version(),
      platform: process.platform,
      profile,
      budgets,
      samples,
      actual,
      status: failures.length === 0 ? "passed" : "failed",
    }),
    contentType: "application/json",
  });
  expect(failures, JSON.stringify(actual)).toEqual([]);
});
