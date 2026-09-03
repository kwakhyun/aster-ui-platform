import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const argumentsList = process.argv.slice(2);
const concurrencyIndex = argumentsList.indexOf("--concurrency");
const concurrencyValue = concurrencyIndex >= 0 ? argumentsList[concurrencyIndex + 1] : "4";
const concurrency = Number(concurrencyValue);

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
  throw new Error("--concurrency must be an integer between 1 and 16.");
}
if (concurrencyIndex >= 0) {
  if (!concurrencyValue || concurrencyValue.startsWith("--")) {
    throw new Error("--concurrency requires a value.");
  }
  argumentsList.splice(concurrencyIndex, 2);
}
if (argumentsList.length === 0 || argumentsList.some((argument) => argument.startsWith("--"))) {
  throw new Error("Usage: node scripts/run-parallel-checks.mjs [--concurrency 4] <script> [...scripts]");
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const unknownScripts = argumentsList.filter((script) => typeof packageJson.scripts?.[script] !== "string");
if (unknownScripts.length > 0) {
  throw new Error(`Unknown package scripts: ${unknownScripts.join(", ")}`);
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const queue = [...argumentsList];
const failures = [];
let stopScheduling = false;

function runScript(script) {
  console.log(`[parallel-checks] ${script}: started`);
  return new Promise((resolve) => {
    const child = spawn(executable, ["run", script], {
      cwd: projectRoot,
      env: process.env,
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.once("error", (error) => finish({ script, error }));
    child.once("close", (code, signal) => finish({ script, code, signal }));
  });
}

async function worker() {
  while (!stopScheduling) {
    const script = queue.shift();
    if (!script) return;
    const result = await runScript(script);
    if (result.code === 0) {
      console.log(`[parallel-checks] ${script}: passed`);
      continue;
    }
    failures.push(result);
    stopScheduling = true;
  }
}

await Promise.all(
  Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker(),
  ),
);

if (failures.length > 0) {
  for (const failure of failures) {
    const reason = failure.error instanceof Error
      ? failure.error.message
      : failure.signal
        ? `terminated by ${failure.signal}`
        : `exited with code ${failure.code ?? 1}`;
    console.error(`[parallel-checks] ${failure.script}: ${reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[parallel-checks] ${argumentsList.length} checks passed with concurrency ${concurrency}.`);
}
