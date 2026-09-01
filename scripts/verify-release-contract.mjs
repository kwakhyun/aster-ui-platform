import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packagePaths = [
  "package.json",
  "apps/studio/package.json",
  "packages/tokens/package.json",
  "packages/react/package.json",
  "packages/figma-bridge/package.json",
];
const packageVersions = await Promise.all(packagePaths.map(async (file) => {
  const parsed = JSON.parse(await readFile(path.join(projectRoot, file), "utf8"));
  return [file, parsed.version];
}));
const rootVersion = packageVersions[0][1];
const errors = packageVersions
  .filter(([, version]) => version !== rootVersion)
  .map(([file, version]) => `${file}: ${version} != ${rootVersion}`);

const releaseManifest = JSON.parse(
  await readFile(path.join(projectRoot, ".release-please-manifest.json"), "utf8"),
);
for (const [packagePath, version] of Object.entries(releaseManifest)) {
  if (version !== rootVersion) errors.push(`${packagePath} release manifest: ${version}`);
}

const componentManifest = JSON.parse(
  await readFile(path.join(projectRoot, "packages/react/component-manifest.json"), "utf8"),
);
if (componentManifest.version !== rootVersion) {
  errors.push(`component manifest: ${componentManifest.version}`);
}

const tokenSource = await readFile(path.join(projectRoot, "packages/tokens/src/index.ts"), "utf8");
const tokenMatch = tokenSource.match(/tokenVersion\s*=\s*"([^"]+)"/);
if (tokenMatch?.[1] !== rootVersion) errors.push(`tokenVersion: ${tokenMatch?.[1] ?? "missing"}`);

const deployment = await readFile(path.join(projectRoot, "infra/k8s/aster-ui.yaml"), "utf8");
if (!deployment.includes(`app.kubernetes.io/version: ${rootVersion}`)) {
  errors.push("Kubernetes version metadata is out of date.");
}
if (!deployment.includes("image: __ASTER_UI_IMAGE_DIGEST__")) {
  errors.push("Kubernetes image must be supplied through the immutable digest renderer.");
}
const changelog = await readFile(path.join(projectRoot, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`## ${rootVersion}`)) errors.push("Changelog is missing the current version.");

if (errors.length > 0) {
  console.error(`Release contract failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Release contract passed: ${rootVersion} across ${packageVersions.length} packages and deployment metadata.`);
}
