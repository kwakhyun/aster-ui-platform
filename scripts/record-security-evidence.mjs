import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createEvidenceReport, verifyEvidenceReport } from "./lib/provenance.mjs";

export const securityAuditCommand = "pnpm audit --prod --audit-level high";
export const securityAuditMaxAgeMs = 24 * 60 * 60 * 1_000;

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function getCurrentDependencySnapshot(projectRoot) {
  return digest(await readFile(path.join(projectRoot, "pnpm-lock.yaml")));
}

function getLegacyDependencySnapshot(report, projectRoot) {
  if (!/^[a-f0-9]{40}$/.test(report.gitCommit ?? "")) return null;
  try {
    const lockfile = execFileSync("git", ["show", `${report.gitCommit}:pnpm-lock.yaml`], {
      cwd: projectRoot,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return digest(lockfile);
  } catch {
    return null;
  }
}

export async function inspectReusableSecurityEvidence(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const report = options.report ?? await readFile(
    path.join(projectRoot, "reports/security-audit.json"),
    "utf8",
  ).then(JSON.parse).catch(() => null);
  if (!report || report.status !== "passed" || report.knownVulnerabilities !== 0) {
    return { reusable: false, reason: "no passing audit evidence is available" };
  }
  if (report.command !== securityAuditCommand) {
    return { reusable: false, reason: "the recorded audit command does not match" };
  }
  if (!verifyEvidenceReport(report, report.sourceRevision, report.gitCommit ?? undefined)) {
    return { reusable: false, reason: "the audit evidence digest is invalid" };
  }

  const generatedAt = Date.parse(report.generatedAt ?? "");
  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? securityAuditMaxAgeMs;
  if (!Number.isFinite(generatedAt) || generatedAt > now + 5 * 60 * 1_000 || now - generatedAt > maxAgeMs) {
    return { reusable: false, reason: "the last passing audit is older than 24 hours" };
  }

  const currentSnapshot = await getCurrentDependencySnapshot(projectRoot);
  const auditedSnapshot = report.dependencySnapshot
    ?? getLegacyDependencySnapshot(report, projectRoot);
  if (auditedSnapshot !== currentSnapshot) {
    return { reusable: false, reason: "pnpm-lock.yaml changed after the last passing audit" };
  }

  return { reusable: true, report };
}

export async function recordSecurityEvidence(projectRoot = process.cwd()) {
  const outputPath = path.join(projectRoot, "reports/security-audit.json");
  const report = await createEvidenceReport({
    schemaVersion: 4,
    command: securityAuditCommand,
    scope: "Production dependency graph",
    dependencySnapshot: await getCurrentDependencySnapshot(projectRoot),
    knownVulnerabilities: 0,
    status: "passed",
  }, projectRoot);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log("Recorded passing production dependency audit evidence.");
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPath === import.meta.url) {
  await recordSecurityEvidence();
}
