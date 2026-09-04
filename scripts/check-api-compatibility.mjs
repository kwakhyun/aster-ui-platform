import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";
import {
  comparePublicApiSurface,
  readPublicApiSurface,
} from "./lib/public-api-surface.mjs";

const projectRoot = process.cwd();
const baselinePath = path.join(projectRoot, "packages/react/api-baseline.json");
const publicApiBaselinePath = path.join(projectRoot, "packages/react/public-api-baseline.json");
const manifestPath = path.join(projectRoot, "packages/react/component-manifest.json");
const reportPath = path.join(projectRoot, "reports/api-compatibility.json");
const [baseline, publicApiBaseline, manifest] = await Promise.all([
  readFile(baselinePath, "utf8").then(JSON.parse),
  readFile(publicApiBaselinePath, "utf8").then(JSON.parse),
  readFile(manifestPath, "utf8").then(JSON.parse),
]);
const currentComponents = new Map(manifest.components.map((component) => [component.name, component]));
const breakingChanges = [];
const currentExports = readPublicApiSurface(projectRoot);
const exportComparison = comparePublicApiSurface(publicApiBaseline.exports, currentExports);
breakingChanges.push(...exportComparison.breakingChanges);

const scalarContracts = [
  ["package name", baseline.package, manifest.package],
  ["public API package name", baseline.package, publicApiBaseline.package],
  ["public API baseline schema", 1, publicApiBaseline.schemaVersion],
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

let checkedProps = 0;
const additions = [];
for (const expectedComponent of baseline.components) {
  const currentComponent = currentComponents.get(expectedComponent.name);
  if (!currentComponent) {
    breakingChanges.push(`${expectedComponent.name}: component removed`);
    continue;
  }
  if (currentComponent.forwardsRef !== expectedComponent.forwardsRef) {
    breakingChanges.push(`${expectedComponent.name}: forwarded ref changed`);
  }
  if (currentComponent.extendsElementAttributes !== expectedComponent.extendsElementAttributes) {
    breakingChanges.push(`${expectedComponent.name}: element attribute contract changed`);
  }
  const currentProps = new Map(currentComponent.props.map((prop) => [prop.name, prop]));
  for (const expected of expectedComponent.props) {
    checkedProps += 1;
    const current = currentProps.get(expected.name);
    if (!current) {
      breakingChanges.push(`${expectedComponent.name}.${expected.name}: removed`);
      continue;
    }
    if (current.type !== expected.type) breakingChanges.push(`${expectedComponent.name}.${expected.name}: type changed`);
    if (!expected.required && current.required) breakingChanges.push(`${expectedComponent.name}.${expected.name}: became required`);
    if (current.default !== expected.default) breakingChanges.push(`${expectedComponent.name}.${expected.name}: default changed`);
  }
  for (const current of currentComponent.props) {
    if (!expectedComponent.props.some((expected) => expected.name === current.name)) {
      additions.push(`${expectedComponent.name}.${current.name}`);
    }
  }
}

for (const component of manifest.components) {
  if (!baseline.components.some((expected) => expected.name === component.name)) {
    additions.push(component.name);
  }
}
const report = await createEvidenceReport({
  schemaVersion: 5,
  baselineVersion: baseline.version,
  currentVersion: manifest.version,
  checkedComponents: baseline.components.length,
  checkedProps,
  checkedExports: publicApiBaseline.exports.length,
  exportAdditions: exportComparison.additions,
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
  console.log(`API compatibility passed against ${baseline.version}: ${baseline.components.length} components, ${checkedProps} props, and ${publicApiBaseline.exports.length} public exports checked.`);
}
