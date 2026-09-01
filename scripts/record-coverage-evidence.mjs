import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "reports/coverage.json");
const coveragePaths = {
  "Clinic consumer": "apps/clinic-web/coverage/coverage-summary.json",
  "Backoffice consumer": "apps/backoffice-web/coverage/coverage-summary.json",
  Tokens: "packages/tokens/coverage/coverage-summary.json",
  "Figma bridge": "packages/figma-bridge/coverage/coverage-summary.json",
  React: "packages/react/coverage/coverage-summary.json",
  Studio: "apps/studio/coverage/coverage-summary.json",
};

function validateMetric(scope, metric, value) {
  if (!value || typeof value !== "object") {
    throw new Error(`${scope} coverage is missing ${metric}.`);
  }
  for (const field of ["total", "covered", "skipped", "pct"]) {
    if (!Number.isFinite(value[field])) {
      throw new Error(`${scope} ${metric}.${field} must be finite.`);
    }
  }
  if (value.pct < 0 || value.pct > 100 || value.covered > value.total) {
    throw new Error(`${scope} ${metric} coverage is outside its valid range.`);
  }
}

const coverage = {};
for (const [scope, relativePath] of Object.entries(coveragePaths)) {
  const summary = JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
  if (!summary.total || typeof summary.total !== "object") {
    throw new Error(`${scope} coverage summary is missing its total.`);
  }
  for (const metric of ["statements", "branches", "functions", "lines"]) {
    validateMetric(scope, metric, summary.total[metric]);
  }
  coverage[scope] = summary.total;
}

const report = await createEvidenceReport({
  schemaVersion: 1,
  command: "pnpm test:coverage",
  status: "passed",
  coverage,
});
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Recorded provenance-bound coverage evidence for ${Object.keys(coverage).length} scopes.`);
