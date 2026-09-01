import process from "node:process";
import {
  createEvidenceReport,
  getSourceFiles,
  getSourceGitCommit,
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
const sourceGitCommit = getSourceGitCommit();
const sourceFiles = new Set((await getSourceFiles()).map(({ relative }) => relative));
const requiredSourceFiles = [
  ".github/workflows/ci.yml",
  "Dockerfile",
  "ai/prompts/design-system-proposal.md",
  "docs/case-study.md",
  "examples/migration/PrimaryButton.before.tsx",
  "infra/k8s/aster-ui.yaml",
];
const missingSourceFiles = requiredSourceFiles.filter((file) => !sourceFiles.has(file));

if (!verifyEvidenceReport(report, report.sourceRevision)
  || !verifyEvidenceReport(report, report.sourceRevision, sourceGitCommit)
  || verifyEvidenceReport(tampered, report.sourceRevision)
  || verifyEvidenceReport(tamperedCommit, report.sourceRevision)
  || verifyEvidenceReport(report, staleRevision)
  || report.gitCommit !== sourceGitCommit
  || sourceFiles.has("apps/studio/src/generated/quality-evidence.json")
  || sourceFiles.has("packages/react/component-manifest.json")
  || missingSourceFiles.length > 0) {
  console.error("Evidence provenance self-check failed.");
  process.exitCode = 1;
} else {
  console.log(
    `Evidence provenance passed: ${sourceFiles.size} source inputs covered; evidence-only artifacts excluded; tampered and stale reports fail.`,
  );
}
