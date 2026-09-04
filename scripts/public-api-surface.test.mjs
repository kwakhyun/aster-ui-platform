import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import {
  comparePublicApiSurface,
  readPublicApiSurface,
} from "./lib/public-api-surface.mjs";

const expected = [
  { name: "Button", kind: "value", signature: "ForwardRefComponent<ButtonProps>" },
  { name: "ButtonProps", kind: "type", signature: "{readonly tone?:ButtonTone;}" },
];

test("public surface rejects removed and changed exports", () => {
  const result = comparePublicApiSurface(expected, [
    { name: "ButtonProps", kind: "type", signature: "{readonly tone:ButtonTone;}" },
  ]);

  assert.deepEqual(result.breakingChanges, [
    "public export Button: removed",
    "public export ButtonProps: signature changed",
  ]);
});

test("public surface reports compatible additions separately", () => {
  const result = comparePublicApiSurface(expected, [
    ...expected,
    { name: "Badge", kind: "value", signature: "ForwardRefComponent<BadgeProps>" },
  ]);

  assert.deepEqual(result.breakingChanges, []);
  assert.deepEqual(result.additions, ["Badge"]);
});

test("public surface reads every export from the React package entry point", () => {
  const surface = readPublicApiSurface(process.cwd());
  assert.equal(surface.length, 23);
  assert.deepEqual(
    surface.filter((entry) => entry.kind === "value").map((entry) => entry.name),
    ["Alert", "Badge", "Button", "Tabs", "TextField", "TreatmentCard"],
  );
  assert.match(
    surface.find((entry) => entry.name === "TreatmentCardProps")?.signature ?? "",
    /onSavedChange/,
  );
});
