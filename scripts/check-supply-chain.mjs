import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const read = (file) => readFile(path.join(projectRoot, file), "utf8");
const [dockerfile, nginx, deployment, ...workflows] = await Promise.all([
  read("Dockerfile"),
  read("infra/nginx.conf"),
  read("infra/k8s/aster-ui.yaml"),
  read(".github/workflows/ci.yml"),
  read(".github/workflows/release-please.yml"),
]);
const errors = [];

const baseImages = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1]);
if (baseImages.length < 2 || baseImages.some((image) => !/@sha256:[a-f0-9]{64}$/.test(image))) {
  errors.push("Every Docker base image must use an immutable sha256 digest.");
}

for (const [index, workflow] of workflows.entries()) {
  const actionRefs = [...workflow.matchAll(/^\s*- uses:\s+(\S+)/gm)].map((match) => match[1]);
  const mutable = actionRefs.filter((reference) =>
    !reference.startsWith("./") && !/@[a-f0-9]{40}$/.test(reference)
  );
  if (mutable.length > 0) {
    errors.push(`Workflow ${index + 1} has mutable action refs: ${mutable.join(", ")}`);
  }
}

const ciWorkflow = workflows[0];
const qualityJob = ciWorkflow.match(/^ {2}quality:\n([\s\S]*?)(?=^ {2}container:)/m)?.[1] ?? "";
const pagesJob = ciWorkflow.match(/^ {2}pages:\n([\s\S]*)$/m)?.[1] ?? "";
if (!qualityJob.includes("pnpm verify")
  || !qualityJob.includes("actions/upload-pages-artifact@")) {
  errors.push("The quality job must verify and upload the GitHub Pages artifact.");
}
if (!pagesJob.includes("actions/deploy-pages@")
  || pagesJob.includes("pnpm build")
  || pagesJob.includes("actions/upload-pages-artifact@")) {
  errors.push("The Pages job must deploy the artifact from quality without rebuilding it.");
}

if (!deployment.includes("automountServiceAccountToken: false")) {
  errors.push("The Kubernetes pod must disable service account token mounting.");
}
if (!deployment.includes("image: __ASTER_UI_IMAGE_DIGEST__")) {
  errors.push("The Kubernetes image must be injected by the immutable digest renderer.");
}
if (!nginx.includes("try_files /index.html =503;")) {
  errors.push("The health endpoint must verify that the built application shell exists.");
}

if (errors.length > 0) {
  console.error(`Supply-chain contract failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Supply-chain contract passed: ${baseImages.length} base images and immutable GitHub Action refs.`);
}
