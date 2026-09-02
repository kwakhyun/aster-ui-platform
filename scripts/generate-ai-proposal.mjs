import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createProposalPrompt,
  digest,
  validateProposal,
  validateProposalReport,
} from "./lib/ai-workflow.mjs";
import { runBoundedCommand } from "./lib/bounded-process.mjs";
import {
  prepareOutputFileWithin,
  resolveExistingFileWithin,
} from "./lib/safe-project-path.mjs";

const projectRoot = process.cwd();
const defaultRequest = "ai/requests/localize-treatment-card-save-label.md";
const fixtureProposalPath = "ai/fixtures/treatment-card-label.proposal.json";
const fixtureOutputPath = "reports/ai-workflow.json";

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function boundedNumberArgument(name, fallback, { minimum, maximum, integer = false }) {
  const rawValue = argument(name);
  const value = rawValue === undefined ? fallback : Number(rawValue);
  if (!Number.isFinite(value)
    || (integer && !Number.isInteger(value))
    || value < minimum
    || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}${integer ? " as an integer" : ""}.`);
  }
  return value;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(projectRoot, relativePath), "utf8"));
}

function extractStructuredOutput(rawOutput) {
  let envelope;
  try {
    envelope = JSON.parse(rawOutput);
  } catch {
    throw new Error("Claude Code did not return valid JSON output.");
  }
  if (envelope && typeof envelope === "object" && envelope.is_error === true) {
    throw new Error("Claude Code reported a provider error.");
  }
  if (envelope && typeof envelope === "object" && envelope.structured_output) {
    return envelope.structured_output;
  }
  if (envelope && typeof envelope === "object" && typeof envelope.result === "string") {
    try {
      return JSON.parse(envelope.result);
    } catch {
      throw new Error("Claude Code did not return valid structured output.");
    }
  }
  return envelope;
}

const fixtureMode = process.argv.includes("--fixture") || process.argv.includes("--check");
const provider = fixtureMode ? "fixture" : (argument("--provider") ?? "claude");
if (!fixtureMode && provider !== "claude") throw new Error("Only the claude provider is supported for live proposals.");
const requestedRequestPath = fixtureMode ? defaultRequest : (argument("--request") ?? defaultRequest);
const requestFile = fixtureMode
  ? path.resolve(projectRoot, defaultRequest)
  : await resolveExistingFileWithin(projectRoot, "ai/requests", requestedRequestPath, "--request");
const requestPath = path.relative(projectRoot, requestFile).split(path.sep).join("/");
const requestedOutputPath = fixtureMode ? fixtureOutputPath : argument("--output");
if (!requestedOutputPath) throw new Error("--output is required outside fixture mode.");
const resolvedOutput = fixtureMode
  ? path.resolve(projectRoot, fixtureOutputPath)
  : await prepareOutputFileWithin(projectRoot, "reports/ai-proposals", requestedOutputPath, "--output");

const [request, promptTemplate, schema, manifest] = await Promise.all([
  readFile(requestFile, "utf8"),
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
  const timeoutMs = boundedNumberArgument("--timeout-ms", 120_000, {
    minimum: 1_000,
    maximum: 600_000,
    integer: true,
  });
  const maxBudgetUsd = boundedNumberArgument("--max-budget-usd", 0.5, {
    minimum: 0.01,
    maximum: 5,
  });
  const versionResult = await runBoundedCommand(claudeBinary, ["--version"], {
    timeoutMs: 10_000,
    maxStdoutBytes: 64 * 1024,
    maxStderrBytes: 64 * 1024,
  }).catch(() => {
    throw new Error("Claude Code executable could not be inspected.");
  });
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
    maxBudgetUsd.toFixed(2),
  ];
  const model = argument("--model");
  if (model) args.push("--model", model);
  const result = await runBoundedCommand(claudeBinary, args, { timeoutMs }).catch((error) => {
    const reason = typeof error?.reason === "string" ? error.reason : "execution";
    throw new Error(`Claude Code proposal did not complete (${reason}).`);
  });
  if (result.code !== 0) throw new Error("Claude Code proposal failed without a structured error.");
  proposal = extractStructuredOutput(result.stdout);
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
validateProposalReport(report, {
  manifest,
  request,
  requestPath,
  promptTemplate,
  promptTemplatePath: "ai/prompts/design-system-proposal.md",
});
const serialized = `${JSON.stringify(report, null, 2)}\n`;

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
        validateProposalReport(invalidReport, {
          manifest,
          request,
          requestPath,
          promptTemplate,
          promptTemplatePath: "ai/prompts/design-system-proposal.md",
        });
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("AI workflow accepted a tampered proposal report.");
    }
    console.log(`AI workflow fixture passed: ${checks.length} proposal checks, ${invalidFixtures.length} proposal rejections, and ${invalidReports.length} report-integrity rejections; human review remains required.`);
  }
} else {
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, serialized, fixtureMode ? undefined : { flag: "wx" });
  console.log(`Wrote proposal report to ${path.relative(projectRoot, resolvedOutput)}. No source files changed.`);
}
