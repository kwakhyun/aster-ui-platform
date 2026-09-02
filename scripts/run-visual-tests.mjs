import { spawnSync } from "node:child_process";
import process from "node:process";
import { getSourceRevision } from "./lib/provenance.mjs";

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const sourceRevision = await getSourceRevision();
if (!/^workspace:[a-f0-9]{20}$/.test(sourceRevision)) {
  throw new Error("Visual tests require a valid source revision.");
}
const build = spawnSync(executable, ["build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ASTER_VISUAL_FIXTURE_MODE: "true",
    ASTER_VISUAL_FIXTURE_REVISION: sourceRevision,
  },
});
if (build.status !== 0) process.exit(build.status ?? 1);
const argumentsList = ["exec", "playwright", "test"];
if (process.argv.includes("--update-snapshots")) argumentsList.push("--update-snapshots");
const tests = spawnSync(executable, argumentsList, { stdio: "inherit" });
process.exit(tests.status ?? 1);
