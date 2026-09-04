import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readPublicApiSurface } from "./lib/public-api-surface.mjs";

const projectRoot = process.cwd();
const packageJson = JSON.parse(await readFile(
  path.join(projectRoot, "packages/react/package.json"),
  "utf8",
));
const outputPath = path.join(projectRoot, "packages/react/public-api-baseline.json");
const baseline = {
  schemaVersion: 1,
  package: packageJson.name,
  version: packageJson.version,
  entryPoint: "packages/react/src/index.ts",
  exports: readPublicApiSurface(projectRoot),
};

await writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`Generated ${path.relative(projectRoot, outputPath)} with ${baseline.exports.length} public exports.`);
