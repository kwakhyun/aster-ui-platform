import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createEvidenceReport, verifyEvidenceReport } from "./lib/provenance.mjs";

export const securityAuditCommand = "pnpm audit --prod --audit-level high --json";
export const securityAuditMaxAgeMs = 24 * 60 * 60 * 1_000;
const severities = ["info", "low", "moderate", "high", "critical"];

function normalizeVulnerabilities(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !severities.includes(key))) {
    throw new Error("Audit output is missing valid vulnerability counts.");
  }
  const counts = Object.fromEntries(severities.map((severity) => [severity, value[severity] ?? (severity === "info" ? 0 : undefined)]));
  if (Object.values(counts).some((count) => !Number.isSafeInteger(count) || count < 0)) {
    throw new Error("Audit vulnerability counts must be non-negative integers for every severity.");
  }
  return counts;
}

export function summarizeSecurityAudit(output) {
  const audit = JSON.parse(output);
  const vulnerabilities = normalizeVulnerabilities(audit?.metadata?.vulnerabilities);
  return {
    auditLevel: "high",
    vulnerabilities,
    knownVulnerabilities: Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0),
  };
}

function isPassingAuditSummary(summary) {
  try {
    const counts = normalizeVulnerabilities(summary?.vulnerabilities);
    return summary.auditLevel === "high"
      && summary.knownVulnerabilities === Object.values(counts).reduce((sum, count) => sum + count, 0)
      && counts.high === 0 && counts.critical === 0;
  } catch {
    return false;
  }
}

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function getCurrentDependencySnapshot(projectRoot) {
  return digest(await readFile(path.join(projectRoot, "pnpm-lock.yaml")));
}

export async function inspectReusableSecurityEvidence(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const report = options.report ?? await readFile(
    path.join(projectRoot, "reports/security-audit.json"),
    "utf8",
  ).then(JSON.parse).catch(() => null);
  if (!report || report.schemaVersion !== 5 || report.status !== "passed" || !isPassingAuditSummary(report)) {
    return { reusable: false, reason: "no passing audit evidence with verified severity counts is available" };
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
  if (report.dependencySnapshot !== currentSnapshot) {
    return { reusable: false, reason: "pnpm-lock.yaml changed after the last passing audit" };
  }

  return { reusable: true, report };
}

export async function recordSecurityEvidence(summary, projectRoot = process.cwd()) {
  if (!isPassingAuditSummary(summary)) {
    throw new Error("Cannot record passing audit evidence without valid counts and zero high/critical vulnerabilities.");
  }
  const outputPath = path.join(projectRoot, "reports/security-audit.json");
  const report = await createEvidenceReport({
    schemaVersion: 5,
    command: securityAuditCommand,
    scope: "Production dependency graph",
    dependencySnapshot: await getCurrentDependencySnapshot(projectRoot),
    auditLevel: summary.auditLevel,
    vulnerabilities: normalizeVulnerabilities(summary.vulnerabilities),
    knownVulnerabilities: summary.knownVulnerabilities,
    status: "passed",
  }, projectRoot);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Recorded production dependency audit: ${summary.knownVulnerabilities} known vulnerabilities; no high or critical findings.`);
}

const entryPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPath === import.meta.url) {
  const auditFile = process.argv[2];
  if (!auditFile) throw new Error("An audit JSON file is required. Prefer pnpm security:audit to run and record the audit together.");
  await recordSecurityEvidence(summarizeSecurityAudit(await readFile(auditFile, "utf8")));
}
