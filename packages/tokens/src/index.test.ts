import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isThemeName,
  isTokenAliasPath,
  themeNames,
  tokenAliasPaths,
  tokenArtifactPlatforms,
  tokenVersion,
} from "./index";

interface TokenNode {
  readonly $value?: unknown;
  readonly [key: string]: unknown;
}

function collectPaths(node: TokenNode, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key.startsWith("$")) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "$value" in value) return [path];
    return value && typeof value === "object" ? collectPaths(value as TokenNode, path) : [];
  });
}

interface DimensionToken {
  readonly name: string;
  readonly cssName: string;
  readonly value: number;
}

function collectDimensions(
  node: TokenNode,
  prefix = "",
  inheritedType?: string,
): DimensionToken[] {
  const type = typeof node.$type === "string" ? node.$type : inheritedType;
  return Object.entries(node).flatMap(([key, value]) => {
    if (key.startsWith("$")) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "$value" in value) {
      if (type !== "dimension") return [];
      const raw = (value as { $value: { value: number; unit: string } }).$value;
      expect(raw.unit).toBe("px");
      const segments = path.split(".");
      return [{
        name: `${segments[0]}${segments.slice(1).map((segment) =>
          `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`
        ).join("")}`,
        cssName: `--${segments.join("-")}`,
        value: raw.value,
      }];
    }
    return value && typeof value === "object"
      ? collectDimensions(value as TokenNode, path, type)
      : [];
  });
}

describe("design-token artifacts", () => {
  it("keeps the release version and review payload aligned", () => {
    expect(tokenVersion).toBe("3.1.0-beta.2");
    expect(themeNames).toEqual(["coral", "ocean"]);
    expect(isThemeName("coral")).toBe(true);
    expect(isThemeName("violet")).toBe(false);
    expect(tokenArtifactPlatforms).toEqual(["web", "ios", "android"]);
  });

  it("keeps every Figma alias inside the DTCG core contract", async () => {
    const core = JSON.parse(
      await readFile(new URL("./core.tokens.json", import.meta.url), "utf8"),
    ) as TokenNode;
    const corePaths = new Set(collectPaths(core));
    expect(tokenAliasPaths.every((path) => corePaths.has(path))).toBe(true);
  });

  it("accepts only aliases supported by the shared token contract", () => {
    expect(isTokenAliasPath("color.coral.700")).toBe(true);
    expect(isTokenAliasPath("brand.missing.900")).toBe(false);
  });

  it("keeps semantic keys aligned across themes", async () => {
    const [coral, ocean] = await Promise.all([
      readFile(new URL("./semantic.tokens.json", import.meta.url), "utf8"),
      readFile(new URL("./ocean.tokens.json", import.meta.url), "utf8"),
    ]);
    expect([...collectPaths(JSON.parse(coral) as TokenNode)].sort())
      .toEqual([...collectPaths(JSON.parse(ocean) as TokenNode)].sort());
  });

  it("generates CSS, Swift, and Compose artifacts through Style Dictionary", async () => {
    const css = await readFile(new URL("../dist/css/tokens.css", import.meta.url), "utf8");
    const swift = await readFile(
      new URL("../dist/themes/coral/ios/AsterTokensCoral.swift", import.meta.url),
      "utf8",
    );
    const kotlin = await readFile(
      new URL("../dist/themes/ocean/android/AsterTokensOcean.kt", import.meta.url),
      "utf8",
    );
    expect(css).toContain("--semantic-color-action-primary");
    expect(css).toContain("--semantic-color-focus-ring");
    expect(css).toContain("--space-2");
    expect(css).toContain('[data-theme="ocean"]');
    expect(swift).toContain("AsterTokensCoral");
    expect(kotlin).toContain("AsterTokensOcean");
  });

  it("keeps every px dimension numerically aligned across CSS, Swift, and Compose", async () => {
    const core = JSON.parse(
      await readFile(new URL("./core.tokens.json", import.meta.url), "utf8"),
    ) as TokenNode;
    const dimensions = collectDimensions(core);

    for (const theme of themeNames) {
      const pascalTheme = `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
      const [css, swift, kotlin] = await Promise.all([
        readFile(new URL(`../dist/themes/${theme}/css/tokens.css`, import.meta.url), "utf8"),
        readFile(
          new URL(`../dist/themes/${theme}/ios/AsterTokens${pascalTheme}.swift`, import.meta.url),
          "utf8",
        ),
        readFile(
          new URL(`../dist/themes/${theme}/android/AsterTokens${pascalTheme}.kt`, import.meta.url),
          "utf8",
        ),
      ]);

      for (const dimension of dimensions) {
        expect(css).toContain(`${dimension.cssName}: ${dimension.value}px`);
        expect(swift).toContain(
          `static let ${dimension.name} = CGFloat(${dimension.value.toFixed(2)})`,
        );
        expect(kotlin).toContain(`val ${dimension.name} = ${dimension.value.toFixed(2)}.dp`);
      }
    }
  });
});
