import { copyFile, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await copyFile(
  new URL("../src/styles.css", import.meta.url),
  new URL("../dist/styles.css", import.meta.url),
);
await copyFile(
  new URL("../component-manifest.json", import.meta.url),
  new URL("../dist/component-manifest.json", import.meta.url),
);
