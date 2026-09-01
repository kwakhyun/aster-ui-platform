import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const core = JSON.parse(await readFile(
  path.join(projectRoot, "packages/tokens/src/core.tokens.json"),
  "utf8",
));

function collectDimensions(node, prefix = "", inheritedType = null) {
  const type = node.$type ?? inheritedType;
  return Object.entries(node).flatMap(([key, value]) => {
    if (key.startsWith("$")) return [];
    const tokenPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "$value" in value) {
      if (type !== "dimension") return [];
      if (value.$value.unit !== "px" || !Number.isFinite(value.$value.value)) {
        throw new Error(`Invalid DTCG dimension ${tokenPath}.`);
      }
      const segments = tokenPath.split(".");
      return [{
        tokenPath,
        cssName: `--${segments.join("-")}`,
        nativeName: `${segments[0]}${segments.slice(1).map((segment) =>
          `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
        ).join("")}`,
        value: value.$value.value,
      }];
    }
    return value && typeof value === "object"
      ? collectDimensions(value, tokenPath, type)
      : [];
  });
}

const dimensions = collectDimensions(core);
const failures = [];
const swiftFiles = [];
for (const theme of ["coral", "ocean"]) {
  const pascalTheme = `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
  const swiftPath = path.join(
    projectRoot,
    `packages/tokens/dist/themes/${theme}/ios/AsterTokens${pascalTheme}.swift`,
  );
  swiftFiles.push(swiftPath);
  const [css, swift, kotlin] = await Promise.all([
    readFile(path.join(projectRoot, `packages/tokens/dist/themes/${theme}/css/tokens.css`), "utf8"),
    readFile(swiftPath, "utf8"),
    readFile(path.join(projectRoot, `packages/tokens/dist/themes/${theme}/android/AsterTokens${pascalTheme}.kt`), "utf8"),
  ]);

  if (!swift.includes(`public enum AsterTokens${pascalTheme}`)) {
    failures.push(`${theme}: Swift enum declaration is missing.`);
  }
  if (!kotlin.includes(`object AsterTokens${pascalTheme}`)) {
    failures.push(`${theme}: Kotlin object declaration is missing.`);
  }
  for (const dimension of dimensions) {
    const expected = dimension.value.toFixed(2);
    if (!css.includes(`${dimension.cssName}: ${dimension.value}px`)) {
      failures.push(`${theme}/${dimension.tokenPath}: CSS px mismatch.`);
    }
    if (!swift.includes(`static let ${dimension.nativeName} = CGFloat(${expected})`)) {
      failures.push(`${theme}/${dimension.tokenPath}: Swift point mismatch.`);
    }
    if (!kotlin.includes(`val ${dimension.nativeName} = ${expected}.dp`)) {
      failures.push(`${theme}/${dimension.tokenPath}: Compose dp mismatch.`);
    }
  }
}

let swiftCompile = "not available on this platform";
if (process.platform === "darwin") {
  const sdk = spawnSync("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-path"], {
    encoding: "utf8",
  });
  const version = spawnSync("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-version"], {
    encoding: "utf8",
  });
  if (sdk.status === 0 && version.status === 0) {
    const moduleCache = await mkdtemp(path.join(tmpdir(), "aster-ui-swift-"));
    const architecture = process.arch === "arm64" ? "arm64" : "x86_64";
    const compile = spawnSync("xcrun", [
      "--sdk", "iphonesimulator", "swiftc", "-typecheck",
      "-target", `${architecture}-apple-ios${version.stdout.trim()}-simulator`,
      "-sdk", sdk.stdout.trim(),
      "-module-cache-path", moduleCache,
      ...swiftFiles,
    ], { encoding: "utf8" });
    await rm(moduleCache, { recursive: true, force: true });
    if (compile.status !== 0) {
      failures.push(`Swift compiler smoke test failed: ${compile.stderr.trim() || "unknown error"}`);
    } else {
      swiftCompile = "passed";
    }
  }
}

if (failures.length > 0) {
  console.error(`Native token contract failed:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Native token contract passed for ${dimensions.length} dimensions across 2 themes; Swift typecheck ${swiftCompile}.`,
  );
}
