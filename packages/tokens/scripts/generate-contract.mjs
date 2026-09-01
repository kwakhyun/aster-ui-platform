import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const sourcePath = new URL("../src/core.tokens.json", import.meta.url);
const outputPath = new URL("../src/generated/token-contract.ts", import.meta.url);

function collectTokenPaths(node, prefix = "") {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key.startsWith("$")) return [];
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "$value" in value) return [tokenPath];
    return value && typeof value === "object" ? collectTokenPaths(value, tokenPath) : [];
  });
}

const core = JSON.parse(await readFile(sourcePath, "utf8"));
const paths = collectTokenPaths(core).sort((left, right) => left.localeCompare(right));
const output = `// Generated from src/core.tokens.json. Do not edit by hand.\nexport const tokenAliasPaths = ${JSON.stringify(paths, null, 2)} as const;\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("Generated token alias contract is out of date.");
    process.exitCode = 1;
  } else {
    console.log(`Token alias contract is current with ${paths.length} DTCG paths.`);
  }
} else {
  await mkdir(path.dirname(fileURLToPath(outputPath)), { recursive: true });
  await writeFile(outputPath, output);
  console.log(`Generated token alias contract with ${paths.length} DTCG paths.`);
}
