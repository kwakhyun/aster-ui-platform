import ts from "typescript";

export function scanJsxUsages(sourceText, fileName, packageName, componentNames) {
  const targets = new Set(componentNames);
  const counts = Object.fromEntries(componentNames.map((component) => [component, 0]));
  const namedImports = new Map();
  const namespaceImports = new Set();
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== packageName
      || statement.importClause?.isTypeOnly) continue;

    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        const importedName = element.propertyName?.text ?? element.name.text;
        if (targets.has(importedName)) namedImports.set(element.name.text, importedName);
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      namespaceImports.add(bindings.name.text);
    }
  }

  function recordTag(tagName) {
    if (ts.isIdentifier(tagName)) {
      const component = namedImports.get(tagName.text);
      if (component) counts[component] += 1;
      return;
    }
    if (ts.isPropertyAccessExpression(tagName)
      && ts.isIdentifier(tagName.expression)
      && namespaceImports.has(tagName.expression.text)
      && targets.has(tagName.name.text)) {
      counts[tagName.name.text] += 1;
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      recordTag(node.tagName);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return counts;
}
