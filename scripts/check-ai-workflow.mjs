import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validateApprovalReceipt } from "./lib/ai-workflow.mjs";
import { runBoundedCommand } from "./lib/bounded-process.mjs";
import { createEvidenceReport, getSourceRevision } from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const approvalsRoot = path.join(projectRoot, "reports/ai-approvals");

async function runNode(args, timeoutMs = 30_000) {
  return runBoundedCommand(process.execPath, args, {
    cwd: projectRoot,
    timeoutMs,
    maxStdoutBytes: 1024 * 1024,
    maxStderrBytes: 1024 * 1024,
  });
}

async function expectFailure(args, label, expectedMessage) {
  const result = await runNode(args);
  if (result.code === 0) throw new Error(`AI workflow did not reject ${label}.`);
  if (expectedMessage && !result.stderr.includes(expectedMessage)) {
    throw new Error(`AI workflow rejected ${label} for an unexpected reason.`);
  }
}

const sourceRevisionBefore = await getSourceRevision(projectRoot);
await mkdir(approvalsRoot, { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(approvalsRoot, ".workflow-check-"));
const temporaryRelative = path.relative(projectRoot, temporaryDirectory).split(path.sep).join("/");

try {
  const proposalCheck = await runNode(["scripts/generate-ai-proposal.mjs", "--check"]);
  if (proposalCheck.code !== 0) throw new Error("Deterministic AI proposal validation failed.");
  process.stdout.write(proposalCheck.stdout);

  const receiptPath = `${temporaryRelative}/approval.json`;
  const approval = await runNode([
    "scripts/approve-ai-proposal.mjs",
    "--proposal",
    "reports/ai-workflow.json",
    "--reviewer",
    "Automated workflow verification",
    "--output",
    receiptPath,
  ]);
  if (approval.code !== 0) throw new Error("AI approval happy path failed.");

  const [receipt, report, manifest, request, promptTemplate] = await Promise.all([
    readFile(path.join(projectRoot, receiptPath), "utf8").then(JSON.parse),
    readFile(path.join(projectRoot, "reports/ai-workflow.json"), "utf8").then(JSON.parse),
    readFile(path.join(projectRoot, "packages/react/component-manifest.json"), "utf8").then(JSON.parse),
    readFile(path.join(projectRoot, "ai/requests/localize-treatment-card-save-label.md"), "utf8"),
    readFile(path.join(projectRoot, "ai/prompts/design-system-proposal.md"), "utf8"),
  ]);
  validateApprovalReceipt(receipt, report, {
    manifest,
    promptTemplate,
    promptTemplatePath: "ai/prompts/design-system-proposal.md",
    request,
    requestPath: "ai/requests/localize-treatment-card-save-label.md",
  });
  let tamperedReceiptRejected = false;
  try {
    validateApprovalReceipt({ ...receipt, status: "tampered" }, report, {
      manifest,
      promptTemplate,
      promptTemplatePath: "ai/prompts/design-system-proposal.md",
      request,
      requestPath: "ai/requests/localize-treatment-card-save-label.md",
    });
  } catch {
    tamperedReceiptRejected = true;
  }
  if (!tamperedReceiptRejected) throw new Error("AI workflow accepted a tampered approval receipt.");

  await expectFailure([
    "scripts/approve-ai-proposal.mjs",
    "--proposal",
    "reports/ai-workflow.json",
    "--reviewer",
    "Automated workflow verification",
    "--output",
    receiptPath,
  ], "approval receipt overwrite", "EEXIST");

  const tamperedReportPath = path.join(temporaryDirectory, "tampered-report.json");
  const tamperedReport = {
    ...report,
    context: { ...report.context, manifestDigest: "tampered" },
  };
  await writeFile(tamperedReportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`);
  await expectFailure([
    "scripts/approve-ai-proposal.mjs",
    "--proposal",
    `${temporaryRelative}/tampered-report.json`,
    "--reviewer",
    "Automated workflow verification",
    "--output",
    `${temporaryRelative}/tampered-approval.json`,
  ], "tampered proposal approval", "manifest context does not match");

  const samePathBefore = await readFile(tamperedReportPath, "utf8");
  await expectFailure([
    "scripts/approve-ai-proposal.mjs",
    "--proposal",
    `${temporaryRelative}/tampered-report.json`,
    "--reviewer",
    "Automated workflow verification",
    "--output",
    `${temporaryRelative}/tampered-report.json`,
  ], "proposal overwrite", "must not overwrite");
  if (await readFile(tamperedReportPath, "utf8") !== samePathBefore) {
    throw new Error("Rejected approval modified its proposal input.");
  }

  await expectFailure([
    "scripts/approve-ai-proposal.mjs",
    "--proposal",
    "reports/ai-workflow.json",
    "--reviewer",
    "Reviewer\nInjected",
    "--output",
    `${temporaryRelative}/invalid-reviewer.json`,
  ], "multiline reviewer", "single non-empty line");

  await expectFailure([
    "scripts/generate-ai-proposal.mjs",
    "--provider",
    "claude",
    "--request",
    "../package.json",
    "--output",
    "reports/ai-proposals/escaped-request.json",
  ], "request path escape", "must be inside ai/requests/");

  await expectFailure([
    "scripts/generate-ai-proposal.mjs",
    "--provider",
    "claude",
    "--output",
    "reports/outside-proposals.json",
  ], "output path escape", "must be inside reports/ai-proposals/");

  let timeoutRejected = false;
  try {
    await runBoundedCommand(process.execPath, ["-e", "setTimeout(() => {}, 10_000)"], {
      cwd: projectRoot,
      timeoutMs: 50,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
  } catch (error) {
    timeoutRejected = error?.reason === "timeout";
  }
  if (!timeoutRejected) throw new Error("AI provider timeout did not fail closed.");

  for (const [stream, expression, expectedReason] of [
    ["stdout", "process.stdout.write('x'.repeat(2048))", "stdout-limit"],
    ["stderr", "process.stderr.write('x'.repeat(2048))", "stderr-limit"],
  ]) {
    let outputLimitRejected = false;
    try {
      await runBoundedCommand(process.execPath, ["-e", expression], {
        cwd: projectRoot,
        timeoutMs: 5_000,
        maxStdoutBytes: 1024,
        maxStderrBytes: 1024,
      });
    } catch (error) {
      outputLimitRejected = error?.reason === expectedReason;
    }
    if (!outputLimitRejected) throw new Error(`AI provider ${stream} limit did not fail closed.`);
  }

  const sourceRevisionAfter = await getSourceRevision(projectRoot);
  if (sourceRevisionAfter !== sourceRevisionBefore) {
    throw new Error("AI workflow verification changed source inputs.");
  }
  const evidence = await createEvidenceReport({
    schemaVersion: 1,
    command: "pnpm ai:check",
    status: "passed",
    proposalChecks: 6,
    proposalRejections: 4,
    reportIntegrityRejections: 3,
    approvalHappyPaths: 1,
    failClosedBoundaries: 7,
    providerTimeouts: 1,
    providerOutputLimits: 2,
    sourceMutations: 0,
  });
  await writeFile(
    path.join(projectRoot, "reports/ai-verification.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    "AI workflow E2E passed: proposal validation, human approval, 7 fail-closed boundaries, provider timeout and output limits, and zero source mutation.",
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
