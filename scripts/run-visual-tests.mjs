import { spawnSync } from "node:child_process";
import process from "node:process";

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const build = spawnSync(executable, ["build"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
const argumentsList = ["exec", "playwright", "test"];
if (process.argv.includes("--update-snapshots")) argumentsList.push("--update-snapshots");
const tests = spawnSync(executable, argumentsList, { stdio: "inherit" });
process.exit(tests.status ?? 1);
