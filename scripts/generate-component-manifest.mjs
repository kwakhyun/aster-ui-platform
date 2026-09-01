import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(projectRoot, "packages/react/component-registry.json");
const packagePath = path.join(projectRoot, "packages/react/package.json");
const outputPath = path.join(projectRoot, "packages/react/component-manifest.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const registry = JSON.parse(await readFile(registryPath, "utf8"));

async function generateComponent(entry) {
  const sourcePath = path.join(projectRoot, "packages/react", entry.source);
  const sourceText = await readFile(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const contract = sourceFile.statements.find(
    (statement) => ts.isInterfaceDeclaration(statement) && statement.name.text === entry.propsInterface,
  );
  if (!contract || !ts.isInterfaceDeclaration(contract)) {
    throw new Error(`${entry.propsInterface} interface was not found in ${entry.source}.`);
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

  return {
    name: entry.name,
    category: entry.category,
    generatedFrom: `packages/react/${entry.source}#${entry.propsInterface}`,
    propsInterface: entry.propsInterface,
    status: entry.status,
    description: entry.description,
    platforms: entry.platforms,
    forwardsRef: entry.forwardsRef,
    extendsElementAttributes: entry.extendsElementAttributes,
    props,
  };
}

const manifest = {
  schemaVersion: 2,
  generatedFrom: "packages/react/component-registry.json",
  package: packageJson.name,
  version: packageJson.version,
  crossPlatformTokenArtifacts: ["CSS", "Swift", "Compose"],
  requiredEvidence: {
    unit: "pnpm --filter @aster-ui/react test",
    apiCompatibility: "pnpm api:check",
    browserAccessibility: "pnpm test:visual",
  },
  components: await Promise.all(registry.components.map(generateComponent)),
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
