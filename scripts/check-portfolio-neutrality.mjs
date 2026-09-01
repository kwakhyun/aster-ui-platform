import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const repositoryRoot = process.cwd();

const employerBrandPatterns = [
  {
    label: "Korean employer brand 1",
    pattern: new RegExp(["강남", String.raw`\s*`, "언니"].join(""), "iu"),
  },
  {
    label: "Korean employer brand 2",
    pattern: new RegExp(["힐링", String.raw`\s*`, "페이퍼"].join(""), "iu"),
  },
  {
    label: "English employer brand 1",
    pattern: new RegExp(["gangnam", String.raw`[\s_-]*`, "unni"].join(""), "iu"),
  },
  {
    label: "English employer brand 2",
    pattern: new RegExp(["healing", String.raw`[\s_-]*`, "paper"].join(""), "iu"),
  },
];

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const findings = [];
let scannedFileCount = 0;

for (const relativePath of trackedFiles) {
  const pathFinding = employerBrandPatterns.find(({ pattern }) => pattern.test(relativePath));
  if (pathFinding) {
    findings.push(`${relativePath}: filename contains ${pathFinding.label}`);
  }

  const contents = readFileSync(relativePath);
  if (contents.includes(0)) {
    continue;
  }

  scannedFileCount += 1;
  const lines = contents.toString("utf8").split(/\r?\n/u);

  for (const [lineIndex, line] of lines.entries()) {
    const contentFinding = employerBrandPatterns.find(({ pattern }) => pattern.test(line));
    if (contentFinding) {
      findings.push(`${relativePath}:${lineIndex + 1}: contains ${contentFinding.label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Portfolio neutrality check failed:\n");
  console.error(findings.map((finding) => `- ${finding}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Portfolio neutrality passed: ${scannedFileCount} tracked text files contain no employer-specific brand names.`,
  );
}
