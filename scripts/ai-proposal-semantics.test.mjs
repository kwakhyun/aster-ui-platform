import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateProposal } from "./lib/ai-workflow.mjs";

const manifest = JSON.parse(await readFile(new URL("../packages/react/component-manifest.json", import.meta.url), "utf8"));
const fixture = JSON.parse(await readFile(new URL("../ai/fixtures/treatment-card-label.proposal.json", import.meta.url), "utf8"));
const component = manifest.components.find(({ name }) => name === fixture.component);
const prop = component.props.find(({ name }) => name === "imageProps");
const deprecation = { action: "deprecate", prop: prop.name, type: prop.type, required: prop.required, rationale: "Use the replacement prop in a later release." };
const proposal = (change, semverImpact = "patch") => ({ ...fixture, semverImpact, apiChanges: [{ ...deprecation, ...change }] });

test("accepts a deprecation only when the current public shape is preserved", () => {
  assert.doesNotThrow(() => validateProposal(proposal({}), manifest));
});

for (const change of [{ type: "never" }, { required: true }, { type: "never", required: true }]) {
  test(`rejects API changes disguised as a deprecation: ${JSON.stringify(change)}`, () => {
    for (const impact of ["patch", "minor", "major"]) {
      assert.throws(() => validateProposal(proposal(change, impact), manifest), /deprecation must preserve/);
    }
  });
}

test("requires a major change for an explicit existing-prop type or requiredness change", () => {
  const change = { action: "change", type: "never", required: true };
  assert.throws(() => validateProposal(proposal(change, "minor"), manifest), /requires a major/);
  assert.doesNotThrow(() => validateProposal(proposal(change, "major"), manifest));
});
