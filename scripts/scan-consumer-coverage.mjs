import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";
import { scanJsxUsages } from "./lib/scan-jsx-usage.mjs";

const projectRoot = process.cwd();
const appsRoot = path.join(projectRoot, "apps");
const outputPath = path.join(projectRoot, "reports/consumer-coverage.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.(ts|tsx)$/.test(entry.name)
      && !/\.(test|example|stories)\./.test(entry.name)
      ? [target]
      : [];
  }));
  return nested.flat();
}

const appDirectories = (await readdir(appsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(appsRoot, entry.name));
const consumers = [];

for (const appDirectory of appDirectories) {
  const manifestPath = path.join(appDirectory, "design-system-consumer.json");
  const manifest = await readFile(manifestPath, "utf8").then(JSON.parse).catch(() => null);
  if (!manifest) continue;

  const sourceFiles = (await Promise.all(
    manifest.sourceRoots.map((sourceRoot) => walk(path.join(appDirectory, sourceRoot))),
  )).flat();
  const componentsToScan = [...manifest.targetComponents, ...manifest.deprecatedComponents];
  const componentUsages = Object.fromEntries(
    manifest.targetComponents.map((component) => [component, 0]),
  );
  const deprecatedUsages = Object.fromEntries(
    manifest.deprecatedComponents.map((component) => [component, 0]),
  );
  for (const file of sourceFiles) {
    const counts = scanJsxUsages(
      await readFile(file, "utf8"),
      file,
      manifest.package,
      componentsToScan,
    );
    for (const component of manifest.targetComponents) {
      componentUsages[component] += counts[component] ?? 0;
    }
    for (const component of manifest.deprecatedComponents) {
      deprecatedUsages[component] += counts[component] ?? 0;
    }
  }
  const coveredTargets = Object.values(componentUsages).filter((count) => count > 0).length;
  consumers.push({
    consumer: manifest.consumer,
    package: manifest.package,
    filesScanned: sourceFiles.length,
    declaredTargets: manifest.targetComponents.length,
    coveredTargets,
    coverageRate: manifest.targetComponents.length === 0
      ? 0
      : coveredTargets / manifest.targetComponents.length,
    componentUsages,
    deprecatedUsages,
  });
}

const declaredTargets = consumers.reduce((sum, consumer) => sum + consumer.declaredTargets, 0);
const coveredTargets = consumers.reduce((sum, consumer) => sum + consumer.coveredTargets, 0);
const deprecatedUsageCount = consumers.reduce(
  (sum, consumer) => sum + Object.values(consumer.deprecatedUsages).reduce((subtotal, count) => subtotal + count, 0),
  0,
);
const status = consumers.length > 0
  && declaredTargets > 0
  && declaredTargets === coveredTargets
  && deprecatedUsageCount === 0
  ? "passed"
  : "action-required";
const report = await createEvidenceReport({
  schemaVersion: 4,
  metric: "declared-repository-sample-coverage",
  scope: "repository-sample-only",
  organizationAdoptionMetric: false,
  denominator: "Component targets explicitly declared by each repository sample consumer",
  consumerCount: consumers.length,
  declaredTargets,
  coveredTargets,
  coverageRate: declaredTargets === 0 ? 0 : coveredTargets / declaredTargets,
  deprecatedUsageCount,
  interpretation: "Scanner behavior evidence only; not an organization adoption or product outcome metric",
  consumers,
  status,
});
const serialized = `${JSON.stringify(report, null, 2)}\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized);
if (process.argv.includes("--check") && status !== "passed") {
  console.error(serialized);
  process.exitCode = 1;
} else {
  console.log(`Repository sample coverage ${status}: ${coveredTargets}/${declaredTargets} declared targets across ${consumers.length} sample consumer(s); not an organization adoption metric.`);
}
