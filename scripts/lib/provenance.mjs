import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const excludedDirectories = new Set([
  ".git",
  ".turbo",
  "audits",
  "coverage",
  "dist",
  "node_modules",
  "reports",
  "test-results",
]);
const excludedFiles = new Set([
  "apps/studio/src/generated/quality-evidence.json",
  "packages/react/component-manifest.json",
]);
export const sourceRevisionInputs = Object.freeze([
  ".dockerignore",
  ".github",
  ".gitignore",
  ".npmrc",
  ".release-please-manifest.json",
  "CHANGELOG.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "Dockerfile",
  "LICENSE",
  "README.md",
  "ai",
  "apps",
  "design/aster-ui-final-target.png",
  "design-qa.md",
  "docs",
  "eslint.config.mjs",
  "examples",
  "infra",
  "package.json",
  "packages",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "release-please-config.json",
  "scripts",
  "tests",
  "tsconfig.base.json",
  "turbo.json",
]);

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function computeEvidenceDigest(core, sourceRevision, gitCommit = null) {
  return `sha256:${sha256(stableSerialize({ core, gitCommit, sourceRevision }))}`;
}

export function verifyEvidenceReport(report, expectedSourceRevision, expectedGitCommit) {
  if (!report || typeof report !== "object") return false;
  const {
    generatedAt,
    sourceRevision,
    gitCommit,
    runId,
    artifactDigest,
    ...core
  } = report;
  return typeof sourceRevision === "string"
    && sourceRevision === expectedSourceRevision
    && typeof runId === "string"
    && runId.length > 0
    && typeof generatedAt === "string"
    && Number.isFinite(Date.parse(generatedAt))
    && (gitCommit === null || (typeof gitCommit === "string" && /^[a-f0-9]{40}$/.test(gitCommit)))
    && (expectedGitCommit === undefined || gitCommit === expectedGitCommit)
    && artifactDigest === computeEvidenceDigest(core, sourceRevision, gitCommit);
}

async function collectSourceFiles(directory, projectRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;
    const target = path.join(directory, entry.name);
    const relative = path.relative(projectRoot, target).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...await collectSourceFiles(target, projectRoot));
      }
    } else if (!excludedFiles.has(relative)) {
      files.push({ relative, target });
    }
  }
  return files;
}

export async function getSourceFiles(projectRoot = process.cwd()) {
  const files = [];
  for (const input of sourceRevisionInputs) {
    const target = path.join(projectRoot, input);
    const metadata = await stat(target);
    if (metadata.isDirectory()) {
      files.push(...await collectSourceFiles(target, projectRoot));
    } else {
      files.push({ relative: input, target });
    }
  }
  files.sort((left, right) => left.relative.localeCompare(right.relative));
  return files;
}

export async function getSourceRevision(projectRoot = process.cwd()) {
  const files = await getSourceFiles(projectRoot);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(await readFile(file.target));
    hash.update("\0");
  }
  const workspaceDigest = hash.digest("hex").slice(0, 20);
  return `workspace:${workspaceDigest}`;
}

export function getSourceGitCommit(projectRoot = process.cwd()) {
  try {
    const excludedPathspecs = [...excludedFiles].map((file) => `:(exclude)${file}`);
    const revision = execFileSync("git", [
      "log",
      "-1",
      "--format=%H",
      "--",
      ...sourceRevisionInputs,
      ...excludedPathspecs,
    ], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[a-f0-9]{40}$/.test(revision) ? revision : null;
  } catch {
    // A portfolio working tree may intentionally have no commit yet.
    return null;
  }
}

export async function createEvidenceReport(core, projectRoot = process.cwd()) {
  const sourceRevision = await getSourceRevision(projectRoot);
  const gitCommit = getSourceGitCommit(projectRoot);
  const runId = process.env.GITHUB_RUN_ID
    ? `github:${process.env.GITHUB_RUN_ID}`
    : `local:${process.pid}`;
  return {
    ...core,
    generatedAt: new Date().toISOString(),
    sourceRevision,
    gitCommit,
    runId,
    artifactDigest: computeEvidenceDigest(core, sourceRevision, gitCommit),
  };
}
