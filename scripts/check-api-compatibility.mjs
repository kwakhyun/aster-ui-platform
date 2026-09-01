import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const baselinePath = path.join(projectRoot, "packages/react/api-baseline.json");
const manifestPath = path.join(projectRoot, "packages/react/component-manifest.json");
const reportPath = path.join(projectRoot, "reports/api-compatibility.json");
const [baseline, manifest] = await Promise.all([
  readFile(baselinePath, "utf8").then(JSON.parse),
  readFile(manifestPath, "utf8").then(JSON.parse),
]);
const currentByName = new Map(manifest.props.map((prop) => [prop.name, prop]));
const breakingChanges = [];

const scalarContracts = [
  ["component name", baseline.component, manifest.name],
  ["package name", baseline.package, manifest.package],
  ["forwarded ref", baseline.forwardsRef, manifest.forwardsRef],
  ["article attribute forwarding", baseline.extendsArticleAttributes, manifest.extendsArticleAttributes],
];
for (const [label, expected, current] of scalarContracts) {
  if (current !== expected) breakingChanges.push(`${label}: ${String(expected)} -> ${String(current)}`);
}
for (const field of ["platforms", "crossPlatformTokenArtifacts"]) {
  const currentValues = new Set(manifest[field] ?? []);
  for (const expected of baseline[field] ?? []) {
    if (!currentValues.has(expected)) breakingChanges.push(`${field}: removed ${expected}`);
  }
}

for (const expected of baseline.props) {
  const current = currentByName.get(expected.name);
  if (!current) {
    breakingChanges.push(`${expected.name}: removed`);
    continue;
  }
  if (current.type !== expected.type) breakingChanges.push(`${expected.name}: type changed`);
  if (!expected.required && current.required) breakingChanges.push(`${expected.name}: became required`);
  if (current.default !== expected.default) breakingChanges.push(`${expected.name}: default changed`);
}

const additions = manifest.props
  .filter((prop) => !baseline.props.some((expected) => expected.name === prop.name))
  .map((prop) => prop.name);
const report = await createEvidenceReport({
  schemaVersion: 3,
  baselineVersion: baseline.version,
  currentVersion: manifest.version,
  checkedProps: baseline.props.length,
  additions,
  breakingChanges,
  status: breakingChanges.length === 0 ? "passed" : "failed",
  command: "pnpm api:check",
});
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (breakingChanges.length > 0) {
  console.error(`API compatibility failed:\n${breakingChanges.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`API compatibility passed against ${baseline.version}: ${baseline.props.length} props checked.`);
}
