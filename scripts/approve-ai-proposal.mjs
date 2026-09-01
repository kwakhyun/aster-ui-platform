import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { digest, validateProposalReport } from "./lib/ai-workflow.mjs";

const projectRoot = process.cwd();
function resolveInsideProject(candidate, label) {
  const resolved = path.resolve(projectRoot, candidate);
  const relative = path.relative(projectRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must resolve to a file inside the project.`);
  }
  return resolved;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const proposalPath = argument("--proposal");
const outputPath = argument("--output");
const reviewer = argument("--reviewer")?.trim();
if (!proposalPath || !outputPath || !reviewer) {
  throw new Error("Usage: --proposal <report.json> --reviewer <name> --output <receipt.json>");
}
if (reviewer.length > 100 || /[\r\n]/.test(reviewer)) {
  throw new Error("--reviewer must be a single line of at most 100 characters.");
}
const resolvedProposal = resolveInsideProject(proposalPath, "--proposal");
const resolvedOutput = resolveInsideProject(outputPath, "--output");
const reportsRoot = path.join(projectRoot, "reports") + path.sep;
if (!resolvedOutput.startsWith(reportsRoot)) throw new Error("--output must be inside reports/.");

const report = JSON.parse(await readFile(resolvedProposal, "utf8"));
if (typeof report.request?.path !== "string") throw new Error("Proposal report is missing its request path.");
const requestPath = resolveInsideProject(report.request.path, "proposal request path");
const [manifest, request, promptTemplate] = await Promise.all([
  readFile(path.join(projectRoot, "packages/react/component-manifest.json"), "utf8").then(JSON.parse),
  readFile(requestPath, "utf8"),
  readFile(path.join(projectRoot, "ai/prompts/design-system-proposal.md"), "utf8"),
]);
validateProposalReport(report, { manifest, request, promptTemplate });

const receipt = {
  schemaVersion: 1,
  proposalPath: path.relative(projectRoot, resolvedProposal),
  proposalDigest: digest(report.proposal),
  requestDigest: report.request.digest,
  status: "approved",
  reviewer,
  reviewedAt: new Date().toISOString(),
  sourceMutation: {
    applied: false,
    note: "Approval authorizes a separate implementation review. It does not apply generated code.",
  },
};
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Recorded human approval receipt at ${path.relative(projectRoot, resolvedOutput)}. No source files changed.`);
