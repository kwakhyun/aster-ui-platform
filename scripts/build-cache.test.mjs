import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFile, copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { getSourceFiles, getSourceRevision } from "./lib/provenance.mjs";

test("Studio cache follows repository provenance inputs without hashing build outputs", async (t) => {
  const root = process.cwd();
  const fixture = await mkdtemp(path.join(tmpdir(), "aster-build-cache-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const files = [
    ...(await getSourceFiles(root)).map((file) => file.relative),
    "apps/studio/src/generated/quality-evidence.json",
    "packages/react/component-manifest.json",
  ];
  await Promise.all(files.map(async (file) => {
    const target = path.join(fixture, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file), target);
  }));
  await symlink(path.join(root, "node_modules"), path.join(fixture, "node_modules"), "dir");
  const snapshot = async () => {
    const output = execFileSync(path.join(root, "node_modules/.bin/turbo"), [
      "run", "build", "--filter=@aster-ui/studio", "--dry=json",
    ], { cwd: fixture, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const task = JSON.parse(output).tasks.find((candidate) => candidate.taskId === "@aster-ui/studio#build");
    const inputs = new Set(Object.keys(task.inputs).map((file) => path.resolve(fixture, "apps/studio", file)));
    const missingInputs = (await getSourceFiles(fixture)).filter((file) => !inputs.has(file.target));
    assert.deepEqual(missingInputs.map((file) => file.relative), [], "Every provenance source must be a Studio build input.");
    return {
      revision: await getSourceRevision(fixture),
      hash: task.hash,
    };
  };
  const initial = await snapshot();
  await appendFile(path.join(fixture, "README.md"), "\nCache regression fixture.\n");
  const changedDocument = await snapshot();
  assert.notEqual(changedDocument.revision, initial.revision);
  assert.notEqual(changedDocument.hash, initial.hash, "Root documentation must invalidate the embedded revision.");

  await writeFile(path.join(fixture, "scripts/new-cache-input.mjs"), "export const addedSource = true;\n");
  const addedScript = await snapshot();
  assert.notEqual(addedScript.revision, changedDocument.revision);
  assert.notEqual(addedScript.hash, changedDocument.hash, "New root scripts must also invalidate the build.");

  await mkdir(path.join(fixture, "apps/studio/dist"), { recursive: true });
  await writeFile(path.join(fixture, "apps/studio/dist/cache-output.js"), "generated\n");
  const generatedOutput = await snapshot();
  assert.deepEqual(generatedOutput, addedScript, "Build output must not invalidate its own cache.");

  await appendFile(path.join(fixture, "apps/studio/src/generated/quality-evidence.json"), "\n");
  const changedEvidence = await snapshot();
  assert.equal(changedEvidence.revision, generatedOutput.revision);
  assert.notEqual(changedEvidence.hash, generatedOutput.hash, "Bundled quality evidence must invalidate the build independently of provenance.");
});
