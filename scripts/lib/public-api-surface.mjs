import path from "node:path";
import ts from "typescript";

const TYPE_FORMAT_FLAGS = ts.TypeFormatFlags.NoTruncation
  | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
  | ts.TypeFormatFlags.WriteArrowStyleSignature;

function normalizeSignature(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:?|&<>])\s*/g, "$1")
    .trim();
}

function declarationSignature(symbol, checker) {
  const declarations = symbol.getDeclarations() ?? [];
  const typeAlias = declarations.find(ts.isTypeAliasDeclaration);
  if (typeAlias) {
    return normalizeSignature(typeAlias.type.getText(typeAlias.getSourceFile()));
  }

  const interfaceDeclaration = declarations.find(ts.isInterfaceDeclaration);
  if (interfaceDeclaration) {
    const heritage = interfaceDeclaration.heritageClauses
      ?.flatMap((clause) => clause.types.map((type) => type.getText(interfaceDeclaration.getSourceFile())))
      .join(",") ?? "";
    const members = interfaceDeclaration.members
      .map((member) => member.getText(interfaceDeclaration.getSourceFile()))
      .join(" ");
    return normalizeSignature(`${heritage ? `extends ${heritage} ` : ""}{ ${members} }`);
  }

  const declaration = symbol.valueDeclaration ?? declarations[0];
  if (!declaration) return "unknown";
  return normalizeSignature(checker.typeToString(
    checker.getTypeOfSymbolAtLocation(symbol, declaration),
    declaration,
    TYPE_FORMAT_FLAGS,
  ));
}

function symbolKind(symbol) {
  const hasValue = (symbol.flags & ts.SymbolFlags.Value) !== 0;
  const hasType = (symbol.flags & ts.SymbolFlags.Type) !== 0;
  if (hasValue && hasType) return "value-and-type";
  return hasValue ? "value" : "type";
}

export function readPublicApiSurface(projectRoot) {
  const packageRoot = path.join(projectRoot, "packages/react");
  const configPath = path.join(packageRoot, "tsconfig.build.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageRoot);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => projectRoot,
      getNewLine: () => "\n",
    }));
  }

  const entryPath = path.join(packageRoot, "src/index.ts");
  const entry = program.getSourceFile(entryPath);
  const checker = program.getTypeChecker();
  const moduleSymbol = entry && checker.getSymbolAtLocation(entry);
  if (!entry || !moduleSymbol) throw new Error("Unable to resolve @aster-ui/react public entry point.");

  return checker.getExportsOfModule(moduleSymbol)
    .map((exportSymbol) => {
      const symbol = (exportSymbol.flags & ts.SymbolFlags.Alias) !== 0
        ? checker.getAliasedSymbol(exportSymbol)
        : exportSymbol;
      return {
        name: exportSymbol.getName(),
        kind: symbolKind(symbol),
        signature: declarationSignature(symbol, checker),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function comparePublicApiSurface(expectedExports, currentExports) {
  const currentByName = new Map(currentExports.map((entry) => [entry.name, entry]));
  const breakingChanges = [];
  for (const expected of expectedExports) {
    const current = currentByName.get(expected.name);
    if (!current) {
      breakingChanges.push(`public export ${expected.name}: removed`);
      continue;
    }
    if (current.kind !== expected.kind) {
      breakingChanges.push(`public export ${expected.name}: kind changed`);
    }
    if (current.signature !== expected.signature) {
      breakingChanges.push(`public export ${expected.name}: signature changed`);
    }
  }

  const additions = currentExports
    .filter((entry) => !expectedExports.some((expected) => expected.name === entry.name))
    .map((entry) => entry.name);
  return { additions, breakingChanges };
}
