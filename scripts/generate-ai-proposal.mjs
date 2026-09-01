import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createProposalPrompt,
  digest,
  validateProposal,
  validateProposalReport,
} from "./lib/ai-workflow.mjs";

const projectRoot = process.cwd();
const defaultRequest = "ai/requests/localize-treatment-card-save-label.md";
const fixtureProposalPath = "ai/fixtures/treatment-card-label.proposal.json";
const fixtureOutputPath = "reports/ai-workflow.json";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(projectRoot, relativePath), "utf8"));
}

function extractStructuredOutput(rawOutput) {
  const envelope = JSON.parse(rawOutput);
  if (envelope && typeof envelope === "object" && envelope.is_error === true) {
    throw new Error(`Claude Code proposal failed: ${String(envelope.result ?? "unknown provider error")}`);
  }
  if (envelope && typeof envelope === "object" && envelope.structured_output) {
    return envelope.structured_output;
  }
  if (envelope && typeof envelope === "object" && typeof envelope.result === "string") {
    return JSON.parse(envelope.result);
  }
  return envelope;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 10 * 1024 * 1024) child.kill();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 1024 * 1024) child.kill();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

const fixtureMode = process.argv.includes("--fixture") || process.argv.includes("--check");
const provider = fixtureMode ? "fixture" : (argument("--provider") ?? "claude");
const requestPath = fixtureMode ? defaultRequest : (argument("--request") ?? defaultRequest);
const outputPath = fixtureMode ? fixtureOutputPath : argument("--output");
if (!outputPath) throw new Error("--output is required outside fixture mode.");

const [request, promptTemplate, schema, manifest] = await Promise.all([
  readFile(path.resolve(projectRoot, requestPath), "utf8"),
  readFile(path.resolve(projectRoot, "ai/prompts/design-system-proposal.md"), "utf8"),
  readJson("ai/schemas/proposal.schema.json"),
  readJson("packages/react/component-manifest.json"),
]);
const prompt = createProposalPrompt(promptTemplate, request, manifest);

let proposal;
let providerMetadata;
let generatedAt;
if (provider === "fixture") {
  proposal = await readJson(fixtureProposalPath);
  providerMetadata = {
    id: "checked-in-fixture",
    version: "1",
    execution: "offline deterministic replay",
  };
  generatedAt = "2026-09-01T10:30:00+09:00";
} else if (provider === "claude") {
  const claudeBinary = process.env.CLAUDE_BIN ?? "claude";
  const versionResult = await runCommand(claudeBinary, ["--version"]);
  if (versionResult.code !== 0) throw new Error("Claude Code executable could not be inspected.");
  const version = versionResult.stdout.trim();
  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(schema),
    "--tools",
    "",
    "--permission-mode",
    "plan",
    "--no-session-persistence",
    "--max-budget-usd",
    argument("--max-budget-usd") ?? "0.50",
  ];
  const model = argument("--model");
  if (model) args.push("--model", model);
  const result = await runCommand(claudeBinary, args);
  try {
    proposal = extractStructuredOutput(result.stdout);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Claude Code did not return a valid structured proposal.", { cause: error });
  }
  if (result.code !== 0) throw new Error("Claude Code proposal failed without a structured error.");
  providerMetadata = {
    id: "claude-code",
    version,
    execution: "non-interactive structured output with tools disabled",
  };
  generatedAt = new Date().toISOString();
} else {
  throw new Error(`Unsupported AI provider: ${provider}`);
}

const checks = validateProposal(proposal, manifest);
const report = {
  schemaVersion: 1,
  generatedAt,
  provider: providerMetadata,
  request: {
    path: requestPath,
    digest: digest(request),
  },
  prompt: {
    template: "ai/prompts/design-system-proposal.md",
    digest: digest(prompt),
  },
  context: {
    package: manifest.package,
    version: manifest.version,
    componentCount: manifest.components.length,
    manifestDigest: digest(manifest),
  },
  proposal,
  automatedValidation: {
    status: "passed",
    checks,
  },
  humanReview: {
    status: "required",
    reviewer: null,
    reviewedAt: null,
  },
  sourceMutation: {
    allowedByThisCommand: false,
    applied: false,
  },
};
validateProposalReport(report, { manifest, request, promptTemplate });
const serialized = `${JSON.stringify(report, null, 2)}\n`;
const resolvedOutput = path.resolve(projectRoot, outputPath);

if (process.argv.includes("--check")) {
  const current = await readFile(resolvedOutput, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("AI workflow fixture report is out of date.");
    process.exitCode = 1;
  } else {
    const invalidFixtures = [
      { ...proposal, component: "MissingComponent" },
      {
        ...proposal,
        semverImpact: "minor",
        apiChanges: [{ ...proposal.apiChanges[0], required: true }],
      },
      {
        ...proposal,
        testCases: proposal.testCases.filter((testCase) => testCase.kind !== "accessibility"),
      },
      { ...proposal, unsupported: true },
    ];
    for (const invalid of invalidFixtures) {
      let rejected = false;
      try {
        validateProposal(invalid, manifest);
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("AI workflow accepted an invalid fail-closed fixture.");
    }
    const invalidReports = [
      { ...report, context: { ...report.context, manifestDigest: "tampered" } },
      { ...report, automatedValidation: { ...report.automatedValidation, checks: [] } },
      { ...report, sourceMutation: { ...report.sourceMutation, applied: true } },
    ];
    for (const invalidReport of invalidReports) {
      let rejected = false;
      try {
        validateProposalReport(invalidReport, { manifest, request, promptTemplate });
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("AI workflow accepted a tampered proposal report.");
    }
    console.log(`AI workflow fixture passed: ${checks.length} proposal checks, ${invalidFixtures.length} proposal rejections, and ${invalidReports.length} report-integrity rejections; human review remains required.`);
  }
} else {
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, serialized);
  console.log(`Wrote proposal report to ${path.relative(projectRoot, resolvedOutput)}. Source mutation: disabled.`);
}
