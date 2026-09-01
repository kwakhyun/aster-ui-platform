import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createFigmaVariablesPayload,
  fetchFigmaLocalVariables,
  normalizeFigmaChanges,
} from "../packages/figma-bridge/dist/index.js";

const projectRoot = process.cwd();
const fixtureBefore = "packages/figma-bridge/fixtures/local-variables.before.json";
const fixtureAfter = "packages/figma-bridge/fixtures/local-variables.after.json";
const fixtureOutput = "reports/figma-sync.json";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(projectRoot, relativePath), "utf8"));
}

const fixtureMode = process.argv.includes("--fixture") || process.argv.includes("--check");
const beforePath = fixtureMode ? fixtureBefore : argument("--before");
const afterPath = fixtureMode ? fixtureAfter : argument("--after");
const outputPath = fixtureMode ? fixtureOutput : argument("--output");
const collectionName = fixtureMode ? "Aster semantic tokens" : argument("--collection");
const modeName = fixtureMode ? "Coral" : argument("--mode");
const sourceTheme = fixtureMode ? "coral" : argument("--theme");
const sourceVersionText = fixtureMode ? "12" : argument("--source-version");
const syncedAt = fixtureMode ? "2026-09-01T09:51:00+09:00" : new Date().toISOString();
const fileKey = argument("--file-key");

if (!beforePath || !outputPath || !collectionName || !modeName || !sourceTheme || !sourceVersionText) {
  throw new Error(
    "Usage: --before <snapshot.json> (--after <snapshot.json> | --file-key <key>) "
    + "--collection <name> --mode <name> --theme <coral|ocean> --source-version <integer> --output <report.json>",
  );
}
const sourceVersion = Number(sourceVersionText);
if (!Number.isInteger(sourceVersion) || sourceVersion <= 0) {
  throw new Error("--source-version must be a positive integer.");
}

const before = await readJson(beforePath);
let after;
let transport;
if (fileKey) {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("FIGMA_ACCESS_TOKEN is required for live Figma sync.");
  const authKind = process.env.FIGMA_AUTH_MODE === "oauth" ? "oauth" : "figma-token";
  after = await fetchFigmaLocalVariables(fileKey, { kind: authKind, token });
  transport = {
    mode: "live-read",
    endpoint: "GET /v1/files/:file_key/variables/local",
    authentication: authKind === "oauth" ? "OAuth bearer token" : "X-Figma-Token",
  };
} else {
  if (!afterPath) throw new Error("Either --after or --file-key is required.");
  after = await readJson(afterPath);
  transport = {
    mode: "sanitized-fixture",
    endpoint: "GET /v1/files/:file_key/variables/local",
    authentication: "not used for fixture replay",
  };
}

const payload = createFigmaVariablesPayload(before, after, {
  collectionName,
  modeName,
  sourceVersion,
  sourceTheme,
  scopes: ["WEB", "IOS", "ANDROID"],
});
if (payload.changes.length === 0) throw new Error("No reviewable Figma alias changes were found.");
const review = normalizeFigmaChanges(payload, syncedAt);
const report = {
  schemaVersion: 1,
  transport,
  sourceContract: {
    collection: collectionName,
    mode: modeName,
    trackedPrefix: "semantic/",
    documentation: "https://developers.figma.com/docs/rest-api/variables-endpoints/",
    requiredScope: "file_variables:read",
  },
  payload,
  review,
  humanReview: {
    required: true,
    completed: false,
    note: "This command creates a review artifact. It never writes to Figma or source files.",
  },
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
const resolvedOutput = path.resolve(projectRoot, outputPath);

if (process.argv.includes("--check")) {
  const current = await readFile(resolvedOutput, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("Figma REST fixture report is out of date.");
    process.exitCode = 1;
  } else {
    console.log(`Figma REST fixture passed: ${review.validation.changeCount} alias changes require human review.`);
  }
} else {
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, serialized);
  console.log(`Wrote ${path.relative(projectRoot, resolvedOutput)} with ${review.validation.changeCount} reviewable changes.`);
}
