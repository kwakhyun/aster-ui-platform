import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createApprovalReceipt } from "./lib/ai-workflow.mjs";
import {
  prepareOutputFileWithin,
  resolveExistingFileWithin,
} from "./lib/safe-project-path.mjs";

const projectRoot = process.cwd();

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

const proposalPath = argument("--proposal");
const outputPath = argument("--output");
const reviewer = argument("--reviewer")?.trim();
if (!proposalPath || !outputPath || !reviewer) {
  throw new Error("Usage: --proposal <report.json> --reviewer <name> --output <receipt.json>");
}
const resolvedProposal = await resolveExistingFileWithin(
  projectRoot,
  "reports",
  proposalPath,
  "--proposal",
);
const resolvedOutput = await prepareOutputFileWithin(
  projectRoot,
  "reports/ai-approvals",
  outputPath,
  "--output",
);
if (resolvedProposal === resolvedOutput) {
  throw new Error("--output must not overwrite the proposal report.");
}

const report = JSON.parse(await readFile(resolvedProposal, "utf8"));
if (typeof report.request?.path !== "string") throw new Error("Proposal report is missing its request path.");
const requestPath = await resolveExistingFileWithin(
  projectRoot,
  "ai/requests",
  report.request.path,
  "proposal request path",
);
const [manifest, request, promptTemplate] = await Promise.all([
  readFile(path.join(projectRoot, "packages/react/component-manifest.json"), "utf8").then(JSON.parse),
  readFile(requestPath, "utf8"),
  readFile(path.join(projectRoot, "ai/prompts/design-system-proposal.md"), "utf8"),
]);
const normalizedRequestPath = path.relative(projectRoot, requestPath).split(path.sep).join("/");
const receipt = createApprovalReceipt(report, {
  manifest,
  proposalPath: path.relative(projectRoot, resolvedProposal).split(path.sep).join("/"),
  promptTemplate,
  promptTemplatePath: "ai/prompts/design-system-proposal.md",
  request,
  requestPath: normalizedRequestPath,
  reviewer,
});
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
console.log(`Recorded human approval receipt at ${path.relative(projectRoot, resolvedOutput)}. No source files changed.`);
