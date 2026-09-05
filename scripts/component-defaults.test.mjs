import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import { collectComponentDefaults } from "./lib/component-defaults.mjs";

function collect(source) {
  return Object.fromEntries(collectComponentDefaults(ts.createSourceFile("Example.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), "Example"));
}
test("only component parameter defaults become manifest defaults", () => {
  assert.deepEqual(collect(`export const Example = forwardRef(function Example({variant = "primary", size: localSize = "md"}, ref) {
    const { variant = "body", size = "lg" } = {};
    return null;
  });
  function helper({variant = "helper"}) {}`), {variant: '"primary"', size: '"md"'});
});
test("supports function and wrapped arrow components, aliases, and absent defaults", () => {
  assert.deepEqual(collect('export function Example({size: renamed = "md", children}) {}'), {size: '"md"'});
  assert.deepEqual(collect('export const Example = memo(forwardRef(({tone = "quiet"}, ref) => null));'), {tone: '"quiet"'});
  assert.deepEqual(collect('export const Example = ({children}) => null;'), {});
});
test("fails explicitly for an unsupported component declaration", () => {
  assert.throws(() => collect('export const Example = importedComponent;'), /Cannot locate/);
  assert.throws(() => collect('export function Example(props) {}'), /destructure props/);
});
