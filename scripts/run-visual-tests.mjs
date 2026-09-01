import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const qualityEvidence = JSON.parse(
  readFileSync("apps/studio/src/generated/quality-evidence.json", "utf8"),
);
if (typeof qualityEvidence.sourceRevision !== "string"
  || !/^workspace:[a-f0-9]{20}$/.test(qualityEvidence.sourceRevision)
  || !Array.isArray(qualityEvidence.checks)
  || qualityEvidence.checks.length === 0
  || !qualityEvidence.checks.every((check) => check.status === "passed")) {
  throw new Error("Visual tests require a checked-in passing evidence fixture.");
}
const build = spawnSync(executable, ["build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ASTER_VISUAL_FIXTURE_MODE: "true",
    ASTER_VISUAL_FIXTURE_REVISION: qualityEvidence.sourceRevision,
  },
});
if (build.status !== 0) process.exit(build.status ?? 1);
const argumentsList = ["exec", "playwright", "test"];
if (process.argv.includes("--update-snapshots")) argumentsList.push("--update-snapshots");
const tests = spawnSync(executable, argumentsList, { stdio: "inherit" });
process.exit(tests.status ?? 1);
