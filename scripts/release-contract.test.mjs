import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { getSourceFiles } from "./lib/provenance.mjs";

const root = process.cwd();

async function fixtureFor(t) {
  const fixture = await mkdtemp(path.join(tmpdir(), "aster-release-contract-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const files = [
    ...(await getSourceFiles(root)).map((file) => file.relative),
    "packages/react/component-manifest.json", "reports/ai-workflow.json",
  ];
  for (const file of files) {
    await mkdir(path.dirname(path.join(fixture, file)), { recursive: true });
    await copyFile(path.join(root, file), path.join(fixture, file));
  }
  return fixture;
}

function check(fixture, script, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: fixture, encoding: "utf8" });
}

test("the configured single release keeps every release and generated-doc contract aligned", async (t) => {
  const fixture = await fixtureFor(t);
  const config = JSON.parse(await readFile(path.join(fixture, "release-please-config.json"), "utf8"));
  assert.equal(config["release-type"], "node");
  assert.deepEqual(Object.keys(config.packages), ["."]);
  const currentPackage = JSON.parse(await readFile(path.join(fixture, "package.json"), "utf8"));
  const [major, minor] = currentPackage.version.split(".").map(Number);
  const nextVersion = `${major}.${minor + 1}.0`;
  const writeVersion = async (file) => {
    const target = path.join(fixture, file);
    const value = JSON.parse(await readFile(target, "utf8"));
    value.version = nextVersion;
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  };
  // Reproduce the documented node strategy plus its configured JSON/generic updaters.
  await writeVersion("package.json");
  await writeFile(path.join(fixture, ".release-please-manifest.json"), JSON.stringify({ ".": nextVersion }));
  await writeFile(path.join(fixture, "CHANGELOG.md"), `# Changelog\n\n## [${nextVersion}](https://example.test/compare/previous...next) (2026-10-22)\n`);
  for (const entry of config.packages["."]["extra-files"]) {
    if (typeof entry === "string") {
      assert.ok(entry.endsWith(".json"), "Unstructured extra files must use a declared generic updater.");
      await writeVersion(entry);
    } else {
      assert.equal(entry.type, "generic");
      const target = path.join(fixture, entry.path);
      const source = await readFile(target, "utf8");
      assert.match(source, /x-release-please-version/);
      await writeFile(target, source.split("\n").map((line) => line.includes("x-release-please-version")
        ? line.replace(/\d+\.\d+\.\d+(?:-[\w.-]+)?/g, nextVersion)
        : line).join("\n"));
    }
  }
  for (const [script, args] of [["scripts/verify-release-contract.mjs", []], ["scripts/generate-component-docs.mjs", ["--check"]]]) {
    const result = check(fixture, script, ...args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  const staleProposal = check(fixture, "scripts/generate-ai-proposal.mjs", "--check");
  assert.equal(staleProposal.status, 1, "The previous version's AI report must remain invalid.");
  assert.match(staleProposal.stderr, /out of date/);

  const packageJson = JSON.parse(await readFile(path.join(fixture, "package.json"), "utf8"));
  const preparation = packageJson.scripts["check:postbuild"].split("&&")[0].trim();
  assert.equal(preparation, "pnpm ai:fixture", "Refresh the offline fixture before parallel postbuild verification.");
  const prepared = spawnSync("pnpm", ["ai:fixture"], { cwd: fixture, encoding: "utf8" });
  assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
  const verified = check(fixture, "scripts/check-ai-workflow.mjs");
  assert.equal(verified.status, 0, verified.stderr || verified.stdout);
  const proposal = JSON.parse(await readFile(path.join(fixture, "reports/ai-workflow.json"), "utf8"));
  assert.equal(proposal.context.version, nextVersion);
  const evidence = JSON.parse(await readFile(path.join(fixture, "reports/ai-verification.json"), "utf8"));
  assert.equal(evidence.status, "passed");
  assert.equal(evidence.sourceMutations, 0);
});

test("release checks reject a partially updated Kubernetes version and independent package versions", async (t) => {
  const fixture = await fixtureFor(t);
  const deploymentPath = path.join(fixture, "infra/k8s/aster-ui.yaml");
  const original = await readFile(deploymentPath, "utf8");
  await writeFile(deploymentPath, original.replace(/app\.kubernetes\.io\/version: [^\s]+/, "app.kubernetes.io/version: 0.0.0"));
  const partial = check(fixture, "scripts/verify-release-contract.mjs");
  assert.equal(partial.status, 1);
  assert.match(partial.stderr, /Kubernetes version metadata/);
  await writeFile(deploymentPath, original);
  await writeFile(path.join(fixture, ".release-please-manifest.json"), JSON.stringify({ "packages/react": "3.2.0" }));
  const independent = check(fixture, "scripts/verify-release-contract.mjs");
  assert.equal(independent.status, 1);
  assert.match(independent.stderr, /one shared version/);
});
