import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Local jsdom/axe checks can share a busy workstation; browser timing has its own budgets.
    testTimeout: process.env.CI ? 10_000 : 30_000,
    // Each UI suite loads React and axe. Keep memory bounded on shared machines.
    fileParallelism: false,
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 75,
        lines: 75,
      },
    },
  },
});
