import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createEvidenceReport,
  getSourceGitCommit,
  getSourceRevision,
  verifyEvidenceReport,
} from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "apps/studio/src/generated/quality-evidence.json");

async function readReport(name) {
  return readFile(path.join(projectRoot, "reports", name), "utf8").then(JSON.parse).catch(() => null);
}

const [unit, api, visual, performance, security] = await Promise.all([
  readReport("unit-tests.json"),
  readReport("api-compatibility.json"),
  readReport("visual-regression.json"),
  readReport("performance-budget.json"),
  readReport("security-audit.json"),
]);
const sourceRevision = await getSourceRevision(projectRoot);
const sourceGitCommit = getSourceGitCommit(projectRoot);

function isPassingCurrentReport(report) {
  return report?.status === "passed"
    && verifyEvidenceReport(report, sourceRevision, sourceGitCommit);
}

function evidenceFields(report) {
  return {
    generatedAt: report?.generatedAt ?? null,
    sourceRevision: report?.sourceRevision ?? null,
    gitCommit: report?.gitCommit ?? null,
    runId: report?.runId ?? null,
    evidenceDigest: report?.artifactDigest ?? null,
  };
}

const checks = [
  {
    id: "unit",
    label: "Unit and accessibility states",
    status: isPassingCurrentReport(unit) ? "passed" : "attention",
    detail: isPassingCurrentReport(unit)
      ? "Workspace unit suites and the axe UI-state matrix exited successfully."
      : "A passing unit report for this exact source revision is not present.",
    command: "pnpm test",
    ...evidenceFields(unit),
  },
  {
    id: "api",
    label: "API compatibility",
    status: isPassingCurrentReport(api) ? "passed" : "attention",
    detail: isPassingCurrentReport(api)
      ? `${api.checkedProps} baseline props checked; ${api.breakingChanges.length} breaking changes.`
      : "The API comparison is missing, failing, or stale for this source revision.",
    command: "pnpm api:check",
    ...evidenceFields(api),
  },
  {
    id: "visual",
    label: "Browser visual and accessibility",
    status: isPassingCurrentReport(visual) ? "passed" : "attention",
    detail: isPassingCurrentReport(visual)
      ? `${visual.passed} browser cases passed with ${visual.snapshots} snapshot assertions and real-browser axe checks.`
      : "A passing browser report for this exact source revision is not present.",
    command: "pnpm test:visual",
    ...evidenceFields(visual),
  },
  {
    id: "performance",
    label: "Performance budget",
    status: isPassingCurrentReport(performance) ? "passed" : "attention",
    detail: isPassingCurrentReport(performance)
      ? "Production JS, CSS, font, and responsive image budgets passed."
      : "The performance report is missing, failing, or stale for this source revision.",
    command: "pnpm perf:check",
    ...evidenceFields(performance),
  },
  {
    id: "security",
    label: "Production dependency audit",
    status: isPassingCurrentReport(security) ? "passed" : "attention",
    detail: isPassingCurrentReport(security)
      ? `${security.knownVulnerabilities} known production dependency vulnerabilities reported.`
      : "A registry-backed dependency audit for this source revision is not present.",
    command: "pnpm audit --prod --audit-level high",
    ...evidenceFields(security),
  },
];
const evidence = await createEvidenceReport({
  schemaVersion: 3,
  checks,
}, projectRoot);
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => null);
  const generatedAt = Date.parse(current?.generatedAt ?? "");
  const isCurrent = current?.schemaVersion === 3
    && Number.isFinite(generatedAt)
    && typeof current.runId === "string"
    && verifyEvidenceReport(current, sourceRevision, sourceGitCommit)
    && JSON.stringify(current.checks) === JSON.stringify(evidence.checks);
  if (!isCurrent) {
    console.error("Studio quality evidence is out of date.");
    process.exitCode = 1;
  } else {
    console.log("Studio quality evidence matches repository reports.");
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized);
  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}
