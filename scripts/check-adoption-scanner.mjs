import assert from "node:assert/strict";
import { scanJsxUsages } from "./lib/scan-jsx-usage.mjs";

const fixture = `
  import { Button, TreatmentCard as Card } from "@aster-ui/react";
  import * as Aster from "@aster-ui/react";
  const documentation = "<TreatmentCard />";
  // <Button /> is documentation, not runtime usage.
  export const View = () => <><Button /><Card /><Aster.Button /><Aster.TreatmentCard /></>;
`;
assert.deepEqual(
  scanJsxUsages(
    fixture,
    "fixture.tsx",
    "@aster-ui/react",
    ["Button", "TreatmentCard"],
  ),
  { Button: 2, TreatmentCard: 2 },
);

assert.deepEqual(
  scanJsxUsages(
    "const TreatmentCard = () => null; export const View = () => <TreatmentCard />;",
    "shadowed.tsx",
    "@aster-ui/react",
    ["TreatmentCard"],
  ),
  { TreatmentCard: 0 },
);

console.log("Adoption scanner fixtures passed: imports, aliases, namespaces, strings, comments, and local names.");
