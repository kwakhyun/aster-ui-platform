import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const templatePath = path.join(projectRoot, "infra/k8s/aster-ui.yaml");
const marker = "__ASTER_UI_IMAGE_DIGEST__";

function readOption(name) {
  const exact = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const image = readOption("--image");
const output = readOption("--output");
const digestPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+@sha256:[a-f0-9]{64}$/;

if (!image || !digestPattern.test(image)) {
  console.error("--image must be an immutable registry/repository@sha256:<64 lowercase hex> reference.");
  process.exit(1);
}

const template = await readFile(templatePath, "utf8");
if ((template.match(new RegExp(marker, "g")) ?? []).length !== 1) {
  console.error(`Expected exactly one ${marker} marker in ${path.relative(projectRoot, templatePath)}.`);
  process.exit(1);
}

const rendered = template.replace(marker, image);
const requiredContracts = [
  "automountServiceAccountToken: false",
  "runAsNonRoot: true",
  "readOnlyRootFilesystem: true",
  'drop: ["ALL"]',
  "seccompProfile:",
  "readinessProbe:",
  "livenessProbe:",
];
const missing = requiredContracts.filter((contract) => !rendered.includes(contract));
if (missing.length > 0 || rendered.includes(marker)) {
  console.error(`Rendered Kubernetes contract is incomplete: ${missing.join(", ") || "image marker remains"}.`);
  process.exit(1);
}

if (process.argv.includes("--check")) {
  console.log(`Kubernetes manifest contract passed with immutable image ${image}.`);
} else if (output) {
  const outputPath = path.resolve(projectRoot, output);
  await writeFile(outputPath, rendered);
  console.log(`Rendered ${path.relative(projectRoot, outputPath)} with immutable image ${image}.`);
} else {
  process.stdout.write(rendered);
}
