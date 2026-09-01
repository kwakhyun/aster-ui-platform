import process from "node:process";
import {
  createEvidenceReport,
  verifyEvidenceReport,
} from "./lib/provenance.mjs";

const report = await createEvidenceReport({
  schemaVersion: 3,
  command: "provenance self-check",
  status: "passed",
});
const tampered = { ...report, status: "failed" };
const tamperedCommit = { ...report, gitCommit: "a".repeat(40) };
const staleRevision = `${report.sourceRevision}:stale`;

if (!verifyEvidenceReport(report, report.sourceRevision)
  || verifyEvidenceReport(tampered, report.sourceRevision)
  || verifyEvidenceReport(tamperedCommit, report.sourceRevision)
  || verifyEvidenceReport(report, staleRevision)) {
  console.error("Evidence provenance self-check failed.");
  process.exitCode = 1;
} else {
  console.log("Evidence provenance passed: current reports verify, tampered and stale reports fail.");
}
