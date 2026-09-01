import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createEvidenceReport } from "./lib/provenance.mjs";
import { scanJsxUsages } from "./lib/scan-jsx-usage.mjs";

const projectRoot = process.cwd();
const appsRoot = path.join(projectRoot, "apps");
const outputPath = path.join(projectRoot, "reports/adoption.json");

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
  const componentsToScan = [...manifest.eligibleComponents, ...manifest.deprecatedComponents];
  const componentUsages = Object.fromEntries(
    manifest.eligibleComponents.map((component) => [component, 0]),
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
    for (const component of manifest.eligibleComponents) {
      componentUsages[component] += counts[component] ?? 0;
    }
    for (const component of manifest.deprecatedComponents) {
      deprecatedUsages[component] += counts[component] ?? 0;
    }
  }
  const adoptedComponents = Object.values(componentUsages).filter((count) => count > 0).length;
  consumers.push({
    consumer: manifest.consumer,
    package: manifest.package,
    filesScanned: sourceFiles.length,
    eligibleComponents: manifest.eligibleComponents.length,
    adoptedComponents,
    adoptionRate: manifest.eligibleComponents.length === 0
      ? 0
      : adoptedComponents / manifest.eligibleComponents.length,
    componentUsages,
    deprecatedUsages,
  });
}

const eligibleComponents = consumers.reduce((sum, consumer) => sum + consumer.eligibleComponents, 0);
const adoptedComponents = consumers.reduce((sum, consumer) => sum + consumer.adoptedComponents, 0);
const deprecatedUsageCount = consumers.reduce(
  (sum, consumer) => sum + Object.values(consumer.deprecatedUsages).reduce((subtotal, count) => subtotal + count, 0),
  0,
);
const status = consumers.length > 0
  && eligibleComponents > 0
  && eligibleComponents === adoptedComponents
  && deprecatedUsageCount === 0
  ? "healthy"
  : "action-required";
const report = await createEvidenceReport({
  schemaVersion: 3,
  denominator: "Components explicitly declared eligible by each consumer manifest",
  consumerCount: consumers.length,
  eligibleComponents,
  adoptedComponents,
  adoptionRate: eligibleComponents === 0 ? 0 : adoptedComponents / eligibleComponents,
  deprecatedUsageCount,
  confidence: consumers.length === 1
    ? "single-declared-consumer; portfolio signal only"
    : "multi-consumer repository scan",
  consumers,
  status,
});
const serialized = `${JSON.stringify(report, null, 2)}\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized);
if (process.argv.includes("--check") && status !== "healthy") {
  console.error(serialized);
  process.exitCode = 1;
} else {
  console.log(`Adoption ${status}: ${adoptedComponents}/${eligibleComponents} eligible components across ${consumers.length} declared consumer(s).`);
}
