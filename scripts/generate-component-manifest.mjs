import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "packages/react/src/TreatmentCard.tsx");
const packagePath = path.join(projectRoot, "packages/react/package.json");
const outputPath = path.join(projectRoot, "packages/react/component-manifest.json");
const sourceText = await readFile(sourcePath, "utf8");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const contract = sourceFile.statements.find(
  (statement) => ts.isInterfaceDeclaration(statement) && statement.name.text === "TreatmentCardProps",
);

if (!contract || !ts.isInterfaceDeclaration(contract)) {
  throw new Error("TreatmentCardProps interface was not found.");
}

const defaults = new Map();
function collectDefaults(node) {
  if (ts.isBindingElement(node) && ts.isIdentifier(node.name) && node.initializer) {
    defaults.set(node.name.text, node.initializer.getText(sourceFile));
  }
  ts.forEachChild(node, collectDefaults);
}
collectDefaults(sourceFile);

const props = contract.members.flatMap((member) => {
  if (!ts.isPropertySignature(member) || !member.type || !member.name || !ts.isIdentifier(member.name)) {
    return [];
  }
  const name = member.name.text;
  return [{
    name,
    type: member.type.getText(sourceFile).replace(/\s+/g, " ").trim(),
    required: !member.questionToken,
    default: defaults.get(name) ?? null,
  }];
});

const manifest = {
  schemaVersion: 1,
  generatedFrom: "packages/react/src/TreatmentCard.tsx#TreatmentCardProps",
  name: "TreatmentCard",
  package: packageJson.name,
  version: packageJson.version,
  status: "beta",
  description: "의료미용 시술 정보를 접근 가능한 HTML article 계약으로 제공하는 웹 컴포넌트입니다.",
  platforms: ["Web"],
  crossPlatformTokenArtifacts: ["CSS", "Swift", "Compose"],
  forwardsRef: "HTMLElement",
  extendsArticleAttributes: true,
  props,
  requiredEvidence: {
    unit: "pnpm --filter @aster-ui/react test",
    apiCompatibility: "pnpm api:check",
    browserAccessibility: "pnpm test:visual",
  },
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error("Generated component manifest is out of date.");
    process.exitCode = 1;
  } else {
    console.log("Generated component manifest is current.");
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized);
  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}
