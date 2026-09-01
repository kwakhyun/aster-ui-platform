import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function lexicalPath(projectRoot, allowedRoot, candidate, label) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedAllowedRoot = path.resolve(resolvedProjectRoot, allowedRoot);
  const resolvedCandidate = path.resolve(resolvedProjectRoot, candidate);
  if (!isInside(resolvedAllowedRoot, resolvedCandidate)) {
    throw new Error(`${label} must be inside ${allowedRoot}/.`);
  }
  return { resolvedAllowedRoot, resolvedCandidate };
}

export async function resolveExistingFileWithin(projectRoot, allowedRoot, candidate, label) {
  const { resolvedAllowedRoot, resolvedCandidate } = lexicalPath(
    projectRoot,
    allowedRoot,
    candidate,
    label,
  );
  const [canonicalAllowedRoot, canonicalCandidate] = await Promise.all([
    realpath(resolvedAllowedRoot),
    realpath(resolvedCandidate),
  ]);
  if (!isInside(canonicalAllowedRoot, canonicalCandidate)) {
    throw new Error(`${label} resolves outside ${allowedRoot}/.`);
  }
  return canonicalCandidate;
}

export async function prepareOutputFileWithin(projectRoot, allowedRoot, candidate, label) {
  const { resolvedAllowedRoot, resolvedCandidate } = lexicalPath(
    projectRoot,
    allowedRoot,
    candidate,
    label,
  );
  const parent = path.dirname(resolvedCandidate);
  await mkdir(parent, { recursive: true });
  const [canonicalAllowedRoot, canonicalParent] = await Promise.all([
    realpath(resolvedAllowedRoot),
    realpath(parent),
  ]);
  if (canonicalParent !== canonicalAllowedRoot && !isInside(canonicalAllowedRoot, canonicalParent)) {
    throw new Error(`${label} resolves outside ${allowedRoot}/.`);
  }
  return path.join(canonicalParent, path.basename(resolvedCandidate));
}
