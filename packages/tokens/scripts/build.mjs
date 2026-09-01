import StyleDictionary from "style-dictionary";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const swiftPixelTransform = "size/swift/pxToCGFloat";

StyleDictionary.registerTransform({
  name: swiftPixelTransform,
  type: "value",
  filter: (token) => token.$type === "dimension" || token.type === "dimension",
  transform: (token) => {
    const rawValue = token.$value ?? token.value;
    const dimension = typeof rawValue === "object" && rawValue !== null
      ? rawValue
      : { value: rawValue, unit: "px" };
    if (dimension.unit !== "px") {
      throw new Error(`Expected a px dimension for ${token.name}, received ${dimension.unit}.`);
    }
    const value = Number(dimension.value);
    if (!Number.isFinite(value)) {
      throw new Error(`Expected a numeric px dimension for ${token.name}.`);
    }
    return `CGFloat(${value.toFixed(2)})`;
  },
});

const themes = [
  { name: "coral", source: "src/semantic.tokens.json" },
  { name: "ocean", source: "src/ocean.tokens.json" },
];

for (const theme of themes) {
  const pascalName = `${theme.name[0].toUpperCase()}${theme.name.slice(1)}`;
  const dictionary = new StyleDictionary({
    source: ["src/core.tokens.json", theme.source],
    usesDtcg: true,
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: `dist/themes/${theme.name}/css/`,
        files: [
          {
            destination: "tokens.css",
            format: "css/variables",
            options: {
              outputReferences: true,
              selector: theme.name === "coral" ? ':root, [data-theme="coral"]' : `[data-theme="${theme.name}"]`,
            },
          },
        ],
      },
      json: {
        transformGroup: "js",
        buildPath: `dist/themes/${theme.name}/json/`,
        files: [{ destination: "tokens.json", format: "json/nested" }],
      },
      ios: {
        transforms: [
          "attribute/cti",
          "name/camel",
          "color/UIColorSwift",
          "content/swift/literal",
          "asset/swift/literal",
          swiftPixelTransform,
        ],
        buildPath: `dist/themes/${theme.name}/ios/`,
        files: [
          {
            destination: `AsterTokens${pascalName}.swift`,
            format: "ios-swift/any.swift",
            options: {
              className: `AsterTokens${pascalName}`,
              objectType: "enum",
              accessControl: "public",
              showFileHeader: false,
            },
          },
        ],
      },
      android: {
        transforms: [
          "attribute/cti",
          "name/camel",
          "color/composeColor",
          "size/compose/em",
          "size/compose/sp",
          "size/compose/dp",
        ],
        buildPath: `dist/themes/${theme.name}/android/`,
        files: [
          {
            destination: `AsterTokens${pascalName}.kt`,
            format: "compose/object",
            options: {
              className: `AsterTokens${pascalName}`,
              packageName: "com.aster.ui.tokens",
              showFileHeader: false,
            },
          },
        ],
      },
    },
  });

  await dictionary.buildAllPlatforms();
}

await mkdir("dist", { recursive: true });
await mkdir("dist/css", { recursive: true });
await mkdir("dist/json", { recursive: true });

const cssArtifacts = await Promise.all(
  themes.map((theme) => readFile(`dist/themes/${theme.name}/css/tokens.css`, "utf8")),
);
await writeFile("dist/css/tokens.css", cssArtifacts.join("\n"));

for (const theme of themes) {
  const json = await readFile(`dist/themes/${theme.name}/json/tokens.json`, "utf8");
  await writeFile(`dist/json/${theme.name}.tokens.json`, json);
}
await writeFile("dist/json/tokens.json", await readFile("dist/json/coral.tokens.json", "utf8"));

await writeFile(
  "dist/build-metadata.json",
  `${JSON.stringify(
    {
      specification: "W3C DTCG",
      generator: "Style Dictionary",
      generatedAt: "deterministic-at-build-time",
      platforms: ["web", "ios", "android"],
      themes: themes.map((theme) => theme.name),
      artifacts: themes.flatMap((theme) => [
        `themes/${theme.name}/css/tokens.css`,
        `themes/${theme.name}/json/tokens.json`,
        `themes/${theme.name}/ios/AsterTokens${theme.name[0].toUpperCase()}${theme.name.slice(1)}.swift`,
        `themes/${theme.name}/android/AsterTokens${theme.name[0].toUpperCase()}${theme.name.slice(1)}.kt`,
      ]),
    },
    null,
    2,
  )}\n`,
);
