import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packageRoot = path.join(projectRoot, "packages/react");
const distRoot = path.join(packageRoot, "dist");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }))).flat();
}

const files = await walk(distRoot);
const relativeFiles = files.map((file) => path.relative(distRoot, file).split(path.sep).join("/"));
const forbidden = relativeFiles.filter((file) =>
  /(^|\/)(test|__tests__)(\/|$)|\.(test|spec)\.|(^|\/)setup\.(js|d\.ts)$/.test(file)
);
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const exportedPaths = Object.values(packageJson.exports).flatMap((entry) =>
  typeof entry === "string" ? [entry] : Object.values(entry)
);
const missingExports = [];
for (const exportedPath of exportedPaths) {
  const target = path.join(packageRoot, exportedPath);
  try {
    await access(target);
  } catch {
    missingExports.push(exportedPath);
  }
}

if (forbidden.length > 0 || missingExports.length > 0) {
  if (forbidden.length > 0) console.error(`Forbidden package files:\n${forbidden.join("\n")}`);
  if (missingExports.length > 0) console.error(`Missing package exports:\n${missingExports.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`React package contents passed: ${relativeFiles.length} files, ${exportedPaths.length} exports, no test artifacts.`);
}
