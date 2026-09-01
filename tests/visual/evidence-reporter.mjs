import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createEvidenceReport } from "../../scripts/lib/provenance.mjs";

class EvidenceReporter {
  passed = 0;
  failed = 0;
  skipped = 0;
  snapshots = 0;
  accessibilityChecks = 0;

  onTestEnd(test, result) {
    if (result.status === "passed") this.passed += 1;
    else if (result.status === "skipped") this.skipped += 1;
    else this.failed += 1;
    this.snapshots += test.annotations.filter((annotation) => annotation.type === "snapshot").length;
    this.accessibilityChecks += test.annotations.filter((annotation) => annotation.type === "axe").length;
  }

  async onEnd(result) {
    const report = await createEvidenceReport({
      schemaVersion: 3,
      command: "pnpm test:visual",
      browser: process.env.CI ? "Playwright Chromium" : "Installed Google Chrome",
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      snapshots: this.snapshots,
      accessibilityChecks: this.accessibilityChecks,
      status: result.status === "passed" && this.failed === 0 ? "passed" : "failed",
    });
    const output = path.resolve("reports/visual-regression.json");
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  }
}

export default EvidenceReporter;
