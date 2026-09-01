import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { createEvidenceReport } from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const buildRoot = path.join(projectRoot, "apps/studio/dist/client");
const reportPath = path.join(projectRoot, "reports/performance-budget.json");
const budgets = {
  javascriptGzipBytes: 190_000,
  cssGzipBytes: 35_000,
  largestImageBytes: 60_000,
  fontBytes: 120_000,
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }))).flat();
}

const files = await walk(buildRoot).catch(() => {
  throw new Error("Production build is missing. Run pnpm build before pnpm perf:check.");
});
let javascriptGzipBytes = 0;
let cssGzipBytes = 0;
const images = [];
let fontBytes = 0;
for (const file of files) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".js" || extension === ".css") {
    const gzipBytes = gzipSync(await readFile(file), { level: 9 }).byteLength;
    if (extension === ".js") javascriptGzipBytes += gzipBytes;
    else cssGzipBytes += gzipBytes;
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".avif"].includes(extension)) {
    images.push({ file: path.relative(buildRoot, file), bytes: (await stat(file)).size });
  }
  if ([".woff", ".woff2"].includes(extension)) fontBytes += (await stat(file)).size;
}
images.sort((left, right) => right.bytes - left.bytes);
const largestImageBytes = images[0]?.bytes ?? 0;
const failures = Object.entries(budgets).flatMap(([metric, budget]) => {
  const actual = { javascriptGzipBytes, cssGzipBytes, largestImageBytes, fontBytes }[metric];
  return actual > budget ? [`${metric}: ${actual} > ${budget}`] : [];
});
if (images.some((image) => image.file.endsWith(".png"))) failures.push("A PNG raster was shipped; responsive WebP is required.");
const report = await createEvidenceReport({
  schemaVersion: 3,
  command: "pnpm perf:check",
  budgets,
  actual: { javascriptGzipBytes, cssGzipBytes, largestImageBytes, fontBytes },
  images,
  failures,
  status: failures.length === 0 ? "passed" : "failed",
});
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  console.error(`Performance budget failed:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Performance budget passed: JS ${javascriptGzipBytes} B gzip, CSS ${cssGzipBytes} B gzip, largest image ${largestImageBytes} B, fonts ${fontBytes} B.`);
}
