# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions

- The source of visual truth is `../../design/aster-ui-final-target.png` at a 1440 × 1024 viewport.
- The Component Lab is the primary product frame. Figma sync, semantic-token review, quality gates, and semver publishing are one end-to-end human-reviewed workflow.
- Preserve the black top bar, porcelain workspace, coral primary accent, blue focus state, compact component tree, large TreatmentCard preview, and right-side inspector.
- AI may draft documentation or migration output, but the UI must always show human review and must never imply automatic correctness or automatic merge.
- Use Phosphor icons and real raster imagery. Do not replace visible assets with emoji, CSS drawings, or handcrafted SVGs.
