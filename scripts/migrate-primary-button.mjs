import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const projectRoot = process.cwd();
const fixtureBefore = path.join(projectRoot, "examples/migration/PrimaryButton.before.tsx");
const fixtureAfter = path.join(projectRoot, "examples/migration/PrimaryButton.after.tsx");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function migrate(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let foundLegacyImport = false;

  const transformer = (context) => {
    const visit = (node) => {
      if (
        ts.isImportDeclaration(node)
        && ts.isStringLiteral(node.moduleSpecifier)
        && node.moduleSpecifier.text === "@legacy/ui"
        && node.importClause?.namedBindings
        && ts.isNamedImports(node.importClause.namedBindings)
      ) {
        const remaining = node.importClause.namedBindings.elements.filter(
          (element) => element.name.text !== "PrimaryButton",
        );
        if (remaining.length !== node.importClause.namedBindings.elements.length) foundLegacyImport = true;
        if (remaining.length === 0 && !node.importClause.name) return undefined;
        return context.factory.updateImportDeclaration(
          node,
          node.modifiers,
          context.factory.updateImportClause(
            node.importClause,
            node.importClause.isTypeOnly,
            node.importClause.name,
            context.factory.updateNamedImports(node.importClause.namedBindings, remaining),
          ),
          node.moduleSpecifier,
          node.attributes,
        );
      }

      if (ts.isJsxOpeningElement(node) && node.tagName.getText(sourceFile) === "PrimaryButton") {
        const hasTone = node.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "tone",
        );
        return context.factory.updateJsxOpeningElement(
          node,
          context.factory.createIdentifier("Button"),
          node.typeArguments,
          context.factory.updateJsxAttributes(
            node.attributes,
            hasTone
              ? node.attributes.properties
              : [
                  context.factory.createJsxAttribute(
                    context.factory.createIdentifier("tone"),
                    context.factory.createStringLiteral("primary"),
                  ),
                  ...node.attributes.properties,
                ],
          ),
        );
      }
      if (ts.isJsxClosingElement(node) && node.tagName.getText(sourceFile) === "PrimaryButton") {
        return context.factory.updateJsxClosingElement(node, context.factory.createIdentifier("Button"));
      }
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "PrimaryButton") {
        const hasTone = node.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "tone",
        );
        return context.factory.updateJsxSelfClosingElement(
          node,
          context.factory.createIdentifier("Button"),
          node.typeArguments,
          context.factory.updateJsxAttributes(
            node.attributes,
            hasTone
              ? node.attributes.properties
              : [
                  context.factory.createJsxAttribute(
                    context.factory.createIdentifier("tone"),
                    context.factory.createStringLiteral("primary"),
                  ),
                  ...node.attributes.properties,
                ],
          ),
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (root) => {
      const transformed = ts.visitNode(root, visit);
      if (!foundLegacyImport || !ts.isSourceFile(transformed)) return transformed;
      const asterImport = context.factory.createImportDeclaration(
        undefined,
        context.factory.createImportClause(
          false,
          undefined,
          context.factory.createNamedImports([
            context.factory.createImportSpecifier(false, undefined, context.factory.createIdentifier("Button")),
          ]),
        ),
        context.factory.createStringLiteral("@aster-ui/react"),
      );
      return context.factory.updateSourceFile(transformed, [asterImport, ...transformed.statements]);
    };
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformed = result.transformed[0];
  if (!transformed || !ts.isSourceFile(transformed)) throw new Error("Migration did not produce a source file.");
  const output = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed);
  result.dispose();
  if (!foundLegacyImport) throw new Error("No PrimaryButton import from @legacy/ui was found.");
  if (output.includes("PrimaryButton")) throw new Error("PrimaryButton remains after migration.");
  return output;
}

if (process.argv.includes("--check")) {
  const source = await readFile(fixtureBefore, "utf8");
  const expected = await readFile(fixtureAfter, "utf8").catch(() => "");
  const actual = migrate(source, fixtureBefore);
  if (actual !== expected) {
    console.error("PrimaryButton migration fixture is out of date.");
    process.exitCode = 1;
  } else {
    console.log("PrimaryButton migration fixture passed.");
  }
} else {
  const input = readArgument("--input");
  const output = readArgument("--output");
  if (!input || !output) throw new Error("Usage: --input <file> --output <file>");
  const inputPath = path.resolve(projectRoot, input);
  const outputPath = path.resolve(projectRoot, output);
  await writeFile(outputPath, migrate(await readFile(inputPath, "utf8"), inputPath));
  console.log(`Migrated ${path.relative(projectRoot, inputPath)} to ${path.relative(projectRoot, outputPath)}.`);
}
