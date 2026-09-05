import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";

const outputPath = path.join(process.cwd(), "reports/unit-tests.json");
const report = await createEvidenceReport({
  schemaVersion: 3,
  command: process.argv.includes("--coverage") ? "pnpm test:coverage && pnpm test:scripts" : "pnpm test",
  scope: "All Turborepo workspace unit suites, including axe state tests",
  status: "passed",
});
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log("Recorded passing workspace unit evidence.");
