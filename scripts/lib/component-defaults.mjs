import ts from "typescript";

// Only unwrap the exported component, never traverse helper functions or its body.
export function collectComponentDefaults(sourceFile, componentName) {
  const declaration = sourceFile.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === componentName
  ) ?? sourceFile.statements.filter(ts.isVariableStatement)
    .flatMap((node) => [...node.declarationList.declarations])
    .find((node) => ts.isIdentifier(node.name) && node.name.text === componentName);
  let component = declaration && ts.isVariableDeclaration(declaration) ? declaration.initializer : declaration;
  while (component && (ts.isCallExpression(component) || ts.isParenthesizedExpression(component))) {
    component = ts.isCallExpression(component) ? component.arguments[0] : component.expression;
  }
  if (!component || !(ts.isFunctionDeclaration(component) || ts.isFunctionExpression(component) || ts.isArrowFunction(component))) {
    throw new Error(`Cannot locate props parameter for ${componentName}.`);
  }
  const parameter = component.parameters[0];
  if (!parameter) return new Map();
  if (!ts.isObjectBindingPattern(parameter.name)) {
    throw new Error(`${componentName} must destructure props in its parameter to generate defaults.`);
  }
  return new Map(parameter.name.elements.flatMap((element) => {
    const name = element.propertyName ?? element.name;
    if (!element.initializer || !(ts.isIdentifier(name) || ts.isStringLiteral(name))) return [];
    return [[name.text, element.initializer.getText(sourceFile)]];
  }));
}
