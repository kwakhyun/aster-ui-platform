import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { getSourceRevision } from "../../scripts/lib/provenance.mjs";

export default defineConfig(async () => {
  const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
  const sourceRevision = await getSourceRevision(projectRoot);
  return {
    publicDir: "public-prod",
    define: {
      __ASTER_SOURCE_REVISION__: JSON.stringify(sourceRevision),
    },
    build: {
      outDir: "dist/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.tsx"],
      },
    },
    plugins: [react(), tailwindcss()],
  };
});
